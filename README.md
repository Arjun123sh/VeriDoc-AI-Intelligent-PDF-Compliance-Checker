# 📄 VeriDoc-AI-Intelligent-PDF-Compliance-Checker

RuleGuard AI is a **super-simple full-stack web application** that validates any PDF document using rule-based checks powered by an LLM.

The app performs **three core actions**:

1. **Upload a PDF**
2. **Let the user enter 3 custom rules**
3. **Check the PDF using an LLM** and return PASS/FAIL with reasoning

---

## 🚀 Features

### **1. Upload Any PDF (2–10 pages)**

User selects a PDF file which is processed on the backend.

### **2. Enter 3 Simple Rules**

Examples:

* “The document must have a purpose section.”
* “The document must mention at least one date.”
* “The document must define at least one term.”

### **3. AI-Powered PDF Validation**

For each user rule, the backend:

* Extracts PDF text
* Sends text + rule to an LLM
* Receives structured validation output

Each rule returns:

* ✔ **Status**: PASS / FAIL
* 🧾 **Evidence sentence**
* 🧠 **Short reasoning**
* 🎯 **Confidence score (0–100)**

**Output Example**

```json
{
  "rule": "Document must mention a date.",
  "status": "pass",
  "evidence": "Found in page 1: 'Published 2024'",
  "reasoning": "Document includes a publication year.",
  "confidence": 92
}
```

---

## 🛠️ Tech Stack

### **Frontend**

* React.js / Next.js
* Tailwind CSS / Material UI
* Axios for API calls

### **Backend**

* Next.js
* PDF text extraction:

  * `pdf-parse` 
* LLM Provider:

  * Gemini

---

## 🧠 LLM Prompt Structure

Each rule is checked using a clean system prompt:

```
You are a document validation engine.
Given PDF text and one rule, return:

- PASS or FAIL
- One evidence sentence
- Reasoning in 1–2 lines
- Confidence (0–100)

Respond ONLY in JSON.

PDF Text: {{text}}
Rule: {{rule}}
```

