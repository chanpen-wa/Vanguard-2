import React, { useState } from "react";
import { Users, Unlock, RotateCcw } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

// 🪟 Modal ยืนยัน
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-bold text-lg text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-xl text-sm font-bold hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NurseUsersPanel({
  currentUser,
  systemUsers = [],
  wards = [],
  showToast,
}) {
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(null);

  // ✅ เห็นเฉพาะผู้ใช้ใน ward ตัวเอง
  const myWardUsers = systemUsers.filter(
    (u) => u.ward_id === currentUser.ward_id,
  );
  const myWard = wards.find((w) => w.id === currentUser.ward_id);

  // 🔓 ปลดล็อค
  const handleUnlock = async (username) => {
    if (username === currentUser.username) {
      showToast("error", "❌ ไม่สามารถปลดล็อคตัวเองได้");
      return;
    }
    const { error } = await supabase.rpc("unlock_user", {
      p_username: username,
      p_unlocked_by: currentUser.username,
    });
    if (error) showToast("error", `ปลดล็อคไม่สำเร็จ: ${error.message}`);
    else showToast("success", `🔓 ปลดล็อค ${username} สำเร็จ`);
    setShowUnlockConfirm(null);
  };

  // 🔄 รีเซ็ตรหัสผ่าน
  const handleReset = async (userId, username, fullName) => {
    if (username === currentUser.username) {
      showToast("error", "❌ ไม่สามารถรีเซ็ตรหัสผ่านตัวเองได้");
      return;
    }
    const { error } = await supabase.rpc("reset_user_password", {
      p_user_id: userId,
      p_username: username,
      p_reset_by: currentUser.username,
    });
    if (error) showToast("error", `รีเซ็ตไม่สำเร็จ: ${error.message}`);
    else showToast("success", `🔄 รีเซ็ตรหัส ${username} เป็น 123 เรียบร้อย`);
    setShowResetConfirm(null);
  };

  return (
    <div className="rounded-3xl shadow-sm border border-slate-200 bg-white mt-10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          ผู้ใช้ในวอร์ด: {myWard?.name || "-"}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          ปลดล็อค หรือ รีเซ็ตรหัสผ่านให้เพื่อนร่วมวอร์ด
        </p>
      </div>

      {/* User List */}
      <div className="p-4 space-y-2">
        {myWardUsers.length === 0 ? (
          <p className="text-center text-slate-400 py-4">
            ไม่มีผู้ใช้ในวอร์ดนี้
          </p>
        ) : (
          myWardUsers.map((u) => {
            const isMe = u.username === currentUser.username;
            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div>
                  <p className="font-bold text-slate-700 text-sm">
                    {u.full_name}{" "}
                    {isMe && (
                      <span className="text-[10px] text-slate-400">(คุณ)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    @{u.username} • {u.role}
                  </p>
                </div>

                {/* ปุ่ม — แสดงเฉพาะคนอื่นที่ไม่ใช่ตัวเอง */}
                {!isMe && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowUnlockConfirm(u)}
                      className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                      title="ปลดล็อค"
                    >
                      <Unlock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(u)}
                      className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                      title="รีเซ็ตรหัสผ่านเป็น 123"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal ยืนยันปลดล็อค */}
      {showUnlockConfirm && (
        <ConfirmModal
          title="🔓 ยืนยันการปลดล็อค"
          message={`ปลดล็อคผู้ใช้: ${showUnlockConfirm.full_name} (@${showUnlockConfirm.username})?`}
          onConfirm={() => handleUnlock(showUnlockConfirm.username)}
          onCancel={() => setShowUnlockConfirm(null)}
        />
      )}

      {/* Modal ยืนยันรีเซ็ตรหัสผ่าน */}
      {showResetConfirm && (
        <ConfirmModal
          title="🔄 ยืนยันการรีเซ็ตรหัสผ่าน"
          message={`รีเซ็ตรหัสผ่านของ: ${showResetConfirm.full_name} (@${showResetConfirm.username}) เป็น 123?`}
          onConfirm={() =>
            handleReset(
              showResetConfirm.id,
              showResetConfirm.username,
              showResetConfirm.full_name,
            )
          }
          onCancel={() => setShowResetConfirm(null)}
        />
      )}
    </div>
  );
}
