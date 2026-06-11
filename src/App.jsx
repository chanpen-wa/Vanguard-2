import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, LogOut, Clock } from 'lucide-react';
import WardNursePane from './components/WardNursePane';
import ICCommandCenter from './components/ICCommandCenter';
import { useAppData } from './hooks/useAppData';
import { supabase } from './utils/supabaseClient';
import { createSession, validateSession, destroySession, setupActivityTracking, getSessionTimeRemaining } from './utils/session';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const session = validateSession();
    return session || null;
  });
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
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
    isCaseNew 
  } = useAppData(currentUser);

  const showToast = (type, text) => { 
    setToast({ type, text }); 
    setTimeout(() => setToast(null), 4000); 
  };

  // ตั้งค่า Activity Tracking
  useEffect(() => {
    const cleanup = setupActivityTracking();
    return cleanup;
  }, []);

  // ตรวจสอบ Session ทุก 1 นาที
  useEffect(() => {
    if (!currentUser) return;
    
    const interval = setInterval(() => {
      const session = validateSession();
      if (!session) {
        setCurrentUser(null);
        showToast('error', '⏰ Session หมดอายุ กรุณา Login ใหม่');
      }
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  // 🔐 ฟังก์ชัน Login — ใช้ RPC Function (bcrypt)
  const handleLogin = async (e) => {
    e.preventDefault(); 
    setIsLoggingIn(true); 
    setLoginError('');
    
    try {
      // เรียกใช้ RPC function ที่สร้างใน Supabase (verify_user)
      const { data, error } = await supabase
        .rpc('verify_user', {
          p_username: loginForm.username,
          p_password: loginForm.password
        });
      
      if (data && data.length > 0 && !error) {
        const user = data[0];
        
        // สร้าง Session (ไม่เก็บ password ใน localStorage)
        const session = createSession(user);
        setCurrentUser(session);
        
        // ล้างฟอร์ม
        setLoginForm({ username: '', password: '' });
        showToast('success', `ยินดีต้อนรับ ${user.full_name}`);
        
        // ขอ Permission Browser Notification
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } else {
        setLoginError('❌ ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Fallback: ถ้า RPC ไม่ทำงาน → ใช้วิธี query ตรงๆ (ชั่วคราว)
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('system_users')
          .select('*')
          .eq('username', loginForm.username)
          .eq('password', loginForm.password)
          .single();
        
        if (fallbackData && !fallbackError) {
          const session = createSession(fallbackData);
          setCurrentUser(session);
          setLoginForm({ username: '', password: '' });
          showToast('success', `ยินดีต้อนรับ ${fallbackData.full_name}`);
          console.warn('⚠️ ใช้วิธี login แบบปกติ (แนะนำให้สร้าง RPC function)');
        } else {
          setLoginError('❌ ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
        }
      } catch (fallbackErr) {
        setLoginError('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
      }
    }
    
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    destroySession();
    setCurrentUser(null);
    showToast('info', 'ออกจากระบบเรียบร้อย');
  };

  // ========================
  // หน้า LOGIN
  // ========================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200/60 p-10">
          
          {/* Logo & Title */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Vanguard IC
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Epidemiology Surveillance System
            </p>
            
            {/* 🔐 Security Info */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <p className="font-semibold">🔐 ระบบความปลอดภัย</p>
              <p className="mt-1 opacity-75">
                รหัสผ่านถูกเข้ารหัสแบบ Bcrypt • Auto-Logout หลัง 8 ชม.
              </p>
            </div>
          </div>
          
          {/* Error Message */}
          {loginError && (
            <div className="bg-rose-50 text-rose-600 p-3.5 rounded-xl text-sm mb-6 border border-rose-100 flex items-center gap-2 font-medium animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> 
              {loginError}
            </div>
          )}
          
          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                Username
              </label>
              <input 
                required 
                type="text" 
                value={loginForm.username} 
                onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
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
                onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                className="w-full px-5 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all bg-slate-50 focus:bg-white font-medium" 
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLoggingIn} 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-sm transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? '⏳ กำลังตรวจสอบ...' : '🔐 เข้าสู่ระบบ'}
            </button>
          </form>
          
          <p className="text-center text-xs text-slate-400 mt-6">
            © 2026 Vanguard IC • ระบบเฝ้าระวังการติดเชื้อในโรงพยาบาล
          </p>
        </div>
      </div>
    );
  }

  // ========================
  // กำลังโหลดข้อมูล
  // ========================
  if (loading && currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500 font-bold">กำลังเชื่อมต่อฐานข้อมูล Vanguard IC...</p>
        </div>
      </div>
    );
  }

  // ========================
  // ระบบหลัก (หลัง Login)
  // ========================
  return (
    <div className="min-h-screen font-sans bg-[#F8FAFC] text-slate-800 selection:bg-slate-200">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 font-medium ${
          toast.type === 'error' ? 'bg-rose-600 text-white' :
          toast.type === 'success' ? 'bg-emerald-600 text-white' :
          'bg-slate-900 text-white'
        }`}>
          <CheckCircle className="w-5 h-5 text-white opacity-80" /> 
          {toast.text}
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                Vanguard IC
              </h1>
              <p className="text-[11px] font-bold text-blue-600 tracking-wider uppercase mt-0.5">
                Surveillance System
              </p>
            </div>
          </div>
          
          {/* User Info & Actions */}
          <div className="flex items-center gap-5">
            <SessionTimer />
            
            <div className="flex items-center gap-3 pl-5 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-extrabold text-slate-800 leading-none">{currentUser.full_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{currentUser.role === 'IC_HEAD' ? 'Command Center' : 'Ward Nurse'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold">
                {currentUser.full_name?.charAt(0) || '?'}
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

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {currentUser.role === 'NURSE' && (
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
        
        {currentUser.role === 'IC_HEAD' && (
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
          />
        )}
      </main>
    </div>
  );
}

// ========================
// Session Timer Component
// ========================
function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState(getSessionTimeRemaining());
  
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getSessionTimeRemaining();
      setTimeLeft(remaining);
    }, 30 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!timeLeft || timeLeft.percentage > 50) return null;
  
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
      timeLeft.percentage < 15 
        ? 'bg-rose-100 text-rose-600 animate-pulse' 
        : 'bg-amber-100 text-amber-600'
    }`}>
      <Clock className="w-3 h-3" />
      {timeLeft.hours > 0 ? `${timeLeft.hours}ชม.` : ''}
      {timeLeft.minutes}นาที
    </div>
  );
}