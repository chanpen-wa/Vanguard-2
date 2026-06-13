import React from "react";
import { User } from "lucide-react";
import ErrorMessage from "../shared/ErrorMessage";
import { supabase } from "../../utils/supabaseClient";

/**
 * 🏥 Vanguard IC — Patient Form
 * ฟอร์มกรอกข้อมูลผู้ป่วยสำหรับ Nurse
 */
export default function PatientForm({
  formData,
  setFormData,
  validationErrors = {},
  setValidationErrors,
  handleEnter,
  showToast,
}) {
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ✅ Auto-fill เมื่อออกจากช่อง HN
  const handleHnBlur = async () => {
    const hn = formData.hn?.trim();
    if (!hn) return;

    try {
      const { data, error } = await supabase
        .from("assessments")
        .select("patient_name, age_text, gender")
        .eq("hn", hn)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setFormData((prev) => ({
          ...prev,
          patient_name: data.patient_name || prev.patient_name,
          age_text: data.age_text || prev.age_text,
          gender: data.gender || prev.gender,
        }));
        if (showToast) {
          showToast(
            "info",
            `📋 ดึงข้อมูลจากเคสล่าสุด HN: ${hn} — ตรวจสอบก่อนส่ง`,
          );
        }
      }
    } catch (err) {
      // Silent — ไม่เจอไม่เป็นไร
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-7">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 text-slate-800 font-bold">
        <User className="w-5 h-5 opacity-50" /> ข้อมูลผู้ป่วย (Patient Data)
      </div>
      <div className="space-y-4">
        {/* HN + Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              HN *
            </label>
            <input
              id="inp_hn"
              required
              type="text"
              value={formData.hn}
              onChange={(e) => updateField("hn", e.target.value)}
              onBlur={handleHnBlur}
              onKeyDown={(e) => handleEnter(e, "inp_name")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-all ${
                validationErrors.hn
                  ? "bg-rose-50 border-rose-300"
                  : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white"
              }`}
            />
            <ErrorMessage message={validationErrors.hn} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Patient Name *
            </label>
            <input
              id="inp_name"
              required
              type="text"
              value={formData.patient_name}
              onChange={(e) => updateField("patient_name", e.target.value)}
              onKeyDown={(e) => handleEnter(e, "inp_admit")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm font-medium outline-none transition-all ${
                validationErrors.patient_name
                  ? "bg-rose-50 border-rose-300"
                  : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white"
              }`}
            />
            <ErrorMessage message={validationErrors.patient_name} />
          </div>
        </div>

        {/* Gender + Diagnosis */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Gender *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => updateField("gender", e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm font-medium outline-none transition-all ${
                validationErrors.gender
                  ? "bg-rose-50 border-rose-300"
                  : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white"
              }`}
            >
              <option value="">-- เลือก --</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
            </select>
            <ErrorMessage message={validationErrors.gender} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Diagnosis
            </label>
            <input
              id="inp_dx"
              type="text"
              value={formData.dx}
              onChange={(e) => updateField("dx", e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-colors"
              placeholder="Dx..."
            />
          </div>
        </div>

        {/* Admit Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              Admit Date *
            </label>
            <input
              id="inp_admit"
              required
              type="date"
              value={formData.admission_date}
              onChange={(e) => updateField("admission_date", e.target.value)}
              onKeyDown={(e) => handleEnter(e, "inp_y")}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono outline-none transition-all ${
                validationErrors.admission_date
                  ? "bg-rose-50 border-rose-300"
                  : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white"
              }`}
            />
            <ErrorMessage message={validationErrors.admission_date} />
          </div>
          <div></div>
        </div>

        {/* Age — Year / Month / Day */}
        <div
          className={`grid grid-cols-3 gap-3 p-4 rounded-2xl border transition-all ${
            validationErrors.age
              ? "bg-rose-50 border-rose-200"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">
              Years
            </label>
            <input
              id="inp_y"
              type="number"
              min="0"
              value={formData.age_years}
              onChange={(e) => updateField("age_years", e.target.value)}
              onKeyDown={(e) => handleEnter(e, "inp_m")}
              className="w-full px-2 py-2 border border-slate-200 bg-white rounded-xl text-sm text-center font-bold text-slate-700 outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">
              Months
            </label>
            <input
              id="inp_m"
              type="number"
              min="0"
              max="11"
              value={formData.age_months}
              onChange={(e) => updateField("age_months", e.target.value)}
              onKeyDown={(e) => handleEnter(e, "inp_d")}
              className="w-full px-2 py-2 border border-slate-200 bg-white rounded-xl text-sm text-center font-medium outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">
              Days
            </label>
            <input
              id="inp_d"
              type="number"
              min="0"
              max="31"
              value={formData.age_days}
              onChange={(e) => updateField("age_days", e.target.value)}
              onKeyDown={(e) => handleEnter(e, "inp_temp")}
              className="w-full px-2 py-2 border border-slate-200 bg-white rounded-xl text-sm text-center font-medium outline-none focus:border-slate-400"
            />
          </div>
          {validationErrors.age && (
            <div className="col-span-3">
              <ErrorMessage message={validationErrors.age} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
