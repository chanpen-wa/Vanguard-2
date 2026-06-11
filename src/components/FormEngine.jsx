import React from 'react';
import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';

const THEME_MAP = {
  blue: { wrapper: 'border-blue-200 bg-white', header: 'bg-blue-50/50 border-b border-blue-100 text-blue-900', dot: 'bg-blue-500' },
  yellow: { wrapper: 'border-amber-200 bg-white', header: 'bg-amber-50/30 border-b border-amber-100 text-amber-900', dot: 'bg-amber-500' },
  red: { wrapper: 'border-rose-200 bg-white', header: 'bg-rose-50/30 border-b border-rose-100 text-rose-900', dot: 'bg-rose-500' },
  purple: { wrapper: 'border-purple-200 bg-white', header: 'bg-purple-50/40 border-b border-purple-100 text-purple-900', dot: 'bg-purple-500' },
  amber: { wrapper: 'border-amber-200 bg-white', header: 'bg-amber-50 border-b border-amber-100 text-amber-800', dot: 'bg-amber-500' },
  pink: { wrapper: 'border-pink-200 bg-white', header: 'bg-pink-50/50 border-b border-pink-100 text-pink-900', dot: 'bg-pink-500' },
  slate: { wrapper: 'border-slate-200 bg-white', header: 'bg-slate-50/50 border-b border-slate-100 text-slate-800', dot: 'bg-slate-500' }
};

const ALERT_THEMES = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-rose-50 text-rose-800 border-rose-200',
  purple: 'bg-purple-50 text-purple-800 border-purple-200'
};

