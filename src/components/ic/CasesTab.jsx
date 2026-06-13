import React, { useState } from "react";
import {
  Search,
  Eye,
  RotateCcw,
  ShieldCheck,
  BrainCircuit,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  CalendarDays,
} from "lucide-react";
import { getTriageColor, calculateHospitalDay } from "../../utils/triageLogic";
import { getCriteriaLabel } from "../../utils/criteriaLabels";
import * as XLSX from "xlsx";

export default function CasesTab({
  assessments = [],
  wards = [],
  systemCategories = [],
  handleOpenAuditModal,
  handleUpdateStatus,
  markCaseAsViewed,
  isCaseNew,
  caseNotes = {},
  setCaseNotes,
}) {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    ward: "all",
    category: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPrintIds, setSelectedPrintIds] = useState([]);
  const itemsPerPage = 15;

  const filteredAssessments = assessments.filter((item) => {
    const matchSearch =
      item.hn?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.patient_name?.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus =
      filters.status === "all" || item.status === filters.status;
    const matchWard =
      filters.ward === "all" || item.ward_id?.toString() === filters.ward;
    const matchCat =
      filters.category === "all" || item.device_type === filters.category;
    let matchDate = true;
    if (filters.dateFrom || filters.dateTo) {
      const d = new Date(item.created_at);
      if (filters.dateFrom)
        matchDate = matchDate && d >= new Date(filters.dateFrom);
      if (filters.dateTo) {
        const e = new Date(filters.dateTo);
        e.setHours(23, 59, 59);
        matchDate = matchDate && d <= e;
      }
    }
    return matchSearch && matchStatus && matchWard && matchCat && matchDate;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssessments.length / itemsPerPage),
  );
  const paginatedData = filteredAssessments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleExportSelectedExcel = () => {
    const selectedCases = assessments.filter((a) =>
      selectedPrintIds.includes(a.id),
    );
    if (selectedCases.length === 0) return;
    const data = selectedCases.map((item) => {
      const vitals = item.detailed_analysis_json?.clinical_vitals || {};
      const infectious = item.detailed_analysis_json?.infectious_data || {};
      const criteria = infectious.dynamic_data
        ? Object.entries(infectious.dynamic_data)
            .filter(([, v]) => v === true)
            .map(([k]) => getCriteriaLabel(k, null)?.title || k)
            .join(", ")
        : "";
      return {
        รหัสเคส: item.id,
        วันที่ประเมิน: new Date(item.created_at).toLocaleString("th-TH"),
        HN: item.hn,
        "ชื่อ-สกุล": item.patient_name,
        อายุ: item.age_text || "-",
        เพศ:
          item.gender === "male"
            ? "ชาย"
            : item.gender === "female"
              ? "หญิง"
              : "-",
        หอผู้ป่วย: item.ward_name || "-",
        "วันที่ Admit": vitals.admission_date || "-",
        DOE: infectious.doe || "-",
        "Hospital Day":
          calculateHospitalDay(item.admission_date, item.date_of_event) || "-",
        "Temp (°C)": vitals.vital_temp || "-",
        BP: `${vitals.vital_bp_sys || "-"}/${vitals.vital_bp_dia || "-"}`,
        Pulse: vitals.vital_pulse || "-",
        RR: vitals.vital_rr || "-",
        SpO2: vitals.vital_spo2 || "-",
        หมวดหมู่: item.device_type,
        เกณฑ์ที่พบ: criteria,
        "ผล AI": item.auto_assess_result,
        สถานะ: item.status,
        "หมายเหตุ IC": item.ic_notes || "-",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 15 },
      { wch: 18 },
      { wch: 10 },
      { wch: 22 },
      { wch: 6 },
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 6 },
      { wch: 6 },
      { wch: 6 },
      { wch: 12 },
      { wch: 35 },
      { wch: 28 },
      { wch: 10 },
      { wch: 25 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Case_Data");
    const sum = [
      { รายการ: "จำนวนเคส", ค่า: selectedCases.length },
      {
        รายการ: "Pending",
        ค่า: selectedCases.filter((c) => c.status === "Pending").length,
      },
      {
        รายการ: "HAI",
        ค่า: selectedCases.filter((c) => c.status === "Confirmed").length,
      },
      {
        รายการ: "POA",
        ค่า: selectedCases.filter((c) => c.status === "POA").length,
      },
      { รายการ: "", ค่า: "" },
      { รายการ: "พิมพ์เมื่อ", ค่า: new Date().toLocaleString("th-TH") },
    ];
    const wsS = XLSX.utils.json_to_sheet(sum);
    wsS["!cols"] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsS, "สรุป");
    XLSX.writeFile(
      wb,
      `VanguardIC_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const printBulkViaIframe = () => {
    const selectedCases = assessments.filter((a) =>
      selectedPrintIds.includes(a.id),
    );
    if (selectedCases.length === 0) return;
    const casesHtml = selectedCases
      .map(
        (a, i) => `
      <div style="page-break-after:${i < selectedCases.length - 1 ? "always" : "auto"};padding:1.2cm">
        <div class="header"><h2>แบบบันทึกการเฝ้าระวังการติดเชื้อในโรงพยาบาล</h2><p class="subtitle">Infection Control Assessment Record</p></div>
        <table class="info-table"><tr><td class="label">ชื่อ-สกุล</td><td>${a.patient_name}</td><td class="label">หอผู้ป่วย</td><td>${a.ward_name || "-"}</td></tr><tr><td class="label">HN</td><td>${a.hn}</td><td class="label">รหัสเคส</td><td>${a.id}</td></tr><tr><td class="label">อายุ/เพศ</td><td>${a.age_text || "-"} / ${a.gender === "male" ? "ชาย" : "หญิง"}</td><td class="label">วันที่</td><td>${new Date(a.created_at).toLocaleString("th-TH")}</td></tr></table>
        <div class="section-title">1. ข้อมูลทางคลินิก</div>
        <table class="data-table"><tr><td class="label">Admit</td><td>${a.detailed_analysis_json?.clinical_vitals?.admission_date || "-"}</td><td class="label">DOE</td><td>${a.detailed_analysis_json?.infectious_data?.doe || "-"}</td></tr><tr><td class="label">Temp</td><td>${a.detailed_analysis_json?.clinical_vitals?.vital_temp || "-"} °C</td><td class="label">BP</td><td>${a.detailed_analysis_json?.clinical_vitals?.vital_bp_sys || "-"}/${a.detailed_analysis_json?.clinical_vitals?.vital_bp_dia || "-"}</td></tr><tr><td class="label">Pulse</td><td>${a.detailed_analysis_json?.clinical_vitals?.vital_pulse || "-"}</td><td class="label">SpO2</td><td>${a.detailed_analysis_json?.clinical_vitals?.vital_spo2 || "-"}%</td></tr></table>
        <div class="section-title">ผล AI</div><div class="ai-result">${a.auto_assess_result}</div>
        <div class="section-title">สรุป</div><table class="data-table"><tr><td class="label">สถานะ</td><td>${a.status === "Confirmed" ? "HAI" : a.status === "POA" ? "POA" : a.status}</td></tr><tr><td class="label">หมายเหตุ</td><td>${a.ic_notes || "-"}</td></tr></table>
        <div class="sign-area"><div class="sign-box"><div class="line"></div><p class="name">(.....................................)</p><p class="role">พยาบาลผู้ประเมิน</p></div><div class="sign-box"><div class="line"></div><p class="name">(.....................................)</p><p class="role">พยาบาลควบคุมการติดเชื้อ / IC</p></div></div>
        <div class="footer">Vanguard IC — เคสที่ ${i + 1} จาก ${selectedCases.length}</div>
      </div>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vanguard IC — Bulk Print</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Sarabun',sans-serif;font-size:13px;color:#1e293b;background:#fff;line-height:1.5}.header{text-align:center;margin-bottom:14px}.header h2{font-size:18px;font-weight:700;color:#0f172a}.subtitle{font-size:11px;color:#64748b}.info-table{width:100%;border-collapse:collapse;margin-bottom:12px}.info-table td{padding:4px 8px;border:1px solid #e2e8f0}.label{background:#f1f5f9;font-weight:600;color:#475569;width:22%}.section-title{font-size:13px;font-weight:700;color:#1e40af;border-bottom:2px solid #3b82f6;padding-bottom:3px;margin:14px 0 6px}.data-table{width:100%;border-collapse:collapse;margin-bottom:10px}.data-table td{padding:5px 8px;border:1px solid #e2e8f0}.data-table .label{width:28%}.ai-result{background:#fef2f2;border:1px solid #fecaca;padding:8px 12px;border-radius:5px;font-weight:700;font-size:14px;color:#991b1b;margin-bottom:10px}.sign-area{display:flex;justify-content:space-between;margin-top:30px;padding-top:12px}.sign-box{text-align:center;width:40%}.line{border-bottom:1px dashed #94a3b8;height:14px;margin-bottom:4px}.name{font-size:10px;color:#64748b}.role{font-weight:700;color:#1e293b;font-size:12px}.footer{text-align:center;margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px}@media print{@page{size:A4;margin:.8cm}}</style></head><body>${casesHtml}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const pw = window.open(url, "_blank");
    if (pw) {
      pw.onload = () => {
        pw.print();
        URL.revokeObjectURL(url);
      };
    }
  };

  const getCatBadge = (type) => {
    const map = {
      BSI: "bg-blue-100 text-blue-700",
      LRI: "bg-cyan-100 text-cyan-700",
      PNEU: "bg-cyan-100 text-cyan-700",
      UTI: "bg-purple-100 text-purple-700",
      GI: "bg-amber-100 text-amber-700",
      CVS: "bg-rose-100 text-rose-700",
      CNS: "bg-indigo-100 text-indigo-700",
      SSI: "bg-orange-100 text-orange-700",
      EENT: "bg-teal-100 text-teal-700",
      OST: "bg-lime-100 text-lime-700",
    };
    return map[type] || "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหา HN / ชื่อผู้ป่วย..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-sm font-medium outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters({ ...filters, dateFrom: e.target.value })
            }
            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
          />
          <span className="text-slate-300">-</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
          />
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() =>
                setFilters({ ...filters, dateFrom: "", dateTo: "" })
              }
              className="text-slate-400 hover:text-rose-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filters.ward}
          onChange={(e) => {
            setFilters({ ...filters, ward: e.target.value });
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-sm font-bold text-slate-600 outline-none transition-colors"
        >
          <option value="all">ทุกหอผู้ป่วย</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id.toString()}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => {
            setFilters({ ...filters, category: e.target.value });
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-sm font-bold text-slate-600 outline-none transition-colors"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {systemCategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => {
            setFilters({ ...filters, status: e.target.value });
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-sm font-bold text-slate-600 outline-none transition-colors"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed HAI</option>
          <option value="POA">POA</option>
          <option value="Discarded">Discarded</option>
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedPrintIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-bold text-indigo-700 pl-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> เลือกอยู่{" "}
            {selectedPrintIds.length} เคส
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPrintIds([])}
              className="px-4 py-2 text-xs font-bold text-indigo-500 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> ยกเลิก
            </button>
            <button
              onClick={printBulkViaIframe}
              className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> พิมพ์ ({selectedPrintIds.length})
            </button>
            <button
              onClick={handleExportSelectedExcel}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Export ({selectedPrintIds.length}
              )
            </button>
          </div>
        </div>
      )}

      {/* Case Cards */}
      <div className="grid gap-4">
        {paginatedData.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
            <p className="text-slate-400 font-semibold">ไม่พบเคส</p>
          </div>
        ) : (
          paginatedData.map((item) => {
            const caseIsPending = item.status === "Pending";
            const caseIsNew =
              typeof isCaseNew === "function"
                ? isCaseNew(item.id, item.updated_at || item.created_at)
                : false;
            const isSelected = selectedPrintIds.includes(item.id);
            let statusColor =
              item.status === "Confirmed"
                ? "bg-rose-500"
                : item.status === "POA"
                  ? "bg-orange-500"
                  : "bg-slate-300";
            if (caseIsPending) statusColor = "bg-amber-400";

            return (
              <div
                key={item.id}
                className={`rounded-2xl shadow-sm border overflow-hidden flex items-stretch hover:shadow-md transition-all duration-200 relative group ${isSelected ? "border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-200" : "border-slate-200/80 bg-white"}`}
              >
                <div className="flex items-center px-4 bg-slate-50/50 border-r border-slate-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={isSelected}
                    onChange={() =>
                      setSelectedPrintIds((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((id) => id !== item.id)
                          : [...prev, item.id],
                      )
                    }
                  />
                </div>
                <div className={`w-2 shrink-0 ${statusColor}`}></div>

                {/* NEW / UPDATED Badge */}
                {caseIsNew && (
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md ${caseIsPending ? "bg-indigo-500 text-white" : "bg-amber-500 text-white"}`}
                    >
                      {caseIsPending ? "NEW" : "UPDATED"}
                    </span>
                  </div>
                )}

                <div className="p-5 md:p-6 flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
                  <div className="w-full lg:w-1/4">
                    <div className="flex items-center gap-2 mb-2">
                      {caseIsNew && (
                        <div
                          className={`w-2 h-2 rounded-full ${caseIsPending ? "bg-indigo-500 animate-pulse ring-2 ring-indigo-100" : "bg-amber-500 ring-2 ring-amber-100"}`}
                        />
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${statusColor}`}
                      >
                        {item.status === "Confirmed" ? "HAI" : item.status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCatBadge(item.device_type)}`}
                      >
                        {item.device_type}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-800 mt-1 leading-tight group-hover:text-indigo-600 transition-colors">
                      {item.patient_name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-2">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                        HN: {item.hn}
                      </span>
                      <span>{item.ward_name}</span>
                    </p>
                  </div>
                  <div className="w-full lg:w-2/4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />{" "}
                      AI Triage
                    </p>
                    <p
                      className={`font-bold text-sm leading-snug line-clamp-2 ${getTriageColor(item.auto_assess_result).text}`}
                    >
                      {item.auto_assess_result}
                    </p>
                    <button
                      onClick={() => handleOpenAuditModal(item)}
                      className="mt-3 text-xs font-bold border border-slate-200 text-slate-600 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> ดูรายละเอียด
                    </button>
                  </div>
                  <div className="w-full lg:w-1/4">
                    {caseIsPending ? (
                      <div className="space-y-2.5">
                        <input
                          value={caseNotes[item.id] || ""}
                          onChange={(e) =>
                            setCaseNotes((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none bg-slate-50 focus:bg-white focus:border-indigo-400 transition-colors"
                          placeholder="Add IC note..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                item,
                                "Confirmed",
                                caseNotes[item.id] || "",
                              )
                            }
                            className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white rounded-xl text-[11px] font-bold py-2 shadow-sm"
                          >
                            Confirm HAI
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                item,
                                "POA",
                                caseNotes[item.id] || "",
                              )
                            }
                            className="flex-1 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white rounded-xl text-[11px] font-bold py-2 shadow-sm"
                          >
                            Confirm POA
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateStatus(
                              item,
                              "Discarded",
                              caseNotes[item.id] || "",
                            )
                          }
                          className="w-full border border-slate-200 rounded-xl text-[11px] font-bold bg-white text-slate-500 hover:bg-slate-50 py-1.5"
                        >
                          Discard
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border bg-slate-50 border-slate-100 flex flex-col items-end text-right">
                        <p
                          className={`text-sm font-extrabold ${item.status === "Confirmed" ? "text-rose-600" : "text-orange-600"}`}
                        >
                          Status: {item.status}
                        </p>
                        {item.ic_notes && (
                          <p className="text-xs mt-1.5 font-medium text-slate-500 italic">
                            "{item.ic_notes}"
                          </p>
                        )}
                        <button
                          onClick={() =>
                            handleUpdateStatus(
                              item,
                              "Pending",
                              "IC Re-evaluation",
                            )
                          }
                          className="mt-3 px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3 h-3" /> Re-evaluate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredAssessments.length > 0 && (
        <div className="p-2 flex items-center justify-between bg-white border border-slate-200 rounded-2xl shadow-sm">
          <span className="text-xs font-bold text-slate-500 pl-4">
            แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง{" "}
            {Math.min(currentPage * itemsPerPage, filteredAssessments.length)}{" "}
            จาก {filteredAssessments.length} เคส
          </span>
          <div className="flex items-center gap-1 pr-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl text-slate-600 disabled:opacity-50 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-indigo-700 border border-slate-100">
              หน้า {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl text-slate-600 disabled:opacity-50 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
