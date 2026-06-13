import React, { useState } from "react";
import { Key, X, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

export default function ChangePasswordModal({
  currentUser,
  onClose,
  showToast,
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (newPassword.length < 3) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 3 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    if (oldPassword === newPassword) {
      setError("รหัสผ่านใหม่ต้องไม่ตรงกับรหัสผ่านเดิม");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. ตรวจสอบรหัสผ่านเก่า
      const { data: verifyData, error: verifyError } = await supabase.rpc(
        "verify_user",
        {
          p_username: currentUser.username,
          p_password: oldPassword,
        },
      );

      if (
        verifyError ||
        !verifyData ||
        verifyData.length === 0 ||
        verifyData[0].error_msg
      ) {
        setError("รหัสผ่านเดิมไม่ถูกต้อง");
        setIsSubmitting(false);
        return;
      }

      // 2. อัปเดตรหัสผ่านใหม่
      const { error: updateError } = await supabase.rpc(
        "update_user_password",
        {
          p_user_id: currentUser.id,
          p_new_password: newPassword,
        },
      );

      if (updateError) {
        setError(`เปลี่ยนรหัสผ่านไม่สำเร็จ: ${updateError.message}`);
        setIsSubmitting(false);
        return;
      }

      showToast(
        "success",
        "✅ เปลี่ยนรหัสผ่านสำเร็จ! ใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งต่อไป",
      );
      onClose();
    } catch (err) {
      setError("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" /> เปลี่ยนรหัสผ่าน
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm mb-4 border border-rose-100 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white"
              placeholder="อย่างน้อย 3 ตัวอักษร"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-slate-50 focus:bg-white"
              placeholder="ใส่รหัสผ่านใหม่อีกครั้ง"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              "⏳ กำลังบันทึก..."
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> บันทึกรหัสผ่านใหม่
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