export default function FormEngine({ schema, data = {}, onChange, patientAgeYears, patientAgeDisplay }) {
  if (!schema || !schema.sections) return null;

  // ✅ Auto-calculate aggregate fields
  const calculateAggregateFields = (newData) => {
    if (!schema.aggregate_fields || !Array.isArray(schema.aggregate_fields)) return newData;
    
    const updatedData = { ...newData };
    
    schema.aggregate_fields.forEach(agg => {
      if (agg.operator === 'count_true' && agg.source_fields) {
        const count = agg.source_fields.filter(fieldId => updatedData[fieldId] === true).length;
        updatedData[agg.id] = count;
      } else if (agg.operator === 'any_true' && agg.source_fields) {
        const anyTrue = agg.source_fields.some(fieldId => updatedData[fieldId] === true);
        updatedData[agg.id] = anyTrue;
      }
    });
    
    return updatedData;
  };

  const handleChange = (id, value) => {
    let newData = { ...data, [id]: value };
    newData = calculateAggregateFields(newData);
    onChange(newData);
  };

  const parseText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ✅ Helper: เช็ค age
  const isAgeValid = patientAgeYears !== undefined && patientAgeYears !== null && patientAgeYears !== '';
  const ageNum = isAgeValid ? Number(patientAgeYears) : null;

  const checkAgeCondition = (field) => {
    // target_age
    if (field.target_age && isAgeValid) {
      const age = Number(patientAgeYears);
      console.warn(`🔍 CHECK: ${field.id} | target_age=${field.target_age} | patient=${age}`);
      if (field.target_age === 'infant' && age >= 1) return false;
      if (field.target_age === 'adult' && age === 0) return false;
    }
    // target_condition
    if (field.target_condition) {
      if (field.target_condition === 'is_infant') {
        if (!isAgeValid) return false;
        if (ageNum >= 1) return false;
      }
      if (field.target_condition === 'is_adult') {
        if (isAgeValid && ageNum === 0) return false;
      }
    }
    return true;
  };

  const RenderField = ({ field, level = 0 }) => {
    // ✅ กรองตามอายุ/เงื่อนไข
    if (!checkAgeCondition(field)) return null;

    if (field.type === 'alert') {
      const themeClass = ALERT_THEMES[field.theme] || ALERT_THEMES.info;
      return (
        <div className={`flex items-start gap-3 p-3.5 mb-3 rounded-xl border ${themeClass} shadow-sm animate-in fade-in slide-in-from-bottom-2`}>
          <Info className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
          <div className="text-sm font-medium leading-relaxed">{parseText(field.text)}</div>
        </div>
      );
    }

    if (field.type === 'row') {
      return (
        <div className="mb-4">
          {field.label && <label className="block text-sm font-extrabold text-slate-700 mb-2">{parseText(field.label)}</label>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field.children?.map(child => <RenderField key={child.id} field={child} level={level + 1} />)}
          </div>
        </div>
      );
    }

    if (field.type === 'row_inline') {
      return (
        <div className="mb-4 p-4 bg-slate-50/50 border border-slate-200 rounded-2xl">
          {field.label && <label className="block text-sm font-extrabold text-slate-700 mb-3">{parseText(field.label)}</label>}
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {field.children?.map(child => <RenderField key={child.id} field={child} level={level + 1} />)}
          </div>
        </div>
      );
    }

    const currentValue = data[field.id];

    if (field.type === 'checkbox') {
      const isChecked = !!currentValue;
      return (
        <div className="mb-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleChange(field.id, e.target.checked)}
                className="peer w-5 h-5 appearance-none border-2 border-slate-300 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
              />
              <CheckCircle2 className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-bold select-none transition-colors ${isChecked ? 'text-indigo-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                {parseText(field.label)}
              </span>
              {field.description && <span className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{field.description}</span>}
            </div>
          </label>
          
          {isChecked && field.children && field.children.length > 0 && (
            <div className="mt-3 ml-2 pl-6 border-l-2 border-indigo-100 animate-in fade-in slide-in-from-left-2 space-y-3">
              {field.children.map(child => <RenderField key={child.id} field={child} level={level + 1} />)}
            </div>
          )}
        </div>
      );
    }

    if (field.type === 'radio_select') {
      return (
        <div className="mb-5 animate-in fade-in slide-in-from-bottom-2">
          <label className="block text-sm font-bold text-slate-700 mb-2.5">
            {parseText(field.label)}
            {field.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          
          <div className="space-y-2">
            {field.options?.map((opt, i) => {
              // ✅ target_condition ใน option
              if (opt.target_condition) {
                if (opt.target_condition === 'is_infant') {
                  if (!isAgeValid) return null;
                  if (ageNum >= 1) return null;
                }
                if (opt.target_condition === 'is_adult') {
                  if (isAgeValid && ageNum === 0) return null;
                }
              }
              
              const isSelected = currentValue === opt.value;
              return (
                <label 
                  key={i} 
                  className={`
                    flex items-center gap-3.5 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-100' 
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/80'
                    }
                  `}
                >
                  <div className={`
                    relative w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
                    ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'}
                  `}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-in zoom-in-50 duration-200" />
                    )}
                  </div>
                  
                  <input
                    type="radio"
                    name={field.id}
                    value={opt.value}
                    checked={isSelected}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    className="sr-only"
                  />
                  
                  <span className={`text-sm font-semibold transition-colors duration-200 ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                  
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 ml-auto shrink-0 animate-in zoom-in-50 duration-200" strokeWidth={2.5} />
                  )}
                </label>
              );
            })}
          </div>
          
          {field.description && (
            <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed">{field.description}</p>
          )}
        </div>
      );
    }

    if (['text', 'number', 'date'].includes(field.type)) {
      return (
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            {parseText(field.label)}
            {field.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          <input
            type={field.type}
            value={currentValue || ''}
            onChange={(e) => handleChange(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder || ''}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
          />
          {field.description && <p className="mt-1.5 text-xs text-slate-500 font-medium">{field.description}</p>}
        </div>
      );
    }

    return null;
  };

  const isInfant = ageNum !== null && ageNum < 1;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      
      {isAgeValid && (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm shrink-0">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-extrabold text-indigo-900 mb-1">
              ระบบกรองข้อมูลอัตโนมัติตามช่วงวัย
            </h4>
            <p className="text-sm font-medium text-indigo-700">
              ฟอร์มถูกปรับสัดส่วนสำหรับประเมิน: <span className="font-bold underline decoration-indigo-300 underline-offset-2">{isInfant ? 'ทารก (อายุน้อยกว่า 1 ปี)' : 'เด็กโต/ผู้ใหญ่ (อายุ 1 ปีขึ้นไป)'}</span> (อายุผู้ป่วย {patientAgeDisplay || `${patientAgeYears} ปี`})
            </p>
          </div>
        </div>
      )}

      {schema.sections.map((section) => {
        
        const sectionCondition = section.condition || section.depends_on;
        if (sectionCondition) {
          const conditionFieldVal = data[sectionCondition.field];
          if (conditionFieldVal !== sectionCondition.value) {
            return null;
          }
        }

        const theme = THEME_MAP[section.theme] || THEME_MAP.blue;

        return (
          <div 
            key={section.id} 
            className={`rounded-2xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 ${theme.wrapper}`}
          >
            <div className={`px-5 py-3.5 flex items-center gap-3 ${theme.header}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${theme.dot} shadow-sm shrink-0`}></div>
              <h3 className="font-extrabold text-base tracking-wide">{section.title}</h3>
            </div>
            
            <div className="p-5 sm:p-6 bg-white">
              {section.description && (
                <p className="text-xs text-slate-500 font-medium mb-5 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                  {section.description}
                </p>
              )}
              
              <div className="space-y-1">
                {section.fields?.map((field) => (
                  <RenderField key={field.id} field={field} level={0} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}