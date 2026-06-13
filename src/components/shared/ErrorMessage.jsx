import React from "react";
import { AlertTriangle } from "lucide-react";

/**
 * ⚠️ Vanguard IC — Error Message Component
 * แสดงข้อความ error หรือ warning สำหรับการ validation ฟอร์ม
 *
 * @param {Object} props
 * @param {string} [props.message] - ข้อความ error (ถ้าไม่มีจะไม่แสดงอะไร)
 * @param {string} [props.className] - เพิ่ม class
 */
export default function ErrorMessage({ message, className = "" }) {
  if (!message) return null;

  const isWarning = message.startsWith("แนะนำ");

  return (
    <div
      className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium animate-in fade-in slide-in-from-top-1 ${
        isWarning ? "text-amber-600" : "text-rose-600"
      } ${className}`}
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
