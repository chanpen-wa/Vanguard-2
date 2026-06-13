import React from "react";

/**
 * 🖨️ Vanguard IC — Bulk Print Container
 * แม่แบบพิมพ์แบบกลุ่ม (HA-Compliant) สำหรับพิมพ์หลายเคสพร้อมกัน
 * ใช้ใน ICCommandCenter
 *
 * @param {Object} props
 * @param {Array} props.assessments - เคสทั้งหมด
 * @param {Array} props.selectedIds - ID ของเคสที่เลือกพิมพ์
 */
export default function BulkPrintContainer({
  assessments = [],
  selectedIds = [],
}) {
  if (selectedIds.length === 0) return null;

  const selectedCases = assessments.filter((a) => selectedIds.includes(a.id));

  return (
    <div
      id="bulk-print-container"
      style={{
        display: "none",
        boxSizing: "border-box",
      }}
      className="bg-white text-black font-sans"
    >
      {selectedCases.map((caseData, idx) => (
        <div
          key={caseData.id}
          className="print-page"
          style={{
            pageBreakAfter: idx < selectedCases.length - 1 ? "always" : "auto",
            padding: "2cm",
            background: "white",
            minHeight: "297mm",
            width: "210mm",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h2 className="text-2xl font-bold uppercase">
              แบบบันทึกการเฝ้าระวังการติดเชื้อในโรงพยาบาล
            </h2>
            <p className="text-lg">(Infection Control Assessment Record)</p>
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
                  {caseData.detailed_analysis_json?.infectious_data?.doe || "-"}
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
            <p className="font-bold text-lg">{caseData.auto_assess_result}</p>
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
              <strong>ข้อเสนอแนะ/หมายเหตุ:</strong> {caseData.ic_notes || "-"}
            </p>
          </div>

          <div className="flex justify-between mt-16 pt-8 text-sm">
            <div className="text-center w-64">
              <p className="mb-1">
                ลงชื่อ......................................................
              </p>
              <p className="text-sm">
                (............................................................)
              </p>
              <p className="mt-1 font-bold">พยาบาลผู้ประเมิน</p>
            </div>
            <div className="text-center w-64">
              <p className="mb-1">
                ลงชื่อ......................................................
              </p>
              <p className="text-sm">
                (............................................................)
              </p>
              <p className="mt-1 font-bold">พยาบาลควบคุมการติดเชื้อ / IC</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
