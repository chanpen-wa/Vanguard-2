import React from "react";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  CalendarDays,
  X,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { getTriageColor } from "../../utils/triageLogic";

export default function RecentCases({
  filteredAssessments = [],
  systemCategories = [],
  filters,
  setFilters,
  onOpenAudit,
  onCancelCase,
  cdcConfig = {},
}) {
  const pendingCases = filteredAssessments.filter(
    (c) => c.status === "Pending",
  );
  const reviewedCases = filteredAssessments.filter(
    (c) => c.status !== "Pending",
  );

  return (
    <div className="rounded-3xl shadow-sm border border-slate-200/60 bg-white overflow-hidden mt-10">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              รายการประเมินเฝ้าระวังประจำหอผู้ป่วย
            </h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ HN..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400"
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
              onChange={(e) =>
                setFilters({ ...filters, dateTo: e.target.value })
              }
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
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-600"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {systemCategories.map((sys) => (
              <option key={sys.id} value={sys.id}>
                {sys.id}
              </option>
            ))}
          </select>
          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
            พบ {filteredAssessments.length} รายการ
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x border-slate-100 min-h-[400px]">
        <div className="p-6 bg-slate-50/50">
          <h4 className="font-bold text-slate-700 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide">
            <AlertCircle className="w-4 h-4 text-orange-500" />{" "}
            รอยืนยันจากกองระบาดวิทยา ({pendingCases.length})
          </h4>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {pendingCases.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenAudit(item)}
                className="p-5 border border-slate-200 rounded-2xl bg-white relative cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group"
              >
                <span className="absolute top-5 right-5 px-2.5 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Pending
                </span>
                <h5 className="font-bold text-base text-slate-800">
                  {item.patient_name}
                </h5>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  HN: {item.hn} • {item.device_type} •{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
                <p
                  className={`text-sm font-bold mt-3 ${getTriageColor(item.auto_assess_result).text}`}
                >
                  {item.auto_assess_result}
                </p>
                <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelCase(item.id);
                    }}
                    className="px-4 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />{" "}
                    ดึงเรื่องกลับเพื่อแก้ไข
                  </button>
                </div>
              </div>
            ))}
            {pendingCases.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">
                ไม่มีเคสที่รอยืนยัน
              </p>
            )}
          </div>
        </div>
        <div className="p-6 bg-white">
          <h4 className="font-bold text-slate-700 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide">
            <CheckCircle className="w-4 h-4 text-teal-500" /> คำวินิจฉัยสิ้นสุด
            ({reviewedCases.length})
          </h4>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {reviewedCases.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenAudit(item)}
                className="p-5 border border-slate-200 rounded-2xl bg-white relative cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === "Confirmed" ? "bg-rose-100 text-rose-700 border border-rose-200" : item.status === "POA" ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                  >
                    {item.status === "Confirmed"
                      ? "🚨 HAI"
                      : item.status === "POA"
                        ? "🟠 POA"
                        : `🗑️ ${item.status}`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(
                      item.updated_at || item.created_at,
                    ).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h5 className="font-bold text-base text-slate-800">
                  {item.patient_name}
                </h5>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  HN: {item.hn} • {item.device_type}
                </p>
                <div className="mt-4 p-4 rounded-xl border bg-gradient-to-br from-slate-50 to-white">
                  {item.ic_notes ? (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-slate-700">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">
                          ข้อเสนอแนะจาก IC
                        </span>
                        "{item.ic_notes}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center">
                      ไม่มีข้อเสนอแนะเพิ่มเติม
                    </p>
                  )}
                </div>
              </div>
            ))}
            {reviewedCases.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">
                ไม่มีเคสที่วินิจฉัยแล้ว
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
