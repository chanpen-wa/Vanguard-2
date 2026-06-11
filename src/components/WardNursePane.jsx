import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Activity, Clock, CheckCircle, CheckCircle2, AlertCircle, Eye, X, Calculator, User, ChevronRight, Send, RotateCcw, MessageSquare, ShieldCheck, AlertTriangle, Bell, BellRing, Search, CalendarDays, Info } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import FormEngine from './FormEngine';
import { handleAnalyzeLogic, getTriageColor, calculateHospitalDay } from '../utils/triageLogic';
import { useNurseNotifications } from '../hooks/useNurseNotifications';

function handleEnter(e, nextId) { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(nextId)?.focus(); } }

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  if (days < 7) return `${days} วันที่แล้ว`;
  return new Date(timestamp).toLocaleDateString('th-TH');
}

export default function WardNursePane({ 
  currentUser, wards, systemUsers, cdcConfig, assessments, 
  fetchAssessments, showToast, systemCategories,
  viewedCases, markCaseAsViewed, isCaseNew
}) {
  const [formData, setFormData] = useState({ 
    hn: '', patient_name: '', dx: '', 
    age_years: '', age_months: '', age_days: '', 
    gender: '',
    admission_date: '', 
    vital_temp: '', vital_pulse: '', vital_rr: '', vital_bp_sys: '', vital_bp_dia: '', vital_spo2: '' 
  });
  const [systemData, setSystemData] = useState({ system: 'BSI', doe: '', dynamic_data: {} });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filters, setFilters] = useState({ 
    category: 'all', 
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  const {
    notifications, unreadCount,
    showPanel: showNotifPanel, setShowPanel: setShowNotifPanel,
    markAsRead, markAllAsRead, clearAll
  } = useNurseNotifications(currentUser);

  const isInfant = (formData.age_years === '0' || formData.age_years === 0) && (formData.age_months !== '' || formData.age_days !== '');
  const currentAgeCategory = isInfant ? 'infant' : 'adult';
  const calculatedMap = formData.vital_bp_sys && formData.vital_bp_dia ? Math.round((Number(formData.vital_bp_sys) + 2 * Number(formData.vital_bp_dia)) / 3) : '';

  const getAgeDisplay = () => {
    const parts = [];
    if (formData.age_years) parts.push(`${formData.age_years} ปี`);
    if (formData.age_months) parts.push(`${formData.age_months} เดือน`);
    if (formData.age_days) parts.push(`${formData.age_days} วัน`);
    return parts.length > 0 ? parts.join(' ') : 'ไม่ระบุ';
  };
  const ageDisplay = getAgeDisplay();

  const getAgeYears = () => {
    const years = Number(formData.age_years) || 0;
    const months = Number(formData.age_months) || 0;
    const days = Number(formData.age_days) || 0;
    if (years > 0) return years;
    if (months > 0 || days > 0) return 0;
    return '';
  };

  const handleCategoryChange = (sysId) => { 
    setSystemData({ system: sysId, doe: '', dynamic_data: {} }); 
    setAnalysisResult(null); 
    setValidationErrors({});
  };

  const handleAnalyze = () => { 
    setValidationErrors({});
    setAnalysisResult(handleAnalyzeLogic(formData, systemData, cdcConfig)); 
  };

  const handleFormChange = (data) => {
    setSystemData(prev => ({ ...prev, dynamic_data: data }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.hn || formData.hn.trim() === '') errors.hn = 'กรุณากรอก HN ผู้ป่วย';
    if (!formData.patient_name || formData.patient_name.trim() === '') errors.patient_name = 'กรุณากรอกชื่อผู้ป่วย';
    if (!formData.gender) errors.gender = 'กรุณาระบุเพศ';
    if (!formData.admission_date) errors.admission_date = 'กรุณาระบุวันที่ Admit';
    if (!formData.age_years && !formData.age_months && !formData.age_days) errors.age = 'กรุณาระบุอายุ (ปี, เดือน, หรือ วัน)';
    if (!formData.vital_temp) errors.vital_temp = 'แนะนำให้กรอกอุณหภูมิ';
    if (!systemData.doe) errors.doe = 'กรุณาระบุ Date of Event (DOE)';
    
    if (formData.admission_date && systemData.doe) {
      const admitDate = new Date(formData.admission_date);
      const doeDate = new Date(systemData.doe);
      if (doeDate < admitDate) errors.doe = 'DOE ต้องไม่น้อยกว่าวันที่ Admit';
    }
    
    if (!analysisResult) errors.analysis = 'กรุณากด "ประมวลผลทางสถิติด้วย Triage AI" ก่อนส่งข้อมูล';
    
    return errors;
  };

  const handleSubmitClinical = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    setValidationErrors(errors);
    
    const criticalErrors = Object.entries(errors).filter(([key, msg]) => !msg.startsWith('แนะนำ'));
    
    if (criticalErrors.length > 0) {
      showToast('error', `กรุณากรอกข้อมูลให้ครบถ้วน (พบ ${criticalErrors.length} จุดที่ต้องแก้ไข)`);
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(`inp_${firstErrorField}`) || document.getElementById(`inp_doe`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }
    
    setIsSubmitting(true);
    const assessmentId = `IC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const newRecord = { 
      id: assessmentId, 
      hn: String(formData.hn || ''), 
      patient_name: String(formData.patient_name || ''), 
      ward_id: Number(currentUser.ward_id) || null, 
      device_type: String(systemData.system || 'BSI'), 
      status: 'Pending', 
      created_by: Number(currentUser.id) || null, 
      auto_assess_result: String(analysisResult.title || ''), 
      
      detailed_analysis_json: { 
        clinical_vitals: {
          ...formData,
          age_display: ageDisplay,
          gender: formData.gender
        }, 
        infectious_data: systemData, 
        ai_result: analysisResult,
        ward_name: wards.find(w => w.id === currentUser.ward_id)?.name || '-',
        submitted_by: currentUser.full_name
      }, 
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      vital_temp: Number(formData.vital_temp) || null,
      vital_pulse: Number(formData.vital_pulse) || null,
      vital_bp_sys: Number(formData.vital_bp_sys) || null,
      vital_bp_dia: Number(formData.vital_bp_dia) || null,
      vital_spo2: Number(formData.vital_spo2) || null,
      admission_date: formData.admission_date || null,
      date_of_event: systemData.doe || null,
      age_text: ageDisplay,
      gender: formData.gender || null
    };
    
    const { data, error } = await supabase.from('assessments').insert([newRecord]).select();
    
    if (error) {
      console.error('❌ Insert error:', error);
      showToast('error', `ส่งเคสไม่สำเร็จ: ${error.message}`);
      setIsSubmitting(false);
      return;
    }
    
    showToast('success', 'ส่งเคสเข้าสู่ศูนย์ควบคุม IC สำเร็จ');
    
    setFormData({ hn: '', patient_name: '', dx: '', age_years: '', age_months: '', age_days: '', gender: '', admission_date: '', vital_temp: '', vital_pulse: '', vital_rr: '', vital_bp_sys: '', vital_bp_dia: '', vital_spo2: '' }); 
    setSystemData({ system: 'BSI', doe: '', dynamic_data: {} }); 
    setAnalysisResult(null); 
    setValidationErrors({});
    fetchAssessments();
    setIsSubmitting(false);
  };

  const handleCancelCase = async (id) => {
    if(!window.confirm('ยืนยันการดึงเรื่องกลับ (ยกเลิกเคส)?')) return;
    await supabase.from('assessments').update({ status: 'Cancelled' }).eq('id', id);
    await supabase.from('audit_logs').insert([{ assessment_id: id, action_type: 'CANCEL_CASE', old_value: 'Pending', new_value: 'Cancelled', changed_by: currentUser.id, details: 'พยาบาลขอดึงเรื่องกลับและยกเลิกเคส' }]);
    showToast('success', 'ดึงเรื่องกลับสำเร็จ'); fetchAssessments();
  };

  const handleOpenAuditModal = async (assessment) => {
    setSelectedAssessment(assessment); 
    setShowAuditModal(true);
    if (markCaseAsViewed) markCaseAsViewed(assessment.id);
    const { data } = await supabase.from('audit_logs').select('*').eq('assessment_id', assessment.id).order('created_at', { ascending: true });
    const logsWithUser = (data || []).map(log => {
      const user = systemUsers.find(u => u.id === log.changed_by);
      return { ...log, user_full_name: user ? user.full_name : 'System' };
    });
    setAuditLogs(logsWithUser);
  };

  const filteredAssessments = assessments.filter(item => {
    const matchCategory = filters.category === 'all' || item.device_type === filters.category;
    const matchSearch = !filters.search || 
      item.patient_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.hn?.toLowerCase().includes(filters.search.toLowerCase());
    
    let matchDate = true;
    if (filters.dateFrom || filters.dateTo) {
      const itemDate = new Date(item.created_at);
      if (filters.dateFrom) matchDate = matchDate && itemDate >= new Date(filters.dateFrom);
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59);
        matchDate = matchDate && itemDate <= endDate;
      }
    }
    
    return matchCategory && matchSearch && matchDate;
  });

  const pendingCases = filteredAssessments.filter(c => c.status === 'Pending');
  const reviewedCases = filteredAssessments.filter(c => c.status !== 'Pending');

  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    const isWarning = message.startsWith('แนะนำ');
    return (
      <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium animate-in fade-in slide-in-from-top-1 ${isWarning ? 'text-amber-600' : 'text-rose-600'}`}>
        <AlertTriangle className="w-3 h-3" />
        <span>{message}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* LEFT COLUMN: PATIENT DATA */}
        <div className="w-full xl:w-1/3 xl:sticky xl:top-24 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Clinical Triage</h1>
              <p className="text-slate-500 mt-1.5 text-sm font-medium">ประเมินความเสี่ยงและวินิจฉัยการติดเชื้อ</p>
            </div>
            
            {/* 🔔 Notification Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm" title="การแจ้งเตือนจาก IC">
                {unreadCount > 0 ? <BellRing className="w-5 h-5 text-indigo-600" /> : <Bell className="w-5 h-5 text-slate-400" />}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-50">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifPanel && (
                <div className="absolute right-0 top-12 w-80 max-h-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm"><BellRing className="w-4 h-4 text-indigo-500" />ตอบกลับจาก IC{unreadCount > 0 && <span className="text-xs font-bold text-rose-500">({unreadCount})</span>}</h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">อ่านทั้งหมด</button>}
                      <button onClick={clearAll} className="text-[10px] font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors">ล้าง</button>
                      <button onClick={() => setShowNotifPanel(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[340px] custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center"><Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400 font-medium">ยังไม่มีการตอบกลับจาก IC</p></div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map(n => (
                          <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? 'bg-indigo-50/50 border-l-2 border-indigo-400' : ''}`}>
                            <p className="text-sm font-bold text-slate-800 leading-tight">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5 font-medium">{n.message}</p>
                            {n.detail && n.detail !== 'ไม่มีหมายเหตุ' && <p className="text-xs text-slate-400 mt-0.5 italic">"{n.detail}"</p>}
                            <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(n.timestamp)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Patient Data Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-7">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 text-slate-800 font-bold"><User className="w-5 h-5 opacity-50"/> ข้อมูลผู้ป่วย (Patient Data)</div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">HN *</label>
                  <input id="inp_hn" required type="text" value={formData.hn} onChange={e=>{setFormData({...formData, hn:e.target.value}); setValidationErrors({...validationErrors, hn: ''});}} onKeyDown={(e)=>handleEnter(e,'inp_name')} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-all ${validationErrors.hn ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white'}`} />
                  <ErrorMessage message={validationErrors.hn} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Patient Name *</label>
                  <input id="inp_name" required type="text" value={formData.patient_name} onChange={e=>{setFormData({...formData, patient_name:e.target.value}); setValidationErrors({...validationErrors, patient_name: ''});}} onKeyDown={(e)=>handleEnter(e,'inp_admit')} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-medium outline-none transition-all ${validationErrors.patient_name ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white'}`} />
                  <ErrorMessage message={validationErrors.patient_name} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Gender *</label>
                  <select value={formData.gender} onChange={e=>{setFormData({...formData, gender:e.target.value}); setValidationErrors({...validationErrors, gender: ''});}} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-medium outline-none transition-all ${validationErrors.gender ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white'}`}>
                    <option value="">-- เลือก --</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                  </select>
                  <ErrorMessage message={validationErrors.gender} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Diagnosis</label>
                  <input id="inp_dx" type="text" value={formData.dx} onChange={e=>setFormData({...formData, dx:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-colors" placeholder="Dx..." />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Admit Date *</label>
                  <input id="inp_admit" required type="date" value={formData.admission_date} onChange={e=>{setFormData({...formData, admission_date:e.target.value}); setValidationErrors({...validationErrors, admission_date: ''});}} onKeyDown={(e)=>handleEnter(e,'inp_y')} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-mono outline-none transition-all ${validationErrors.admission_date ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-slate-100 focus:bg-white'}`} />
                  <ErrorMessage message={validationErrors.admission_date} />
                </div>
                <div></div>
              </div>
              
              <div className={`grid grid-cols-3 gap-3 p-4 rounded-2xl border transition-all ${validationErrors.age ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">Years</label>
                  <input id="inp_y" type="number" min="0" value={formData.age_years} onChange={e=>{setFormData({...formData, age_years:e.target.value}); setValidationErrors({...validationErrors, age: ''});}} onKeyDown={(e)=>handleEnter(e,'inp_m')} className="w-full px-2 py-2 border border-slate-200 bg-white rounded-xl text-sm text-center font-bold text-slate-700 outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">Months</label>
                  <input id="inp_m" type="number" min="0" max="11" value={formData.age_months} onChange={e=>{setFormData({...formData, age_months:e.target.value}); setValidationErrors({...validationErrors, age: ''});}} onKeyDown={(e)=>handleEnter(e,'inp_d')} className="w-full px-2 py-2 border border-slate-200 bg-white rounded-xl text-sm text-center font-medium outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">Days</label>
                  <input id="inp_d" type="number" min="0" max="31" value={formData.age_days} onChange={e=>{setFormData({...formData, age_days:e.target.value}); setValidationErrors({...validationErrors, age: ''});}} onKeyDown={(e)=>handleEnter(e,'inp_temp')} className="w-full px-2 py-2 border border-slate-200 bg-white rounded-xl text-sm text-center font-medium outline-none focus:border-slate-400" />
                </div>
                {validationErrors.age && (
                  <div className="col-span-3"><ErrorMessage message={validationErrors.age} /></div>
                )}
              </div>
            </div>
          </div>

          {/* Vitals Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-7">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 text-slate-800 font-bold"><Activity className="w-5 h-5 opacity-50"/> สัญญาณชีพ (Vitals)</div>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Temperature (°C) <span className="text-orange-400 lowercase tracking-normal ml-1">* Auto Triage</span></label>
                <input id="inp_temp" type="number" step="0.1" value={formData.vital_temp} onChange={e=>{setFormData({...formData, vital_temp:e.target.value}); setValidationErrors({...validationErrors, vital_temp: ''});}} onKeyDown={(e)=>handleEnter(e,'inp_pulse')} className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-colors ${formData.vital_temp > 38 || (formData.vital_temp !== '' && formData.vital_temp < 36) ? 'bg-rose-50 border-rose-200 text-rose-700' : validationErrors.vital_temp ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-400'}`} placeholder="37.0" />
                <ErrorMessage message={validationErrors.vital_temp} />
              </div>
              <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Pulse</label><input id="inp_pulse" type="number" value={formData.vital_pulse} onChange={e=>setFormData({...formData, vital_pulse:e.target.value})} onKeyDown={(e)=>handleEnter(e,'inp_rr')} className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm outline-none focus:bg-white focus:border-slate-400 transition-colors" /></div>
              <div><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Resp. Rate</label><input id="inp_rr" type="number" value={formData.vital_rr} onChange={e=>setFormData({...formData, vital_rr:e.target.value})} onKeyDown={(e)=>handleEnter(e,'inp_sys')} className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm outline-none focus:bg-white focus:border-slate-400 transition-colors" /></div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Blood Pressure</label>
                <div className="flex items-center gap-2">
                  <input id="inp_sys" type="number" value={formData.vital_bp_sys} onChange={e=>setFormData({...formData, vital_bp_sys:e.target.value})} onKeyDown={(e)=>handleEnter(e,'inp_dia')} className="w-1/3 px-2 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm text-center outline-none transition-colors" placeholder="Sys" />
                  <span className="text-slate-300 font-light text-xl">/</span>
                  <input id="inp_dia" type="number" value={formData.vital_bp_dia} onChange={e=>setFormData({...formData, vital_bp_dia:e.target.value})} onKeyDown={(e)=>handleEnter(e,'inp_spo2')} className="w-1/3 px-2 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm text-center outline-none transition-colors" placeholder="Dia" />
                  <div className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs text-center font-bold tracking-wide">MAP: {calculatedMap}</div>
                </div>
              </div>
              <div className="col-span-2"><label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">SpO2 (%)</label><input id="inp_spo2" type="number" value={formData.vital_spo2} onChange={e=>setFormData({...formData, vital_spo2:e.target.value})} onKeyDown={(e)=>handleEnter(e,'inp_doe')} className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-sm outline-none transition-colors" placeholder="98" /></div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DYNAMIC FORM */}
        <div className="w-full xl:w-2/3">
          <form onSubmit={handleSubmitClinical} className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-7 md:p-8 border-b border-slate-100">
              <h3 className="font-bold text-lg mb-5 text-slate-800">เลือกหมวดหมู่การติดเชื้อ (Category)</h3>
              <div className="flex flex-wrap gap-2.5">
                {systemCategories.map(sys => (
                  <button key={sys.id} type="button" onClick={() => handleCategoryChange(sys.id)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${systemData.system === sys.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}>{sys.name}</button>
                ))}
              </div>
            </div>
            <div className="p-7 md:p-8 space-y-8 bg-[#FAFAFA]">
              <div className={`flex flex-col md:flex-row md:items-center gap-5 p-6 rounded-2xl border shadow-sm transition-all ${validationErrors.doe ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Date of Event (DOE) *</label>
                  <input id="inp_doe" required type="date" value={systemData.doe} onChange={e=>{setSystemData({...systemData, doe:e.target.value}); setValidationErrors({...validationErrors, doe: ''});}} className={`w-48 px-4 py-2.5 border rounded-xl text-sm font-mono outline-none transition-all ${validationErrors.doe ? 'bg-white border-rose-300' : 'bg-slate-50 border-slate-200 focus:border-slate-400 focus:bg-white'}`} />
                  <ErrorMessage message={validationErrors.doe} />
                </div>
                {formData.admission_date && systemData.doe && calculateHospitalDay(formData.admission_date, systemData.doe) !== null && (
                  <div className="md:mt-5">
                    {calculateHospitalDay(formData.admission_date, systemData.doe) >= 3 ? (
                      <span className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1.5 w-fit"><AlertCircle className="w-3.5 h-3.5"/> Hospital Day {calculateHospitalDay(formData.admission_date, systemData.doe)} (HAI)</span>
                    ) : (
                      <span className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1.5 w-fit"><AlertCircle className="w-3.5 h-3.5"/> Hospital Day {calculateHospitalDay(formData.admission_date, systemData.doe)} (POA)</span>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-3xl border p-7 bg-white border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                  <h4 className="text-lg font-bold text-slate-800 tracking-tight">เกณฑ์ระบาดวิทยา ({systemData.system})</h4>
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-lg">{currentAgeCategory === 'infant' ? '👶 Infant < 1 Y' : '🧑 Adult ≥ 1 Y'}</span>
                </div>
                <FormEngine 
                  schema={cdcConfig[systemData.system]} 
                  data={systemData.dynamic_data} 
                  patientAgeYears={getAgeYears()} 
                  patientAgeDisplay={ageDisplay}
                  onChange={handleFormChange}
                />
              </div>
              
              {validationErrors.analysis && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-bold text-rose-700">{validationErrors.analysis}</p>
                </div>
              )}
              
              <div className="pt-2 flex justify-center">
                <button type="button" onClick={handleAnalyze} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 shadow-md transition-all hover:-translate-y-0.5"><Calculator className="w-5 h-5 opacity-70"/> ประมวลผลทางสถิติด้วย Triage AI</button>
              </div>
              
              {/* ✅ Reasoning Logs */}
              {analysisResult && (
                <div className={`mt-8 rounded-3xl border overflow-hidden animate-in zoom-in-95 duration-300 shadow-sm ${
                  analysisResult.type === 'success' 
                    ? 'bg-white border-emerald-200' 
                    : analysisResult.type === 'warning' 
                    ? 'bg-white border-amber-200' 
                    : 'bg-white border-rose-200'
                }`}>
                  
                  {/* Header Result */}
                  <div className={`px-6 py-5 flex items-start gap-4 ${
                    analysisResult.type === 'success' 
                      ? 'bg-emerald-50/50 border-b border-emerald-100' 
                      : analysisResult.type === 'warning'
                      ? 'bg-amber-50/50 border-b border-amber-100'
                      : 'bg-rose-50/50 border-b border-rose-100'
                  }`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      analysisResult.type === 'success' 
                        ? 'bg-emerald-500 text-white' 
                        : analysisResult.type === 'warning'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {analysisResult.type === 'success' ? <CheckCircle className="w-6 h-6" /> : 
                       analysisResult.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
                       <X className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-1">AI Diagnostic Result</h4>
                      <h4 className={`font-extrabold text-xl leading-tight ${getTriageColor(analysisResult.title)}`}>
                        {analysisResult.title}
                      </h4>
                      <p className="text-sm text-slate-600 font-medium mt-1.5 bg-white/60 inline-block px-3 py-1 rounded-lg border border-white/40">
                        {analysisResult.summary}
                      </p>
                    </div>
                  </div>
                  
                  {/* Reasoning Cards */}
                  <div className="p-6 bg-slate-50/30">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-indigo-400" /> Reasoning Breakdown
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysisResult.reason.map((r, i) => {
                        const isPositive = r.includes('✓') || r.includes('✅');
                        const isNegative = r.includes('✗') || r.includes('❌');
                        const isInfo = r.includes('ℹ️') || r.includes('📌') || r.includes('💡');
                        const isWarning = r.includes('⚠️') || r.includes('🚨');
                        
                        return (
                          <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
                            isPositive ? 'border-emerald-100' :
                            isNegative ? 'border-rose-100 opacity-75' :
                            isWarning ? 'border-amber-100' :
                            isInfo ? 'border-blue-100 col-span-1 md:col-span-2' :
                            'border-slate-100'
                          }`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isPositive ? 'bg-emerald-50 text-emerald-600' :
                              isNegative ? 'bg-rose-50 text-rose-500' :
                              isWarning ? 'bg-amber-50 text-amber-500' :
                              isInfo ? 'bg-blue-50 text-blue-500' :
                              'bg-slate-50 text-slate-400'
                            }`}>
                              {isPositive ? <CheckCircle className="w-4 h-4" /> :
                               isNegative ? <X className="w-4 h-4" /> :
                               isWarning ? <AlertTriangle className="w-4 h-4" /> :
                               isInfo ? <Info className="w-4 h-4" /> :
                               <ChevronRight className="w-4 h-4" />}
                            </div>
                            <div className="pt-1.5">
                              <p className={`text-sm font-bold leading-snug ${
                                isPositive ? 'text-emerald-900' :
                                isNegative ? 'text-rose-900' :
                                isWarning ? 'text-amber-900' :
                                isInfo ? 'text-blue-900' :
                                'text-slate-700'
                              }`}>{r.replace(/^[✓✅✗❌ℹ️📌💡⚠️🚨]\s*/, '')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end bg-white">
              <button disabled={isSubmitting || !analysisResult} type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-10 py-3.5 rounded-2xl font-bold shadow-md transition-all flex items-center gap-2.5 hover:-translate-y-0.5 disabled:opacity-50"><Send className="w-4 h-4"/> ส่งรายงานคัดกรองเข้าสู่ศูนย์ควบคุม</button>
            </div>
          </form>
        </div>
      </div>

      {/* WARD RECENT CASES */}
      <div className="rounded-3xl shadow-sm border border-slate-200/60 bg-white overflow-hidden mt-10">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600"/>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">รายการประเมินเฝ้าระวังประจำหอผู้ป่วย</h3>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="ค้นหาชื่อ หรือ HN..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition-colors" />
            </div>
            
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="bg-transparent text-sm font-medium text-slate-700 outline-none" />
              <span className="text-slate-300">-</span>
              <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="bg-transparent text-sm font-medium text-slate-700 outline-none" />
              {(filters.dateFrom || filters.dateTo) && (
                <button onClick={() => setFilters({...filters, dateFrom: '', dateTo: ''})} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
              )}
            </div>
            
            <select value={filters.category} onChange={e=>setFilters({...filters, category: e.target.value})} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-600">
              <option value="all">ทุกหมวดหมู่</option>
              {systemCategories.map(sys => <option key={sys.id} value={sys.id}>{sys.id}</option>)}
            </select>
            
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
              พบ {filteredAssessments.length} รายการ
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x border-slate-100 min-h-[400px]">
          <div className="p-6 bg-slate-50/50">
            <h4 className="font-bold text-slate-700 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide"><AlertCircle className="w-4 h-4 text-orange-500"/> รอยืนยันจากกองระบาดวิทยา ({pendingCases.length})</h4>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {pendingCases.map(item => {
                const caseIsNew = typeof isCaseNew === 'function' ? isCaseNew(item.id, item.updated_at || item.created_at) : false;
                return (
                  <div key={item.id} onClick={() => handleOpenAuditModal(item)} className="p-5 border border-slate-200 rounded-2xl bg-white relative cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group">
                    {caseIsNew && item.status !== 'Pending' && (
                      <div className="absolute -top-2 -left-2 z-10">
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md animate-in zoom-in-50 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> UPDATED</span>
                      </div>
                    )}
                    <span className="absolute top-5 right-5 px-2.5 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Pending</span>
                    <h5 className="font-bold text-base text-slate-800">{item.patient_name}</h5>
                    <p className="text-xs text-slate-500 mt-1 font-medium">HN: {item.hn} • {item.device_type} • {new Date(item.created_at).toLocaleDateString()}</p>
                    <p className={`text-sm font-bold mt-3 ${getTriageColor(item.auto_assess_result)}`}>{item.auto_assess_result}</p>
                    <div className="flex justify-end mt-4 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleCancelCase(item.id); }} className="px-4 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"><RotateCcw className="w-3.5 h-3.5"/> ดึงเรื่องกลับเพื่อแก้ไข</button>
                    </div>
                  </div>
                );
              })}
              {pendingCases.length === 0 && <p className="text-center text-slate-400 text-sm py-8">ไม่มีเคสที่รอยืนยัน</p>}
            </div>
          </div>
          <div className="p-6 bg-white">
            <h4 className="font-bold text-slate-700 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide"><CheckCircle className="w-4 h-4 text-teal-500"/> คำวินิจฉัยสิ้นสุด ({reviewedCases.length})</h4>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {reviewedCases.map(item => {
                const caseIsNew = typeof isCaseNew === 'function' ? isCaseNew(item.id, item.updated_at || item.created_at) : false;
                return (
                  <div key={item.id} onClick={() => handleOpenAuditModal(item)} className="p-5 border border-slate-200 rounded-2xl bg-white relative cursor-pointer hover:border-slate-300 hover:shadow-md transition-all">
                    {caseIsNew && (
                      <div className="absolute -top-2 -left-2 z-10">
                        <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md animate-in zoom-in-50 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> UPDATED</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'Confirmed' 
                          ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                          : item.status === 'POA'
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.status === 'Confirmed' ? '🚨 HAI' : item.status === 'POA' ? '🟠 POA' : `🗑️ ${item.status}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.updated_at || item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    
                    <h5 className="font-bold text-base text-slate-800">{item.patient_name}</h5>
                    <p className="text-xs text-slate-500 mt-1 font-medium">HN: {item.hn} • {item.device_type}</p>
                    
                    <div className="mt-4 p-4 rounded-xl border bg-gradient-to-br from-slate-50 to-white">
                      {item.ic_notes ? (
                        <div className="flex items-start gap-2 p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs font-medium text-slate-700 leading-relaxed">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">ข้อเสนอแนะจาก IC</span>
                            "{item.ic_notes}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center">ไม่มีข้อเสนอแนะเพิ่มเติม</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {reviewedCases.length === 0 && <p className="text-center text-slate-400 text-sm py-8">ไม่มีเคสที่วินิจฉัยแล้ว</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ AUDIT MODAL — Phase 4 สวย */}
      {showAuditModal && selectedAssessment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"> 
          <div className="p-0 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl bg-white text-slate-800 animate-in zoom-in-95 overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">Clinical Data Audit</h3>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    selectedAssessment.gender === 'male' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                    selectedAssessment.gender === 'female' ? 'bg-gradient-to-br from-pink-400 to-pink-600' :
                    'bg-gradient-to-br from-slate-400 to-slate-600'
                  }`}>
                    {selectedAssessment.patient_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-extrabold text-lg">{selectedAssessment.patient_name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md">HN: {selectedAssessment.hn}</span>
                      <span>{selectedAssessment.age_text || '-'}</span>
                      <span>{selectedAssessment.gender === 'male' ? '♂' : selectedAssessment.gender === 'female' ? '♀' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Timeline Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="relative pl-8 border-l-2 border-slate-200 space-y-8 ml-3">
                
                {/* Case Submitted */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-slate-800 ring-4 ring-white flex items-center justify-center">
                    <Activity className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        Case Submitted
                      </h4>
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg">
                        {selectedAssessment.device_type}
                      </span>
                    </div>
                    
                    <div className="p-5 space-y-4">
                      {/* Patient Info */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Age</p>
                          <p className="text-sm font-extrabold text-slate-800">{selectedAssessment.age_text || '-'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</p>
                          <p className="text-sm font-extrabold text-slate-800">
                            {selectedAssessment.gender === 'male' ? 'ชาย' : selectedAssessment.gender === 'female' ? 'หญิง' : '-'}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ward</p>
                          <p className="text-sm font-extrabold text-slate-800">{selectedAssessment.ward_name || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Vitals */}
                      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" /> Patient Vitals
                        </p>
                        <div className="grid grid-cols-5 gap-3">
                          {[
                            { label: 'Temp', value: selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_temp, unit: '°C', high: selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_temp > 38 },
                            { label: 'Pulse', value: selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_pulse, unit: '' },
                            { label: 'RR', value: selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_rr, unit: '' },
                            { label: 'BP', value: `${selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_bp_sys || '-'}/${selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_bp_dia || '-'}`, unit: '' },
                            { label: 'SpO2', value: selectedAssessment.detailed_analysis_json?.clinical_vitals?.vital_spo2, unit: '%' }
                          ].map((v, i) => (
                            <div key={i} className="text-center">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{v.label}</p>
                              <p className={`text-sm font-extrabold ${v.high ? 'text-rose-600' : 'text-slate-800'}`}>
                                {v.value || '-'}{v.unit}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Triage Log */}
                      <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-xl border border-indigo-100 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" /> Triage Log
                          </p>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            selectedAssessment.auto_assess_result?.includes('POSITIVE') 
                              ? 'bg-rose-100 text-rose-600' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {selectedAssessment.auto_assess_result?.includes('POSITIVE') ? '✅ Positive' : '⚠️ Negative'}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {selectedAssessment.detailed_analysis_json?.ai_result?.reason?.map((r, i) => {
                            const isPositive = r.includes('✓') || r.includes('✅');
                            const isNegative = r.includes('✗') || r.includes('❌');
                            const isInfo = r.includes('ℹ️') || r.includes('📌') || r.includes('💡');
                            const isWarning = r.includes('⚠️') || r.includes('🚨');
                            
                            return (
                              <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${
                                isPositive ? 'bg-emerald-50/80' :
                                isNegative ? 'bg-rose-50/80' :
                                isWarning ? 'bg-amber-50/80' :
                                isInfo ? 'bg-blue-50/80' :
                                'bg-slate-50/80'
                              }`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  isPositive ? 'bg-emerald-100 text-emerald-600' :
                                  isNegative ? 'bg-rose-100 text-rose-600' :
                                  isWarning ? 'bg-amber-100 text-amber-600' :
                                  isInfo ? 'bg-blue-100 text-blue-600' :
                                  'bg-slate-200 text-slate-500'
                                }`}>
                                  {isPositive ? <CheckCircle className="w-3 h-3" /> :
                                   isNegative ? <X className="w-3 h-3" /> :
                                   isWarning ? <AlertTriangle className="w-3 h-3" /> :
                                   <ChevronRight className="w-3 h-3" />}
                                </div>
                                <p className={`text-xs font-medium leading-relaxed ${
                                  isPositive ? 'text-emerald-800' :
                                  isNegative ? 'text-rose-800' :
                                  isWarning ? 'text-amber-800' :
                                  isInfo ? 'text-blue-800' :
                                  'text-slate-700'
                                }`}>{r}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Audit Logs */}
                {auditLogs.map(log => (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full ring-4 ring-white flex items-center justify-center ${
                      log.new_value === 'Confirmed' ? 'bg-rose-500' :
                      log.new_value === 'POA' ? 'bg-orange-500' :
                      'bg-slate-400'
                    }`}>
                      <RotateCcw className="w-3 h-3 text-white" />
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-800">
                          Status Updated: <span className={`${
                            log.new_value === 'Confirmed' ? 'text-rose-600' :
                            log.new_value === 'POA' ? 'text-orange-600' :
                            'text-slate-600'
                          }`}>{log.new_value}</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.created_at).toLocaleString('th-TH')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        โดย: <span className="font-semibold text-slate-700">{log.user_full_name}</span>
                      </p>
                      {log.details && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs font-medium text-slate-700 italic">
                          💬 "{log.details}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

WardNursePane.propTypes = {
  currentUser: PropTypes.object.isRequired,
  wards: PropTypes.array.isRequired,
  systemUsers: PropTypes.array.isRequired,
  cdcConfig: PropTypes.object.isRequired,
  assessments: PropTypes.array.isRequired,
  fetchAssessments: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  systemCategories: PropTypes.array.isRequired,
  viewedCases: PropTypes.object,
  markCaseAsViewed: PropTypes.func,
  isCaseNew: PropTypes.func,
};