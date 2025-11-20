import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function runRuleCheck(text: string, rule: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",  
  });

  const prompt = `
You are checking a rule on a PDF document.

Rule: "${rule}"

Document Text:
${text.slice(0, 6000)}

Return JSON ONLY in this format:
{
  "rule": "",
  "status": "pass" | "fail",
  "evidence": "",
  "reasoning": "",
  "confidence": 0-100
}
`;

  const result = await model.generateContent(prompt);
  const output = result.response.text();

  try {
    return JSON.parse(output);
  } catch (e) {
    return {
      rule,
      status: "fail",
      evidence: "",
      reasoning: "Could not parse LLM response",
      confidence: 10,
    };
  }
}
