import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadedFiles = formData.getAll("pdfFile");
    const rulesString = formData.get("rules") as string | null;

    const apiKey = process.env.GEMINI_API_KEY!;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    const rules = rulesString ? JSON.parse(rulesString) : [];

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No File Found" }, { status: 404 });
    }

    const uploadedFile = uploadedFiles[0];

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        { error: "Uploaded file is not in correct format." },
        { status: 400 }
      );
    }

    // Convert PDF file buffer
    const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
    const pdfParser = new PDFParser(null, 1);

    // --------------------
    // Parse PDF text
    // --------------------
    const parsedText: string = await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (err: any) => {
        reject("PDF parsing failed");
      });

      pdfParser.on("pdfParser_dataReady", () => {
        resolve(pdfParser.getRawTextContent());
      });

      pdfParser.parseBuffer(fileBuffer);
    });

    // --------------------
    // Initialize Gemini SDK
    // --------------------
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    console.log("Parsed PDF Text:", parsedText);
    // --------------------
    // Run rule checks
    // --------------------
      const results = await Promise.all(
      rules.map(async (rule: string) => {
        if (!rule.trim()) {
          return {
            rule,
            status: "Not Provided",
            evidence: "",
            reasoning: "",
            confidence: 0,
          };
        }

        const prompt = `
You are a PDF rule-checker bot.

Here is the PDF content:
${parsedText}

Check this rule: "${rule}"

Return *valid JSON only*:
{
  "rule": "",
  "status": "Satisfied / Not Satisfied",
  "evidence": "",
  "reasoning": "",
  "confidence": 1-100
}

IMPORTANT: Return ONLY the JSON object, no additional text, no markdown code blocks.
`;

        try {
          const llmRes = await model.generateContent(prompt);

          const text =
            llmRes?.response?.text() ||
            `{"status": "Error", "reasoning": "Empty response"}`;

          console.log("LLM Response Text:", text);
          
          let json;
          try {
            // Clean the response text before parsing
            let cleanedText = text.trim();
            
            // Remove markdown code blocks if present
            if (cleanedText.startsWith('```json')) {
              cleanedText = cleanedText.slice(7); // Remove ```json
            }
            if (cleanedText.startsWith('```')) {
              cleanedText = cleanedText.slice(3); // Remove ```
            }
            if (cleanedText.endsWith('```')) {
              cleanedText = cleanedText.slice(0, -3); // Remove trailing ```
            }
            
            // Extract JSON from the text (in case there's extra text)
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              cleanedText = jsonMatch[0];
            }
            
            json = JSON.parse(cleanedText);
            
            // Ensure all required fields are present
            json = {
              rule: json.rule || rule,
              status: json.status || "Error",
              evidence: json.evidence || "",
              reasoning: json.reasoning || "",
              confidence: Math.max(0, Math.min(100, Number(json.confidence) || 0)),
            };
            
          } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            json = {
              rule,
              status: "Error",
              evidence: "",
              reasoning: "Invalid JSON from LLM: " + text.substring(0, 100),
              confidence: 0,
            };
          }

          return json;
        } catch (error) {
          console.error("Gemini API Error:", error);
          return {
            rule,
            status: "Error",
            evidence: "",
            reasoning: "Gemini API error",
            confidence: 0,
          };
        }
      })
    );


    console.log("Final Results:", results);

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Server Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.toString() },
      { status: 500 }
    );
  }
}
