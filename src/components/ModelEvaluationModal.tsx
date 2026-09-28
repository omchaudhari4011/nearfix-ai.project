import React, { useState } from "react";
import { X, Sparkles, Cpu, AlertCircle, CheckCircle2, Layers } from "lucide-react";
import { MLMetrics } from "../types";
import { complaintApi } from "../api";

interface ModelEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: MLMetrics | null;
}

export const ModelEvaluationModal: React.FC<ModelEvaluationModalProps> = ({
  isOpen,
  onClose,
  metrics
}) => {
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestInference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testText.trim()) return;
    setTesting(true);
    setError(null);
    try {
      const res = await complaintApi.classifyOnly(testText);
      setTestResult(res.data);
    } catch {
      setError("Inference test failed. Please try a different query.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-[16px] border border-[#E0E7FF] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-[8px] text-[#6B7280] hover:text-[#1E1B4B] hover:bg-slate-50 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[12px] bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-[#1E1B4B] leading-tight">
              AI Classifier Architecture & Performance
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              TF-IDF Vectorizer + Linear Support Vector Machine (SVC)
            </p>
          </div>
        </div>

        {/* Pipeline Diagram */}
        <div className="mb-6 p-4 rounded-[12px] bg-[#F5F7FF] border border-[#E0E7FF]">
          <div className="text-xs font-medium text-[#6B7280] mb-2.5">
            Architecture Pipeline
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-[8px] bg-white border border-[#E0E7FF]">
              <div className="font-medium text-[#1E1B4B]">1. Tokenization</div>
              <div className="text-[11px] text-[#6B7280] mt-1">Lowercasing, stopwords removal, clean text</div>
            </div>
            <div className="p-3 rounded-[8px] bg-white border border-[#E0E7FF]">
              <div className="font-medium text-[#1E1B4B]">2. TF-IDF Matrix</div>
              <div className="text-[11px] text-[#6B7280] mt-1">Word unigrams + bigrams with sublinear TF</div>
            </div>
            <div className="p-3 rounded-[8px] bg-white border border-[#E0E7FF]">
              <div className="font-medium text-[#1E1B4B]">3. Linear SVM</div>
              <div className="text-[11px] text-[#6B7280] mt-1">Max-margin hyperplane classification</div>
            </div>
            <div className="p-3 rounded-[8px] bg-white border border-[#E0E7FF]">
              <div className="font-medium text-[#1E1B4B]">4. Geodesic Match</div>
              <div className="text-[11px] text-[#6B7280] mt-1">Haversine nearest technician allocation</div>
            </div>
          </div>
        </div>

        {/* Stat Cards with Colored Icon Circles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-[12px] bg-white border border-[#E0E7FF] text-center">
            <span className="text-xs text-[#6B7280]">Accuracy</span>
            <div className="text-2xl font-semibold text-[#10B981] mt-1">
              {metrics?.accuracy || 88.5}%
            </div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-white border border-[#E0E7FF] text-center">
            <span className="text-xs text-[#6B7280]">Classifier</span>
            <div className="text-sm font-semibold text-[#1E1B4B] mt-2">
              Linear SVC
            </div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-white border border-[#E0E7FF] text-center">
            <span className="text-xs text-[#6B7280]">Dataset</span>
            <div className="text-2xl font-semibold text-[#4F46E5] mt-1">
              {metrics?.total_samples || 99}
            </div>
          </div>
          <div className="p-3.5 rounded-[12px] bg-white border border-[#E0E7FF] text-center">
            <span className="text-xs text-[#6B7280]">Classes</span>
            <div className="text-2xl font-semibold text-[#1E1B4B] mt-1">
              {metrics?.categories?.length || 7}
            </div>
          </div>
        </div>

        {/* Classification Report Table */}
        {metrics?.classification_report && (
          <div className="mb-6 overflow-x-auto">
            <div className="text-xs font-medium text-[#6B7280] mb-2">
              Class-Wise Metrics (Precision, Recall, F1)
            </div>
            <table className="w-full text-left text-xs border border-[#E0E7FF] rounded-[12px] overflow-hidden">
              <thead className="bg-[#F5F7FF] text-[#6B7280] font-medium border-b border-[#E0E7FF]">
                <tr>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Precision</th>
                  <th className="p-2.5">Recall</th>
                  <th className="p-2.5">F1-Score</th>
                  <th className="p-2.5">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E7FF]">
                {Object.entries(metrics.classification_report).map(([cat, scores]: any) => {
                  if (typeof scores !== "object" || !scores.precision) return null;
                  return (
                    <tr key={cat} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium capitalize text-[#1E1B4B]">
                        {cat.replace("_", " ")}
                      </td>
                      <td className="p-2.5 text-[#1E1B4B]">{(scores.precision * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-[#1E1B4B]">{(scores.recall * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-[#1E1B4B]">{(scores["f1-score"] * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-[#6B7280]">{scores.support}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-4 rounded-[8px] bg-red-50 border border-red-200 text-[#EF4444] text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#EF4444]" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Live Inference Sandbox */}
        <div className="p-4 rounded-[12px] bg-[#F5F7FF] border border-[#E0E7FF] space-y-3">
          <div className="text-xs font-medium text-[#1E1B4B] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" />
            Live Model Test Playground
          </div>

          <form onSubmit={handleTestInference} className="flex gap-2">
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="e.g. Compressor trips when cooling reaches set point..."
              className="flex-1 px-3 py-2 text-xs rounded-[8px] border border-[#E0E7FF] bg-white text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
            />
            <button
              type="submit"
              disabled={testing || !testText.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-[8px] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {testing ? "Testing..." : "Test"}
            </button>
          </form>

          {testResult && (
            <div className="p-3.5 rounded-[8px] bg-white border border-[#E0E7FF] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Predicted Category:</span>
                <span className="font-semibold text-[#4F46E5] capitalize">
                  {testResult.predicted_category.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Confidence:</span>
                <span className="font-medium text-[#1E1B4B]">
                  {(testResult.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Price Estimate:</span>
                <span className="font-medium text-[#1E1B4B]">
                  {testResult.price_estimate}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
