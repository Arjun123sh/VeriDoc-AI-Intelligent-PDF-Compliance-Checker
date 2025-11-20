// /app/api/parse/route.ts
import { NextRequest, NextResponse } from "next/server";

// Define types for better type safety
interface RuleResult {
  rule: string;
  status: string;
  evidence: string;
  reasoning: string;
  confidence: number;
}

interface PdfParserText {
  text: string;
}

interface PdfParserPage {
  texts: PdfParserText[];
}

interface PdfParserData {
  pages: PdfParserPage[];
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pdfFile = formData.get("pdfFile") as File | null;
  const rulesString = formData.get("rules") as string | null;

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  if (!pdfFile) {
    return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });
  }

  // Validate file type
  if (pdfFile.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  let rules: string[] = [];
  try {
    rules = rulesString ? JSON.parse(rulesString) : [];
    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "Rules must be an array" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid rules format" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await pdfFile.arrayBuffer());

    // ----------------------------------------------------
    // Extract text using pdf-parser
    // ----------------------------------------------------
    const extractedText: string = await new Promise((resolve, reject) => {
      // You'll need to install proper types for pdf-parser or use a different library
      // For now, using any type for the pdf-parser callback
      const pdfParser = require("pdf-parser");
      
      pdfParser.pdf2json(buffer, (err: any, pdfData: PdfParserData) => {
        if (err) {
          reject(new Error(`PDF parsing failed: ${err.message}`));
          return;
        }

        if (!pdfData?.pages || !Array.isArray(pdfData.pages)) {
          reject(new Error("Invalid PDF structure"));
          return;
        }

        let text = "";
        pdfData.pages.forEach((page: PdfParserPage) => {
          if (page.texts && Array.isArray(page.texts)) {
            page.texts.forEach((t: PdfParserText) => {
              text += t.text + " ";
            });
          }
        });

        resolve(text.trim());
      });
    });

    if (!extractedText) {
      return NextResponse.json({ error: "No text could be extracted from PDF" }, { status: 400 });
    }

    // ----------------------------------------------------
    // Gemini Rule Checking
    // ----------------------------------------------------
    const results: RuleResult[] = [];

    for (const rule of rules) {
      if (!rule.trim()) continue;

      const prompt = `
You are a PDF rule-checker bot.
PDF Content:
${extractedText}

Rule to check: "${rule}"

Return ONLY valid JSON:
{
  "rule": "${rule}",
  "status": "Satisfied / Not Satisfied",
  "evidence": "exact text from PDF that supports your conclusion",
  "reasoning": "brief explanation of why the rule is satisfied or not",
  "confidence": 1-100
}

Important: Return ONLY the JSON object, no other text.
      `;

      try {
        const llmRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
              }
            }),
          }
        );

        if (!llmRes.ok) {
          throw new Error(`Gemini API error: ${llmRes.status} ${llmRes.statusText}`);
        }

        const responseData = await llmRes.json();
        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        console.log("LLM Raw Response:", responseText);

        // Clean the response text to extract only JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

        let parsedResult: RuleResult;
        try {
          parsedResult = JSON.parse(cleanJson);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          // Fallback result if JSON parsing fails
          parsedResult = {
            rule: rule,
            status: "Error",
            evidence: "Failed to parse LLM response",
            reasoning: "The AI response was not valid JSON",
            confidence: 0
          };
        }

        // Validate the parsed result has required fields
        if (!parsedResult.rule) parsedResult.rule = rule;
        if (!parsedResult.status) parsedResult.status = "Unknown";
        if (!parsedResult.evidence) parsedResult.evidence = "No evidence found";
        if (!parsedResult.reasoning) parsedResult.reasoning = "No reasoning provided";
        if (typeof parsedResult.confidence !== 'number') parsedResult.confidence = 0;

        results.push(parsedResult);

      } catch (ruleError) {
        console.error(`Error processing rule "${rule}":`, ruleError);
        results.push({
          rule: rule,
          status: "Error",
          evidence: "Rule processing failed",
          reasoning: ruleError instanceof Error ? ruleError.message : "Unknown error",
          confidence: 0
        });
      }
    }

    console.log("Final Results:", results);

    return NextResponse.json({ 
      success: true,
      results,
      extractedTextLength: extractedText.length
    });

  } catch (err) {
    console.error("PDF processing error:", err);
    const errorMessage = err instanceof Error ? err.message : "PDF processing failed";
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}