import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  CalendarDays,
  Download,
  X,
  Activity,
  Hospital,
  Bug,
  Search,
  Eye,
  ChevronDown,
  Printer,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "../../utils/supabaseClient";

// ==========================================
// 🎨 Constants
// ==========================================
const COLORS = {
  HAI: "#e11d48",
  POA: "#f97316",
  Pending: "#f59e0b",
  Discarded: "#94a3b8",
};

const CATEGORY_COLORS = {
  BSI: "#3b82f6",
  UTI: "#8b5cf6",
  PNEU: "#06b6d4",
  SSI: "#f43f5e",
  GI: "#eab308",
  CVS: "#ec4899",
  EENT: "#14b8a6",
  CNS: "#6366f1",
  OST: "#84cc16",
  REPR: "#a855f7",
  OTHER: "#64748b",
};

const TABLE_LIMIT = 5000;
const SEARCH_LIMIT = 100;
const ITEMS_PER_PAGE = 20;

// ==========================================
// 🧩 Custom Hook: Debounce
// ==========================================
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ==========================================
// 📊 Main Component
// ==========================================
export default function DashboardTab({
  wards = [],
  currentUser = {},
  cdcConfig = {},
}) {
  const [dashDates, setDashDates] = useState({ start: "", end: "" });
  const [trendRange, setTrendRange] = useState(30);
  const [showCaseTable, setShowCaseTable] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseStatusFilter, setCaseStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [hospitalName, setHospitalName] = useState("โรงพยาบาล");

  const [recentCases, setRecentCases] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const cacheRef = useRef({});
  const debouncedSearch = useDebounce(caseSearch, 400);

  // ==========================================
  // Load Hospital Name
  // ==========================================
  useEffect(() => {
    loadHospitalName();
    loadRecentCases();
  }, []);

  const loadHospitalName = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "hospital_name")
      .single();
    if (data) setHospitalName(data.value);
  };

  // ==========================================
  // Load Recent Cases
  // ==========================================
  const loadRecentCases = async () => {
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .in("status", ["Pending", "Confirmed", "POA", "Discarded"])
      .order("created_at", { ascending: false })
      .limit(TABLE_LIMIT);
    if (data) {
      cacheRef.current["recent_cases"] = data;
      setRecentCases(data);
    }
  };

  // ==========================================
  // Search
  // ==========================================
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    handleSearch(debouncedSearch);
  }, [debouncedSearch]);

  const handleSearch = async (query) => {
    setIsSearching(true);
    setHasSearched(true);
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .or(`patient_name.ilike.%${query}%,hn.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(SEARCH_LIMIT);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setCaseSearch("");
    setHasSearched(false);
    setSearchResults([]);
    setCurrentPage(1);
  };

  const displayData = hasSearched ? searchResults : recentCases;

  // ==========================================
  // Filter Data
  // ==========================================
  const filtered = useMemo(() => {
    let data = displayData;
    if (dashDates.start || dashDates.end) {
      data = data.filter((item) => {
        const d = new Date(item.created_at).getTime();
        const start = dashDates.start ? new Date(dashDates.start).getTime() : 0;
        const end = dashDates.end
          ? new Date(dashDates.end).setHours(23, 59, 59)
          : Infinity;
        return d >= start && d <= end;
      });
    }
    return data;
  }, [displayData, dashDates]);

  // ==========================================
  // Stats (Cached)
  // ==========================================
  const stats = useMemo(() => {
    const cacheKey = `stats_${filtered.length}_${filtered[0]?.id || "none"}`;
    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];

    const total = filtered.length;
    const pending = filtered.filter((a) => a.status === "Pending").length;
    const hai = filtered.filter((a) => a.status === "Confirmed").length;
    const poa = filtered.filter((a) => a.status === "POA").length;
    const discarded = filtered.filter((a) => a.status === "Discarded").length;
    const reviewed = hai + poa + discarded;
    const haiRate = reviewed > 0 ? ((hai / reviewed) * 100).toFixed(1) : 0;
    const avgHospitalDay =
      filtered.length > 0
        ? (
            filtered.reduce((sum, a) => {
              const admit = a.admission_date,
                doe = a.date_of_event;
              if (admit && doe) {
                const days =
                  Math.ceil((new Date(doe) - new Date(admit)) / 86400000) + 1;
                return sum + (days > 0 ? days : 0);
              }
              return sum;
            }, 0) / filtered.length
          ).toFixed(1)
        : 0;

    const result = {
      total,
      pending,
      hai,
      poa,
      discarded,
      reviewed,
      haiRate,
      avgHospitalDay,
    };
    cacheRef.current[cacheKey] = result;
    return result;
  }, [filtered]);

  // ==========================================
  // Chart Data
  // ==========================================
  const pieData = useMemo(
    () =>
      [
        { name: "HAI", value: stats.hai, color: COLORS.HAI },
        { name: "POA", value: stats.poa, color: COLORS.POA },
        { name: "Pending", value: stats.pending, color: COLORS.Pending },
        { name: "Discarded", value: stats.discarded, color: COLORS.Discarded },
      ].filter((d) => d.value > 0),
    [stats],
  );

  const trendData = useMemo(() => {
    const cacheKey = `trend_${trendRange}_${filtered.length}`;
    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];

    const dates = {};
    const today = new Date();
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      });
      dates[key] = { date: key, HAI: 0, POA: 0, Pending: 0, Total: 0 };
    }
    filtered.forEach((a) => {
      const key = new Date(a.created_at).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      });
      if (dates[key]) {
        dates[key].Total += 1;
        if (a.status === "Confirmed") dates[key].HAI += 1;
        if (a.status === "POA") dates[key].POA += 1;
        if (a.status === "Pending") dates[key].Pending += 1;
      }
    });
    const result = Object.values(dates);
    cacheRef.current[cacheKey] = result;
    return result;
  }, [filtered, trendRange]);

  const wardData = useMemo(() => {
    const map = {};
    filtered.forEach((a) => {
      const ward =
        a.ward_name || a.detailed_analysis_json?.ward_name || "ไม่ระบุ";
      if (!map[ward])
        map[ward] = { name: ward, HAI: 0, POA: 0, Pending: 0, Total: 0 };
      map[ward].Total += 1;
      if (a.status === "Confirmed") map[ward].HAI += 1;
      if (a.status === "POA") map[ward].POA += 1;
      if (a.status === "Pending") map[ward].Pending += 1;
    });
    return Object.values(map)
      .map((w) => ({
        ...w,
        haiRate:
          w.Total > 0 ? ((w.HAI / (w.HAI + w.POA || 1)) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.Total - a.Total);
  }, [filtered]);

  const categoryData = useMemo(() => {
    const map = {};
    filtered.forEach((a) => {
      const cat = a.device_type || "OTHER";
      if (!map[cat])
        map[cat] = {
          name: cat,
          count: 0,
          HAI: 0,
          POA: 0,
          color: CATEGORY_COLORS[cat] || COLORS.OTHER,
        };
      map[cat].count += 1;
      if (a.status === "Confirmed") map[cat].HAI += 1;
      if (a.status === "POA") map[cat].POA += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach((a) => {
      const d = new Date(a.created_at);
      const key = d.toLocaleDateString("th-TH", {
        month: "short",
        year: "numeric",
      });
      if (!map[key]) map[key] = { month: key, HAI: 0, POA: 0, Total: 0 };
      map[key].Total += 1;
      if (a.status === "Confirmed") map[key].HAI += 1;
      if (a.status === "POA") map[key].POA += 1;
    });
    return Object.values(map).slice(-12);
  }, [filtered]);

  // ==========================================
  // Case Table + Pagination
  // ==========================================
  const caseTableData = useMemo(() => {
    let data = filtered;
    if (caseStatusFilter !== "all")
      data = data.filter((a) => a.status === caseStatusFilter);
    return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [filtered, caseStatusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [caseStatusFilter, caseSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(caseTableData.length / ITEMS_PER_PAGE),
  );
  const paginatedCases = caseTableData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      )
        pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // ==========================================
  // 📥 Excel Export
  // ==========================================
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateRange = `${dashDates.start || "ทั้งหมด"} - ${dashDates.end || "ทั้งหมด"}`;

    const summaryRows = [
      [`🏥 ${hospitalName}`],
      ["รายงานเฝ้าระวังการติดเชื้อในโรงพยาบาล"],
      [`วันที่: ${new Date().toLocaleString("th-TH")}`],
      [`ช่วงข้อมูล: ${dateRange}`],
      [`ผู้ส่งออก: ${currentUser?.full_name || "-"}`],
      [],
      ["📊 สรุปภาพรวม", ""],
      ["จำนวนเคสทั้งหมด", stats.total],
      ["รอประเมิน (Pending)", stats.pending],
      ["HAI", stats.hai],
      ["POA", stats.poa],
      ["Discarded", stats.discarded],
      ["HAI Rate", `${stats.haiRate}%`],
      ["Avg Hospital Day", stats.avgHospitalDay],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1["!cols"] = [{ wch: 45 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws1, "📊 Summary");

    const wardRows = [
      ["หอผู้ป่วย", "ทั้งหมด", "HAI", "POA", "Pending", "HAI Rate"],
    ];
    wardData.forEach((w) =>
      wardRows.push([
        w.name,
        w.Total,
        w.HAI,
        w.POA,
        w.Pending,
        `${w.haiRate}%`,
      ]),
    );
    const ws2 = XLSX.utils.aoa_to_sheet(wardRows);
    ws2["!cols"] = [
      { wch: 30 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "🏥 Wards");

    const catRows = [["หมวดหมู่", "ทั้งหมด", "HAI", "POA"]];
    categoryData.forEach((c) => catRows.push([c.name, c.count, c.HAI, c.POA]));
    const ws3 = XLSX.utils.aoa_to_sheet(catRows);
    ws3["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, "🦠 Categories");

    const trendRows = [["วันที่", "HAI", "POA", "Pending", "Total"]];
    trendData.forEach((t) =>
      trendRows.push([t.date, t.HAI, t.POA, t.Pending, t.Total]),
    );
    const ws4 = XLSX.utils.aoa_to_sheet(trendRows);
    ws4["!cols"] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws4, "📈 Trends");

    const monthlyRows = [["เดือน", "HAI", "POA", "รวม"]];
    monthlyData.forEach((m) =>
      monthlyRows.push([m.month, m.HAI, m.POA, m.Total]),
    );
    const ws5 = XLSX.utils.aoa_to_sheet(monthlyRows);
    ws5["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws5, "📅 Monthly");

    XLSX.writeFile(
      wb,
      `VanguardIC_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // ==========================================
  // 🖨️ Print Report
  // ==========================================
  const handlePrintReport = () => {
    const dateRange = `${dashDates.start || "ทั้งหมด"} - ${dashDates.end || "ทั้งหมด"}`;

    const wardRows = wardData
      .map(
        (w, i) => `
      <tr class="${i % 2 === 0 ? "bg-gray-50" : ""}">
        <td>${w.name}</td><td class="text-center">${w.Total}</td><td class="text-center text-red">${w.HAI}</td>
        <td class="text-center text-orange">${w.POA}</td><td class="text-center">${w.Pending}</td><td class="text-center text-bold">${w.haiRate}%</td>
      </tr>`,
      )
      .join("");

    const catRows = categoryData
      .map(
        (c, i) => `
      <tr class="${i % 2 === 0 ? "bg-gray-50" : ""}">
        <td><span style="display:inline-block;width:12px;height:12px;background:${c.color};border-radius:3px;margin-right:8px;vertical-align:middle"></span>${c.name}</td>
        <td class="text-center">${c.count}</td><td class="text-center text-red">${c.HAI}</td><td class="text-center text-orange">${c.POA}</td>
      </tr>`,
      )
      .join("");

    const trendRows = trendData
      .map(
        (t, i) => `
      <tr class="${i % 2 === 0 ? "bg-gray-50" : ""}">
        <td>${t.date}</td><td class="text-center text-red">${t.HAI}</td><td class="text-center text-orange">${t.POA}</td>
        <td class="text-center">${t.Pending}</td><td class="text-center text-bold">${t.Total}</td>
      </tr>`,
      )
      .join("");

    const monthlyRows = monthlyData
      .map(
        (m, i) => `
      <tr class="${i % 2 === 0 ? "bg-gray-50" : ""}">
        <td>${m.month}</td><td class="text-center text-red">${m.HAI}</td><td class="text-center text-orange">${m.POA}</td><td class="text-center text-bold">${m.Total}</td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>Vanguard IC — รายงานเฝ้าระวังการติดเชื้อ</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #1e293b; padding: 1.5cm; line-height: 1.6; background: white; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px double #1e293b; padding-bottom: 20px; }
    .header h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .header .subtitle { font-size: 14px; color: #475569; font-weight: 600; }
    .header .meta { font-size: 11px; color: #64748b; margin-top: 8px; }
    .section { margin-bottom: 24px; page-break-inside: avoid; }
    .section-title { font-size: 15px; font-weight: 700; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 12px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #1e293b; color: white; padding: 9px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    .text-center { text-align: center; }
    .text-red { color: #e11d48; font-weight: 700; }
    .text-orange { color: #f97316; font-weight: 700; }
    .text-bold { font-weight: 700; }
    .bg-gray-50 { background: #f8fafc; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    .stat-card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; }
    .stat-card .value { font-size: 26px; font-weight: 700; }
    .stat-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .stat-card.red .value { color: #e11d48; }
    .stat-card.orange .value { color: #f97316; }
    .stat-card.blue .value { color: #3b82f6; }
    .stat-card.slate .value { color: #475569; }
    .sign-area { display: flex; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; }
    .sign-box { text-align: center; width: 45%; }
    .sign-box .line { border-bottom: 1px dashed #94a3b8; height: 40px; margin-bottom: 8px; }
    .sign-box .name { font-size: 12px; color: #64748b; }
    .sign-box .role { font-weight: 700; font-size: 13px; color: #1e293b; margin-top: 4px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
    @media print { body { padding: 1cm; } @page { size: A4; margin: 1.5cm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 ${hospitalName}</h1>
    <p class="subtitle">รายงานเฝ้าระวังการติดเชื้อในโรงพยาบาล</p>
    <p class="meta">วันที่ออกรายงาน: ${new Date().toLocaleString("th-TH")} | ช่วงข้อมูล: ${dateRange} | ผู้ส่งออก: ${currentUser?.full_name || "-"}</p>
  </div>

  <div class="section">
    <h2 class="section-title">📊 สรุปภาพรวม</h2>
    <div class="stats-grid">
      <div class="stat-card slate"><div class="value">${stats.total}</div><div class="label">เคสทั้งหมด</div></div>
      <div class="stat-card red"><div class="value">${stats.hai}</div><div class="label">HAI</div></div>
      <div class="stat-card orange"><div class="value">${stats.poa}</div><div class="label">POA</div></div>
      <div class="stat-card blue"><div class="value">${stats.haiRate}%</div><div class="label">HAI Rate</div></div>
    </div>
    <table>
      <tr><td style="font-weight:600;width:200px;">รอประเมิน (Pending)</td><td>${stats.pending}</td></tr>
      <tr><td style="font-weight:600;">ยกเลิก (Discarded)</td><td>${stats.discarded}</td></tr>
      <tr><td style="font-weight:600;">วันนอนเฉลี่ย</td><td>${stats.avgHospitalDay} วัน</td></tr>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">🏥 จำแนกตามหอผู้ป่วย</h2>
    <table><thead><tr><th>หอผู้ป่วย</th><th class="text-center">ทั้งหมด</th><th class="text-center">HAI</th><th class="text-center">POA</th><th class="text-center">Pending</th><th class="text-center">HAI Rate</th></tr></thead><tbody>${wardRows}</tbody></table>
  </div>

  <div class="section">
    <h2 class="section-title">🦠 จำแนกตามหมวดหมู่</h2>
    <table><thead><tr><th>หมวดหมู่</th><th class="text-center">ทั้งหมด</th><th class="text-center">HAI</th><th class="text-center">POA</th></tr></thead><tbody>${catRows}</tbody></table>
  </div>

  <div class="section">
    <h2 class="section-title">📈 แนวโน้มรายวัน (${trendRange} วัน)</h2>
    <table><thead><tr><th>วันที่</th><th class="text-center">HAI</th><th class="text-center">POA</th><th class="text-center">Pending</th><th class="text-center">รวม</th></tr></thead><tbody>${trendRows}</tbody></table>
  </div>

  <div class="section">
    <h2 class="section-title">📅 เปรียบเทียบรายเดือน</h2>
    <table><thead><tr><th>เดือน</th><th class="text-center">HAI</th><th class="text-center">POA</th><th class="text-center">รวม</th></tr></thead><tbody>${monthlyRows}</tbody></table>
  </div>

  <div class="sign-area">
    <div class="sign-box">
      <div class="line"></div>
      <p class="name">.....................................................</p>
      <p class="role">ผู้ตรวจสอบ </p>
    </div>
    <div class="sign-box">
      <div class="line"></div>
      <p class="name">${currentUser?.full_name || "....................................................."}</p>
      <p class="role">ผู้ออกรายงาน</p>
    </div>
  </div>

  <div class="footer">
    <span>${hospitalName}</span>
    <span>Vanguard IC — Epidemiology Surveillance System</span>
    <span>${new Date().toLocaleString("th-TH")}</span>
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
  // 🖥️ Render (เหมือนเดิม — ไม่เปลี่ยนแปลง)
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-2xl text-slate-900">
            📊 Epidemiology Dashboard
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {hasSearched
              ? `🔍 ผลค้นหา: "${caseSearch}" — ${filtered.length} รายการ`
              : `📋 แสดง ${TABLE_LIMIT.toLocaleString()} เคสล่าสุด`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setTrendRange(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${trendRange === d ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
              >
                {d} วัน
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dashDates.start}
              onChange={(e) =>
                setDashDates({ ...dashDates, start: e.target.value })
              }
              className="bg-transparent text-sm font-bold text-slate-700 outline-none"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              value={dashDates.end}
              onChange={(e) =>
                setDashDates({ ...dashDates, end: e.target.value })
              }
              className="bg-transparent text-sm font-bold text-slate-700 outline-none"
            />
            {(dashDates.start || dashDates.end) && (
              <button
                onClick={() => setDashDates({ start: "", end: "" })}
                className="text-slate-400 hover:text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {hasSearched && (
            <button
              onClick={handleClearSearch}
              className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-200"
            >
              ✕ ล้างค้นหา
            </button>
          )}
          <button
            onClick={handlePrintReport}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          label="Total Cases"
          value={stats.total}
          color="bg-slate-100 text-slate-800"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="HAI"
          value={stats.hai}
          color="bg-rose-50 text-rose-600"
        />
        <StatCard
          label="POA"
          value={stats.poa}
          color="bg-orange-50 text-orange-600"
        />
        <StatCard
          label="Discarded"
          value={stats.discarded}
          color="bg-slate-50 text-slate-500"
        />
        <StatCard
          label="HAI Rate"
          value={`${stats.haiRate}%`}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Avg Day"
          value={stats.avgHospitalDay}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
          <h3 className="font-bold text-slate-800 mb-4">
            📈 Infection Trends ({trendRange} Days)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="haiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.HAI} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.HAI} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="poaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.POA} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.POA} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.1}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Legend iconType="circle" />
              <Area
                type="monotone"
                dataKey="HAI"
                stroke={COLORS.HAI}
                strokeWidth={2}
                fill="url(#haiGrad)"
                dot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="POA"
                stroke={COLORS.POA}
                strokeWidth={2}
                fill="url(#poaGrad)"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="Pending"
                stroke={COLORS.Pending}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
          <h3 className="font-bold text-slate-800 mb-4">
            🍩 Status Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none" }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-slate-400 font-medium">
              No data
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Hospital className="w-5 h-5 text-indigo-500" /> Ward Performance
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={wardData.slice(0, 10)} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.1}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Legend iconType="circle" />
              <Bar
                dataKey="HAI"
                fill={COLORS.HAI}
                stackId="a"
                barSize={20}
                name="HAI"
              />
              <Bar
                dataKey="POA"
                fill={COLORS.POA}
                stackId="a"
                barSize={20}
                name="POA"
              />
              <Bar
                dataKey="Pending"
                fill={COLORS.Pending}
                stackId="a"
                barSize={20}
                name="Pending"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Bug className="w-5 h-5 text-indigo-500" /> Infection Categories
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={categoryData}>
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.1}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Legend iconType="circle" />
              <Bar
                dataKey="HAI"
                fill={COLORS.HAI}
                radius={[8, 8, 0, 0]}
                name="HAI"
              />
              <Bar
                dataKey="POA"
                fill={COLORS.POA}
                radius={[8, 8, 0, 0]}
                name="POA"
              />{" "}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
        <h3 className="font-bold text-slate-800 mb-4">📅 Monthly Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.1}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend iconType="circle" />
            <Bar dataKey="HAI" fill={COLORS.HAI} radius={[8, 8, 0, 0]} />
            <Bar dataKey="POA" fill={COLORS.POA} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Case Table */}
      <div className="rounded-3xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <button
          onClick={() => setShowCaseTable(!showCaseTable)}
          className="w-full p-6 flex justify-between items-center hover:bg-slate-50 transition-colors"
        >
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-500" /> Case Details (
            {caseTableData.length.toLocaleString()})
          </h3>
          <div
            className={`transition-transform ${showCaseTable ? "rotate-180" : ""}`}
          >
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </div>
        </button>
        {showCaseTable && (
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="🔍 ค้นหา HN หรือชื่อผู้ป่วย..."
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white"
                />
                {isSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ⏳
                  </span>
                )}
              </div>
              <select
                value={caseStatusFilter}
                onChange={(e) => setCaseStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none bg-slate-50"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">HAI</option>
                <option value="POA">POA</option>
                <option value="Discarded">Discarded</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    {[
                      "วันที่",
                      "HN",
                      "ชื่อผู้ป่วย",
                      "หอผู้ป่วย",
                      "หมวดหมู่",
                      "ผล AI",
                      "สถานะ",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-3 font-bold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCases.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="p-3 text-xs whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-3 font-mono text-xs">{a.hn}</td>
                      <td className="p-3 font-medium text-sm">
                        {a.patient_name}
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">
                        {a.ward_name ||
                          a.detailed_analysis_json?.ward_name ||
                          "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                          style={{
                            backgroundColor:
                              (CATEGORY_COLORS[a.device_type] || "#64748b") +
                              "20",
                            color: CATEGORY_COLORS[a.device_type] || "#64748b",
                          }}
                        >
                          {a.device_type}
                        </span>
                      </td>
                      <td className="p-3 text-xs max-w-[200px] truncate">
                        {a.auto_assess_result}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${a.status === "Confirmed" ? "bg-rose-100 text-rose-700" : a.status === "POA" ? "bg-orange-100 text-orange-700" : a.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {a.status === "Confirmed" ? "HAI" : a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {caseTableData.length === 0 && (
                <p className="text-center text-slate-400 py-12">ไม่พบข้อมูล</p>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, caseTableData.length)}{" "}
                  จาก {caseTableData.length.toLocaleString()} รายการ
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg text-xs font-bold disabled:opacity-30 hover:bg-slate-100"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg text-xs font-bold disabled:opacity-30 hover:bg-slate-100"
                  >
                    «
                  </button>
                  {getPageNumbers().map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`dots-${i}`}
                        className="w-8 h-8 flex items-center justify-center text-xs text-slate-300"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === currentPage ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-100 text-slate-600"}`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg text-xs font-bold disabled:opacity-30 hover:bg-slate-100"
                  >
                    »
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg text-xs font-bold disabled:opacity-30 hover:bg-slate-100"
                  >
                    »»
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 🧩 Stat Card
// ==========================================
function StatCard({ label, value, color }) {
  return (
    <div
      className={`p-4 rounded-2xl border border-slate-200 shadow-sm ${color.split(" ")[0]}`}
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-2xl font-extrabold ${color.split(" ")[1]}`}>
        {value}
      </p>
    </div>
  );
}
