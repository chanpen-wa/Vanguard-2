import React from "react";
import {
  AlertTriangle,
  CheckCircle,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import { getTriageColor } from "../../utils/triageLogic";

// ==========================================
// 🧠 AI Analysis Result Component
// ==========================================
export default function AnalysisResult({ analysisResult }) {
  if (!analysisResult) return null;

  const triageColor = getTriageColor(analysisResult.title);

  // Icon Logic
  let iconBgColor = "bg-slate-500 text-white";
  let IconComponent = X;
  if (triageColor.text === "text-rose-700") {
    iconBgColor = "bg-rose-500 text-white";
    IconComponent = AlertTriangle;
  } else if (triageColor.text === "text-amber-700") {
    iconBgColor = "bg-amber-500 text-white";
    IconComponent = AlertTriangle;
  } else if (triageColor.text === "text-emerald-700") {
    iconBgColor = "bg-emerald-500 text-white";
    IconComponent = CheckCircle;
  }

  return (
    <div
      className={`mt-8 rounded-3xl border overflow-hidden animate-in zoom-in-95 duration-300 shadow-sm ${
        analysisResult.type === "success"
          ? triageColor.border + " bg-white"
          : analysisResult.type === "warning"
            ? "bg-white border-amber-200"
            : "bg-white border-rose-200"
      }`}
    >
      {/* Header */}
      <div
        className={`px-6 py-5 flex items-start gap-4 ${
          analysisResult.type === "success"
            ? triageColor.bg + " border-b " + triageColor.border
            : analysisResult.type === "warning"
              ? "bg-amber-50/50 border-b border-amber-100"
              : "bg-rose-50/50 border-b border-rose-100"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${iconBgColor}`}
        >
          <IconComponent className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            AI Diagnostic Result
          </h4>
          <h4
            className={`font-extrabold text-xl leading-tight ${triageColor.text}`}
          >
            {analysisResult.title}
          </h4>
          <p className="text-sm text-slate-600 font-medium mt-1.5 bg-white/60 inline-block px-3 py-1 rounded-lg border border-white/40">
            {analysisResult.summary}
          </p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="p-6 bg-slate-50/30">
        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" /> Reasoning Breakdown
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysisResult.reason.map((r, i) => {
            const isPos = r.includes("✓") || r.includes("✅");
            const isNeg = r.includes("✗") || r.includes("❌");
            const isInf =
              r.includes("ℹ️") || r.includes("📌") || r.includes("💡");
            const isWarn = r.includes("⚠️") || r.includes("🚨");

            let bg, tx, Ico;
            if (isPos) {
              bg = "bg-emerald-50 border-emerald-200";
              tx = "text-emerald-900";
              Ico = CheckCircle;
            } else if (isNeg) {
              bg = "bg-rose-50 border-rose-200";
              tx = "text-rose-900";
              Ico = X;
            } else if (isWarn) {
              bg = "bg-amber-50 border-amber-200";
              tx = "text-amber-900";
              Ico = AlertTriangle;
            } else if (isInf) {
              bg = "bg-blue-50 border-blue-200";
              tx = "text-blue-900";
              Ico = Info;
            } else {
              bg = "bg-slate-50 border-slate-200";
              tx = "text-slate-700";
              Ico = ChevronRight;
            }

            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${isInf ? "md:col-span-2" : ""} ${bg}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bg.replace("border-", "").replace("50", "100")} ${tx}`}
                >
                  <Ico className="w-4 h-4" />
                </div>
                <div className="pt-1.5">
                  <p className={`text-sm font-bold leading-snug ${tx}`}>
                    {r.replace(/^[✓✅✗❌ℹ️📌💡⚠️🚨]\s*/, "")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
