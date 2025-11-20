"use client";
import { useState } from "react";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Plus, Trash2 } from "lucide-react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [rules, setRules] = useState(["", "", ""]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleRuleChange = (i: number, value: string) => {
    const arr = [...rules];
    arr[i] = value;
    setRules(arr);
  };

  const addRule = () => {
    setRules([...rules, ""]);
  };

  const removeRule = (i: number) => {
    if (rules.length > 1) {
      setRules(rules.filter((_, idx) => idx !== i));
    }
  };

const submit = async () => {
  if (!file) return alert("Upload a PDF first!");

  setLoading(true);

  const form = new FormData();
  form.append("pdfFile", file);
  form.append("rules", JSON.stringify(rules));

  try {
    const res = await axios.post("/api/check", form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("API Response:", res.data);

    setResults(res.data.results || []);
  } catch (err) {
    console.error("Error:", err);
    alert("Error checking PDF");
  }

  setLoading(false);
};


  const getStatusIcon = (status: string) => {
    const lower = status?.toLowerCase();
    if (lower === "pass" || lower === "compliant") {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (lower === "fail" || lower === "non-compliant") {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusColor = (status: string) => {
    const lower = status?.toLowerCase();
    if (lower === "pass" || lower === "compliant") return "text-green-600 bg-green-50";
    if (lower === "fail" || lower === "non-compliant") return "text-red-600 bg-red-50";
    return "text-yellow-600 bg-yellow-50";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NIYAMR AI</h1>
          <p className="text-gray-600">Intelligent PDF Rule Compliance Checker</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* File Upload Section */}
          <div className="p-8 border-b border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Upload Document
            </label>
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-500 mr-3" />
                <span className="text-gray-600 group-hover:text-blue-600">
                  {file ? file.name : "Choose a PDF file or drag it here"}
                </span>
              </label>
            </div>
          </div>

          {/* Rules Section */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700">
                Compliance Rules
              </label>
              <button
                onClick={addRule}
                className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Rule
              </button>
            </div>
            <div className="space-y-3">
              {rules.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={r}
                    onChange={(e) => handleRuleChange(i, e.target.value)}
                    placeholder={`e.g., Document must contain a signature`}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {rules.length > 1 && (
                    <button
                      onClick={() => removeRule(i)}
                      className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="p-8">
            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing Document...
                </span>
              ) : (
                "Check Compliance"
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rule
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Evidence
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reasoning
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{r.rule}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                          {getStatusIcon(r.status)}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        {r.evidence}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        {r.reasoning}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {r.confidence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}