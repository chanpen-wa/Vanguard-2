import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  CheckCircle2,
  X,
  User,
  RotateCcw,
  ShieldCheck,
  BrainCircuit,
  Printer,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Eye,
  ChevronUp,
  FileText,
  Info,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { getTriageColor } from "../../utils/triageLogic";
import { getCriteriaLabel } from "../../utils/criteriaLabels";
import FormEngine from "../FormEngine";
import { DEFAULT_CDC_DB } from "../../data/schemaDB";

// ==========================================
// 🧹 Reasoning Text Cleaner
// ==========================================
const formatReasonText = (text) => {
  if (!text) return "";
  let cleaned = text
    .replace(
      /[^\u0E00-\u0E7Fa-zA-Z0-9\s\.\,\:\;\-\+\=\/\(\)\[\]\{\}\"\'\!\@\#\$\%\^\&\*\_\?\<\>～∼‖]/g,
      "",
    )
    .trim();
  if (cleaned.includes("พบความสอดคล้อง")) {
    const match = cleaned.match(/(\d+) ระดับ/);
    cleaned = `🔍 ตรวจพบ ${match ? match[1] : ""} เกณฑ์`;
  } else if (cleaned.includes("ผลวินิจฉัย")) {
    cleaned = cleaned.replace(/ผลวินิจฉัย:\s*/, "→ ");
  } else if (cleaned.includes("ระยะเวลา:")) {
    cleaned = cleaned.replace("HAI", "🏥 HAI").replace("POA", "🏠 POA");
  } else if (cleaned.includes("ยกระดับเป็น")) {
    cleaned = cleaned.replace(/ยกระดับเป็น\s*/, "⬆️ ");
  } else if (cleaned.includes("ข้อมูลวัน")) {
    cleaned = "⚠️ ไม่สามารถระบุ HAI/POA ได้";
  }
  return cleaned;
};

// ==========================================
// 🖨️ Print via iframe (Modern Styling)
// ==========================================
const printViaIframe = (assessment, schema) => {
  const criteriaRows = assessment.detailed_analysis_json?.infectious_data
    ?.dynamic_data
    ? Object.entries(
        assessment.detailed_analysis_json.infectious_data.dynamic_data,
      )
        .filter(([, val]) => val === true)
        .map(
          ([key]) =>
            `<tr><td style="padding:8px 10px;border:1px solid #e2e8f0;">${getCriteriaLabel(key, schema)?.title || key}</td></tr>`,
        )
        .join("")
    : '<tr><td style="padding:8px 10px;border:1px solid #e2e8f0;">ไม่มี</td></tr>';

  const reasoningRows = assessment.detailed_analysis_json?.ai_result?.reason
    ? assessment.detailed_analysis_json.ai_result.reason
        .map(
          (r) =>
            `<tr><td style="padding:8px 10px;border:1px solid #e2e8f0;">${r.replace(/^[✓✅✗❌ℹ️📌💡⚠️🚨]\s*/, "")}</td></tr>`,
        )
        .join("")
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Vanguard IC — รายงานการเฝ้าระวังการติดเชื้อ</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Sarabun', sans-serif; 
      font-size: 14px; 
      color: #1e293b; 
      background: #fff; 
      padding: 1.5cm; 
      line-height: 1.6;
    }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .header .subtitle { font-size: 13px; color: #64748b; }
    
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 6px 10px; border: 1px solid #e2e8f0; }
    .info-table .label { background: #f1f5f9; font-weight: 600; color: #475569; width: 25%; }
    
    .section-title { 
      font-size: 15px; font-weight: 700; color: #1e40af; 
      border-bottom: 2px solid #3b82f6; padding-bottom: 4px; 
      margin: 24px 0 10px 0; 
    }
    
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .data-table td { padding: 8px 10px; border: 1px solid #e2e8f0; }
    .data-table .label { background: #f1f5f9; font-weight: 600; color: #475569; width: 30%; }
    .data-table tr:nth-child(even) { background: #f8fafc; }
    
    .ai-result { 
      background: #fef2f2; border: 1px solid #fecaca; 
      padding: 12px 16px; border-radius: 6px; 
      font-weight: 700; font-size: 16px; color: #991b1b; 
      margin-bottom: 16px; 
    }
    .ai-result.negative { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .ai-result.poa { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
    
    .sign-area { 
      display: flex; justify-content: space-between; 
      margin-top: 50px; padding-top: 20px;
    }
    .sign-box { text-align: center; width: 40%; }
    .sign-box .line { border-bottom: 1px dashed #94a3b8; height: 20px; margin-bottom: 8px; }
    .sign-box .name { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .sign-box .role { font-weight: 700; color: #1e293b; margin-top: 4px; }
    
    .footer { 
      text-align: center; margin-top: 30px; 
      font-size: 11px; color: #94a3b8; 
      border-top: 1px solid #e2e8f0; padding-top: 12px;
    }
    
    @media print { 
      body { padding: 0.5cm; } 
      @page { size: A4; margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>แบบบันทึกการเฝ้าระวังการติดเชื้อในโรงพยาบาล</h2>
    <p class="subtitle">Infection Control Assessment Record</p>
  </div>

  <table class="info-table">
    <tr>
      <td class="label">ชื่อ-สกุลผู้ป่วย</td><td>${assessment.patient_name}</td>
      <td class="label">หอผู้ป่วย</td><td>${assessment.ward_name || "-"}</td>
    </tr>
    <tr>
      <td class="label">HN</td><td>${assessment.hn}</td>
      <td class="label">รหัสเคส</td><td>${assessment.id}</td>
    </tr>
    <tr>
      <td class="label">อายุ / เพศ</td><td>${assessment.age_text || "-"} / ${assessment.gender === "male" ? "ชาย" : assessment.gender === "female" ? "หญิง" : "-"}</td>
      <td class="label">วันที่ส่ง</td><td>${new Date(assessment.created_at).toLocaleString("th-TH")}</td>
    </tr>
  </table>

  <div class="section-title">1. ข้อมูลทางคลินิก</div>
  <table class="data-table">
    <tr><td class="label">วันที่ Admit</td><td>${assessment.detailed_analysis_json?.clinical_vitals?.admission_date || "-"}</td><td class="label">Date of Event</td><td>${assessment.detailed_analysis_json?.infectious_data?.doe || "-"}</td></tr>
    <tr><td class="label">อุณหภูมิ</td><td>${assessment.detailed_analysis_json?.clinical_vitals?.vital_temp || "-"} °C</td><td class="label">ความดันโลหิต</td><td>${assessment.detailed_analysis_json?.clinical_vitals?.vital_bp_sys || "-"}/${assessment.detailed_analysis_json?.clinical_vitals?.vital_bp_dia || "-"} mmHg</td></tr>
    <tr><td class="label">ชีพจร</td><td>${assessment.detailed_analysis_json?.clinical_vitals?.vital_pulse || "-"} /min</td><td class="label">SpO2</td><td>${assessment.detailed_analysis_json?.clinical_vitals?.vital_spo2 || "-"}%</td></tr>
  </table>

  <div class="section-title">เกณฑ์ที่พบ (${assessment.device_type})</div>
  <table class="data-table">${criteriaRows}</table>

  <div class="section-title">2. ผลประเมิน AI</div>
  <div class="ai-result${assessment.auto_assess_result?.includes("NEGATIVE") ? " negative" : assessment.auto_assess_result?.includes("POA") ? " poa" : ""}">${assessment.auto_assess_result}</div>
  ${assessment.detailed_analysis_json?.ai_result?.summary ? `<p style="margin-bottom:12px;color:#475569">${assessment.detailed_analysis_json.ai_result.summary}</p>` : ""}

  ${reasoningRows ? `<div class="section-title">เหตุผลประกอบการวิเคราะห์</div><table class="data-table">${reasoningRows}</table>` : ""}

  <div class="section-title">3. สรุปผลโดยคณะกรรมการ IC</div>
  <table class="data-table">
    <tr><td class="label">สถานะ</td><td>${assessment.status === "Confirmed" ? "ติดเชื้อในโรงพยาบาล (HAI)" : assessment.status === "POA" ? "ติดเชื้อจากชุมชน (POA)" : assessment.status}</td></tr>
    <tr><td class="label">ข้อเสนอแนะ</td><td>${assessment.ic_notes || "-"}</td></tr>
  </table>

  <div class="sign-area">
    <div class="sign-box">
      <div class="line"></div>
      <p class="name">(..........................................................)</p>
      <p class="role">พยาบาลผู้ประเมิน</p>
    </div>
    <div class="sign-box">
      <div class="line"></div>
      <p class="name">(..........................................................)</p>
      <p class="role">พยาบาลควบคุมการติดเชื้อ / IC</p>
    </div>
  </div>

  <div class="footer">
    Vanguard IC — Epidemiology Surveillance System | พิมพ์เมื่อ ${new Date().toLocaleString("th-TH")}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(url);
    };
  }
};

// ==========================================
// 📋 Main Component
// ==========================================
export default function AuditModal({
  show,
  assessment,
  onClose,
  systemUsers = [],
  markCaseAsViewed,
  variant = "ic",
  cdcConfig = {},
}) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [showFullForm, setShowFullForm] = useState(false);

  useEffect(() => {
    if (show && assessment) {
      loadAuditLogs();
      if (markCaseAsViewed) markCaseAsViewed(assessment.id);
    }
  }, [show, assessment]);

  const loadAuditLogs = async () => {
    if (!assessment) return;
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("assessment_id", assessment.id)
      .order("created_at", { ascending: true });
    setAuditLogs(
      (data || []).map((log) => {
        const user = systemUsers.find((u) => u.id === log.changed_by);
        return { ...log, user_full_name: user ? user.full_name : "System" };
      }),
    );
  };

  if (!show || !assessment) return null;

  const schema =
    cdcConfig?.[assessment.device_type] ||
    DEFAULT_CDC_DB?.[assessment.device_type];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl bg-white text-slate-800 animate-in zoom-in-95 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-100 shrink-0 flex justify-between items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2.5">
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {assessment.patient_name}
              </h3>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider border shadow-inner ${
                  assessment.status === "Confirmed"
                    ? "bg-rose-100 border-rose-200 text-rose-700"
                    : assessment.status === "POA"
                      ? "bg-orange-100 border-orange-200 text-orange-700"
                      : assessment.status === "Pending"
                        ? "bg-amber-100 border-amber-200 text-amber-700"
                        : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                {assessment.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-slate-600 font-medium">
              <span className="font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm text-indigo-700 font-bold">
                HN: {assessment.hn}
              </span>
              <span>อายุ {assessment.age_text || "-"}</span>
              <span>เพศ {assessment.gender === "male" ? "ชาย" : "หญิง"}</span>
              <span className="font-bold text-slate-700">
                วอร์ด: {assessment.ward_name || "-"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printViaIframe(assessment, schema)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={() => printViaIframe(assessment, schema)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-sm"
              title="ใช้ Print → Save as PDF"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-all shadow-sm border border-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#F8FAFC]">
          {/* LEFT */}
          <div className="w-full lg:w-1/2 p-6 lg:p-8 overflow-y-auto custom-scrollbar border-r border-slate-200/60 bg-white">
            <div className="mb-8">
              <h4 className="font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-indigo-500" /> Patient Vitals
              </h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Admit Date
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {assessment.detailed_analysis_json?.clinical_vitals
                      ?.admission_date || "-"}
                  </p>
                </div>
                <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                    DOE
                  </p>
                  <p className="text-sm font-bold text-indigo-900">
                    {assessment.detailed_analysis_json?.infectious_data?.doe ||
                      "-"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  {
                    label: "Temp",
                    val: assessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_temp,
                  },
                  {
                    label: "Pulse",
                    val: assessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_pulse,
                  },
                  {
                    label: "RR",
                    val: assessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_rr,
                  },
                  {
                    label: "BP",
                    val: `${assessment.detailed_analysis_json?.clinical_vitals?.vital_bp_sys || "-"}/${assessment.detailed_analysis_json?.clinical_vitals?.vital_bp_dia || "-"}`,
                  },
                  {
                    label: "SpO2",
                    val: assessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_spo2,
                  },
                ].map((v, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 p-2.5 text-center shadow-sm"
                  >
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {v.label}
                    </p>
                    <p className="text-sm font-extrabold text-slate-800">
                      {v.val || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" /> เกณฑ์ที่พบ
                </h4>
                <span className="text-[10px] font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {assessment.device_type}
                </span>
              </div>
              <div className="space-y-2.5">
                {assessment.detailed_analysis_json?.infectious_data
                  ?.dynamic_data &&
                  Object.entries(
                    assessment.detailed_analysis_json.infectious_data
                      .dynamic_data,
                  )
                    .filter(
                      ([key, val]) =>
                        val !== false &&
                        val !== "" &&
                        val !== null &&
                        !key.includes("_met"),
                    )
                    .map(([key]) => {
                      const label = getCriteriaLabel(key, schema);
                      return (
                        <div
                          key={key}
                          className="flex items-start gap-3 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl shadow-sm"
                        >
                          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2
                              className="w-4 h-4 text-white"
                              strokeWidth={3}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">
                              {label?.title || key}
                            </p>
                            {label?.desc && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {label.desc}
                              </p>
                            )}
                            {label?.autoGenerated && (
                              <span className="text-[10px] text-amber-500 italic">
                                (แปลอัตโนมัติ)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                <BrainCircuit className="w-5 h-5 text-indigo-500" />{" "}
                สรุปผลวิเคราะห์ AI
              </h4>
              {(() => {
                const triageColor = getTriageColor(
                  assessment.auto_assess_result,
                );
                return (
                  <div
                    className={`p-4 rounded-2xl border mb-4 ${triageColor.bg} ${triageColor.border}`}
                  >
                    <p className={`font-extrabold text-lg ${triageColor.text}`}>
                      {assessment.auto_assess_result}
                    </p>
                    {assessment.detailed_analysis_json?.ai_result?.summary && (
                      <p className="text-sm text-slate-600 mt-1">
                        {assessment.detailed_analysis_json.ai_result.summary}
                      </p>
                    )}
                  </div>
                );
              })()}
              {assessment.detailed_analysis_json?.ai_result?.reason?.length >
                0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    เหตุผลประกอบ
                  </h5>
                  <div className="space-y-1.5">
                    {assessment.detailed_analysis_json.ai_result.reason.map(
                      (r, i) => {
                        const isPos = r.includes("✓") || r.includes("✅");
                        const isNeg = r.includes("✗") || r.includes("❌");
                        const isInf =
                          r.includes("ℹ️") ||
                          r.includes("📌") ||
                          r.includes("💡");
                        const isWarn = r.includes("⚠️") || r.includes("🚨");
                        let bg = "bg-slate-50 border-slate-200",
                          txt = "text-slate-700",
                          icon = (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          );
                        if (isPos) {
                          bg = "bg-emerald-50 border-emerald-200";
                          txt = "text-emerald-800";
                          icon = (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          );
                        } else if (isNeg) {
                          bg = "bg-rose-50 border-rose-200";
                          txt = "text-rose-700";
                          icon = <X className="w-3.5 h-3.5 text-rose-400" />;
                        } else if (isWarn) {
                          bg = "bg-amber-50 border-amber-200";
                          txt = "text-amber-800";
                          icon = (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          );
                        } else if (isInf) {
                          bg = "bg-blue-50 border-blue-200";
                          txt = "text-blue-700";
                          icon = <Info className="w-3.5 h-3.5 text-blue-500" />;
                        }
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium ${bg}`}
                          >
                            <div className="shrink-0 mt-0.5">{icon}</div>
                            <p className={txt}>{formatReasonText(r)}</p>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowFullForm(!showFullForm)}
                className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
              >
                {showFullForm ? (
                  <>
                    <ChevronUp className="w-4 h-4" /> ซ่อนฟอร์ม
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> ดูฟอร์มประเมินเต็ม
                  </>
                )}
              </button>
              {showFullForm && (
                <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    ฟอร์ม ({assessment.device_type})
                  </h4>
                  <FormEngine
                    schema={schema}
                    data={
                      assessment.detailed_analysis_json?.infectious_data
                        ?.dynamic_data || {}
                    }
                    patientAgeYears={parseInt(assessment.age_text) || null}
                    patientAgeDisplay={assessment.age_text || "ไม่ระบุ"}
                    onChange={() => {}}
                    readOnly={true}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Audit Trail */}
          <div className="w-full lg:w-1/2 p-6 lg:p-8 overflow-y-auto custom-scrollbar relative">
            <div className="absolute left-[47px] top-12 bottom-12 w-0.5 bg-slate-200"></div>
            <h4 className="font-extrabold text-slate-800 flex items-center gap-2 mb-8">
              <Activity className="w-5 h-5 text-emerald-500" /> Audit Trail
            </h4>
            <div className="space-y-8">
              <div className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm">
                  <BrainCircuit className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-bold text-slate-800">
                      Triage AI Evaluated
                    </h5>
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                      {new Date(assessment.created_at).toLocaleString("th-TH")}
                    </span>
                  </div>
                  {(() => {
                    const tc = getTriageColor(assessment.auto_assess_result);
                    return (
                      <div
                        className={`px-3 py-2 rounded-lg border inline-block ${tc.bg} ${tc.border}`}
                      >
                        <p className={`text-xs font-bold ${tc.text}`}>
                          {assessment.auto_assess_result}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {auditLogs.map((log, index) => {
                const isConfirmed = log.new_value === "Confirmed";
                const isPOA = log.new_value === "POA";
                const isLast = index === auditLogs.length - 1;
                return (
                  <div key={log.id} className="relative flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm ${isConfirmed ? "bg-rose-100 text-rose-600" : isPOA ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"}`}
                    >
                      {isLast ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`bg-white p-5 rounded-2xl shadow-sm border ${isLast ? `border-l-4 ${isConfirmed ? "border-rose-200" : isPOA ? "border-orange-200" : "border-slate-200"}` : "border-slate-200"} flex-1`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-slate-800">
                          ปรับสถานะเป็น:{" "}
                          <span
                            className={
                              isConfirmed
                                ? "text-rose-600"
                                : isPOA
                                  ? "text-orange-600"
                                  : "text-slate-600"
                            }
                          >
                            {typeof log.new_value === "object"
                              ? log.new_value.status
                              : log.new_value}
                          </span>
                        </h5>
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                          {new Date(log.created_at).toLocaleString("th-TH")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        <User className="w-3.5 h-3.5 opacity-70 inline" /> โดย:{" "}
                        <span className="font-bold">{log.user_full_name}</span>
                      </p>
                      {log.details && (
                        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 italic mt-2">
                          "{log.details}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
