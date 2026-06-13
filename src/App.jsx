import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Clock,
} from "lucide-react";
import WardNursePane from "./components/WardNursePane";
import ICCommandCenter from "./components/ICCommandCenter";
import { useAppData } from "./hooks/useAppData";
import { supabase } from "./utils/supabaseClient";
import {
  createSession,
  validateSession,
  destroySession,
  setupActivityTracking,
  getSessionTimeRemaining,
} from "./utils/sessionManager";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const session = validateSession();
    return session || null;
  });

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState(null);

  const {
    wards,
    systemUsers,
    cdcConfig,
    assessments,
    systemCategories,
    loading,
    fetchGlobalData,
    fetchAssessments,
    setCdcConfig,
    viewedCases,
    markCaseAsViewed,
    isCaseNew,
  } = useAppData(currentUser);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const cleanup = setupActivityTracking();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const session = validateSession();
      if (!session) {
        setCurrentUser(null);
        showToast("error", "⏰ Session หมดอายุ กรุณา Login ใหม่");
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const { data, error } = await supabase.rpc("verify_user", {
        p_username: loginForm.username,
        p_password: loginForm.password,
      });

      if (error) {
        setLoginError("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
      } else if (data && data.length > 0 && data[0].id) {
        const user = data[0];

        // ✅ ดึงข้อมูลเพิ่มเติมจาก system_users
        const { data: userData } = await supabase
          .from("system_users")
          .select("ward_id, full_name")
          .eq("id", user.id)
          .single();

        // ✅ สร้าง session พร้อมข้อมูลครบ
        const session = createSession({
          id: user.id,
          username: user.username,
          role: user.role,
          full_name:
            userData?.full_name || user.full_name || loginForm.username,
          ward_id: userData?.ward_id || user.ward_id || null,
        });

        setCurrentUser(session);
        setLoginForm({ username: "", password: "" });
        showToast("success", `ยินดีต้อนรับ ${session.full_name}`);

        if ("Notification" in window && Notification.permission === "default")
          Notification.requestPermission();
      } else if (data && data.length > 0 && data[0].error_msg)
        setLoginError(`🔒 ${data[0].error_msg}`);
      else setLoginError("❌ ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    destroySession();
    showToast("info", "ออกจากระบบเรียบร้อย");
    setTimeout(() => setCurrentUser(null), 200);
  };

  const updateCurrentUser = (updates) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updates };
      const session = JSON.parse(
        localStorage.getItem("ic_system_user") || "{}",
      );
      const merged = { ...session, ...updates };
      localStorage.setItem("ic_system_user", JSON.stringify(merged));
      return updated;
    });
  };

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-indigo-100 p-10">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Vanguard IC
              </h1>
              <p className="text-slate-500 mt-2 text-sm font-medium">
                Epidemiology Surveillance System
              </p>
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700">
                <p className="font-semibold">🔐 ระบบความปลอดภัย</p>
                <p className="mt-1 opacity-75">
                  รหัสผ่านถูกเข้ารหัสแบบ Bcrypt • Auto-Logout หลัง 8 ชม.
                </p>
              </div>
            </div>
            {loginError && (
              <div className="bg-rose-50 text-rose-600 p-3.5 rounded-xl text-sm mb-6 border border-rose-100 flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                  Username
                </label>
                <input
                  required
                  type="text"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                  className="w-full px-5 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all bg-slate-50 focus:bg-white font-medium"
                  placeholder="เช่น nurse1, ic_head"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                  Password
                </label>
                <input
                  required
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  className="w-full px-5 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all bg-slate-50 focus:bg-white font-medium"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? "⏳ กำลังตรวจสอบ..." : "🔐 เข้าสู่ระบบ"}
              </button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-6">
              © 2026 Vanguard IC • Developed by Pannawit Sooksaen
            </p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (loading && currentUser) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-indigo-50/60 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <p className="text-slate-500 font-bold">
              กำลังเชื่อมต่อฐานข้อมูล Vanguard IC...
            </p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen font-sans bg-indigo-50/50 text-slate-800 selection:bg-indigo-200">
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-[9999] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 font-medium ${toast.type === "error" ? "bg-rose-600 text-white" : toast.type === "success" ? "bg-emerald-600 text-white" : "bg-slate-900 text-white"}`}
          >
            <CheckCircle className="w-5 h-5 text-white opacity-80" />
            {toast.text}
          </div>
        )}

        <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-30 shadow-sm">
          <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                  Vanguard IC
                </h1>
                <p className="text-[11px] font-bold text-indigo-600 tracking-wider uppercase mt-0.5">
                  Surveillance System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <SessionTimer />
              <div className="flex items-center gap-3 pl-5 border-l border-indigo-100">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-extrabold text-slate-800 leading-none">
                    {currentUser.full_name}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    {currentUser.role === "NURSE"
                      ? `Ward Nurse - ${wards.find((w) => w.id === currentUser.ward_id)?.name || currentUser.full_name}`
                      : currentUser.role}{" "}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold">
                  {currentUser.full_name?.charAt(0) || "?"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                title="ออกจากระบบ"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-6 py-8">
          {currentUser.role === "NURSE" && (
            <WardNursePane
              currentUser={currentUser}
              wards={wards}
              systemUsers={systemUsers}
              cdcConfig={cdcConfig}
              assessments={assessments}
              fetchAssessments={fetchAssessments}
              showToast={showToast}
              systemCategories={systemCategories}
              viewedCases={viewedCases}
              markCaseAsViewed={markCaseAsViewed}
              isCaseNew={isCaseNew}
            />
          )}
          {["IC_HEAD", "ICWN", "ICN"].includes(currentUser.role) && (
            <ICCommandCenter
              currentUser={currentUser}
              wards={wards}
              systemUsers={systemUsers}
              cdcConfig={cdcConfig}
              assessments={assessments}
              fetchGlobalData={fetchGlobalData}
              fetchAssessments={fetchAssessments}
              setCdcConfig={setCdcConfig}
              showToast={showToast}
              systemCategories={systemCategories}
              viewedCases={viewedCases}
              markCaseAsViewed={markCaseAsViewed}
              isCaseNew={isCaseNew}
              updateCurrentUser={updateCurrentUser}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState(getSessionTimeRemaining());
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getSessionTimeRemaining());
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);
  if (!timeLeft || timeLeft.percentage > 50) return null;
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${timeLeft.percentage < 15 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-amber-100 text-amber-600"}`}
    >
      <Clock className="w-3 h-3" />
      {timeLeft.hours > 0 ? `${timeLeft.hours}ชม.` : ""}
      {timeLeft.minutes}นาที
    </div>
  );
}
