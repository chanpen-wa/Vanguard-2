// ==========================================
// 🧠 Vanguard IC: AI Triage Logic Engine
// ==========================================

export const calculateHospitalDay = (admitDateStr, doeDateStr) => {
  if (!admitDateStr || !doeDateStr) return null;
  const start = new Date(admitDateStr);
  const end = new Date(doeDateStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays + 1 : null;
};

export const checkDeviceAttribution = (insertDateStr, removeDateStr, doeDateStr) => {
  if (!doeDateStr || !insertDateStr) return true;
  const insert = new Date(insertDateStr);
  const doe = new Date(doeDateStr);
  insert.setHours(0, 0, 0, 0);
  doe.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((doe - insert) / (1000 * 60 * 60 * 24));
  if (daysDiff < 2) return false;
  if (removeDateStr) {
    const remove = new Date(removeDateStr);
    remove.setHours(0, 0, 0, 0);
    const removeDiff = Math.round((doe - remove) / (1000 * 60 * 60 * 24));
    if (removeDiff > 1) return false;
  }
  return true;
};

export const getTriageColor = (result) => {
  if (!result) return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
  if (result.includes('HAI') || result.includes('CLABSI') || result.includes('VAP') || result.includes('CAUTI')) {
    return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
  }
  if (result.includes('POA')) {
    return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  }
  if (result.includes('POSITIVE')) {
    return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
  }
  if (result.includes('NEGATIVE')) {
    return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  }
  return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
};

// ==========================================
// 🧠 Main Analyze Function
// ==========================================
export const handleAnalyzeLogic = (formData = {}, systemData = {}, cdcConfig = {}) => {
  if (!systemData.system) return { type: 'error', title: 'SYSTEM ERROR', summary: 'ไม่พบข้อมูลหมวดหมู่โรค' };

  const schema = cdcConfig[systemData.system];
  if (!schema || !schema.rules || !schema.rules.disease_paths) {
    return { type: 'error', title: 'SYSTEM ERROR: ไม่พบเกณฑ์ระบาดวิทยา', summary: 'โปรดตรวจสอบการตั้งค่า AI Logic', reason: ['ไม่พบ Rules สำหรับหมวดหมู่นี้'] };
  }

  const mergedData = { ...systemData.dynamic_data };

  let isInfant = false;
  let isAdult = false;
  let ageLabel = 'ไม่ระบุอายุ';

  if (formData.age_years !== undefined && formData.age_years !== null && String(formData.age_years).trim() !== '') {
    const age = Number(formData.age_years);
    if (!isNaN(age)) {
      isInfant = age === 0;
      isAdult = age >= 1;
      ageLabel = isInfant ? 'Infant (< 1 ปี)' : `Adult (>= 1 ปี)`;
    }
  }

  const hospitalDay = calculateHospitalDay(formData.admission_date, systemData.doe);
  const isHAI = hospitalDay >= 3;
  const timingLabel = hospitalDay ? `(Day ${hospitalDay}: ${isHAI ? 'HAI' : 'POA'})` : '';

  // SSI Surveillance Period Check
  if (systemData.system === 'SSI') {
    const surgeryDate = mergedData['surgery_date'];
    const doe = systemData.doe;
    if (surgeryDate && doe) {
      const surgery = new Date(surgeryDate);
      const event = new Date(doe);
      const daysSinceSurgery = Math.ceil((event - surgery) / (1000 * 60 * 60 * 24));
      const hasImplant = mergedData['has_implant'];
      const maxDays = hasImplant ? 90 : 30;
      if (daysSinceSurgery < 0) {
        return { type: 'warning', title: 'ERROR: DOE ก่อนวันผ่าตัด', summary: 'Date of Event ต้องไม่น้อยกว่าวันที่ผ่าตัด', reason: [`Surgery: ${surgeryDate}, DOE: ${doe}`] };
      }
      if (daysSinceSurgery > maxDays) {
        return { type: 'warning', title: `NEGATIVE: เกินระยะเวลาเฝ้าระวัง SSI (${maxDays} วัน)`, summary: `DOE อยู่ที่ ${daysSinceSurgery} วันหลังผ่าตัด`, reason: [`ไม่เข้าเกณฑ์ SSI — DOE เกิน Surveillance Period`, `ระยะเฝ้าระวัง: ${maxDays} วัน`, `จำนวนวันหลังผ่าตัด: ${daysSinceSurgery} วัน`] };
      }
    }
  }

  // Evaluator
  const evaluateNode = (node) => {
    if (!node) return false;
    if (node.type === 'all_of') return node.conditions.every(evaluateNode);
    if (node.type === 'any_of') return node.conditions.some(evaluateNode);
    if (node.type === 'mandatory') {
      if (!node.fields || !Array.isArray(node.fields)) return false;
      return node.fields.every(f => {
        const val = mergedData[f];
        if (val === false) return false;
        return val === true || (val !== undefined && val !== null && val !== '');
      });
    }
    if (node.type === 'exact_match') {
      let val = mergedData[node.field];
      if (typeof node.value === 'boolean' && (val === undefined || val === null)) val = false;
      return String(val).toLowerCase() === String(node.value).toLowerCase();
    }
    if (node.type === 'min_count') {
      const targetVal = Number(node.value || node.count || 1);
      if (node.fields && Array.isArray(node.fields)) {
        return node.fields.filter(f => mergedData[f] === true).length >= targetVal;
      }
      if (node.field) {
        const numericVal = Number(mergedData[node.field]);
        if (!isNaN(numericVal)) return numericVal >= targetVal;
        return mergedData[node.field] === true;
      }
      return false;
    }
    return false;
  };

  let matchedPaths = [];
  for (const path of schema.rules.disease_paths) {
    if (!path.criteria || path.criteria.length === 0) continue;
    if (path.criteria.every(evaluateNode)) matchedPaths.push(path);
  }

  // Auto VAP/CAUTI
  if (systemData.system === 'LRI' || systemData.system === 'PNEU') {
    if (matchedPaths.some(p => ['PNU1', 'PNU2', 'PNU3'].includes(p.base_disease))) {
      mergedData['pneu_pnu1_met'] = true;
      mergedData['pneu_pnu2_met'] = true;
      mergedData['pneu_pnu3_met'] = true;
      const vapPath = schema.rules.disease_paths.find(p => p.device_field === 'pneu_has_ventilator' || p.device_disease === 'VAP');
      if (vapPath && vapPath.criteria.every(evaluateNode)) {
        if (!matchedPaths.some(p => p.device_field === 'pneu_has_ventilator' || p.device_disease === 'VAP')) {
          matchedPaths.push(vapPath);
        }
      }
    }
  }
  if (systemData.system === 'UTI') {
    if (matchedPaths.some(p => p.base_disease?.startsWith('SUTI'))) {
      mergedData['suti_criteria_met'] = true;
      const cautiPath = schema.rules.disease_paths.find(p => p.device_field === 'has_foley' || p.device_disease === 'CAUTI');
      if (cautiPath && cautiPath.criteria.every(evaluateNode)) {
        if (!matchedPaths.some(p => p.device_field === 'has_foley' || p.device_disease === 'CAUTI')) {
          matchedPaths.push(cautiPath);
        }
      }
    }
  }

  if (matchedPaths.length === 0) {
    return {
      type: 'warning',
      title: `NEGATIVE: ไม่เข้าเกณฑ์ ${schema.system_id}`,
      summary: 'ข้อมูลปัจจุบันยังไม่เข้าเกณฑ์ระบาดวิทยา',
      reason: [`ตรวจสอบเกณฑ์ทั้งหมด ${schema.rules.disease_paths.length} รูปแบบแล้ว ไม่พบความสอดคล้อง`, `Age Category: ${ageLabel}`, `Hospital Day: ${hospitalDay || 'ไม่ระบุ'}`]
    };
  }

  const primaryMatch = matchedPaths[matchedPaths.length - 1];
  let finalReasons = [];
  finalReasons.push(`พบความสอดคล้อง ${matchedPaths.length} ระดับ:`);
  matchedPaths.forEach(p => finalReasons.push(`- ${p.base_disease}`));
  finalReasons.push(`ผลวินิจฉัย: ${primaryMatch.base_disease}`);

  if (hospitalDay) {
    finalReasons.push(`ระยะเวลา: ${isHAI ? 'HAI' : 'POA'} (Day ${hospitalDay})`);
  } else {
    finalReasons.push('ไม่สามารถระบุ HAI/POA — ข้อมูลวันไม่สมบูรณ์');
  }

  let finalTitle = `${primaryMatch.base_disease} ${timingLabel}`;

  if (primaryMatch.device_field && mergedData[primaryMatch.device_field]) {
    let insertDate = null, removeDate = null;
    if (primaryMatch.device_field === 'has_central_line') {
      insertDate = mergedData['cl_insert_date'];
      removeDate = mergedData['cl_remove_date'];
    }
    const isDeviceAttributed = checkDeviceAttribution(insertDate, removeDate, systemData.doe);
    if (isDeviceAttributed) {
      finalTitle = `${primaryMatch.device_disease || primaryMatch.base_disease} ${timingLabel}`;
      finalReasons.push(`ยกระดับเป็น ${primaryMatch.device_disease || primaryMatch.base_disease} — พบอุปกรณ์ทางการแพทย์`);
    } else {
      finalReasons.push(`มีอุปกรณ์แต่ไม่เข้าเกณฑ์ device-associated — คงผลวินิจฉัย: ${primaryMatch.base_disease}`);
    }
  }

  if (primaryMatch.pass_message) finalReasons.push(primaryMatch.pass_message);

  return { type: 'success', title: `POSITIVE: ${finalTitle}`, summary: `AI ประเมินพบความสอดคล้องตามเกณฑ์`, reason: finalReasons };
};