// ==========================================
// 📝 CRITERIA_LABELS — Custom Override
// ==========================================
export const CRITERIA_LABELS = {
  blood_culture_positive: { title: 'ผลเพาะเชื้อในเลือดเป็นบวก', desc: 'พบเชื้อในกระแสโลหิต (Blood culture positive)' },
  is_commensal: { title: 'เชื้อประจำถิ่น (Commensal)', desc: 'พบเชื้อกลุ่ม CoNS, Diphtheroids ฯลฯ' },
  organism_name: { title: 'ชนิดเชื้อที่พบ', desc: 'ระบุชื่อเชื้อจากการเพาะเชื้อ' },
  has_central_line: { title: 'มีสายสวนหลอดเลือดส่วนกลาง', desc: 'Central Line ณ DOE หรือภายใน 48 ชม.' },
  cl_insert_date: { title: 'วันที่ใส่สาย Central Line', desc: 'วันที่เริ่มใส่สายสวนหลอดเลือด' },
  cl_remove_date: { title: 'วันที่ถอดสาย Central Line', desc: 'วันที่ถอดสาย (ถ้ามีการถอดก่อน DOE)' },
  is_secondary_bsi: { title: 'การติดเชื้อในกระแสเลือดทุติยภูมิ', desc: 'BSI จากตำแหน่งอื่น' },
  commensal_count: { title: 'จำนวนครั้งที่พบเชื้อประจำถิ่น', desc: 'จำนวนตัวอย่างที่พบ Commensal ชนิดเดียวกัน' },
  fever_adult: { title: 'มีไข้ (ผู้ใหญ่)', desc: 'อุณหภูมิ > 38.0°C' },
  chills: { title: 'หนาวสั่น (Chills)', desc: 'มีอาการหนาวสั่นร่วมกับไข้' },
  hypotension: { title: 'ความดันโลหิตต่ำ', desc: 'SBP < 90 mmHg' },
  fever_infant: { title: 'มีไข้ (ทารก)', desc: 'อุณหภูมิ > 38.0°C หรือ < 36.0°C' },
  hypothermia_infant: { title: 'อุณหภูมิต่ำ (ทารก)', desc: 'อุณหภูมิ < 36.0°C' },
  apnea_infant: { title: 'หยุดหายใจ (Apnea)', desc: 'ทารกมีภาวะหยุดหายใจ' },
  brady_infant: { title: 'หัวใจเต้นช้า (Bradycardia)', desc: 'อัตราการเต้นหัวใจต่ำกว่าเกณฑ์' },
  imaging_positive: { title: 'ภาพถ่ายรังสีปอดผิดปกติ', desc: 'พบความผิดปกติใหม่ใน Chest Imaging' },
  has_ett: { title: 'ใส่ท่อช่วยหายใจ', desc: 'ETT หรือ Tracheostomy ณ DOE หรือภายใน 48 ชม.' },
  wbc_abnormal: { title: 'เม็ดเลือดขาวผิดปกติ', desc: 'WBC ≥ 12,000 หรือ ≤ 4,000 cells/mm³' },
  sputum_change: { title: 'เสมหะเปลี่ยนลักษณะ', desc: 'ปริมาณ/สี/ความหนืดเปลี่ยนจากเดิม' },
  dyspnea_adult: { title: 'หายใจลำบาก/ไอ (ผู้ใหญ่)', desc: 'มีอาการหอบเหนื่อย หายใจเร็ว หรือไอ' },
  apnea_tachypnea: { title: 'หยุดหายใจ/หายใจเร็ว (ทารก)', desc: 'Apnea หรือ Tachypnea' },
  bradycardia_pneu: { title: 'หัวใจเต้นช้า (PNEU)', desc: 'Bradycardia ร่วมกับอาการทางเดินหายใจ' },
  has_foley: { title: 'คาสายสวนปัสสาวะ', desc: 'Foley Catheter ณ DOE หรือเพิ่งถอด ≤ 2 วัน' },
  urine_culture_pos: { title: 'ผลเพาะเชื้อปัสสาวะเป็นบวก', desc: '≥ 10⁵ CFU/ml — ≤ 2 ชนิดเชื้อ' },
  dipstick_pos: { title: 'Urine Dipstick ผิดปกติ', desc: 'ตรวจพบ Leukocyte esterase หรือ Nitrite' },
  pyuria: { title: 'ตรวจพบหนองในปัสสาวะ', desc: 'WBC ≥ 10 cells/mm³' },
  fever_uti: { title: 'มีไข้ (UTI)', desc: 'อุณหภูมิ > 38.0°C' },
  dysuria: { title: 'ปัสสาวะแสบขัด', desc: 'เจ็บหรือแสบเวลาปัสสาวะ' },
  urgency: { title: 'ปัสสาวะเร่งด่วน/บ่อย', desc: 'ปวดปัสสาวะบ่อยผิดปกติ' },
  suprapubic_pain: { title: 'กดเจ็บเหนือหัวหน่า', desc: 'เจ็บบริเวณท้องน้อย' },
  uc_positive: { title: 'Urine Culture เป็นบวก', desc: 'พบเชื้อจากการเพาะเชื้อปัสสาวะ' },
  gi_type: { title: 'ประเภทการติดเชื้อ GI', desc: 'GE, CDI, หรือ HEP' },
  ge_culture_pos: { title: 'เพาะเชื้ออุจจาระเป็นบวก (GE)', desc: 'พบเชื้อก่อโรคจากอุจจาระ' },
  ge_nausea: { title: 'คลื่นไส้/อาเจียน', desc: 'มีอาการคลื่นไส้หรืออาเจียน' },
  ge_diarrhea: { title: 'ท้องเสีย', desc: 'อุจจาระเหลว ≥ 3 ครั้ง/24 ชม.' },
  ge_abd_pain: { title: 'ปวดท้อง', desc: 'มีอาการปวดท้องร่วมด้วย' },
  cvs_type: { title: 'ประเภทการติดเชื้อ CVS', desc: 'CARD, ENDO, หรือ VASC' },
  chest_pain: { title: 'เจ็บหน้าอก', desc: 'Chest pain หรือ Pericardial rub' },
  ekg_changes: { title: 'คลื่นไฟฟ้าหัวใจผิดปกติ', desc: 'EKG เปลี่ยนแปลงเข้าได้กับ myocarditis' },
  cns_type: { title: 'ประเภทการติดเชื้อระบบประสาท', desc: 'Meningitis, Ventriculitis, Encephalitis' },
  ic_surgical_evidence: { title: 'หลักฐานจากการผ่าตัด', desc: 'พบการติดเชื้อระหว่างผ่าตัดระบบประสาท' },
  eent_infection_type: { title: 'ประเภทการติดเชื้อ EENT', desc: 'CONJ, EAR, SINU, MAST, ORAL' },
  conj_culture_positive: { title: 'ผลเพาะเชื้อเยื่อบุตาเป็นบวก', desc: 'พบเชื้อจาก conjunctiva' },
  conj_clinical_criteria: { title: 'เกณฑ์ทางคลินิก (เยื่อบุตา)', desc: 'ตาแดง บวม หรือ discharge' },
  conj_supportive_evidence: { title: 'หลักฐานสนับสนุน (เยื่อบุตา)', desc: 'ผลตรวจเพิ่มเติม' },
  conj_symp_tearing: { title: 'น้ำตาไหลมาก', desc: 'มีน้ำตาไหลหรือ discharge' },
  ost_type: { title: 'ประเภทการติดเชื้อ OST', desc: 'BONE, PJI, หรือ JNT' },
  bone_type: { title: 'ประเภทการติดเชื้อกระดูก', desc: 'BONE, PJI, หรือ JNT' },
  bone_pain: { title: 'ปวด/บวมที่กระดูก', desc: 'กดเจ็บหรือบวมบริเวณกระดูก' },
  bone_imaging_pos: { title: 'ภาพถ่ายรังสีกระดูกผิดปกติ', desc: 'X-ray/MRI พบลักษณะ osteomyelitis' },
  bone_culture_pos: { title: 'เพาะเชื้อจากกระดูกเป็นบวก', desc: 'พบเชื้อจากเนื้อเยื่อกระดูก' },
};

