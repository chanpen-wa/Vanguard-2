import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import {
  ShieldCheck,
  BarChart3,
  Settings,
  Users,
  Search,
  Filter,
  Eye,
  RotateCcw,
  CalendarDays,
  Download,
  Save,
  UploadCloud,
  FileJson,
  CheckCircle,
  CheckCircle2,
  X,
  Activity,
  Calculator,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  FileDown,
  FileUp,
  Bell,
  BellRing,
  AlertTriangle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Info,
  BrainCircuit,
  User,
  Printer,
  Database,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import * as XLSX from "xlsx";
import FormEngine from "./FormEngine";
import { supabase } from "../utils/supabaseClient";
import { getTriageColor } from "../utils/triageLogic";
import SchemaDesigner from "./SchemaDesigner";
import { useNotifications } from "../hooks/useNotifications";

export default function ICCommandCenter({
  currentUser,
  wards,
  systemUsers,
  cdcConfig,
  assessments,
  fetchGlobalData,
  fetchAssessments,
  setCdcConfig,
  showToast,
  systemCategories,
  viewedCases,
  markCaseAsViewed,
  isCaseNew,
}) {
  const [icTab, setIcTab] = useState(() => {
    return localStorage.getItem("ic_tab") || "cases";
  });

  const handleTabChange = (tab) => {
    setIcTab(tab);
    localStorage.setItem("ic_tab", tab);
  };

  // 🔔 Notification System
  const {
    notifications,
    unreadCount,
    showPanel: showNotifPanel,
    setShowPanel: setShowNotifPanel,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications(currentUser);

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    ward: "all",
    category: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedPrintIds, setSelectedPrintIds] = useState([]);
  const [dashDates, setDashDates] = useState({ start: "", end: "" });

  const [previewSchema, setPreviewSchema] = useState(cdcConfig["BSI"]);
  const [previewFormData, setPreviewFormData] = useState({});
  const [jsonText, setJsonText] = useState(
    JSON.stringify(cdcConfig["BSI"], null, 2),
  );

  const fileInputRef = useRef(null);
  const schemaFileRef = useRef(null);
  const dbFileRef = useRef(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const [newWardName, setNewWardName] = useState("");
  const [editingWard, setEditingWard] = useState(null);
  const [editingUsername, setEditingUsername] = useState({});
  const [editingField, setEditingField] = useState({});

  // State สำหรับเก็บ IC Note แยกตาม case ID
  const [caseNotes, setCaseNotes] = useState({});

  // ตรวจสอบ username ซ้ำ
  const checkUsernameDuplicate = async (username, excludeUserId) => {
    if (!username || username.trim() === "") return false;
    const { data } = await supabase
      .from("system_users")
      .select("id")
      .eq("username", username.trim())
      .neq("id", excludeUserId)
      .maybeSingle();
    return !!data;
  };

  // ฟังก์ชันบันทึก Username/Password
  const handleSaveUserField = async (id, field) => {
    const newValue = editingUsername[id];
    if (!newValue || newValue.trim() === "") {
      showToast(
        "error",
        `❌ ${field === "username" ? "Username" : "Password"} ห้ามว่าง`,
      );
      return;
    }

    const fieldName = field === "username" ? "Username" : "Password";
    const user = systemUsers.find((u) => u.id === id);

    const confirmed = window.confirm(
      `⚠️ ยืนยันการเปลี่ยน${fieldName}?\n\n` +
        `ผู้ใช้: ${user?.full_name || "Unknown"}\n` +
        `${fieldName} ใหม่: ${newValue}\n\n` +
        `การกระทำนี้ไม่สามารถย้อนกลับได้`,
    );

    if (!confirmed) return;

    if (field === "username") {
      const isDuplicate = await checkUsernameDuplicate(newValue, id);
      if (isDuplicate) {
        showToast("error", `❌ Username "${newValue}" มีคนใช้แล้ว`);
        return;
      }
    }

    if (field === "password") {
      const { error } = await supabase.rpc("update_user_password", {
        p_user_id: id,
        p_new_password: newValue,
      });
      if (error) {
        await supabase
          .from("system_users")
          .update({ password: newValue })
          .eq("id", id);
      } else {
        await supabase
          .from("system_users")
          .update({ password: newValue })
          .eq("id", id);
      }
    } else {
      await supabase
        .from("system_users")
        .update({ [field]: newValue })
        .eq("id", id);
    }

    setEditingField((prev) => ({ ...prev, [id]: null }));
    setEditingUsername((prev) => ({ ...prev, [id]: undefined }));
    fetchGlobalData();
    showToast("success", `🔐 เปลี่ยน${fieldName}สำเร็จ`);
  };

  const handleUpdateStatus = async (assessment, newStatus, note) => {
    const { error } = await supabase
      .from("assessments")
      .update({
        status: newStatus,
        ic_notes: note,
      })
      .match({ id: assessment.id });

    if (error) {
      console.error("Update error:", error);
      showToast("error", `อัปเดตไม่สำเร็จ: ${error.message}`);
      return;
    }

    await supabase.from("audit_logs").insert([
      {
        assessment_id: assessment.id,
        action_type: "UPDATE_STATUS",
        old_value: assessment.status,
        new_value: newStatus,
        changed_by: currentUser.id,
        details: note || "IC Head Review",
      },
    ]);

    setCaseNotes((prev) => {
      const updated = { ...prev };
      delete updated[assessment.id];
      return updated;
    });

    showToast("success", `อัปเดตสถานะเป็น ${newStatus}`);
    fetchAssessments();
    setShowAuditModal(false);
  };

  const handleOpenAuditModal = async (assessment) => {
    setSelectedAssessment(assessment);
    setShowAuditModal(true);

    markCaseAsViewed(assessment.id);

    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("assessment_id", assessment.id)
      .order("created_at", { ascending: true });
    const logsWithUser = (data || []).map((log) => {
      const user = systemUsers.find((u) => u.id === log.changed_by);
      return { ...log, user_full_name: user ? user.full_name : "System" };
    });
    setAuditLogs(logsWithUser);
  };

  const handlePublishSchema = async () => {
    try {
      const finalSchema = JSON.parse(jsonText);
      if (!finalSchema.system_id) throw new Error("Missing system_id");

      const existingCount = Object.keys(cdcConfig).length;
      const sortOrder =
        cdcConfig[finalSchema.system_id]?.sort_order ?? existingCount;

      const { error } = await supabase.from("cdc_configs").upsert({
        system_id: finalSchema.system_id,
        name: finalSchema.name,
        rules: finalSchema.rules,
        sections: finalSchema.sections,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        showToast("success", `Publish หมวด ${finalSchema.system_id} สำเร็จ!`);
        fetchGlobalData(true);
      } else throw new Error();
    } catch (err) {
      showToast("error", "ระบบล้มเหลว หรือ JSON ผิดรูปแบบ");
    }
  };

  const handleMoveCategory = async (direction) => {
    const currentSystemId = previewSchema?.system_id;
    if (!currentSystemId) {
      showToast("error", "กรุณาเลือกหมวดก่อน");
      return;
    }

    const currentIndex = systemCategories.findIndex(
      (c) => c.id === currentSystemId,
    );
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= systemCategories.length) {
      showToast(
        "info",
        direction === "up" ? "อยู่ตำแหน่งบนสุดแล้ว" : "อยู่ตำแหน่งล่างสุดแล้ว",
      );
      return;
    }

    const currentSortOrder =
      systemCategories[currentIndex].sort_order || currentIndex;
    const targetSortOrder = systemCategories[newIndex].sort_order || newIndex;

    await supabase
      .from("cdc_configs")
      .update({
        sort_order: targetSortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("system_id", currentSystemId);

    await supabase
      .from("cdc_configs")
      .update({
        sort_order: currentSortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("system_id", systemCategories[newIndex].id);

    showToast(
      "success",
      `ย้าย ${currentSystemId} ${direction === "up" ? "ขึ้น" : "ลง"} สำเร็จ`,
    );
    fetchGlobalData(true);
  };

  const handleDeleteCategory = async () => {
    const selectedSystem = previewSchema?.system_id;
    if (!selectedSystem) {
      showToast("error", "กรุณาเลือกหมวดที่ต้องการลบก่อน");
      return;
    }
    if (
      !window.confirm(
        `⚠️ ลบหมวด "${previewSchema?.name || selectedSystem}" ถาวร?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้!\n\nหมายเหตุ: Schema จะถูกลบจาก Supabase แต่ DEFAULT_CDC_DB ยังคงอยู่`,
      )
    )
      return;

    const { error } = await supabase
      .from("cdc_configs")
      .delete()
      .eq("system_id", selectedSystem);
    if (!error) {
      showToast("success", `ลบหมวด ${selectedSystem} สำเร็จ`);
      fetchGlobalData(true);
      setPreviewSchema(null);
      setJsonText("");
    } else {
      showToast("error", `ลบไม่สำเร็จ: ${error.message}`);
    }
  };

  const handleJsonChange = (text) => {
    setJsonText(text);
    try {
      setPreviewSchema(JSON.parse(text));
    } catch (e) {}
  };

  const handleExportAllSchemas = () => {
    try {
      const exportData = {
        export_version: "1.0",
        exported_at: new Date().toISOString(),
        exported_by: currentUser.full_name,
        total_schemas: Object.keys(cdcConfig).length,
        schemas: cdcConfig,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VanguardIC_Schema_Backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(
        "success",
        `Export สำเร็จ! ${Object.keys(cdcConfig).length} หมวดหมู่ถูกบันทึกเป็นไฟล์`,
      );
    } catch (err) {
      showToast("error", "เกิดข้อผิดพลาดในการ Export");
    }
  };

  const handleImportAllSchemas = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      if (!importedData.schemas || typeof importedData.schemas !== "object") {
        throw new Error(
          "รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบข้อมูล schemas ในไฟล์ JSON",
        );
      }

      const schemaCount = Object.keys(importedData.schemas).length;

      if (schemaCount === 0) {
        throw new Error("ไม่พบ Schema ใดๆ ในไฟล์");
      }

      const confirmed = window.confirm(
        `📥 ยืนยันการนำเข้า Schema\n\n` +
          `🔢 จำนวนหมวดหมู่ที่พบ: ${schemaCount} หมวดหมู่\n` +
          `📅 วันที่ Export: ${importedData.exported_at ? new Date(importedData.exported_at).toLocaleString("th-TH") : "ไม่ระบุ"}\n` +
          `👤 ผู้ Export: ${importedData.exported_by || "ไม่ระบุ"}\n` +
          `📦 Version: ${importedData.export_version || "ไม่ระบุ"}\n\n` +
          `⚠️ คำเตือน: การกระทำนี้จะเขียนทับ Schema ปัจจุบันในฐานข้อมูล\n\n` +
          `กด OK เพื่อยืนยันการนำเข้า`,
      );

      if (!confirmed) {
        e.target.value = "";
        return;
      }

      showToast("info", `กำลังนำเข้า ${schemaCount} หมวดหมู่...`);

      let successCount = 0;
      let failCount = 0;

      let index = 0;
      for (const [systemId, schema] of Object.entries(importedData.schemas)) {
        try {
          const { error } = await supabase.from("cdc_configs").upsert({
            system_id: systemId,
            name: schema.name || systemId,
            rules: schema.rules || {},
            sections: schema.sections || [],
            sort_order: schema.sort_order || index,
            updated_at: new Date().toISOString(),
          });

          if (error) {
            console.error(`Failed to import ${systemId}:`, error);
            failCount++;
          } else {
            successCount++;
          }
          index++;
        } catch (err) {
          console.error(`Error importing ${systemId}:`, err);
          failCount++;
        }
      }

      await fetchGlobalData(true);

      if (importedData.schemas["BSI"]) {
        setPreviewSchema(importedData.schemas["BSI"]);
        setJsonText(JSON.stringify(importedData.schemas["BSI"], null, 2));
      }

      if (failCount === 0) {
        showToast("success", `✅ นำเข้าสำเร็จทั้งหมด ${successCount} หมวดหมู่`);
      } else {
        showToast(
          "error",
          `⚠️ นำเข้าสำเร็จ ${successCount} หมวด, ล้มเหลว ${failCount} หมวด`,
        );
      }
    } catch (err) {
      console.error("Import Error:", err);
      showToast("error", `❌ เกิดข้อผิดพลาด: ${err.message}`);
    }

    e.target.value = "";
  };

  const handleAddWard = async () => {
    if (!newWardName) return;

    const { data: wData } = await supabase
      .from("wards")
      .insert({ name: newWardName })
      .select()
      .single();

    if (wData) {
      const { error } = await supabase.rpc("create_user_with_hash", {
        p_username: `nurse${wData.id}`,
        p_password: "123",
        p_full_name: `Nurse ${wData.name}`,
        p_role: "NURSE",
        p_ward_id: wData.id,
      });

      if (error) {
        await supabase.from("system_users").insert({
          username: `nurse${wData.id}`,
          password: "123",
          role: "NURSE",
          ward_id: wData.id,
          full_name: `Nurse ${wData.name}`,
        });
      }

      setNewWardName("");
      showToast("success", `✅ บันทึกหอผู้ป่วย ${wData.name} สำเร็จ`);
      fetchGlobalData();
    }
  };

  const handleEditWard = async (id, newName) => {
    await supabase.from("wards").update({ name: newName }).eq("id", id);
    setEditingWard(null);
    showToast("success", "เปลี่ยนชื่อหอผู้ป่วยเสร็จสิ้น");
    fetchGlobalData();
  };

  const handleDeleteWard = async (id) => {
    if (
      !window.confirm(
        "⚠️ ยืนยันการลบหอผู้ป่วย?\n\n" +
          "การกระทำนี้จะ:\n" +
          "1. ลบบัญชีผู้ใช้ทั้งหมดในหอผู้ป่วยนี้\n" +
          "2. ลบข้อมูลหอผู้ป่วยถาวร\n\n" +
          "การกระทำนี้ไม่สามารถย้อนกลับได้!",
      )
    )
      return;

    try {
      const { error: userError } = await supabase
        .from("system_users")
        .delete()
        .eq("ward_id", id);

      if (userError) {
        await supabase
          .from("system_users")
          .update({ ward_id: null })
          .eq("ward_id", id);
      }

      const { error: wardError } = await supabase
        .from("wards")
        .delete()
        .eq("id", id);

      if (wardError) throw wardError;

      showToast("success", "✅ ลบหอผู้ป่วยสำเร็จ");
      fetchGlobalData();
    } catch (error) {
      console.error("Delete ward error:", error);
      showToast("error", "❌ ลบไม่สำเร็จ: " + error.message);
    }
  };

  const handleUpdateUser = async (id, field, value) => {
    if (field === "password") {
      const { error } = await supabase.rpc("update_user_password", {
        p_user_id: id,
        p_new_password: value,
      });

      if (error) {
        await supabase
          .from("system_users")
          .update({ password: value })
          .eq("id", id);
      } else {
        await supabase
          .from("system_users")
          .update({ password: value })
          .eq("id", id);
      }
    } else {
      await supabase
        .from("system_users")
        .update({ [field]: value })
        .eq("id", id);
    }

    fetchGlobalData();
    showToast(
      "success",
      field === "password" ? "🔐 เปลี่ยนรหัสผ่านสำเร็จ" : "อัปเดตข้อมูลสำเร็จ",
    );
  };

  const filteredAssessments = assessments.filter((item) => {
    const matchSearch =
      item.hn.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.patient_name.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus =
      filters.status === "all" || item.status === filters.status;
    const matchWard =
      filters.ward === "all" || item.ward_id?.toString() === filters.ward;
    const matchCat =
      filters.category === "all" || item.device_type === filters.category;
    return matchSearch && matchStatus && matchWard && matchCat;
  });

  const dashboardAssessments =
    dashDates.start && dashDates.end
      ? assessments.filter((item) => {
          const d = new Date(item.created_at).getTime();
          return (
            d >= new Date(dashDates.start).getTime() &&
            d <= new Date(dashDates.end).setHours(23, 59, 59)
          );
        })
      : assessments;

  // UPGRADED: Formal Excel Export (HA-Compliant format)
  const handleExportExcel = () => {
    const header = [
      [
        "รายงานสรุปการเฝ้าระวังการติดเชื้อในโรงพยาบาล (Hospital Infection Control Report)",
      ],
      [
        `พิมพ์เมื่อ: ${new Date().toLocaleString("th-TH")}`,
        `ผู้ส่งออก: ${currentUser.full_name}`,
      ],
      [],
      [
        "รหัสเคส",
        "วันที่ประเมิน",
        "HN",
        "ชื่อ-สกุลผู้ป่วย",
        "หอผู้ป่วย",
        "หมวดหมู่ (Category)",
        "ผลประเมิน AI (Triage)",
        "สถานะสุดท้าย",
        "ข้อเสนอแนะจาก IC",
      ],
    ];

    const dataRows = dashboardAssessments.map((item) => [
      item.id,
      new Date(item.created_at).toLocaleString("th-TH"),
      item.hn,
      item.patient_name,
      item.ward_name || "-",
      item.device_type,
      item.auto_assess_result,
      item.status,
      item.ic_notes || "-",
    ]);

    const worksheetData = [...header, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 40 },
      { wch: 15 },
      { wch: 40 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IC_Report");
    XLSX.writeFile(
      wb,
      `VanguardIC_OfficialReport_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // ระบบ Full Database Backup
  const handleExportDatabase = async () => {
    try {
      showToast("info", "กำลังเตรียมข้อมูลสำรองระบบ (Backup)...");
      const { data: assessmentsData } = await supabase
        .from("assessments")
        .select("*");
      const { data: wardsData } = await supabase.from("wards").select("*");

      const backupObj = {
        app_version: "Vanguard_IC_1.0",
        exported_at: new Date().toISOString(),
        exported_by: currentUser.full_name,
        data: {
          assessments: assessmentsData || [],
          wards: wardsData || [],
        },
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VanguardIC_FullBackup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(
        "success",
        "ดาวน์โหลดไฟล์ Backup สำเร็จ! (เก็บไฟล์นี้ไว้ให้ดี)",
      );
    } catch (err) {
      showToast("error", "เกิดข้อผิดพลาดในการดึงข้อมูล Backup");
    }
  };

  // ระบบ Full Database Restore (นำเข้าข้อมูล)
  const handleImportDatabase = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      if (
        importedData.app_version !== "Vanguard_IC_1.0" ||
        !importedData.data
      ) {
        throw new Error("รูปแบบไฟล์ Backup ไม่ถูกต้อง หรือเป็นคนละเวอร์ชัน");
      }

      const confirmed = window.confirm(
        `⚠️ คำเตือนระดับสูงสุด: การฟื้นฟูฐานข้อมูล (Restore)\n\n` +
          `📅 วันที่ Backup: ${new Date(importedData.exported_at).toLocaleString("th-TH")}\n` +
          `🏥 จำนวนหอผู้ป่วย (Wards): ${importedData.data.wards?.length || 0} รายการ\n` +
          `📄 จำนวนเคส (Assessments): ${importedData.data.assessments?.length || 0} รายการ\n\n` +
          `ข้อมูลปัจจุบันในระบบที่มี ID ตรงกันจะถูก "เขียนทับ" ด้วยข้อมูลจากไฟล์นี้\nคุณแน่ใจหรือไม่ที่จะดำเนินการต่อ?`,
      );

      if (!confirmed) {
        e.target.value = "";
        return;
      }

      showToast(
        "info",
        "กำลังฟื้นฟูฐานข้อมูล กรุณารอสักครู่ (อย่าเพิ่งปิดหน้าต่าง)...",
      );

      if (importedData.data.wards && importedData.data.wards.length > 0) {
        const { error: wardError } = await supabase
          .from("wards")
          .upsert(importedData.data.wards);
        if (wardError)
          throw new Error(`Wards Restore Failed: ${wardError.message}`);
      }

      if (
        importedData.data.assessments &&
        importedData.data.assessments.length > 0
      ) {
        const { error: assessError } = await supabase
          .from("assessments")
          .upsert(importedData.data.assessments);
        if (assessError)
          throw new Error(`Assessments Restore Failed: ${assessError.message}`);
      }

      await fetchGlobalData(true);
      fetchAssessments();
      showToast("success", "✅ ฟื้นฟูฐานข้อมูล (Restore) สำเร็จเรียบร้อย");
    } catch (err) {
      console.error("Restore Error:", err);
      showToast("error", `❌ นำเข้าไม่สำเร็จ: ${err.message}`);
    }

    e.target.value = "";
  };

  const dashboardStats = {
    total: dashboardAssessments.length,
    pending: dashboardAssessments.filter((a) => a.status === "Pending").length,
    hai: dashboardAssessments.filter((a) => a.status === "Confirmed").length,
    poa: dashboardAssessments.filter((a) => a.status === "POA").length,
    pieData: [
      {
        name: "Pending",
        value: dashboardAssessments.filter((a) => a.status === "Pending")
          .length,
        color: "#f59e0b",
      },
      {
        name: "HAI",
        value: dashboardAssessments.filter((a) => a.status === "Confirmed")
          .length,
        color: "#e11d48",
      },
      {
        name: "POA",
        value: dashboardAssessments.filter((a) => a.status === "POA").length,
        color: "#f97316",
      },
      {
        name: "Discarded",
        value: dashboardAssessments.filter((a) => a.status === "Discarded")
          .length,
        color: "#94a3b8",
      },
    ].filter((d) => d.value > 0),
    barData: Object.keys(cdcConfig)
      .map((sys) => ({
        name: sys,
        count: dashboardAssessments.filter((a) => a.device_type === sys).length,
      }))
      .filter((d) => d.count > 0),
    trendData: (() => {
      const dates = {};
      dashboardAssessments.forEach((a) => {
        const date = new Date(a.created_at).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
        });
        if (!dates[date]) dates[date] = { date, HAI: 0, POA: 0, Total: 0 };
        dates[date].Total += 1;
        if (a.status === "Confirmed") dates[date].HAI += 1;
        if (a.status === "POA") dates[date].POA += 1;
      });
      return Object.values(dates).reverse();
    })(),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Command Center
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            ศูนย์บัญชาการและบริหารจัดการระบาดวิทยา
          </p>
        </div>

        {/* 🔔 Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="relative p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            title="การแจ้งเตือน"
          >
            {unreadCount > 0 ? (
              <BellRing className="w-5 h-5 text-indigo-600" />
            ) : (
              <Bell className="w-5 h-5 text-slate-500" />
            )}

            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-50">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showNotifPanel && (
            <div className="absolute right-0 top-12 w-96 max-h-[600px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-indigo-500" />
                  การแจ้งเตือน
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold text-rose-500">
                      ({unreadCount})
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      อ่านทั้งหมด
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-xs font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    ล้าง
                  </button>
                  <button
                    onClick={() => setShowNotifPanel(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium">
                      ไม่มีการแจ้งเตือน
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.caseId) {
                            setShowNotifPanel(false);
                          }
                        }}
                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !notification.read
                            ? "bg-indigo-50/50 border-l-2 border-indigo-400"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              notification.type === "OUTBREAK"
                                ? "bg-rose-100 text-rose-600"
                                : notification.type === "DEVICE_ALERT"
                                  ? "bg-amber-100 text-amber-600"
                                  : notification.type === "STATUS_UPDATE"
                                    ? "bg-purple-100 text-purple-600"
                                    : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {notification.type === "OUTBREAK" ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : notification.type === "DEVICE_ALERT" ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : notification.type === "STATUS_UPDATE" ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <BellRing className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-tight">
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-600 mt-1 font-medium">
                              {notification.message}
                            </p>
                            {notification.detail && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {notification.detail}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1.5">
                              {formatTimeAgo(notification.timestamp)}
                            </p>
                          </div>

                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-1.5 rounded-2xl inline-flex mb-4 bg-white border border-slate-200 shadow-sm overflow-x-auto max-w-full">
        <button
          onClick={() => handleTabChange("cases")}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${icTab === "cases" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <ShieldCheck className="w-4 h-4" /> Case Management
        </button>
        <button
          onClick={() => handleTabChange("dashboard")}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${icTab === "dashboard" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <BarChart3 className="w-4 h-4" /> Dashboard & Reports
        </button>
        <button
          onClick={() => handleTabChange("users")}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${icTab === "users" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <Users className="w-4 h-4" /> Wards & Users
        </button>
        <button
          onClick={() => handleTabChange("settings")}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${icTab === "settings" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <Settings className="w-4 h-4" /> JSON Builder
        </button>
      </div>

      {icTab === "cases" &&
        (() => {
          const totalPages = Math.max(
            1,
            Math.ceil(filteredAssessments.length / itemsPerPage),
          );
          const paginatedData = filteredAssessments.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage,
          );

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
                <select
                  value={filters.ward}
                  onChange={(e) => {
                    setFilters({ ...filters, ward: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-sm font-bold text-slate-600 outline-none transition-colors"
                >
                  <option value="all">ทุกหอผู้ป่วย (All Wards)</option>
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
                  <option value="all">ทุกสถานะ (All Status)</option>
                  <option value="Pending">รอประเมิน (Pending)</option>
                  <option value="Confirmed">ยืนยัน HAI</option>
                  <option value="POA">ติดเชื้อจากชุมชน (POA)</option>
                  <option value="Discarded">ปฏิเสธเคส (Discarded)</option>
                </select>
              </div>

              {/* Bulk Print Action Bar */}
              {selectedPrintIds.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-2">
                  <span className="text-sm font-bold text-indigo-700 pl-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    เลือกอยู่ {selectedPrintIds.length} เคส
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPrintIds([])}
                      className="px-4 py-2 text-xs font-bold text-indigo-500 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> ยกเลิกทั้งหมด
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Printer className="w-4 h-4" /> พิมพ์แบบฟอร์ม (
                      {selectedPrintIds.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Paginated Cards with Checkbox */}
              <div className="grid gap-4">
                {paginatedData.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                    <p className="text-slate-400 font-semibold">
                      ไม่พบเคสที่ตรงกับเงื่อนไขการค้นหา
                    </p>
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
                        {/* Checkbox สำหรับเลือกพิมพ์ */}
                        <div className="flex items-center px-4 bg-slate-50/50 border-r border-slate-100">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedPrintIds((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id],
                              );
                            }}
                          />
                        </div>

                        <div className={`w-2 shrink-0 ${statusColor}`}></div>

                        {caseIsNew && (
                          <div
                            className={`absolute top-0 left-2 right-0 h-0.5 ${caseIsPending ? "bg-gradient-to-r from-indigo-400 via-indigo-500 to-transparent" : "bg-gradient-to-r from-amber-400 via-amber-500 to-transparent"}`}
                          />
                        )}

                        <div className="p-5 md:p-6 flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
                          <div className="w-full lg:w-1/4">
                            <div className="flex items-center gap-2 mb-2">
                              {caseIsNew && (
                                <div className="relative group/badge">
                                  <div
                                    className={`w-2 h-2 rounded-full ${caseIsPending ? "bg-indigo-500 animate-pulse ring-2 ring-indigo-100" : "bg-amber-500 ring-2 ring-amber-100"}`}
                                  />
                                </div>
                              )}
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white ${statusColor}`}
                              >
                                {item.status === "Confirmed"
                                  ? "HAI"
                                  : item.status}
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
                              AI Triage Analysis
                            </p>
                            <p
                              className={`font-bold text-sm leading-snug line-clamp-2 ${getTriageColor(item.auto_assess_result)}`}
                            >
                              {item.auto_assess_result}
                            </p>
                            <button
                              onClick={() => handleOpenAuditModal(item)}
                              className="mt-3 text-xs font-bold border border-slate-200 text-slate-600 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-2 shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />{" "}
                              ดูข้อมูลคลินิกอย่างละเอียด
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
                                    className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white rounded-xl text-[11px] font-bold py-2 shadow-sm transition-colors"
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
                                    className="flex-1 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white rounded-xl text-[11px] font-bold py-2 shadow-sm transition-colors"
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
                                  className="w-full border border-slate-200 rounded-xl text-[11px] font-bold bg-white text-slate-500 hover:bg-slate-50 py-1.5 transition-colors"
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
                                  className="mt-3 px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
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

              {/* Pagination Footer */}
              {filteredAssessments.length > 0 && (
                <div className="p-2 flex items-center justify-between bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-slate-500 pl-4">
                    แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredAssessments.length,
                    )}{" "}
                    จาก {filteredAssessments.length} เคส
                  </span>

                  <div className="flex items-center gap-1 pr-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-4 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-indigo-700 border border-slate-100">
                      หน้า {currentPage} / {totalPages}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {icTab === "dashboard" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-extrabold text-xl text-slate-900">
                Analytics Dashboard
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Hospital Epidemiology Statistics
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
                <span className="text-slate-300 px-1">-</span>
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
                    className="ml-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Export Excel
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Cases
              </p>
              <p className="text-4xl font-extrabold text-slate-800 mt-2">
                {dashboardStats.total}
              </p>
            </div>
            <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                Pending
              </p>
              <p className="text-4xl font-extrabold text-amber-500 mt-2">
                {dashboardStats.pending}
              </p>
            </div>
            <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
              <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                HAI Confirmed
              </p>
              <p className="text-4xl font-extrabold text-rose-600 mt-2">
                {dashboardStats.hai}
              </p>
            </div>
            <div className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                POA Confirmed
              </p>
              <p className="text-4xl font-extrabold text-orange-500 mt-2">
                {dashboardStats.poa}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 p-8 rounded-3xl border border-slate-200 shadow-sm bg-white">
              <h3 className="font-bold text-slate-800 mb-6">
                Infection Trends
              </h3>
              <div style={{ width: "100%", height: 300, minWidth: 0 }}>
                {dashboardStats.trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboardStats.trendData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.1}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend iconType="circle" />
                      <Line
                        type="monotone"
                        dataKey="HAI"
                        stroke="#e11d48"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="POA"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                    No trend data available
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-slate-200 shadow-sm bg-white">
              <h3 className="font-bold text-slate-800 mb-6">
                Status Distribution
              </h3>
              <div style={{ width: "100%", height: 300, minWidth: 0 }}>
                {dashboardStats.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboardStats.pieData}
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {dashboardStats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                    No status data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {icTab === "users" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl border border-slate-200 shadow-sm bg-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2.5 text-slate-900">
              <Settings className="w-5 h-5 text-teal-500" /> จัดการหอผู้ป่วย
              (Wards)
            </h3>
            <div className="flex gap-2.5 mb-6">
              <input
                type="text"
                placeholder="ชื่อวอร์ดใหม่ (เช่น Ward 4/1)..."
                value={newWardName}
                onChange={(e) => setNewWardName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-slate-400 transition-colors"
              />
              <button
                onClick={handleAddWard}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-3">
              {wards.map((w) => (
                <li
                  key={w.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-2"
                >
                  {editingWard === w.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={w.name}
                        id={`edit-ward-${w.id}`}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                      />
                      <button
                        onClick={() =>
                          handleEditWard(
                            w.id,
                            document.getElementById(`edit-ward-${w.id}`).value,
                          )
                        }
                        className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingWard(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{w.name}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEditingWard(w.id)}
                          className="p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWard(w.id)}
                          className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 rounded-3xl border border-slate-200 shadow-sm bg-white">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2.5 text-slate-900">
              <Users className="w-5 h-5 text-indigo-500" /> บัญชีผู้ใช้งานระบบ
            </h3>
            <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
              * ระบบจะสร้าง Username ให้อัตโนมัติเมื่อเพิ่มวอร์ด
              (สามารถเปลี่ยนได้ด้านล่าง)
              <br />
              🔐 รหัสผ่านถูกเข้ารหัสแบบ Bcrypt อัตโนมัติ
            </p>
            <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {systemUsers.map((u) => (
                <li
                  key={u.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800">
                      {u.full_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md tracking-wider ${u.role === "IC_HEAD" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-700"}`}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-500 flex-wrap">
                    {/* Username */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">User:</span>
                      {editingField[u.id] === "username" ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingUsername[u.id] ?? u.username}
                            onChange={(e) =>
                              setEditingUsername((prev) => ({
                                ...prev,
                                [u.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveUserField(u.id, "username");
                            }}
                            className="w-28 px-2 py-1 bg-white border border-indigo-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 font-mono text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleSaveUserField(u.id, "username")
                            }
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="บันทึก"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingField((prev) => ({
                                ...prev,
                                [u.id]: null,
                              }));
                              setEditingUsername((prev) => ({
                                ...prev,
                                [u.id]: undefined,
                              }));
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-mono bg-white border px-2 py-1 rounded-md shadow-sm text-slate-800">
                            {u.username}
                          </span>
                          <button
                            onClick={() =>
                              setEditingField((prev) => ({
                                ...prev,
                                [u.id]: "username",
                              }))
                            }
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="แก้ไข Username"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Password */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Pass:</span>
                      {editingField[u.id] === "password" ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingUsername[u.id] ?? ""}
                            onChange={(e) =>
                              setEditingUsername((prev) => ({
                                ...prev,
                                [u.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveUserField(u.id, "password");
                            }}
                            className="w-24 px-2 py-1 bg-white border border-indigo-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 text-sm"
                            autoFocus
                            placeholder="รหัสใหม่"
                          />
                          <button
                            onClick={() =>
                              handleSaveUserField(u.id, "password")
                            }
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="บันทึก"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingField((prev) => ({
                                ...prev,
                                [u.id]: null,
                              }));
                              setEditingUsername((prev) => ({
                                ...prev,
                                [u.id]: undefined,
                              }));
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-mono bg-white border px-2 py-1 rounded-md shadow-sm text-slate-800">
                            {u.password}
                          </span>
                          <button
                            onClick={() =>
                              setEditingField((prev) => ({
                                ...prev,
                                [u.id]: "password",
                              }))
                            }
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="แก้ไข Password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {icTab === "settings" && (
        <div className="rounded-3xl shadow-sm border overflow-hidden flex flex-col h-[800px] bg-white border-slate-200">
          <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
            <div>
              <h3 className="text-xl font-extrabold flex items-center gap-2.5">
                <FileJson className="w-5 h-5 text-teal-400" /> Visual Schema
                Builder
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                ออกแบบเกณฑ์การวินิจฉัยด้วยระบบลากวาง (Visual Interface)
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex gap-1.5 border-r border-slate-700 pr-3 mr-1">
                <button
                  onClick={handleExportDatabase}
                  className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                  title="Backup ฐานข้อมูล"
                >
                  <Database className="w-4 h-4" /> Backup DB
                </button>
                <label
                  className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Restore ฐานข้อมูล"
                >
                  <UploadCloud className="w-4 h-4" /> Restore
                  <input
                    ref={dbFileRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportDatabase}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-1.5 border-r border-slate-700 pr-3 mr-1">
                <button
                  onClick={handleExportAllSchemas}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="Export All Schemas to JSON"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <label
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Import Schemas from JSON"
                >
                  <FileUp className="w-4 h-4" />
                  <input
                    ref={schemaFileRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportAllSchemas}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-1 border-r border-slate-700 pr-3 mr-1">
                <button
                  onClick={() => handleMoveCategory("up")}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="เลื่อนขึ้น"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveCategory("down")}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="เลื่อนลง"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              <select
                onChange={(e) => {
                  const s = cdcConfig[e.target.value] || {
                    system_id: e.target.value,
                    name: "",
                    rules: {},
                    sections: [],
                  };
                  setPreviewSchema(s);
                  setJsonText(JSON.stringify(s, null, 2));
                }}
                className="px-4 py-2 bg-slate-800 rounded-xl text-sm font-bold border border-slate-700 text-white outline-none"
              >
                <option value="">-- Select Category --</option>
                {systemCategories.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleDeleteCategory}
                className="p-2 bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                title="Delete Selected Category"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handlePublishSchema}
                className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-colors"
              >
                <Save className="w-4 h-4" /> Publish Config
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <SchemaDesigner
              schema={previewSchema}
              onChange={(newSchema) => {
                setPreviewSchema(newSchema);
                setJsonText(JSON.stringify(newSchema, null, 2));
              }}
            />
          </div>
        </div>
      )}

      {/* 🧾 AUDIT MODAL: HA-Compliant Print Ready & Colored Tracking */}
      {showAuditModal && selectedAssessment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* CSS สำหรับ Print (HA Formal Form) */}
          <style>{`
            @media print {
              html, body, body * {
                visibility: hidden;
              }
              
              #ha-print-template,
              #ha-print-template *,
              #bulk-print-container,
              #bulk-print-container * {
                visibility: visible;
              }
              
              #ha-print-template,
              #bulk-print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white;
              }
              
              ${
                selectedPrintIds.length > 0
                  ? `
                #ha-print-template { display: none; }
                #bulk-print-container { display: block; }
              `
                  : `
                #bulk-print-container { display: none; }
                #ha-print-template { display: block; }
              `
              }
              
              .no-print { display: none !important; }
            }
            
            @page { size: A4; margin: 0; }
          `}</style>

          {/* แบบฟอร์มสำหรับปริ้น (HA-Compliant Template) - แบบรายบุคคล */}
          <div
            id="ha-print-template"
            style={{ display: "none" }}
            className="bg-white text-black font-sans"
          >
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h2 className="text-2xl font-bold uppercase">
                แบบบันทึกการเฝ้าระวังการติดเชื้อในโรงพยาบาล
              </h2>
              <p className="text-lg">(Infection Control Assessment Record)</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <p>
                  <strong>ชื่อ-สกุลผู้ป่วย:</strong>{" "}
                  {selectedAssessment.patient_name}
                </p>
                <p>
                  <strong>HN:</strong> {selectedAssessment.hn}
                </p>
                <p>
                  <strong>อายุ:</strong> {selectedAssessment.age_text || "-"}{" "}
                  <strong>เพศ:</strong>{" "}
                  {selectedAssessment.gender === "male" ? "ชาย" : "หญิง"}
                </p>
              </div>
              <div className="space-y-2 text-right">
                <p>
                  <strong>หอผู้ป่วย:</strong> {selectedAssessment.ward_name}
                </p>
                <p>
                  <strong>รหัสเคสอ้างอิง:</strong> {selectedAssessment.id}
                </p>
                <p>
                  <strong>วันที่ส่งประเมิน:</strong>{" "}
                  {new Date(selectedAssessment.created_at).toLocaleString(
                    "th-TH",
                  )}
                </p>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">
              1. ข้อมูลทางคลินิก (Clinical Data)
            </h3>
            <table className="w-full mb-6 border-collapse border border-gray-400 text-sm">
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 w-1/4">
                    วันที่ Admit
                  </td>
                  <td className="border border-gray-400 p-2 w-1/4">
                    {selectedAssessment.detailed_analysis_json?.clinical_vitals
                      ?.admission_date || "-"}
                  </td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 w-1/4">
                    Date of Event
                  </td>
                  <td className="border border-gray-400 p-2 w-1/4">
                    {selectedAssessment.detailed_analysis_json?.infectious_data
                      ?.doe || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100">
                    Temp (°C)
                  </td>
                  <td className="border border-gray-400 p-2">
                    {selectedAssessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_temp || "-"}
                  </td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100">
                    BP / Pulse
                  </td>
                  <td className="border border-gray-400 p-2">
                    {selectedAssessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_bp_sys || "-"}
                    /
                    {selectedAssessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_bp_dia || "-"}{" "}
                    | PR:{" "}
                    {selectedAssessment.detailed_analysis_json?.clinical_vitals
                      ?.vital_pulse || "-"}
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">
              2. ผลประเมิน AI (Triage Result)
            </h3>
            <div className="p-4 border border-gray-400 mb-6 bg-gray-50">
              <p className="font-bold text-lg">
                {selectedAssessment.auto_assess_result}
              </p>
            </div>

            <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">
              3. สรุปผลโดยคณะกรรมการควบคุมโรคติดเชื้อ (IC Committee)
            </h3>
            <div className="p-4 border border-gray-400 mb-12 min-h-[8rem]">
              <p>
                <strong>สถานะการวินิจฉัยสิ้นสุด:</strong>{" "}
                {selectedAssessment.status === "Confirmed"
                  ? "ติดเชื้อในโรงพยาบาล (HAI)"
                  : selectedAssessment.status === "POA"
                    ? "ติดเชื้อจากชุมชน (POA)"
                    : selectedAssessment.status}
              </p>
              <p className="mt-2">
                <strong>ข้อเสนอแนะ/หมายเหตุ:</strong>{" "}
                {selectedAssessment.ic_notes || "-"}
              </p>
            </div>

            <div className="flex justify-between mt-16 pt-8">
              <div className="text-center w-64">
                <p className="mb-1">
                  ลงชื่อ......................................................
                </p>
                <p className="text-sm">
                  ( ............................................................
                  )
                </p>
                <p className="mt-1 font-bold">พยาบาลผู้ประเมิน</p>
              </div>
              <div className="text-center w-64">
                <p className="mb-1">
                  ลงชื่อ......................................................
                </p>
                <p className="text-sm">
                  ( ............................................................
                  )
                </p>
                <p className="mt-1 font-bold">พยาบาลควบคุมการติดเชื้อ / IC</p>
              </div>
            </div>
          </div>

          {/* ส่วนหน้าต่าง UI ปกติ (ซ่อนเวลาปริ้น) */}
          <div className="rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl bg-white text-slate-800 animate-in zoom-in-95 overflow-hidden border border-slate-200 no-print">
            <div className="bg-white p-6 border-b border-slate-100 shrink-0 flex justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2.5">
                  <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {selectedAssessment.patient_name}
                  </h3>
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider border shadow-inner ${
                      selectedAssessment.status === "Confirmed"
                        ? "bg-rose-100 border-rose-200 text-rose-700"
                        : selectedAssessment.status === "POA"
                          ? "bg-orange-100 border-orange-200 text-orange-700"
                          : selectedAssessment.status === "Pending"
                            ? "bg-amber-100 border-amber-200 text-amber-700"
                            : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {selectedAssessment.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-base text-slate-600 font-medium">
                  <span className="font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm text-indigo-700 font-bold">
                    HN: {selectedAssessment.hn}
                  </span>
                  <span>อายุ {selectedAssessment.age_text || "-"}</span>
                  <span>
                    เพศ{" "}
                    {selectedAssessment.gender === "male"
                      ? "ชาย"
                      : selectedAssessment.gender === "female"
                        ? "หญิง"
                        : "-"}
                  </span>
                  <span className="font-bold text-slate-700">
                    วอร์ด: {selectedAssessment.ward_name || "-"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm"
                  title="พิมพ์รายงาน"
                >
                  <Printer className="w-4 h-4" /> Print Document
                </button>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="p-2.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-all shadow-sm border border-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#F8FAFC]">
              {/* ฝั่งซ้าย Vitals */}
              <div className="w-full lg:w-1/2 p-6 lg:p-8 overflow-y-auto custom-scrollbar border-r border-slate-200/60 bg-white">
                <div className="mb-8">
                  <h4 className="font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-indigo-500" /> Patient
                    Vitals
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Admit Date
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedAssessment.detailed_analysis_json
                          ?.clinical_vitals?.admission_date || "-"}
                      </p>
                    </div>
                    <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                        Date of Event (DOE)
                      </p>
                      <p className="text-sm font-bold text-indigo-900">
                        {selectedAssessment.detailed_analysis_json
                          ?.infectious_data?.doe || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      {
                        label: "Temp",
                        val: selectedAssessment.detailed_analysis_json
                          ?.clinical_vitals?.vital_temp,
                        unit: "°C",
                      },
                      {
                        label: "Pulse",
                        val: selectedAssessment.detailed_analysis_json
                          ?.clinical_vitals?.vital_pulse,
                        unit: "",
                      },
                      {
                        label: "RR",
                        val: selectedAssessment.detailed_analysis_json
                          ?.clinical_vitals?.vital_rr,
                        unit: "",
                      },
                      {
                        label: "BP",
                        val: `${selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_bp_sys || "-"}/${selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_bp_dia || "-"}`,
                        unit: "",
                      },
                      {
                        label: "SpO2",
                        val: selectedAssessment.detailed_analysis_json
                          ?.clinical_vitals?.vital_spo2,
                        unit: "%",
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

                <div>
                  <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
                    <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" />{" "}
                      Selected Criteria
                    </h4>
                    <span className="text-[10px] font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      {selectedAssessment.device_type}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {selectedAssessment.detailed_analysis_json?.infectious_data
                      ?.dynamic_data &&
                      Object.entries(
                        selectedAssessment.detailed_analysis_json
                          .infectious_data.dynamic_data,
                      )
                        .filter(
                          ([key, val]) =>
                            val !== false &&
                            val !== "" &&
                            val !== null &&
                            !key.includes("_met"),
                        )
                        .map(([key, val]) => (
                          <div
                            key={key}
                            className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                          >
                            <div className="bg-indigo-50 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-mono text-slate-400 mb-0.5 truncate">
                                {key}
                              </p>
                              <p className="text-sm font-bold text-slate-700">
                                {typeof val === "boolean"
                                  ? "เลือกแล้ว (Checked)"
                                  : val}
                              </p>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              </div>

              {/* ฝั่งขวา Audit Trail */}
              <div className="w-full lg:w-1/2 p-6 lg:p-8 overflow-y-auto custom-scrollbar relative">
                <div className="absolute left-[47px] top-12 bottom-12 w-0.5 bg-slate-200"></div>

                <h4 className="font-extrabold text-slate-800 flex items-center gap-2 mb-8">
                  <Activity className="w-5 h-5 text-emerald-500" /> Audit Trail
                  Progress
                </h4>

                <div className="space-y-8">
                  {/* Step 1: AI Evaluated */}
                  <div className="relative flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm">
                      <BrainCircuit className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-slate-800">
                          Triage AI Evaluated
                        </h5>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded">
                          {new Date(
                            selectedAssessment.created_at,
                          ).toLocaleString("th-TH")}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg border inline-block ${selectedAssessment.auto_assess_result?.includes("POSITIVE") ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
                      >
                        <p className="text-xs font-bold">
                          {selectedAssessment.auto_assess_result}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2+: Audit Logs */}
                  {auditLogs.map((log, index) => {
                    const isConfirmed = log.new_value === "Confirmed";
                    const isPOA = log.new_value === "POA";
                    const isPending = log.new_value === "Pending";
                    const isLast = index === auditLogs.length - 1;

                    const iconColor = isConfirmed
                      ? "bg-rose-100 text-rose-600"
                      : isPOA
                        ? "bg-orange-100 text-orange-600"
                        : isPending
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-100 text-slate-600";
                    const borderColor = isConfirmed
                      ? "border-rose-200"
                      : isPOA
                        ? "border-orange-200"
                        : isPending
                          ? "border-amber-200"
                          : "border-slate-200";

                    return (
                      <div
                        key={log.id}
                        className="relative flex items-start gap-4"
                      >
                        <div
                          className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 shadow-sm ${iconColor}`}
                        >
                          {isLast ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={`bg-white p-5 rounded-2xl shadow-sm border ${isLast ? `border-l-4 ${borderColor}` : "border-slate-200"} flex-1`}
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
                                {log.new_value}
                              </span>
                            </h5>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded">
                              {new Date(log.created_at).toLocaleString("th-TH")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 opacity-70" /> โดย:{" "}
                            <span className="font-bold">
                              {log.user_full_name}
                            </span>
                          </p>

                          {log.details && (
                            <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-600 italic mt-2">
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
      )}

      {/* 🧾 BULK PRINT TEMPLATE (พิมพ์แบบกลุ่ม) */}
      {selectedPrintIds.length > 0 && (
        <div
          id="bulk-print-container"
          style={{
            display: "none",
            boxSizing: "border-box",
          }}
          className="bg-white text-black font-sans"
        >
          {assessments
            .filter((a) => selectedPrintIds.includes(a.id))
            .map((caseData, idx) => (
              <div
                key={caseData.id}
                className="print-page"
                style={{
                  pageBreakAfter:
                    idx < selectedPrintIds.length - 1 ? "always" : "auto",
                  padding: "2cm",
                  background: "white",
                  minHeight: "297mm",
                  width: "210mm",
                  margin: "0 auto",
                  boxSizing: "border-box",
                }}
              >
                {" "}
                <div className="text-center mb-6 border-b-2 border-black pb-4">
                  <h2 className="text-2xl font-bold uppercase">
                    แบบบันทึกการเฝ้าระวังการติดเชื้อในโรงพยาบาล
                  </h2>
                  <p className="text-lg">
                    (Infection Control Assessment Record)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="space-y-2">
                    <p>
                      <strong>ชื่อ-สกุลผู้ป่วย:</strong> {caseData.patient_name}
                    </p>
                    <p>
                      <strong>HN:</strong> {caseData.hn}
                    </p>
                    <p>
                      <strong>อายุ:</strong> {caseData.age_text || "-"}{" "}
                      <strong>เพศ:</strong>{" "}
                      {caseData.gender === "male" ? "ชาย" : "หญิง"}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p>
                      <strong>หอผู้ป่วย:</strong> {caseData.ward_name}
                    </p>
                    <p>
                      <strong>รหัสเคสอ้างอิง:</strong> {caseData.id}
                    </p>
                    <p>
                      <strong>วันที่ส่งประเมิน:</strong>{" "}
                      {new Date(caseData.created_at).toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">
                  1. ข้อมูลทางคลินิก (Clinical Data)
                </h3>
                <table className="w-full mb-6 border-collapse border border-gray-400 text-sm">
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 p-2 font-bold bg-gray-100 w-1/4">
                        วันที่ Admit
                      </td>
                      <td className="border border-gray-400 p-2 w-1/4">
                        {caseData.detailed_analysis_json?.clinical_vitals
                          ?.admission_date || "-"}
                      </td>
                      <td className="border border-gray-400 p-2 font-bold bg-gray-100 w-1/4">
                        Date of Event
                      </td>
                      <td className="border border-gray-400 p-2 w-1/4">
                        {caseData.detailed_analysis_json?.infectious_data
                          ?.doe || "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 p-2 font-bold bg-gray-100">
                        Temp (°C)
                      </td>
                      <td className="border border-gray-400 p-2">
                        {caseData.detailed_analysis_json?.clinical_vitals
                          ?.vital_temp || "-"}
                      </td>
                      <td className="border border-gray-400 p-2 font-bold bg-gray-100">
                        BP / Pulse
                      </td>
                      <td className="border border-gray-400 p-2">
                        {caseData.detailed_analysis_json?.clinical_vitals
                          ?.vital_bp_sys || "-"}
                        /
                        {caseData.detailed_analysis_json?.clinical_vitals
                          ?.vital_bp_dia || "-"}{" "}
                        | PR:{" "}
                        {caseData.detailed_analysis_json?.clinical_vitals
                          ?.vital_pulse || "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">
                  2. ผลประเมิน AI (Triage Result)
                </h3>
                <div className="p-4 border border-gray-400 mb-6 bg-gray-50">
                  <p className="font-bold text-lg">
                    {caseData.auto_assess_result}
                  </p>
                </div>
                <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">
                  3. สรุปผลโดยคณะกรรมการควบคุมโรคติดเชื้อ (IC Committee)
                </h3>
                <div className="p-4 border border-gray-400 mb-12 min-h-[8rem]">
                  <p>
                    <strong>สถานะการวินิจฉัยสิ้นสุด:</strong>{" "}
                    {caseData.status === "Confirmed"
                      ? "ติดเชื้อในโรงพยาบาล (HAI)"
                      : caseData.status === "POA"
                        ? "ติดเชื้อจากชุมชน (POA)"
                        : caseData.status}
                  </p>
                  <p className="mt-2">
                    <strong>ข้อเสนอแนะ/หมายเหตุ:</strong>{" "}
                    {caseData.ic_notes || "-"}
                  </p>
                </div>
                <div className="flex justify-between mt-16 pt-8 text-sm">
                  <div className="text-center w-64">
                    <p className="mb-1">
                      ลงชื่อ......................................................
                    </p>
                    <p className="text-sm">
                      (
                      ............................................................
                      )
                    </p>
                    <p className="mt-1 font-bold">พยาบาลผู้ประเมิน</p>
                  </div>
                  <div className="text-center w-64">
                    <p className="mb-1">
                      ลงชื่อ......................................................
                    </p>
                    <p className="text-sm">
                      (
                      ............................................................
                      )
                    </p>
                    <p className="mt-1 font-bold">
                      พยาบาลควบคุมการติดเชื้อ / IC
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// 🔔 Helper
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  if (days < 7) return `${days} วันที่แล้ว`;

  return new Date(timestamp).toLocaleDateString("th-TH");
}

ICCommandCenter.propTypes = {
  currentUser: PropTypes.object.isRequired,
  wards: PropTypes.array.isRequired,
  systemUsers: PropTypes.array.isRequired,
  cdcConfig: PropTypes.object.isRequired,
  assessments: PropTypes.array.isRequired,
  fetchGlobalData: PropTypes.func.isRequired,
  fetchAssessments: PropTypes.func.isRequired,
  setCdcConfig: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  systemCategories: PropTypes.array.isRequired,
  viewedCases: PropTypes.object.isRequired,
  markCaseAsViewed: PropTypes.func.isRequired,
  isCaseNew: PropTypes.func.isRequired,
};
