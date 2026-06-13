import React from "react";
import { Activity } from "lucide-react";
import ErrorMessage from "../shared/ErrorMessage";

/**
 * 🩺 Vanguard IC — Vitals Card
 * ฟอร์มกรอกสัญญาณชีพสำหรับ Nurse
 */
export default function VitalsCard({
  formData,
  setFormData,
  validationErrors = {},
  setValidationErrors,
  handleEnter,
  calculatedMap,
}) {
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "vital_temp") {
      setValidationErrors((prev) => ({ ...prev, vital_temp: "" }));
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-7">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 text-slate-800 font-bold">
        <Activity className="w-5 h-5 opacity-50" /> สัญญาณชีพ (Vitals)
      </div>
      <div className="grid grid-cols-2 gap-5">
        {/* Temperature */}
        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Temperature (°C)
          </label>
          <input
            id="inp_temp"
            type="number"
            step="0.1"
            value={formData.vital_temp}
            onChange={(e) => updateField("vital_temp", e.target.value)}
            onKeyDown={(e) => handleEnter(e, "inp_pulse")}
            className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-colors ${
              formData.vital_temp > 38 ||
              (formData.vital_temp !== "" && formData.vital_temp < 36)
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : validationErrors.vital_temp
                  ? "bg-amber-50 border-amber-300"
                  : "bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-400"
            }`}
            placeholder="37.0"
          />
          <ErrorMessage message={validationErrors.vital_temp} />
        </div>

        {/* Pulse */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Pulse
          </label>
          <input
            id="inp_pulse"
            type="number"
            value={formData.vital_pulse}
            onChange={(e) => updateField("vital_pulse", e.target.value)}
            onKeyDown={(e) => handleEnter(e, "inp_rr")}
            className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm outline-none focus:bg-white focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Resp. Rate */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Resp. Rate
          </label>
          <input
            id="inp_rr"
            type="number"
            value={formData.vital_rr}
            onChange={(e) => updateField("vital_rr", e.target.value)}
            onKeyDown={(e) => handleEnter(e, "inp_sys")}
            className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm outline-none focus:bg-white focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Blood Pressure */}
        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            Blood Pressure
          </label>
          <div className="flex items-center gap-2">
            <input
              id="inp_sys"
              type="number"
              value={formData.vital_bp_sys}
              onChange={(e) => updateField("vital_bp_sys", e.target.value)}
              onKeyDown={(e) => handleEnter(e, "inp_dia")}
              className="w-1/3 px-2 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm text-center outline-none transition-colors"
              placeholder="Sys"
            />
            <span className="text-slate-300 font-light text-xl">/</span>
            <input
              id="inp_dia"
              type="number"
              value={formData.vital_bp_dia}
              onChange={(e) => updateField("vital_bp_dia", e.target.value)}
              onKeyDown={(e) => handleEnter(e, "inp_spo2")}
              className="w-1/3 px-2 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm text-center outline-none transition-colors"
              placeholder="Dia"
            />
            <div className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs text-center font-bold tracking-wide">
              MAP: {calculatedMap}
            </div>
          </div>
        </div>

        {/* SpO2 */}
        <div className="col-span-2">
          <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
            SpO2 (%)
          </label>
          <input
            id="inp_spo2"
            type="number"
            value={formData.vital_spo2}
            onChange={(e) => updateField("vital_spo2", e.target.value)}
            onKeyDown={(e) => handleEnter(e, "inp_doe")}
            className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm outline-none transition-colors"
            placeholder="98"
          />
        </div>
      </div>
    </div>
  );
}