// ==========================================
// 🔤 KEYWORD_MAP — Auto-Generate Fallback
// ==========================================
const KEYWORD_MAP = {
  'fever': 'มีไข้', 'adult': '(ผู้ใหญ่)', 'infant': '(ทารก)', 'positive': 'เป็นบวก',
  'culture': 'เพาะเชื้อ', 'blood': 'เลือด', 'urine': 'ปัสสาวะ', 'bone': 'กระดูก',
  'cns': 'ระบบประสาท', 'eent': 'ตา หู จมูก', 'conj': 'เยื่อบุตา', 'symp': 'อาการ',
  'evidence': 'หลักฐาน', 'surgical': 'ผ่าตัด', 'type': 'ประเภท', 'criteria': 'เกณฑ์',
  'secondary': 'ทุติยภูมิ', 'commensal': 'เชื้อประจำถิ่น', 'count': 'จำนวน',
  'apnea': 'หยุดหายใจ', 'bradycardia': 'หัวใจเต้นช้า', 'hypothermia': 'อุณหภูมิต่ำ',
  'tachypnea': 'หายใจเร็ว', 'pneu': 'ทางเดินหายใจ', 'uti': 'ทางเดินปัสสาวะ',
  'gi': 'ทางเดินอาหาร', 'cvs': 'หัวใจ/หลอดเลือด', 'ost': 'กระดูก/ข้อ',
  'infection': 'การติดเชื้อ', 'clinical': 'ทางคลินิก', 'supportive': 'สนับสนุน',
  'tearing': 'น้ำตาไหล', 'organism': 'เชื้อ', 'name': 'ชื่อ', 'insert': 'วันที่ใส่',
  'remove': 'วันที่ถอด', 'line': 'สาย', 'central': 'ส่วนกลาง', 'has': 'มี',
  'imaging': 'ภาพถ่ายรังสี', 'wbc': 'เม็ดเลือดขาว', 'abnormal': 'ผิดปกติ',
  'sputum': 'เสมหะ', 'change': 'เปลี่ยน', 'dyspnea': 'หายใจลำบาก',
  'foley': 'สายสวนปัสสาวะ', 'dipstick': 'Urine Dipstick', 'pyuria': 'หนองในปัสสาวะ',
  'dysuria': 'ปัสสาวะแสบขัด', 'urgency': 'ปัสสาวะเร่งด่วน', 'suprapubic': 'เหนือหัวหน่า',
  'pain': 'ปวด', 'nausea': 'คลื่นไส้', 'diarrhea': 'ท้องเสีย', 'abd': 'ท้อง',
  'chest': 'หน้าอก', 'ekg': 'คลื่นไฟฟ้าหัวใจ', 'chills': 'หนาวสั่น',
  'hypotension': 'ความดันโลหิตต่ำ', 'brady': 'หัวใจเต้นช้า',
};

// ==========================================
// 🧠 Smart Label Functions
// ==========================================
export const generateLabelFromKey = (key) => {
  const parts = key.split('_');
  const translated = parts.map(p => KEYWORD_MAP[p] || p);
  return translated.join(' ').replace(/^\w/, c => c.toUpperCase());
};

const findInFields = (fields, targetId) => {
  if (!fields) return null;
  for (const field of fields) {
    if (field.id === targetId) return field;
    if (field.children) { const found = findInFields(field.children, targetId); if (found) return found; }
  }
  return null;
};

export const findFieldLabelInSchema = (key, schema) => {
  if (!schema?.sections) return null;
  for (const section of schema.sections) {
    const found = findInFields(section.fields, key);
    if (found) return found.label || found.id;
  }
  return null;
};

export const getCriteriaLabel = (key, schema) => {
  // 1. Custom Override
  if (CRITERIA_LABELS[key]) return CRITERIA_LABELS[key];
  // 2. Schema Label
  const schemaLabel = findFieldLabelInSchema(key, schema);
  if (schemaLabel) return { title: schemaLabel, desc: '', fromSchema: true };
  // 3. Auto-Generate
  return { title: generateLabelFromKey(key), desc: '', autoGenerated: true };
};