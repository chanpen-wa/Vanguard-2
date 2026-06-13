import React, { useState } from "react";
import {
  Settings,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Unlock,
  RotateCcw,
  UserCog,
  Key,
  History,
  Undo2,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

export default function UsersTab({
  wards = [],
  systemUsers = [],
  fetchGlobalData,
  showToast,
  currentUser = {},
  updateCurrentUser,
}) {
  const [newWardName, setNewWardName] = useState("");
  const [editingWard, setEditingWard] = useState(null);
  const [editingUsername, setEditingUsername] = useState({});
  const [editingField, setEditingField] = useState({});
  const [editingRole, setEditingRole] = useState({});
  const [editingFullName, setEditingFullName] = useState({});
  const [newIcUsername, setNewIcUsername] = useState("");
  const [newIcFullName, setNewIcFullName] = useState("");
  const [newIcRole, setNewIcRole] = useState("ICWN");

  // 🔑 Change Password Modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordUser, setChangePasswordUser] = useState(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 🗑️ Soft Delete: แสดงรายการวอร์ดที่ถูกลบ
  const [showDeletedWards, setShowDeletedWards] = useState(false);

  const checkUsernameDuplicate = async (username, excludeUserId) => {
    if (!username || username.trim() === "") return false;

    let query = supabase
      .from("system_users")
      .select("id")
      .eq("username", username.trim());

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  };

  const nurseUsers = systemUsers.filter((u) => u.role === "NURSE");
  const icUsers = systemUsers.filter((u) => u.role !== "NURSE");

  // 🗑️ วอร์ดที่ถูกลบ (Soft Delete)
  const deletedWards = wards.filter((w) => w.is_deleted === true);
  const activeWards = wards.filter((w) => !w.is_deleted);

  // ==========================================
  // 🔓 Unlock
  // ==========================================
  const handleUnlockUser = async (username) => {
    if (
      currentUser.username === "ic_head" &&
      username === currentUser.username
    ) {
      showToast("error", "❌ ไม่สามารถปลดล็อคบัญชี IC Head ต้นแบบได้");
      return;
    }
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
  };

  // ==========================================
  // 🔄 Reset Password
  // ==========================================
  const handleResetPassword = async (id, username, fullName) => {
    if (
      currentUser.username === "ic_head" &&
      username === currentUser.username
    ) {
      showToast(
        "error",
        "❌ ไม่สามารถรีเซ็ตรหัสผ่านของบัญชี IC Head ต้นแบบได้",
      );
      return;
    }
    if (username === currentUser.username) {
      showToast("error", "❌ ไม่สามารถรีเซ็ตรหัสตัวเองได้");
      return;
    }
    if (
      !window.confirm(
        `⚠️ รีเซ็ตรหัสผ่าน?\n\nผู้ใช้: ${fullName || username}\nรหัสใหม่จะเป็น: 123\n\nยืนยันการรีเซ็ต?`,
      )
    )
      return;
    const { error } = await supabase.rpc("reset_user_password", {
      p_user_id: id,
      p_username: username,
      p_reset_by: currentUser.username,
    });
    if (error) showToast("error", `รีเซ็ตไม่สำเร็จ: ${error.message}`);
    else {
      showToast("success", `🔄 รีเซ็ตรหัส ${username} เป็น 123 เรียบร้อย`);
      fetchGlobalData();
    }
  };

  // ==========================================
  // ✏️ Change Full Name
  // ==========================================
  const handleSaveFullName = async (id) => {
    const newName = editingFullName[id];
    if (!newName || newName.trim() === "") {
      showToast("error", "❌ ชื่อห้ามว่าง");
      return;
    }
    const { error } = await supabase
      .from("system_users")
      .update({ full_name: newName })
      .eq("id", id);
    if (error) {
      showToast("error", `เปลี่ยนชื่อไม่สำเร็จ: ${error.message}`);
    } else {
      setEditingFullName((prev) => ({ ...prev, [id]: null }));
      if (id === currentUser.id && updateCurrentUser)
        updateCurrentUser({ full_name: newName });
      fetchGlobalData();
      showToast("success", `✅ เปลี่ยนชื่อเป็น ${newName} สำเร็จ`);
    }
  };

  // ==========================================
  // 👔 Change Role
  // ==========================================
  const handleSaveRole = async (id, newRole) => {
    if (!newRole) return;
    const user = systemUsers.find((u) => u.id === id);

    if (currentUser.username === "ic_head" && id === currentUser.id) {
      showToast("error", "❌ ไม่สามารถเปลี่ยน Role ของบัญชี IC Head ต้นแบบได้");
      return;
    }
    if (user?.username === "ic_head" && newRole !== "IC_HEAD") {
      showToast("error", "❌ ไม่สามารถเปลี่ยน Role ของบัญชี IC Head ต้นแบบได้");
      return;
    }
    if (newRole === "IC_HEAD" && user?.username !== "ic_head") {
      showToast("error", "❌ มีได้แค่ 1 บัญชี IC_HEAD ต้นแบบเท่านั้น");
      return;
    }
    if (id === currentUser.id && newRole === "NURSE") {
      showToast("error", "❌ ไม่สามารถลด Role ตัวเองเป็น NURSE ได้");
      return;
    }
    if (
      !window.confirm(
        `⚠️ เปลี่ยน Role?\n\nผู้ใช้: ${user?.full_name || "Unknown"}\nจาก: ${user?.role} → เป็น: ${newRole}\n\nยืนยันการเปลี่ยน?`,
      )
    )
      return;
    const { error } = await supabase
      .from("system_users")
      .update({ role: newRole })
      .eq("id", id);
    if (error) {
      showToast("error", `เปลี่ยน Role ไม่สำเร็จ: ${error.message}`);
    } else {
      setEditingRole((prev) => ({ ...prev, [id]: null }));
      if (id === currentUser.id && updateCurrentUser) {
        updateCurrentUser({ role: newRole, full_name: user?.full_name });
        window.location.reload();
      }
      fetchGlobalData();
      showToast("success", `✅ เปลี่ยน Role เป็น ${newRole} สำเร็จ`);
    }
  };

  // ==========================================
  // 👤 Change Username
  // ==========================================
  const handleSaveUsername = async (id) => {
    const newValue = editingUsername[id];
    if (!newValue || newValue.trim() === "") {
      showToast("error", "❌ Username ห้ามว่าง");
      return;
    }
    const user = systemUsers.find((u) => u.id === id);
    if (
      !window.confirm(
        `⚠️ ยืนยันการเปลี่ยน Username?\n\nผู้ใช้: ${user?.full_name || "Unknown"}\nUsername ใหม่: ${newValue}\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`,
      )
    )
      return;
    const isDuplicate = await checkUsernameDuplicate(newValue, id);
    if (isDuplicate) {
      showToast("error", `❌ Username "${newValue}" มีคนใช้แล้ว`);
      return;
    }
    await supabase
      .from("system_users")
      .update({ username: newValue })
      .eq("id", id);
    setEditingField((prev) => ({ ...prev, [id]: null }));
    setEditingUsername((prev) => ({ ...prev, [id]: undefined }));
    fetchGlobalData();
    showToast("success", `🔐 เปลี่ยน Username สำเร็จ`);
  };

  // ==========================================
  // 🔐 Change Password (by IC)
  // ==========================================
  const handleOpenChangePassword = (user) => {
    setChangePasswordUser(user);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowChangePassword(true);
  };

  const handleSubmitChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (newPassword.length < 3) {
      setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    const { data: verifyData, error: verifyError } = await supabase.rpc(
      "verify_user",
      {
        p_username: changePasswordUser.username,
        p_password: oldPassword,
      },
    );
    if (
      verifyError ||
      !verifyData ||
      verifyData.length === 0 ||
      verifyData[0].error_msg
    ) {
      setPasswordError("รหัสผ่านเดิมไม่ถูกต้อง");
      return;
    }

    const { error: updateError } = await supabase.rpc("update_user_password", {
      p_user_id: changePasswordUser.id,
      p_new_password: newPassword,
    });
    if (updateError) {
      setPasswordError(`เปลี่ยนไม่สำเร็จ: ${updateError.message}`);
      return;
    }

    showToast(
      "success",
      `🔐 เปลี่ยนรหัสผ่านให้ ${changePasswordUser.full_name} สำเร็จ`,
    );
    setShowChangePassword(false);
  };

  // ==========================================
  // 🏥 Wards — ใช้ Soft Delete
  // ==========================================
  const handleAddWard = async () => {
    if (!newWardName) return;
    const { data: wData } = await supabase
      .from("wards")
      .insert({ name: newWardName, is_deleted: false })
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
        showToast("error", `สร้างผู้ใช้ไม่สำเร็จ: ${error.message}`);
        return;
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

  // 🆕 Soft Delete — ไม่ลบจริง แต่ตั้ง is_deleted = true
  const handleSoftDeleteWard = async (id, wardName) => {
    const nursesInWard = nurseUsers.filter((u) => u.ward_id === id);

    if (
      !window.confirm(
        `⚠️ ยืนยันการลบหอผู้ป่วย "${wardName}"?\n\n` +
          `📌 จำนวนพยาบาลในวอร์ด: ${nursesInWard.length} คน\n\n` +
          `🔒 การลบจะ:\n` +
          `1. ซ่อนหอผู้ป่วยจากรายการหลัก\n` +
          `2. ระงับบัญชีพยาบาลทุกคนในวอร์ดนี้ (ไม่สามารถล็อกอินได้)\n` +
          `3. เก็บข้อมูลไว้ในถังขยะ (กู้คืนได้)\n\n` +
          `💡 สามารถกู้คืนได้จาก "🗑️ ถังขยะ" ด้านล่าง`,
      )
    )
      return;

    try {
      // 1. Soft Delete วอร์ด
      const { error: wardError } = await supabase
        .from("wards")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.full_name,
        })
        .eq("id", id);

      if (wardError) throw wardError;

      // 2. ระงับบัญชีพยาบาล (ไม่ลบ)
      if (nursesInWard.length > 0) {
        const { error: userError } = await supabase
          .from("system_users")
          .update({
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspension_reason: `หอผู้ป่วย "${wardName}" ถูกลบเมื่อ ${new Date().toLocaleString("th-TH")}`,
          })
          .eq("ward_id", id);

        if (userError) throw userError;
      }

      showToast(
        "success",
        `✅ ย้าย "${wardName}" ไปถังขยะ (${nursesInWard.length} บัญชีถูกระงับ) — กู้คืนได้จากถังขยะ`,
      );
      fetchGlobalData();
    } catch (error) {
      showToast("error", "❌ ลบไม่สำเร็จ: " + error.message);
    }
  };

  // 🆕 กู้คืนวอร์ดจากถังขยะ
  const handleRestoreWard = async (id, wardName) => {
    const nursesInWard = nurseUsers.filter((u) => u.ward_id === id);

    if (
      !window.confirm(
        `🔄 กู้คืนหอผู้ป่วย "${wardName}"?\n\n` +
          `📌 จำนวนพยาบาลที่ถูกระงับ: ${nursesInWard.length} คน\n\n` +
          `✅ จะกลับมาแสดงในรายการหลัก\n` +
          `✅ บัญชีพยาบาลจะถูกปลดระงับ`,
      )
    )
      return;

    try {
      // 1. กู้คืนวอร์ด
      const { error: wardError } = await supabase
        .from("wards")
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq("id", id);

      if (wardError) throw wardError;

      // 2. ปลดระงับบัญชีพยาบาล
      if (nursesInWard.length > 0) {
        const { error: userError } = await supabase
          .from("system_users")
          .update({
            is_suspended: false,
            suspended_at: null,
            suspension_reason: null,
          })
          .eq("ward_id", id);

        if (userError) throw userError;
      }

      showToast(
        "success",
        `🔄 กู้คืน "${wardName}" สำเร็จ (${nursesInWard.length} บัญชีถูกปลดระงับ)`,
      );
      fetchGlobalData();
    } catch (error) {
      showToast("error", "❌ กู้คืนไม่สำเร็จ: " + error.message);
    }
  };

  // 🆕 ลบถาวร (Hard Delete) — ใช้เมื่อแน่ใจแล้ว
  const handlePermanentDeleteWard = async (id, wardName) => {
    const nursesInWard = nurseUsers.filter((u) => u.ward_id === id);

    if (
      !window.confirm(
        `⚠️⚠️⚠️ ลบถาวร "${wardName}"?\n\n` +
          `📌 จำนวนพยาบาล: ${nursesInWard.length} คน\n\n` +
          `🚨 คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้!\n` +
          `- บัญชีพยาบาลทุกคนในวอร์ดจะถูกลบถาวร\n` +
          `- ข้อมูลหอผู้ป่วยจะถูกลบถาวร\n\n` +
          `💡 แนะนำ: ใช้ Soft Delete แทน (กู้คืนได้)`,
      )
    )
      return;

    // Double confirm
    if (!window.confirm(`พิมพ์ชื่อวอร์ดเพื่อยืนยันการลบถาวร:\n\n"${wardName}"`))
      return;

    try {
      // 1. ลบบัญชีพยาบาลถาวร
      if (nursesInWard.length > 0) {
        await supabase.from("system_users").delete().eq("ward_id", id);
      }

      // 2. ลบวอร์ดถาวร
      const { error } = await supabase.from("wards").delete().eq("id", id);
      if (error) throw error;

      showToast("success", `🗑️ ลบ "${wardName}" ถาวรสำเร็จ`);
      fetchGlobalData();
    } catch (error) {
      showToast("error", "❌ ลบไม่สำเร็จ: " + error.message);
    }
  };

  // ==========================================
  // 👔 IC Users
  // ==========================================
  const handleAddIcUser = async () => {
    if (!newIcUsername || !newIcFullName) {
      showToast("error", "❌ กรุณากรอก Username และชื่อให้ครบ");
      return;
    }
    if (newIcUsername === "ic_head") {
      showToast("error", "❌ มีบัญชี IC_HEAD ต้นแบบได้เพียงบัญชีเดียวเท่านั้น");
      return;
    }
    const isDuplicate = await checkUsernameDuplicate(newIcUsername, null);
    if (isDuplicate) {
      showToast("error", `❌ Username "${newIcUsername}" มีคนใช้แล้ว`);
      return;
    }
    const { error } = await supabase.rpc("create_user_with_hash", {
      p_username: newIcUsername,
      p_password: "123",
      p_full_name: newIcFullName,
      p_role: newIcRole,
      p_ward_id: null,
    });
    if (error) {
      showToast("error", `สร้างผู้ใช้ไม่สำเร็จ: ${error.message}`);
      return;
    }
    setNewIcUsername("");
    setNewIcFullName("");
    setNewIcRole("ICWN");
    showToast("success", `✅ เพิ่มผู้ใช้ IC "${newIcFullName}" สำเร็จ`);
    fetchGlobalData();
  };
  // 🆕 Soft Delete สำหรับ IC Users — ย้ายไปถังขยะแทนลบจริง
  const handleDeleteIcUser = async (id, fullName, username) => {
    if (username === "ic_head") {
      showToast("error", "❌ ไม่สามารถลบบัญชี IC Head ต้นแบบได้");
      return;
    }

    if (
      !window.confirm(
        `⚠️ ย้าย "${fullName}" ไปถังขยะ?\n\n` +
          `🔒 บัญชีจะถูกระงับ (ไม่สามารถล็อกอินได้)\n` +
          `💡 สามารถกู้คืนได้จากถังขยะ\n\n` +
          `ยืนยันการดำเนินการ?`,
      )
    )
      return;

    const { error } = await supabase
      .from("system_users")
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: `ถูกลบโดย ${currentUser.full_name} เมื่อ ${new Date().toLocaleString("th-TH")}`,
      })
      .eq("id", id);

    if (error) {
      showToast("error", `ลบไม่สำเร็จ: ${error.message}`);
    } else {
      showToast(
        "success",
        `✅ ย้าย "${fullName}" ไปถังขยะ — กู้คืนได้จากถังขยะ`,
      );
      fetchGlobalData();
    }
  };

  // 🆕 กู้คืน IC User จากถังขยะ
  const handleRestoreIcUser = async (id, fullName) => {
    if (
      !window.confirm(
        `🔄 กู้คืน "${fullName}"?\n\n` +
          `✅ บัญชีจะถูกปลดระงับ\n` +
          `✅ สามารถล็อกอินได้ตามปกติ`,
      )
    )
      return;

    const { error } = await supabase
      .from("system_users")
      .update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq("id", id);

    if (error) {
      showToast("error", `กู้คืนไม่สำเร็จ: ${error.message}`);
    } else {
      showToast("success", `🔄 กู้คืน "${fullName}" สำเร็จ`);
      fetchGlobalData();
    }
  };

  // 🆕 ลบถาวร (Hard Delete) — ใช้เมื่อแน่ใจแล้ว
  const handlePermanentDeleteIcUser = async (id, fullName, username) => {
    if (username === "ic_head") {
      showToast("error", "❌ ไม่สามารถลบบัญชี IC Head ต้นแบบได้");
      return;
    }

    if (
      !window.confirm(
        `⚠️⚠️⚠️ ลบถาวร "${fullName}"?\n\n` +
          `🚨 คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้!\n` +
          `💡 แนะนำ: ใช้ Soft Delete แทน (กู้คืนได้)`,
      )
    )
      return;

    // Double confirm
    if (
      !window.confirm(`พิมพ์ชื่อผู้ใช้เพื่อยืนยันการลบถาวร:\n\n"${username}"`)
    )
      return;

    const { error } = await supabase.from("system_users").delete().eq("id", id);

    if (error) {
      showToast("error", `ลบไม่สำเร็จ: ${error.message}`);
    } else {
      showToast("success", `🗑️ ลบ "${fullName}" ถาวรสำเร็จ`);
      fetchGlobalData();
    }
  };

  // ==========================================
  // 🖼️ Render User Card
  // ==========================================
  const renderUserCard = (u, isIc = false) => {
    const isIcHead = u.username === "ic_head";
    const isMe = u.id === currentUser.id;
    const isSuspended = u.is_suspended === true;

    // ✅ ic_head ห้ามทำอะไรกับตัวเองเลย
    const isLocked = isIcHead && isMe;

    return (
      <li
        key={u.id}
        className={`p-3 rounded-xl border shadow-sm flex flex-col gap-2 ${
          isSuspended
            ? "border-amber-300 bg-amber-50/50"
            : "border-slate-100 bg-white"
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            {/* ... ส่วนแสดงชื่อเหมือนเดิม ... */}
            {editingFullName[u.id] !== undefined ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editingFullName[u.id]}
                  onChange={(e) =>
                    setEditingFullName((prev) => ({
                      ...prev,
                      [u.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveFullName(u.id);
                  }}
                  className="text-sm font-bold px-2 py-1 border border-indigo-300 rounded-md outline-none text-slate-800 w-36"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveFullName(u.id)}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <CheckCircle className="w-3 h-3" />
                </button>
                <button
                  onClick={() =>
                    setEditingFullName((prev) => ({ ...prev, [u.id]: null }))
                  }
                  className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span
                onClick={() => {
                  // ❌ ic_head ห้ามแก้ไขชื่อตัวเอง
                  if (isLocked) {
                    showToast(
                      "error",
                      "❌ ไม่สามารถแก้ไขชื่อบัญชี IC Head ต้นแบบได้",
                    );
                    return;
                  }
                  setEditingFullName((prev) => ({
                    ...prev,
                    [u.id]: u.full_name || "",
                  }));
                }}
                className={`font-bold text-slate-800 transition-colors text-sm truncate block ${
                  isLocked
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer hover:text-indigo-600"
                }`}
                title={
                  isLocked
                    ? "🔒 บัญชีต้นแบบ — ไม่สามารถแก้ไขได้"
                    : "คลิกเพื่อเปลี่ยนชื่อ"
                }
              >
                {u.full_name}{" "}
                {isIcHead && (
                  <span className="text-[10px] text-red-500 ml-1">👑</span>
                )}
                {isSuspended && (
                  <span className="text-[10px] text-amber-600 ml-1">
                    ⚠️ ถูกระงับ
                  </span>
                )}
              </span>
            )}
            {/* ... ส่วนแสดง ward_name เหมือนเดิม ... */}
          </div>

          {/* 🔒 ปุ่ม Action — ic_head ห้ามทำอะไรกับตัวเอง */}
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            {/* Unlock — ic_head ห้ามปลดล็อคตัวเอง */}
            {!isLocked && (
              <button
                onClick={() => handleUnlockUser(u.username)}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                title="ปลดล็อค"
              >
                <Unlock className="w-3 h-3" />
              </button>
            )}

            {/* Reset Password — ic_head ห้ามรีเซ็ตตัวเอง */}
            {!isLocked && (
              <button
                onClick={() =>
                  handleResetPassword(u.id, u.username, u.full_name)
                }
                className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                title="รีเซ็ตรหัสเป็น 123"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}

            {/* Change Password — ic_head เปลี่ยนรหัสตัวเองได้ */}
            <button
              onClick={() => handleOpenChangePassword(u)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
              title="เปลี่ยนรหัสผ่าน"
            >
              <Key className="w-3 h-3" />
            </button>

            {isIc && (
              <>
                {/* 🔒 Role — ic_head แสดงเป็น badge อย่างเดียว เปลี่ยนไม่ได้ */}
                {isIcHead ? (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 tracking-wider cursor-not-allowed">
                    IC_HEAD
                  </span>
                ) : editingRole[u.id] ? (
                  <select
                    value={editingRole[u.id]}
                    onChange={(e) => handleSaveRole(u.id, e.target.value)}
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-indigo-300 bg-white text-slate-700 outline-none"
                  >
                    <option value="ICWN">ICWN</option>
                    <option value="ICN">ICN</option>
                  </select>
                ) : (
                  <button
                    onClick={() =>
                      setEditingRole((prev) => ({ ...prev, [u.id]: u.role }))
                    }
                    className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider cursor-pointer hover:ring-2 hover:ring-indigo-200 bg-indigo-100 text-indigo-700 transition-all"
                  >
                    {u.role}
                  </button>
                )}

                {/* 🔒 Delete — ic_head ห้ามลบ */}
                {!isIcHead && (
                  <button
                    onClick={() =>
                      handleDeleteIcUser(u.id, u.full_name, u.username)
                    }
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="ย้ายไปถังขยะ"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Username */}
        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">User:</span>
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
                    if (e.key === "Enter") handleSaveUsername(u.id);
                  }}
                  className="w-24 px-1.5 py-0.5 bg-white border border-indigo-300 rounded text-slate-800 font-mono text-xs"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveUsername(u.id)}
                  className="p-0.5 text-emerald-600"
                >
                  <CheckCircle className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setEditingField((prev) => ({ ...prev, [u.id]: null }));
                    setEditingUsername((prev) => ({
                      ...prev,
                      [u.id]: undefined,
                    }));
                  }}
                  className="p-0.5 text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="font-mono bg-white border px-1.5 py-0.5 rounded text-slate-800 text-xs">
                  {u.username}
                </span>
                {/* ❌ ic_head ห้ามแก้ไข username */}
                {!isLocked && (
                  <button
                    onClick={() =>
                      setEditingField((prev) => ({
                        ...prev,
                        [u.id]: "username",
                      }))
                    }
                    className="p-0.5 text-slate-400 hover:text-indigo-600"
                    title="แก้ไข Username"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </li>
    );
  };
  // ==========================================
  // 🖥️ Render
  // ==========================================
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Nurse Panel */}
      <div className="rounded-3xl border border-slate-200 shadow-sm bg-white flex flex-col max-h-[85vh]">
        <div className="p-6 pb-4 shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <Users className="w-5 h-5 text-teal-500" /> การจัดการบัญชีพยาบาล
          </h3>
          <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            เพิ่มหอผู้ป่วยเพื่อสร้างบัญชีพยาบาลประจำวอร์ดโดยอัตโนมัติ •
            รหัสผ่านเริ่มต้น: <strong>123</strong>
          </p>
        </div>
        <div className="px-6 space-y-3 overflow-y-auto flex-1 custom-scrollbar pb-2">
          {activeWards.map((w) => {
            const nursesInWard = nurseUsers.filter((u) => u.ward_id === w.id);
            return (
              <div
                key={w.id}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="p-3 bg-slate-50 flex justify-between items-center border-b border-slate-100">
                  {editingWard === w.id ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        defaultValue={w.name}
                        id={`edit-ward-${w.id}`}
                        className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold bg-white outline-none w-32"
                      />
                      <button
                        onClick={() =>
                          handleEditWard(
                            w.id,
                            document.getElementById(`edit-ward-${w.id}`).value,
                          )
                        }
                        className="bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingWard(null)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-slate-700 text-sm">
                        🏥 {w.name}
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({nursesInWard.length})
                        </span>
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => setEditingWard(w.id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title="แก้ไขชื่อ"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleSoftDeleteWard(w.id, w.name)}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded"
                          title="ย้ายไปถังขยะ"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-2 space-y-1.5">
                  {nursesInWard.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2">
                      ยังไม่มีพยาบาลในวอร์ดนี้
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {nursesInWard.map((u) => renderUserCard(u, false))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ชื่อหอผู้ป่วยใหม่..."
              value={newWardName}
              onChange={(e) => setNewWardName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none bg-white focus:border-teal-400 text-xs"
            />
            <button
              onClick={handleAddWard}
              className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มวอร์ด
            </button>
          </div>
        </div>

        {/* 🗑️ ถังขยะ — แสดงวอร์ดที่ถูกลบ */}
        {deletedWards.length > 0 && (
          <div className="border-t-2 border-amber-200 shrink-0">
            <button
              onClick={() => setShowDeletedWards(!showDeletedWards)}
              className="w-full p-3 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <span className="text-xs font-bold text-amber-700 flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                🗑️ ถังขยะ ({deletedWards.length} วอร์ด)
              </span>
              <span className="text-[10px] text-amber-500">
                {showDeletedWards ? "ซ่อน" : "แสดง"}
              </span>
            </button>

            {showDeletedWards && (
              <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto bg-amber-50/30">
                {deletedWards.map((w) => {
                  const nursesInWard = nurseUsers.filter(
                    (u) => u.ward_id === w.id,
                  );
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-amber-200 rounded-lg"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          🏥 {w.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {nursesInWard.length} บัญชีถูกระงับ
                          {w.deleted_at && (
                            <>
                              {" "}
                              •{" "}
                              {new Date(w.deleted_at).toLocaleDateString(
                                "th-TH",
                              )}
                            </>
                          )}
                          {w.deleted_by && <> • โดย {w.deleted_by}</>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRestoreWard(w.id, w.name)}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-bold hover:bg-emerald-100 flex items-center gap-1"
                          title="กู้คืน"
                        >
                          <Undo2 className="w-3 h-3" /> กู้คืน
                        </button>
                        <button
                          onClick={() =>
                            handlePermanentDeleteWard(w.id, w.name)
                          }
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold hover:bg-rose-100 flex items-center gap-1"
                          title="ลบถาวร"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* IC Panel */}
      <div className="rounded-3xl border border-slate-200 shadow-sm bg-white flex flex-col max-h-[85vh]">
        <div className="p-6 pb-4 shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
            <UserCog className="w-5 h-5 text-indigo-500" />{" "}
            การจัดการผู้ใช้ระดับบริหาร
          </h3>
          <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            👑 ic_head = บัญชีต้นแบบ (เปลี่ยน
            Role/ลบ/ปลดล็อค/รีเซ็ตตัวเองไม่ได้) • รหัสผ่านเริ่มต้น:{" "}
            <strong>123</strong>
          </p>
        </div>
        <ul className="px-6 space-y-2 overflow-y-auto flex-1 custom-scrollbar pb-2">
          {icUsers.map((u) => renderUserCard(u, true))}
        </ul>
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="border-2 border-dashed border-indigo-200 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
              <Plus className="w-3 h-3" /> เพิ่มผู้ใช้ระดับบริหารใหม่
            </p>
            <div className="flex gap-1.5 flex-wrap">
              <input
                type="text"
                placeholder="Username"
                value={newIcUsername}
                onChange={(e) => setNewIcUsername(e.target.value)}
                className="flex-1 min-w-[90px] px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white text-xs font-mono"
              />
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={newIcFullName}
                onChange={(e) => setNewIcFullName(e.target.value)}
                className="flex-1 min-w-[110px] px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white text-xs"
              />
              <select
                value={newIcRole}
                onChange={(e) => setNewIcRole(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none bg-white text-xs font-bold text-slate-700"
              >
                <option value="ICWN">ICWN</option>
                <option value="ICN">ICN</option>
              </select>
              <button
                onClick={handleAddIcUser}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-1 text-xs"
              >
                <Plus className="w-3 h-3" /> เพิ่ม
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🔐 Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-500" /> เปลี่ยนรหัสผ่าน:{" "}
              {changePasswordUser?.full_name}
            </h3>
            {passwordError && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm mb-4 border border-rose-100">
                {passwordError}
              </div>
            )}
            <form onSubmit={handleSubmitChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  รหัสผ่านปัจจุบัน
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  รหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-bold hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
