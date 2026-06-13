import React, { useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Bell,
  BellRing,
  Calculator,
  Send,
  Key,
  BarChart3,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import FormEngine from "./FormEngine";
import {
  handleAnalyzeLogic,
  getTriageColor,
  calculateHospitalDay,
} from "../utils/triageLogic";
import { useNurseNotifications } from "../hooks/useNurseNotifications";
import { DEFAULT_CDC_DB } from "../data/schemaDB";

import NotificationBell from "./shared/NotificationBell";
import AuditModal from "./shared/AuditModal";
import ErrorMessage from "./shared/ErrorMessage";
import PatientForm from "./nurse/PatientForm";
import VitalsCard from "./nurse/VitalsCard";
import CategorySelector from "./nurse/CategorySelector";
import AnalysisResult from "./nurse/AnalysisResult";
import RecentCases from "./nurse/RecentCases";
import ChangePasswordModal from "./nurse/ChangePasswordModal";
import NurseUsersPanel from "./nurse/NurseUsersPanel";

function handleEnter(e, nextId) {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById(nextId)?.focus();
  }
}

export default function WardNursePane({
  currentUser,
  wards,
  systemUsers,
  cdcConfig,
  assessments,
  fetchAssessments,
  showToast,
  systemCategories,
  viewedCases,
  markCaseAsViewed,
  isCaseNew,
}) {
  const [formData, setFormData] = useState({
    hn: "",
    patient_name: "",
    dx: "",
    age_years: "",
    age_months: "",
    age_days: "",
    gender: "",
    admission_date: "",
    vital_temp: "",
    vital_pulse: "",
    vital_rr: "",
    vital_bp_sys: "",
    vital_bp_dia: "",
    vital_spo2: "",
  });

  const systemDataRef = useRef({ system: "BSI", doe: "", dynamic_data: {} });
  const [dynamicData, setDynamicData] = useState({});
  const [systemKey, setSystemKey] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [filters, setFilters] = useState({
    category: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [validationErrors, setValidationErrors] = useState({});

  const {
    notifications,
    unreadCount,
    showPanel: showNotifPanel,
    setShowPanel: setShowNotifPanel,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNurseNotifications(currentUser);

  const isInfant =
    (formData.age_years === "0" || formData.age_years === 0) &&
    (formData.age_months !== "" || formData.age_days !== "");
  const currentAgeCategory = isInfant ? "infant" : "adult";
  const calculatedMap =
    formData.vital_bp_sys && formData.vital_bp_dia
      ? Math.round(
          (Number(formData.vital_bp_sys) + 2 * Number(formData.vital_bp_dia)) /
            3,
        )
      : "";

  const getAgeDisplay = () => {
    const parts = [];
    if (formData.age_years) parts.push(`${formData.age_years} ปี`);
    if (formData.age_months) parts.push(`${formData.age_months} เดือน`);
    if (formData.age_days) parts.push(`${formData.age_days} วัน`);
    return parts.length > 0 ? parts.join(" ") : "ไม่ระบุ";
  };
  const ageDisplay = getAgeDisplay();

  const getAgeYears = () => {
    const years = Number(formData.age_years) || 0;
    const months = Number(formData.age_months) || 0;
    const days = Number(formData.age_days) || 0;
    if (years > 0) return years;
    if (months > 0 || days > 0) return 0;
    return "";
  };

  const handleCategoryChange = (sysId) => {
    systemDataRef.current = { system: sysId, doe: "", dynamic_data: {} };
    setDynamicData({});
    setSystemKey((prev) => prev + 1);
    setAnalysisResult(null);
    setValidationErrors({});
  };

  const handleFormChange = useCallback((data) => {
    systemDataRef.current.dynamic_data = data;
    setDynamicData(data);
  }, []);

  const handleAnalyze = () => {
    setValidationErrors({});
    setAnalysisResult(
      handleAnalyzeLogic(
        formData,
        { ...systemDataRef.current, dynamic_data: dynamicData },
        cdcConfig,
      ),
    );
  };

  const validateForm = () => {
    const errors = {};
    const sd = systemDataRef.current;
    if (!formData.hn?.trim()) errors.hn = "กรุณากรอก HN";
    if (!formData.patient_name?.trim()) errors.patient_name = "กรุณากรอกชื่อ";
    if (!formData.gender) errors.gender = "กรุณาระบุเพศ";
    if (!formData.admission_date)
      errors.admission_date = "กรุณาระบุวันที่ Admit";
    if (!formData.age_years && !formData.age_months && !formData.age_days)
      errors.age = "กรุณาระบุอายุ";
    if (!formData.vital_temp) errors.vital_temp = "แนะนำให้กรอกอุณหภูมิ";
    if (!sd.doe) errors.doe = "กรุณาระบุ DOE";
    if (
      formData.admission_date &&
      sd.doe &&
      new Date(sd.doe) < new Date(formData.admission_date)
    )
      errors.doe = "DOE ต้องไม่น้อยกว่าวันที่ Admit";
    if (!analysisResult) errors.analysis = 'กรุณากด "ประมวลผล" ก่อนส่ง';
    return errors;
  };

  const handleSubmitClinical = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    setValidationErrors(errors);
    if (
      Object.entries(errors).filter(([, m]) => !m.startsWith("แนะนำ")).length >
      0
    ) {
      showToast("error", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    const latestUser = systemUsers.find((u) => u.id === currentUser.id);
    const fullData = { ...systemDataRef.current, dynamic_data: dynamicData };

    // ✅ หา ward_name จาก wards
    const myWardId = Number(currentUser.ward_id) || null;
    const myWard = wards.find((w) => w.id === myWardId);

    const record = {
      id: `IC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
      hn: String(formData.hn || ""),
      patient_name: String(formData.patient_name || ""),
      ward_id: myWardId,
      ward_name: myWard?.name || "ไม่ระบุ",
      device_type: String(fullData.system || "BSI"),
      status: "Pending",
      created_by: Number(currentUser.id) || null,
      auto_assess_result: String(analysisResult.title || ""),
      detailed_analysis_json: {
        clinical_vitals: {
          ...formData,
          age_display: ageDisplay,
          gender: formData.gender,
        },
        infectious_data: fullData,
        ai_result: analysisResult,
        ward_name: myWard?.name || "ไม่ระบุ",
        submitted_by:
          latestUser?.full_name || currentUser.full_name || "Unknown",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vital_temp: Number(formData.vital_temp) || null,
      vital_pulse: Number(formData.vital_pulse) || null,
      vital_bp_sys: Number(formData.vital_bp_sys) || null,
      vital_bp_dia: Number(formData.vital_bp_dia) || null,
      vital_spo2: Number(formData.vital_spo2) || null,
      admission_date: formData.admission_date || null,
      date_of_event: fullData.doe || null,
      age_text: ageDisplay,
      gender: formData.gender || null,
    };
    const { error } = await supabase
      .from("assessments")
      .insert([record])
      .select();
    if (error) {
      showToast("error", `ส่งไม่สำเร็จ: ${error.message}`);
      setIsSubmitting(false);
      return;
    }
    showToast("success", "ส่งเคสสำเร็จ");
    setFormData({
      hn: "",
      patient_name: "",
      dx: "",
      age_years: "",
      age_months: "",
      age_days: "",
      gender: "",
      admission_date: "",
      vital_temp: "",
      vital_pulse: "",
      vital_rr: "",
      vital_bp_sys: "",
      vital_bp_dia: "",
      vital_spo2: "",
    });
    systemDataRef.current = { system: "BSI", doe: "", dynamic_data: {} };
    setDynamicData({});
    setSystemKey((p) => p + 1);
    setAnalysisResult(null);
    setValidationErrors({});
    fetchAssessments();
    setIsSubmitting(false);
  };

  const handleCancelCase = async (id) => {
    if (!window.confirm("ยืนยันการดึงเรื่องกลับ?")) return;
    await supabase
      .from("assessments")
      .update({ status: "Cancelled" })
      .eq("id", id);
    await supabase.from("audit_logs").insert([
      {
        assessment_id: id,
        action_type: "CANCEL_CASE",
        old_value: "Pending",
        new_value: "Cancelled",
        changed_by: currentUser.id,
        details: "พยาบาลขอดึงเรื่องกลับ",
      },
    ]);
    showToast("success", "ดึงเรื่องกลับสำเร็จ");
    fetchAssessments();
  };

  const handleOpenAuditModal = (assessment) => {
    setSelectedAssessment(assessment);
    setShowAuditModal(true);
  };

  const sysData = systemDataRef.current;

  const filteredAssessments = assessments.filter((item) => {
    const matchCat =
      filters.category === "all" || item.device_type === filters.category;
    const matchSearch =
      !filters.search ||
      item.patient_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.hn?.toLowerCase().includes(filters.search.toLowerCase());
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
    return matchCat && matchSearch && matchDate;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <div className="w-full xl:w-1/3 xl:sticky xl:top-24 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Clinical Triage
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm font-medium">
                ประเมินความเสี่ยงและวินิจฉัยการติดเชื้อ
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* 🔑 ปุ่มเปลี่ยนรหัสผ่าน */}
              <button
                onClick={() => setShowChangePassword(true)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                title="เปลี่ยนรหัสผ่าน"
              >
                <Key className="w-5 h-5" />
              </button>

              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                showPanel={showNotifPanel}
                setShowPanel={setShowNotifPanel}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                clearAll={clearAll}
                title="ตอบกลับจาก IC"
                emptyMessage="ยังไม่มีการตอบกลับจาก IC"
                variant="nurse"
              />
            </div>
          </div>
          <PatientForm
            formData={formData}
            setFormData={setFormData}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
            handleEnter={handleEnter}
            showToast={showToast}
          />
          <VitalsCard
            formData={formData}
            setFormData={setFormData}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
            handleEnter={handleEnter}
            calculatedMap={calculatedMap}
          />
        </div>

        <div className="w-full xl:w-2/3">
          <form
            onSubmit={handleSubmitClinical}
            className="bg-white rounded-3xl shadow-md border border-indigo-100 overflow-hidden"
          >
            <CategorySelector
              categories={systemCategories}
              selected={sysData.system}
              onSelect={handleCategoryChange}
            />

            <div className="p-7 md:p-8 space-y-8 bg-white">
              <div
                className={`flex flex-col md:flex-row md:items-center gap-5 p-6 rounded-2xl border shadow-sm transition-all ${validationErrors.doe ? "bg-rose-50 border-rose-200" : "bg-white border-indigo-100"}`}
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    Date of Event (DOE) *
                  </label>
                  <input
                    id="inp_doe"
                    required
                    type="date"
                    value={sysData.doe}
                    onChange={(e) => {
                      systemDataRef.current.doe = e.target.value;
                      setSystemKey((p) => p + 1);
                      setValidationErrors({ ...validationErrors, doe: "" });
                    }}
                    className={`w-48 px-4 py-2.5 border rounded-xl text-sm font-mono outline-none transition-all ${validationErrors.doe ? "bg-white border-rose-300" : "bg-slate-50 border-slate-200 focus:border-indigo-400 focus:bg-white"}`}
                  />
                  <ErrorMessage message={validationErrors.doe} />
                </div>
                {formData.admission_date &&
                  sysData.doe &&
                  calculateHospitalDay(formData.admission_date, sysData.doe) !==
                    null && (
                    <div className="md:mt-5">
                      {calculateHospitalDay(
                        formData.admission_date,
                        sysData.doe,
                      ) >= 3 ? (
                        <span className="px-4 py-2 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1.5 w-fit">
                          <AlertTriangle className="w-3.5 h-3.5" /> Hospital Day{" "}
                          {calculateHospitalDay(
                            formData.admission_date,
                            sysData.doe,
                          )}{" "}
                          (HAI)
                        </span>
                      ) : (
                        <span className="px-4 py-2 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1.5 w-fit">
                          <AlertTriangle className="w-3.5 h-3.5" /> Hospital Day{" "}
                          {calculateHospitalDay(
                            formData.admission_date,
                            sysData.doe,
                          )}{" "}
                          (POA)
                        </span>
                      )}
                    </div>
                  )}
              </div>

              <div className="rounded-3xl border border-indigo-100 p-7 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-indigo-100">
                  <h4 className="text-lg font-bold text-slate-800 tracking-tight">
                    เกณฑ์ระบาดวิทยา ({sysData.system})
                  </h4>
                  <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    {currentAgeCategory === "infant"
                      ? "👶 Infant < 1 Y"
                      : "🧑 Adult ≥ 1 Y"}
                  </span>
                </div>
                <FormEngine
                  key={sysData.system + systemKey}
                  schema={
                    cdcConfig?.[sysData.system] ||
                    DEFAULT_CDC_DB?.[sysData.system]
                  }
                  data={dynamicData}
                  patientAgeYears={getAgeYears()}
                  patientAgeDisplay={ageDisplay}
                  onChange={handleFormChange}
                />
              </div>

              {validationErrors.analysis && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-bold text-rose-700">
                    {validationErrors.analysis}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
                >
                  <Calculator className="w-5 h-5 opacity-70" />{" "}
                  ประมวลผลทางสถิติด้วย Triage AI
                </button>
              </div>

              <AnalysisResult analysisResult={analysisResult} />
            </div>

            <div className="p-6 border-t border-indigo-100 flex justify-end bg-white">
              <button
                disabled={isSubmitting || !analysisResult}
                type="submit"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-10 py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2.5 hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> ส่งรายงานคัดกรองเข้าสู่ศูนย์ควบคุม
              </button>
            </div>
          </form>
        </div>
      </div>

      <RecentCases
        filteredAssessments={filteredAssessments}
        systemCategories={systemCategories}
        filters={filters}
        setFilters={setFilters}
        onOpenAudit={handleOpenAuditModal}
        onCancelCase={handleCancelCase}
        cdcConfig={cdcConfig}
      />

      {/* 👥 Panel จัดการผู้ใช้ในวอร์ด */}
      <NurseUsersPanel
        currentUser={currentUser}
        systemUsers={systemUsers}
        wards={wards}
        showToast={showToast}
      />

      <AuditModal
        show={showAuditModal}
        assessment={selectedAssessment}
        onClose={() => setShowAuditModal(false)}
        systemUsers={systemUsers}
        variant="nurse"
        cdcConfig={cdcConfig || DEFAULT_CDC_DB}
      />

      {/* 🔑 Modal เปลี่ยนรหัสผ่าน */}
      {showChangePassword && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setShowChangePassword(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

WardNursePane.propTypes = {
  currentUser: PropTypes.object.isRequired,
  wards: PropTypes.array.isRequired,
  systemUsers: PropTypes.array.isRequired,
  cdcConfig: PropTypes.object.isRequired,
  assessments: PropTypes.array.isRequired,
  fetchAssessments: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  systemCategories: PropTypes.array.isRequired,
  viewedCases: PropTypes.object,
  markCaseAsViewed: PropTypes.func,
  isCaseNew: PropTypes.func,
};
