import React, { useState, useRef, useEffect } from "react";
import {
  FileJson,
  Save,
  FileDown,
  FileUp,
  UploadCloud,
  Database,
  ArrowUp,
  ArrowDown,
  Trash2,
  History,
  RotateCcw,
  X,
  Archive,
  Box,
  ShieldAlert,
  Download,
  Plus,
  Palette,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { DEFAULT_CDC_DB } from "../../data/schemaDB";
import SchemaDesigner from "../SchemaDesigner";

export default function SettingsTab({
  cdcConfig = {},
  systemCategories = [],
  fetchGlobalData,
  showToast,
  currentUser = {},
}) {
  const [activeTab, setActiveTab] = useState("builder");

  const [previewSchema, setPreviewSchema] = useState(null);
  const [jsonText, setJsonText] = useState("");

  const schemaFileRef = useRef(null);
  const dbFileRef = useRef(null);

  const [versions, setVersions] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [versionNotes, setVersionNotes] = useState("");

  const [archiveCount, setArchiveCount] = useState(0);
  const [archiveDateFrom, setArchiveDateFrom] = useState("");
  const [archiveDateTo, setArchiveDateTo] = useState("");

  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [hasExportedLogs, setHasExportedLogs] = useState(false);

  // 🏥 Hospital Settings
  const [hospitalName, setHospitalName] = useState("");

  useEffect(() => {
    if (activeTab === "builder") loadVersions();
    if (activeTab === "data") {
      loadArchiveCount();
      setHasExportedLogs(false);
      loadHospitalName();
    }
  }, [previewSchema?.system_id, activeTab]);

  // ==========================================
  // 🏥 Hospital Name
  // ==========================================
  const loadHospitalName = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "hospital_name")
      .single();
    if (data) setHospitalName(data.value);
  };

  const saveHospitalName = async () => {
    if (!hospitalName.trim()) {
      showToast("error", "กรุณากรอกชื่อโรงพยาบาล");
      return;
    }
    await supabase
      .from("system_settings")
      .upsert({ key: "hospital_name", value: hospitalName.trim() });
    showToast("success", "✅ บันทึกชื่อโรงพยาบาลเรียบร้อย");
  };

  // ==========================================
  // Version Management
  // ==========================================
  const loadVersions = async () => {
    const currentSystemId = previewSchema?.system_id;
    if (!currentSystemId) return;
    const { data } = await supabase
      .from("schema_versions")
      .select("*")
      .eq("system_id", currentSystemId)
      .order("version_number", { ascending: false });
    setVersions(data || []);
  };

  const handleSaveVersion = async () => {
    const currentSystemId = previewSchema?.system_id;
    if (!currentSystemId || !versionName.trim()) {
      showToast("error", "กรุณากรอกชื่อ Version");
      return;
    }
    const { data: latest } = await supabase
      .from("schema_versions")
      .select("version_number")
      .eq("system_id", currentSystemId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const newVersion = (latest?.version_number || 0) + 1;
    await supabase.from("schema_versions").insert({
      system_id: currentSystemId,
      name: versionName,
      rules: previewSchema.rules,
      sections: previewSchema.sections,
      sort_order: previewSchema.sort_order || 0,
      version_number: newVersion,
      created_by: currentUser.full_name,
      notes: versionNotes || `Version ${newVersion}`,
    });
    showToast("success", `💾 บันทึก "${versionName}" สำเร็จ`);
    setShowSaveDialog(false);
    setVersionName("");
    setVersionNotes("");
    loadVersions();
  };

  const handleRestoreVersion = async (version) => {
    if (
      !window.confirm(
        `⚠️ ย้อนกลับเป็น "${version.name}"?\n\nSchema ปัจจุบันจะถูกแทนที่\nกด Publish เพื่อบันทึก`,
      )
    )
      return;
    setPreviewSchema({
      system_id: version.system_id,
      name: version.name,
      short_name: version.short_name || "",
      rules: version.rules,
      sections: version.sections,
      sort_order: version.sort_order,
    });
    setJsonText(
      JSON.stringify(
        {
          system_id: version.system_id,
          name: version.name,
          short_name: version.short_name || "",
          rules: version.rules,
          sections: version.sections,
          sort_order: version.sort_order,
        },
        null,
        2,
      ),
    );
    showToast(
      "success",
      `🔄 ย้อนกลับเป็น "${version.name}" — กด Publish เพื่อบันทึก`,
    );
  };

  const handleDeleteVersion = async (versionId, versionName) => {
    if (!window.confirm(`⚠️ ลบ "${versionName}" ถาวร?`)) return;
    await supabase.from("schema_versions").delete().eq("id", versionId);
    showToast("success", `🗑️ ลบ "${versionName}" สำเร็จ`);
    loadVersions();
  };

  const handleResetToDefault = () => {
    if (!window.confirm("⚠️ รีเซ็ตเป็นค่าเริ่มต้น?")) return;
    const defaultSchema =
      DEFAULT_CDC_DB[previewSchema?.system_id] ||
      Object.values(DEFAULT_CDC_DB).find(
        (s) => s.system_id === previewSchema?.system_id,
      );
    if (defaultSchema) {
      setPreviewSchema(defaultSchema);
      setJsonText(JSON.stringify(defaultSchema, null, 2));
      showToast("success", "🔃 รีเซ็ตเป็นค่าเริ่มต้น");
    } else showToast("error", "ไม่พบค่าเริ่มต้น");
  };

  // ==========================================
  // Archive Management
  // ==========================================
  const loadArchiveCount = async () => {
    const { count } = await supabase
      .from("archived_assessments")
      .select("*", { count: "exact", head: true });
    setArchiveCount(count || 0);
  };

  const exportToJSON = (cases, logs) => {
    const exportData = {
      export_version: "2.0",
      exported_at: new Date().toISOString(),
      exported_by: currentUser.full_name,
      total_cases: cases?.length || 0,
      total_logs: logs?.length || 0,
      data: { assessments: cases || [], audit_logs: logs || [] },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VanguardIC_Archive_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleArchiveWithLogs = async () => {
    if (!archiveDateFrom && !archiveDateTo) {
      showToast("error", "กรุณาเลือกช่วงวันที่");
      return;
    }
    let query = supabase.from("assessments").select("*");
    if (archiveDateFrom) query = query.gte("created_at", archiveDateFrom);
    if (archiveDateTo) query = query.lte("created_at", archiveDateTo);
    const { data: cases } = await query;
    if (!cases?.length) {
      showToast("info", "ไม่พบเคส");
      return;
    }
    if (
      !window.confirm(
        `📦 เก็บถาวร ${cases.length} เคส?\n\n✅ Export JSON\n✅ Copy ไป Archive\n✅ ต้นฉบับยังอยู่`,
      )
    )
      return;
    const caseIds = cases.map((c) => c.id);
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("*")
      .in("assessment_id", caseIds);
    exportToJSON(cases, logs);
    await supabase.from("archived_assessments").upsert(cases);
    if (logs?.length) await supabase.from("archived_audit_logs").upsert(logs);
    showToast(
      "success",
      `📦 เก็บถาวร ${cases.length} เคส + ${logs?.length || 0} logs`,
    );
    loadArchiveCount();
  };

  const handleExportArchive = async () => {
    let q = supabase.from("archived_assessments").select("*");
    if (archiveDateFrom) q = q.gte("created_at", archiveDateFrom);
    if (archiveDateTo) q = q.lte("created_at", archiveDateTo);
    const { data: cases } = await q;
    if (!cases?.length) {
      showToast("info", "ไม่พบข้อมูล");
      return;
    }
    const { data: logs } = await supabase
      .from("archived_audit_logs")
      .select("*")
      .in(
        "assessment_id",
        cases.map((c) => c.id),
      );
    exportToJSON(cases, logs);
    showToast(
      "success",
      `📥 Export ${cases.length} เคส + ${logs?.length || 0} logs`,
    );
  };

  const handleRestoreFromArchive = async () => {
    if (!archiveDateFrom && !archiveDateTo) {
      showToast("error", "กรุณาเลือกวันที่");
      return;
    }
    let q = supabase.from("archived_assessments").select("*");
    if (archiveDateFrom) q = q.gte("created_at", archiveDateFrom);
    if (archiveDateTo) q = q.lte("created_at", archiveDateTo);
    const { data: cases } = await q;
    if (!cases?.length) {
      showToast("info", "ไม่พบข้อมูล");
      return;
    }
    if (!window.confirm(`🔄 กู้คืน ${cases.length} เคส?`)) return;
    await supabase
      .from("assessments")
      .upsert(cases.map(({ archived_at, ...r }) => r));
    const { data: logs } = await supabase
      .from("archived_audit_logs")
      .select("*")
      .in(
        "assessment_id",
        cases.map((c) => c.id),
      );
    if (logs?.length)
      await supabase
        .from("audit_logs")
        .upsert(logs.map(({ archived_at, ...r }) => r));
    showToast(
      "success",
      `🔄 กู้คืน ${cases.length} เคส + ${logs?.length || 0} logs`,
    );
    fetchGlobalData(true);
  };

  const handleDeleteArchive = async () => {
    if (!archiveDateFrom && !archiveDateTo) {
      showToast("error", "กรุณาเลือกวันที่");
      return;
    }
    if (!window.confirm("⚠️ ลบ Archive ถาวร?")) return;
    let lq = supabase.from("archived_audit_logs").delete();
    if (archiveDateFrom) lq = lq.gte("created_at", archiveDateFrom);
    if (archiveDateTo) lq = lq.lte("created_at", archiveDateTo);
    await lq;
    let cq = supabase.from("archived_assessments").delete();
    if (archiveDateFrom) cq = cq.gte("created_at", archiveDateFrom);
    if (archiveDateTo) cq = cq.lte("created_at", archiveDateTo);
    await cq;
    showToast("success", "🗑️ ลบ Archive เรียบร้อย");
    loadArchiveCount();
  };

  // ==========================================
  // Audit Logs Management
  // ==========================================
  const handleExportAuditLogs = async () => {
    if (!logDateFrom && !logDateTo) {
      showToast("error", "กรุณาเลือกช่วงวันที่");
      return;
    }
    let q = supabase.from("audit_logs").select("*");
    if (logDateFrom) q = q.gte("created_at", logDateFrom);
    if (logDateTo) q = q.lte("created_at", logDateTo);
    const { data: logs } = await q;
    if (!logs?.length) {
      showToast("info", "ไม่พบ audit logs");
      return;
    }
    const exportData = {
      export_version: "1.0",
      exported_at: new Date().toISOString(),
      exported_by: currentUser.full_name,
      type: "audit_logs",
      date_from: logDateFrom,
      date_to: logDateTo,
      count: logs.length,
      data: logs,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VanguardIC_AuditLogs_${logDateFrom || "all"}_to_${logDateTo || "all"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setHasExportedLogs(true);
    showToast(
      "success",
      `📥 Export ${logs.length} audit logs — ไฟล์สำรองเรียบร้อย`,
    );
  };

  const handleDeleteAuditLogs = async () => {
    if (!hasExportedLogs) {
      showToast("error", "❌ กรุณา Export JSON ก่อนลบ!");
      return;
    }
    if (
      !window.confirm(
        `⚠️⚠️⚠️ ลบ Audit Logs ถาวร!\n\n✅ ไฟล์สำรองพร้อม\nช่วงวันที่: ${logDateFrom || "ทั้งหมด"} - ${logDateTo || "ทั้งหมด"}\n\nไม่สามารถย้อนกลับได้!`,
      )
    )
      return;
    let dq = supabase.from("audit_logs").delete();
    if (logDateFrom) dq = dq.gte("created_at", logDateFrom);
    if (logDateTo) dq = dq.lte("created_at", logDateTo);
    await dq;
    setHasExportedLogs(false);
    showToast("success", "🗑️ ลบ audit logs เรียบร้อย — พื้นที่ลดลง");
  };

  const handleCleanupLogs = async () => {
    if (
      !window.confirm(
        "🧹 ล้าง Logs เก่า?\n\n- login_attempts > 30 วัน\n- audit_logs > 3 ปี\n- unlock_logs > 90 วัน",
      )
    )
      return;
    await supabase.rpc("cleanup_old_logs");
    showToast("success", "🧹 ล้าง Logs เรียบร้อย");
  };

  // ==========================================
  // Schema Management
  // ==========================================
  const handlePublishSchema = async () => {
    try {
      const finalSchema = JSON.parse(jsonText);
      if (!finalSchema.system_id) throw new Error("Missing system_id");
      const existingCount = Object.keys(cdcConfig).length;
      const sortOrder =
        finalSchema.sort_order ??
        cdcConfig[finalSchema.system_id]?.sort_order ??
        existingCount;
      const { error } = await supabase.from("cdc_configs").upsert({
        system_id: finalSchema.system_id,
        name: finalSchema.name,
        short_name: finalSchema.short_name || null,
        rules: finalSchema.rules,
        sections: finalSchema.sections,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        showToast("success", `Publish ${finalSchema.system_id} สำเร็จ!`);
        fetchGlobalData(true);
      } else throw new Error(error.message);
    } catch (err) {
      showToast("error", `JSON ผิดรูปแบบ: ${err.message}`);
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
        `⚠️ ลบหมวด "${previewSchema?.name || selectedSystem}" ถาวร?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้!`,
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
    } else showToast("error", `ลบไม่สำเร็จ: ${error.message}`);
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
        `Export สำเร็จ! ${Object.keys(cdcConfig).length} หมวดหมู่`,
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
      if (!importedData.schemas || typeof importedData.schemas !== "object")
        throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
      const schemaCount = Object.keys(importedData.schemas).length;
      if (schemaCount === 0) throw new Error("ไม่พบ Schema ใดๆ ในไฟล์");
      if (
        !window.confirm(
          `📥 ยืนยันการนำเข้า ${schemaCount} หมวดหมู่?\n\n⚠️ จะเขียนทับ Schema ปัจจุบัน`,
        )
      ) {
        e.target.value = "";
        return;
      }
      showToast("info", `กำลังนำเข้า ${schemaCount} หมวดหมู่...`);
      let successCount = 0,
        failCount = 0,
        index = 0;
      for (const [systemId, schema] of Object.entries(importedData.schemas)) {
        try {
          const { error } = await supabase.from("cdc_configs").upsert({
            system_id: systemId,
            name: schema.name || systemId,
            short_name: schema.short_name || null,
            rules: schema.rules || {},
            sections: schema.sections || [],
            sort_order: schema.sort_order || index,
            updated_at: new Date().toISOString(),
          });
          if (error) failCount++;
          else successCount++;
          index++;
        } catch (err) {
          failCount++;
        }
      }
      await fetchGlobalData(true);
      if (importedData.schemas["BSI"]) {
        setPreviewSchema(importedData.schemas["BSI"]);
        setJsonText(JSON.stringify(importedData.schemas["BSI"], null, 2));
      }
      showToast(
        failCount === 0 ? "success" : "error",
        failCount === 0
          ? `✅ นำเข้าสำเร็จ ${successCount} หมวด`
          : `⚠️ สำเร็จ ${successCount}, ล้มเหลว ${failCount}`,
      );
    } catch (err) {
      showToast("error", `❌ ${err.message}`);
    }
    e.target.value = "";
  };

  const handleExportDatabase = async () => {
    try {
      showToast("info", "กำลังเตรียมข้อมูลสำรอง...");
      const { data: assessmentsData } = await supabase
        .from("assessments")
        .select("*");
      const { data: wardsData } = await supabase.from("wards").select("*");
      const backupObj = {
        app_version: "Vanguard_IC_1.0",
        exported_at: new Date().toISOString(),
        exported_by: currentUser.full_name,
        data: { assessments: assessmentsData || [], wards: wardsData || [] },
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
      showToast("success", "ดาวน์โหลดไฟล์ Backup สำเร็จ!");
    } catch (err) {
      showToast("error", "เกิดข้อผิดพลาดในการดึงข้อมูล Backup");
    }
  };

  const handleImportDatabase = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      if (importedData.app_version !== "Vanguard_IC_1.0" || !importedData.data)
        throw new Error("รูปแบบไฟล์ Backup ไม่ถูกต้อง");
      if (
        !window.confirm(
          `⚠️ ฟื้นฟูฐานข้อมูล?\n\n📅 ${new Date(importedData.exported_at).toLocaleString("th-TH")}\n🏥 Wards: ${importedData.data.wards?.length || 0}\n📄 Assessments: ${importedData.data.assessments?.length || 0}\n\nข้อมูลปัจจุบันจะถูกเขียนทับ`,
        )
      ) {
        e.target.value = "";
        return;
      }
      showToast("info", "กำลังฟื้นฟูฐานข้อมูล...");
      if (importedData.data.wards?.length > 0) {
        const { error: wardError } = await supabase
          .from("wards")
          .upsert(importedData.data.wards);
        if (wardError) throw new Error(`Wards: ${wardError.message}`);
      }
      if (importedData.data.assessments?.length > 0) {
        const { error: assessError } = await supabase
          .from("assessments")
          .upsert(importedData.data.assessments);
        if (assessError) throw new Error(`Assessments: ${assessError.message}`);
      }
      await fetchGlobalData(true);
      showToast("success", "✅ ฟื้นฟูฐานข้อมูลสำเร็จ");
    } catch (err) {
      showToast("error", `❌ ${err.message}`);
    }
    e.target.value = "";
  };

  const handleJsonChange = (text) => {
    setJsonText(text);
    try {
      setPreviewSchema(JSON.parse(text));
    } catch (e) {}
  };

  return (
    <div className="rounded-3xl shadow-sm border overflow-hidden flex flex-col h-[800px] bg-white border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ========================================== */}
      {/* Header Bar — แก้ไขใหม่ ไม่ Overflow */}
      {/* ========================================== */}
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-extrabold flex items-center gap-2.5">
            {activeTab === "builder" ? (
              <>
                <FileJson className="w-5 h-5 text-teal-400" /> Schema Builder
              </>
            ) : (
              <>
                <Box className="w-5 h-5 text-amber-400" /> Data Archive
              </>
            )}
          </h3>

          {/* Mode Switcher */}
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === "builder" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
            >
              🧩 Builder
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === "data" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
            >
              📦 Archive
            </button>
          </div>
        </div>

        {/* Right Side — Actions (เฉพาะ Builder Mode) */}
        <div className="flex gap-2 items-center">
          {activeTab === "builder" && (
            <>
              {/* กลุ่ม: Import/Export (Icon ล้วน) */}
              <div className="flex gap-1 border-r border-slate-700 pr-2 mr-1">
                <button
                  onClick={handleExportAllSchemas}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="Export All Schemas"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <label
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-colors"
                  title="Import Schemas"
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

              {/* กลุ่ม: จัดลำดับ (Icon ล้วน) */}
              <div className="flex gap-1 border-r border-slate-700 pr-2 mr-1">
                <button
                  onClick={() => handleMoveCategory("up")}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="ย้ายขึ้น"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMoveCategory("down")}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="ย้ายลง"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* เลือกหมวดหมู่ (จำกัดความกว้าง) */}
              <select
                value={previewSchema?.system_id || ""}
                onChange={(e) => {
                  if (!e.target.value) {
                    setPreviewSchema(null);
                    setJsonText("");
                    return;
                  }
                  const s = cdcConfig[e.target.value] || {
                    system_id: e.target.value,
                    name: "",
                    short_name: "",
                    rules: {},
                    sections: [],
                    sort_order: Object.keys(cdcConfig).length,
                  };
                  setPreviewSchema(s);
                  setJsonText(JSON.stringify(s, null, 2));
                }}
                className="w-40 px-3 py-2 bg-slate-800 rounded-xl text-sm font-bold border border-slate-700 text-white outline-none truncate"
              >
                <option value="">-- เลือกหมวด --</option>
                {systemCategories.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.id} — {sys.short_name || sys.name}
                  </option>
                ))}
              </select>

              {/* กลุ่ม: Action หลัก (Icon + Tooltip) */}
              <button
                onClick={() => {
                  const newId = prompt(
                    "🔖 ระบุ System ID ใหม่ (ตัวย่อภาษาอังกฤษ เช่น SKIN, BURN):",
                  );
                  if (!newId || !newId.trim()) return;
                  const trimmedId = newId.trim().toUpperCase();
                  if (cdcConfig[trimmedId]) {
                    showToast(
                      "error",
                      `❌ System ID "${trimmedId}" มีอยู่แล้ว`,
                    );
                    return;
                  }
                  const shortName = prompt(
                    `🇹🇭 ชื่อย่อภาษาไทยสำหรับ "${trimmedId}" (เช่น "ผิวหนัง"):`,
                    "",
                  );
                  const newSchema = {
                    system_id: trimmedId,
                    name: `หมวดหมู่ใหม่ (${trimmedId})`,
                    short_name: shortName || trimmedId,
                    rules: { disease_paths: [] },
                    sections: [
                      {
                        id: `sec_${Date.now()}`,
                        title: "หมวดหมู่หลัก",
                        theme: "blue",
                        fields: [],
                      },
                    ],
                    sort_order: Object.keys(cdcConfig).length,
                  };
                  setPreviewSchema(newSchema);
                  setJsonText(JSON.stringify(newSchema, null, 2));
                  showToast(
                    "success",
                    `✅ เพิ่มหมวด "${trimmedId}" — แก้ไขชื่อได้ที่ Properties ด้านขวา`,
                  );
                }}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                title="เพิ่มหมวดหมู่ใหม่"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={handleDeleteCategory}
                className="p-2 bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                title="ลบหมวดหมู่"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handlePublishSchema}
                className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-colors flex-shrink-0"
              >
                <Save className="w-4 h-4" /> Publish
              </button>
            </>
          )}
          {activeTab === "data" && (
            <>
              <button
                onClick={handleExportDatabase}
                className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 text-xs font-bold"
              >
                <Database className="w-4 h-4" /> Backup DB
              </button>
              <label className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-bold">
                <UploadCloud className="w-4 h-4" /> Restore
                <input
                  ref={dbFileRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportDatabase}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* Body */}
      {/* ========================================== */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === "builder" ? (
          previewSchema ? (
            <>
              <div className="w-56 bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm">
                <div className="p-3 border-b border-slate-100 bg-purple-50/30">
                  <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-purple-800">
                    <History className="w-3.5 h-3.5" /> Versions
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    บันทึก Version สำหรับหมวด{" "}
                    <strong>{previewSchema.system_id}</strong>
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleRestoreVersion(v)}
                      className="w-full text-left p-2.5 rounded-xl border bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-xs group relative cursor-pointer"
                    >
                      <p className="font-bold text-slate-700 pr-4">{v.name}</p>
                      <p className="text-[10px] text-slate-400">
                        v{v.version_number} •{" "}
                        {new Date(v.created_at).toLocaleDateString("th-TH")}
                      </p>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVersion(v.id, v.name);
                        }}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t space-y-1.5">
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="w-full py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg text-[10px] font-bold hover:bg-purple-100 flex items-center justify-center gap-1"
                  >
                    <Save className="w-3 h-3" /> บันทึก Version
                  </button>
                  <button
                    onClick={handleResetToDefault}
                    className="w-full py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold hover:bg-rose-100 flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> คืนค่าเริ่มต้น
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
            </>
          ) : (
            <div className="flex-1 bg-slate-50 flex items-center justify-center border-r border-slate-200">
              <div className="text-center text-slate-400">
                <Box className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold">
                  👆 เลือกหมวดเพื่อเริ่มต้นแก้ไข Schema
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* ========================================== */}
              {/* 🏥 Hospital Settings */}
              {/* ========================================== */}
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  🏥 ตั้งค่าระบบ
                </h3>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">
                    ชื่อโรงพยาบาล (ใช้ในรายงาน Print และ Excel)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="เช่น โรงพยาบาลตัวอย่าง"
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 bg-slate-50"
                    />
                    <button
                      onClick={saveHospitalName}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================== */}
              {/* Archive */}
              {/* ========================================== */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-500" />{" "}
                  จัดการข้อมูลเก็บถาวร (เคส)
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-500">Archive</p>
                    <p className="text-2xl font-bold">{archiveCount}</p>
                    <p className="text-xs text-slate-400">เคส</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <p className="text-xs text-slate-500">สถานะ</p>
                    <p className="text-sm font-bold text-emerald-600">
                      ✅ พร้อมใช้งาน
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="date"
                    value={archiveDateFrom}
                    onChange={(e) => setArchiveDateFrom(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-xl text-sm outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={archiveDateTo}
                    onChange={(e) => setArchiveDateTo(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleArchiveWithLogs}
                    className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold"
                  >
                    <div className="flex flex-col items-center">
                      <span>📦 เก็บถาวร</span>
                      <span className="text-[10px] font-normal text-amber-500">
                        ✅ เคส + ✅ Audit Logs
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={handleExportArchive}
                    className="py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold"
                  >
                    <div className="flex flex-col items-center">
                      <span>📥 Export JSON</span>
                      <span className="text-[10px] font-normal text-blue-500">
                        ✅ เคส + ✅ Audit Logs
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={handleRestoreFromArchive}
                    className="py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold"
                  >
                    <div className="flex flex-col items-center">
                      <span>🔄 กู้คืน</span>
                      <span className="text-[10px] font-normal text-emerald-500">
                        ✅ กลับสู่ระบบ
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={handleDeleteArchive}
                    className="py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold"
                  >
                    <div className="flex flex-col items-center">
                      <span>🗑️ ลบ Archive</span>
                      <span className="text-[10px] font-normal text-rose-500">
                        ⚠️ ลบถาวร
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* ========================================== */}
              {/* Audit Logs */}
              {/* ========================================== */}
              <div className="bg-white border-2 border-rose-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-rose-700 mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Audit Logs Management
                </h3>
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl mb-4">
                  <p className="text-sm font-bold text-rose-700 mb-1">
                    ⚠️ ข้อมูลสำคัญ — กรุณาอ่านก่อนดำเนินการ
                  </p>
                  <p className="text-xs text-rose-600">
                    Audit Logs เป็นบันทึกประวัติการเปลี่ยนแปลงทั้งหมด ต้อง
                    Export สำรองเป็น JSON ก่อนลบทุกครั้ง
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl mb-4 text-sm font-bold ${hasExportedLogs ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}
                >
                  {hasExportedLogs
                    ? "✅ ไฟล์สำรองพร้อม — สามารถลบได้"
                    : "⚠️ ยังไม่ได้ Export — กรุณา Export ก่อนลบ"}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="date"
                    value={logDateFrom}
                    onChange={(e) => {
                      setLogDateFrom(e.target.value);
                      setHasExportedLogs(false);
                    }}
                    className="flex-1 px-3 py-2.5 border rounded-xl text-sm outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={logDateTo}
                    onChange={(e) => {
                      setLogDateTo(e.target.value);
                      setHasExportedLogs(false);
                    }}
                    className="flex-1 px-3 py-2.5 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleExportAuditLogs}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold"
                  >
                    <div className="flex flex-col items-center">
                      <span className="flex items-center gap-1.5">
                        <Download className="w-4 h-4" /> Step 1: Export JSON
                        สำรอง
                      </span>
                      <span className="text-[10px] font-normal text-blue-100">
                        ✅ Audit Logs เท่านั้น
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={handleDeleteAuditLogs}
                    disabled={!hasExportedLogs}
                    className={`w-full py-3 rounded-xl text-sm font-bold ${hasExportedLogs ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4" /> Step 2: ลบ Audit Logs
                      </span>
                      <span className="text-[10px] font-normal">
                        {hasExportedLogs
                          ? "⚠️ ลบถาวร (สำรองแล้ว)"
                          : "🔒 กรุณา Export ก่อนลบ"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* ========================================== */}
              {/* Backup & Restore */}
              {/* ========================================== */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-500" /> Backup &
                  Restore ฐานข้อมูล
                </h3>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 mb-4">
                  ⚠️ Restore จะเขียนทับข้อมูลปัจจุบัน — ใช้เมื่อจำเป็นเท่านั้น
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportDatabase}
                    className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold"
                  >
                    <div className="flex flex-col items-center">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-4 h-4" /> Backup DB
                      </span>
                      <span className="text-[10px] font-normal text-indigo-500">
                        ✅ Assessments + Wards
                      </span>
                    </div>
                  </button>
                  <label className="py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-bold cursor-pointer">
                    <div className="flex flex-col items-center">
                      <span className="flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4" /> Restore DB
                      </span>
                      <span className="text-[10px] font-normal text-rose-500">
                        ⚠️ เขียนทับข้อมูล
                      </span>
                    </div>
                    <input
                      ref={dbFileRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportDatabase}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* ========================================== */}
              {/* Maintenance */}
              {/* ========================================== */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-slate-500" /> Maintenance
                </h3>
                <button
                  onClick={handleCleanupLogs}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold"
                >
                  <div className="flex flex-col items-center">
                    <span>🧹 ล้าง Logs เก่า</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      Login (&gt;30d) + Audit (&gt;3y) + Unlock (&gt;90d)
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* Save Version Dialog */}
      {/* ========================================== */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-purple-500" /> บันทึก Version ใหม่
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  ชื่อ Version *
                </label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder={`เช่น ${previewSchema?.system_id || "ระบบ"} v1`}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  rows="2"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="สิ่งที่เปลี่ยนแปลง..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-400 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold"
              >
                💾 บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
