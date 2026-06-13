import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 Vanguard IC Error:", error);
    console.error("📍 Component Stack:", errorInfo.componentStack);

    // ถ้าต้องการส่ง error ไปที่ backend
    // supabase.from('error_logs').insert({ error: error.message, stack: error.stack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
            {/* Icon */}
            <div className="w-20 h-20 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              ระบบพบข้อผิดพลาด
            </h2>

            {/* Message */}
            <p className="text-sm text-slate-500 mb-2">
              เกิดข้อผิดพลาดที่ไม่คาดคิดขึ้น
            </p>
            <p className="text-xs text-slate-400 mb-6">
              กรุณารีเฟรชหน้าใหม่ หากยังพบปัญหาติดต่อผู้ดูแลระบบ
            </p>

            {/* Error Details (เฉพาะ dev) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-slate-100 rounded-xl text-left">
                <p className="text-xs font-bold text-rose-600 mb-1">
                  Error Details:
                </p>
                <p className="text-xs text-slate-700 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
              >
                <RefreshCw className="w-4 h-4" /> รีเฟรช
              </button>

              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-600 px-5 py-3 rounded-xl font-bold border border-slate-200 shadow-sm transition-all"
              >
                ล้าง Cache
              </button>
            </div>

            {/* Footer */}
            <p className="text-xs text-slate-400 mt-6">
              Vanguard IC — Epidemiology Surveillance System
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
