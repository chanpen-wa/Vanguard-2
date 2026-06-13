export const SYSTEM_CATEGORIES = [
  { id: 'BSI', name: '1. กระแสโลหิต (BSI/LCBI)', short_name: 'กระแสโลหิต' },
  { id: 'CVS', name: '2. หัวใจ/หลอดเลือด (CVS)', short_name: 'หัวใจ/หลอดเลือด' },
  { id: 'EENT', name: '3. ตา/หู/คอ/จมูก (EENT)', short_name: 'ตา หู จมูก' },
  { id: 'PNEU', name: '4. ทางเดินหายใจ (PNEU/VAP)', short_name: 'ทางเดินหายใจ' },
  { id: 'CNS', name: '5. ระบบประสาท (CNS)', short_name: 'ระบบประสาท' },
  { id: 'SSI', name: '6. ตำแหน่งผ่าตัด (SSI)', short_name: 'แผลผ่าตัด' },
  { id: 'UTI', name: '7. ทางเดินปัสสาวะ (UTI)', short_name: 'ทางเดินปัสสาวะ' },
  { id: 'GI', name: '8. ทางเดินอาหาร (GI)', short_name: 'ทางเดินอาหาร' },
  { id: 'REPR', name: '9. อวัยวะสืบพันธุ์ (REPR)', short_name: 'อวัยวะสืบพันธุ์' },
  { id: 'OST', name: '10. กระดูก/ข้อ (OST)', short_name: 'กระดูก/ข้อ' },
  { id: 'OTHER', name: '11. การติดเชื้ออื่น ๆ', short_name: 'อื่น ๆ' }
];

export const DEFAULT_CDC_DB = {
  'BSI': {
    "system_id": "BSI", "name": "1. การติดเชื้อในกระแสโลหิต (BSI / LCBI / CLABSI)", "short_name": "กระแสโลหิต",
    "rules": {
      "disease_paths": [
        {
          "base_disease": "LCBI", "device_field": "has_central_line", "device_disease": "CLABSI",
          "criteria": [
            { "type": "any_of", "pass_message": "เข้าเกณฑ์ BSI/LCBI", "conditions": [
                { "type": "mandatory", "fields": ["blood_culture_positive"] },
                { "type": "all_of", "conditions": [
                    { "type": "mandatory", "fields": ["is_commensal"] },
                    { "type": "mandatory", "fields": ["fever_adult", "chills", "hypotension", "fever_infant", "apnea_infant", "brady_infant"] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    "sections": [
      {
        "id": "blood_culture", "title": "ผลเพาะเชื้อในเลือด (Blood Culture)", "theme": "blue",
        "fields": [
          {
            "id": "blood_culture_positive", "type": "checkbox", "label": "เพาะเชื้อในเลือดได้ผลบวก (Blood culture positive)",
            "children": [
              { "id": "organism_name", "type": "text", "label": "ชนิดเชื้อที่พบ:", "placeholder": "เช่น S. aureus, E. coli, CoNS" },
              { "id": "is_commensal", "type": "checkbox", "label": "เป็น Commensal organism (เชื้อผิวหนัง)", "description": "CoNS, Diphtheroids, Bacillus spp., Propionibacterium spp., Viridans Streptococci, Aerococcus, Micrococcus",
                "children": [
                  { "id": "alert_comm", "type": "alert", "theme": "amber", "text": "Commensal ต้องพบเชื้อชนิดเดียวกัน ≥ 2 ครั้ง จากตัวอย่างเลือดที่เจาะแยกกัน" },
                  { "id": "commensal_count", "type": "number", "label": "จำนวนครั้งที่พบเชื้อเดียวกัน (จากการเจาะแยกกัน):" }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "central_line", "title": "สาย Central Line — สำหรับ CLABSI", "theme": "purple", "description": "PICC, CVC, Hemodialysis catheter, Umbilical catheter (ทารก) — ไม่รวม Peripheral IV / Arterial line",
        "fields": [
          {
            "id": "has_central_line", "type": "checkbox", "label": "มีสาย Central Line ณ DOE หรือภายใน 48 ชั่วโมงก่อน DOE",
            "children": [
              { "id": "cl_row", "type": "row", "children": [
                  { "id": "cl_insert_date", "type": "date", "label": "วันที่ใส่สาย:" },
                  { "id": "cl_remove_date", "type": "date", "label": "วันที่ถอดสาย (ถ้าถอดแล้ว):" }
              ]}
            ]
          }
        ]
      },
      {
        "id": "symptoms", "title": "อาการ (Symptoms)", "theme": "yellow", "description": "ใช้สำหรับประเมินร่วมกับ Commensal organisms (หากเป็น Recognized Pathogen ไม่ต้องการอาการ)",
        "fields": [
          { "id": "symp_row_adult", "type": "row_inline", "target_age": "adult", "children": [
              { "id": "fever_adult", "type": "checkbox", "label": "ไข้ > 38°C" },
              { "id": "chills", "type": "checkbox", "label": "หนาวสั่น (Chills)" },
              { "id": "hypotension", "type": "checkbox", "label": "ความดันโลหิตต่ำ (Hypotension)" }
          ]},
          { "id": "symp_row_infant", "type": "row_inline", "target_age": "infant", "children": [
              { "id": "fever_infant", "type": "checkbox", "label": "ไข้ > 38°C หรือ < 36°C" },
              { "id": "apnea_infant", "type": "checkbox", "label": "หยุดหายใจ (Apnea)" },
              { "id": "brady_infant", "type": "checkbox", "label": "หัวใจเต้นช้า (Bradycardia)" }
          ]}
        ]
      }
    ]
  },
  'CVS': {
    "system_id": "CVS", "name": "2. หัวใจ/หลอดเลือด (CVS)", "short_name": "หัวใจ/หลอดเลือด",
    "rules": {
      "disease_paths": [
        { "base_disease": "CARD (Myocarditis/Pericarditis)", "criteria": [ { "type": "exact_match", "field": "cvs_type", "value": "CARD" }, { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["card_culture_pos"] }, { "type": "mandatory", "fields": ["card_patho_pos"] }, { "type": "all_of", "conditions": [ { "type": "min_count", "count": 2, "fields": ["fever_adult", "chest_pain", "ekg_changes"] }, { "type": "mandatory", "fields": ["card_imaging_pos"] } ] } ] } ] },
        { "base_disease": "ENDO (Endocarditis)", "criteria": [ { "type": "exact_match", "field": "cvs_type", "value": "ENDO" }, { "type": "any_of", "conditions": [ { "type": "all_of", "conditions": [ { "type": "mandatory", "fields": ["endo_blood_culture"] }, { "type": "mandatory", "fields": ["endo_echo_pos"] } ] }, { "type": "mandatory", "fields": ["endo_patho_pos"] } ] } ] }
      ]
    },
    "sections": [
      {
        "id": "cvs_selector", "title": "เลือกประเภท CVS ที่ต้องการวิเคราะห์", "theme": "blue",
        "fields": [
          { "id": "cvs_type", "type": "radio_select", "options": [ { "label": "CARD — Myocarditis/Pericarditis", "value": "CARD" }, { "label": "ENDO — Endocarditis (เยื่อบุหัวใจอักเสบ)", "value": "ENDO" }, { "label": "VASC — Vascular Infection (หลอดเลือด)", "value": "VASC" } ] }
        ]
      },
      {
        "id": "card_sec", "title": "CARD (Myocarditis/Pericarditis)", "theme": "yellow", "depends_on": { "field": "cvs_type", "value": "CARD" },
        "fields": [
          { "id": "card_culture_pos", "type": "checkbox", "label": "เพาะเชื้อจากเนื้อเยื่อหัวใจ/น้ำ pericardial บวก" },
          { "id": "chest_pain", "type": "checkbox", "label": "เจ็บหน้าอก / เสียง Pericardial rub" },
          { "id": "ekg_changes", "type": "checkbox", "label": "คลื่น EKG เปลี่ยนแปลงเข้าได้กับ myocarditis" }
        ]
      },
      {
        "id": "endo_sec", "title": "ENDO (Endocarditis)", "theme": "red", "depends_on": { "field": "cvs_type", "value": "ENDO" },
        "fields": [
          { "id": "endo_blood_culture", "type": "checkbox", "label": "Blood culture ผลบวก ≥ 2 ชุด (Separate cultures)" },
          { "id": "endo_echo_pos", "type": "checkbox", "label": "Echocardiogram พบ vegetation, abscess หรือ new regurgitation" },
          { "id": "endo_patho_pos", "type": "checkbox", "label": "พบหลักฐานการติดเชื้อที่ลิ้นหัวใจจากการผ่าตัด/พยาธิวิทยา" }
        ]
      }
    ]
  },
  'EENT': {
    "system_id": "EENT", "name": "3. ตา/หู/คอ/จมูก (EENT)", "short_name": "ตา หู จมูก",
    "rules": {
      "disease_paths": [
        { "base_disease": "CONJ (Conjunctivitis)", "criteria": [ { "type": "exact_match", "field": "eent_type", "value": "CONJ" }, { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["conj_culture_pos"] }, { "type": "all_of", "conditions": [ { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["conj_erythema", "conj_discharge"] } ] }, { "type": "mandatory", "fields": ["eent_physician_dx"] } ] } ] } ] }
      ]
    },
    "sections": [
      {
        "id": "eent_selector", "title": "เลือกประเภท EENT", "theme": "purple",
        "fields": [
          { "id": "eent_type", "type": "radio_select", "options": [ { "label": "CONJ — Conjunctivitis (เยื่อบุตาอักเสบ)", "value": "CONJ" }, { "label": "EAR — Ear Infection (หูอักเสบ)", "value": "EAR" }, { "label": "SINU — Sinusitis (ไซนัสอักเสบ)", "value": "SINU" } ] }
        ]
      },
      {
        "id": "conj_sec", "title": "Conjunctivitis (เยื่อบุตาอักเสบ)", "theme": "yellow", "depends_on": { "field": "eent_type", "value": "CONJ" },
        "fields": [
          { "id": "conj_culture_pos", "type": "checkbox", "label": "เพาะเชื้อจาก conjunctiva ได้ผลบวก" },
          { "id": "conj_discharge", "type": "checkbox", "label": "น้ำตาไหลมากหรือมี Discharge จากตา" },
          { "id": "conj_erythema", "type": "checkbox", "label": "ตาแดง หรือ ตาบวม" },
          { "id": "eent_physician_dx", "type": "checkbox", "label": "แพทย์วินิจฉัยยืนยัน" }
        ]
      }
    ]
  },
  'PNEU': {
    "system_id": "PNEU", "name": "4. ทางเดินหายใจ (PNEU/VAP)", "short_name": "ทางเดินหายใจ",
    "rules": { "disease_paths": [ { "base_disease": "PNEU", "device_field": "has_ett", "device_disease": "VAP", "criteria": [ { "type": "mandatory", "fields": ["imaging_positive"], "pass_message": "ผล Chest Imaging เข้าเกณฑ์" }, { "type": "min_count", "count": 3, "fields": ["fever_adult", "wbc_abnormal", "sputum_change", "dyspnea_adult"], "pass_message": "อาการทางคลินิกเข้าเกณฑ์" } ] } ] },
    "sections": [
      { "id": "imaging", "title": "Chest Imaging", "theme": "blue", "fields": [{ "id": "imaging_positive", "type": "checkbox", "label": "ภาพถ่ายรังสีปอด (Chest Imaging) พบความผิดปกติใหม่หรือลุกลาม", "children": [ { "id": "img_type", "type": "text", "label": "ระบุชนิดและวันที่:" } ] }] },
      { "id": "vap_vent", "title": "เครื่องช่วยหายใจ", "theme": "purple", "fields": [{ "id": "has_ett", "type": "checkbox", "label": "มี ETT หรือ Tracheostomy ณ DOE หรือภายใน 48 ชม." }] },
      { "id": "symptoms_pneu", "title": "อาการทางคลินิก (Symptoms)", "theme": "yellow", "fields": [ { "id": "pneu_symp_row", "type": "row_inline", "children": [ { "id": "fever_adult", "type": "checkbox", "label": "ไข้ > 38°C" }, { "id": "wbc_abnormal", "type": "checkbox", "label": "WBC ผิดปกติ" }, { "id": "sputum_change", "type": "checkbox", "label": "เสมหะเปลี่ยนลักษณะ" }, { "id": "dyspnea_adult", "type": "checkbox", "label": "หายใจลำบาก/ไอ" } ] } ] }
    ]
  },
  'CNS': { "system_id": "CNS", "name": "5. ระบบประสาท (CNS)", "short_name": "ระบบประสาท", "rules": { "disease_paths": [] }, "sections": [ { "id": "cns_init", "title": "โครงสร้างเบื้องต้น", "theme": "blue", "fields": [ { "id": "cns_sus", "type": "checkbox", "label": "สงสัยการติดเชื้อระบบประสาทส่วนกลาง" } ] } ] },
  'SSI': { "system_id": "SSI", "name": "6. ตำแหน่งผ่าตัด (SSI)", "short_name": "แผลผ่าตัด", "rules": { "disease_paths": [] }, "sections": [ { "id": "ssi_init", "title": "โครงสร้างเบื้องต้น", "theme": "red", "fields": [ { "id": "ssi_sus", "type": "checkbox", "label": "สงสัยแผลติดเชื้อตำแหน่งผ่าตัด" } ] } ] },
  'UTI': {
    "system_id": "UTI", "name": "7. ทางเดินปัสสาวะ (SUTI/CAUTI)", "short_name": "ทางเดินปัสสาวะ",
    "rules": { "disease_paths": [ { "base_disease": "SUTI", "device_field": "has_foley", "device_disease": "CAUTI", "criteria": [ { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["urine_culture_pos"] }, { "type": "mandatory", "fields": ["pyuria"] }, { "type": "mandatory", "fields": ["dipstick_pos"] } ], "pass_message": "ผลห้องปฏิบัติการปัสสาวะเข้าเกณฑ์" }, { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["fever_uti"] }, { "type": "mandatory", "fields": ["dysuria"] }, { "type": "mandatory", "fields": ["urgency"] }, { "type": "mandatory", "fields": ["suprapubic_pain"] } ], "pass_message": "มีอาการทางคลินิกเข้าเกณฑ์" } ] } ] },
    "sections": [
      { "id": "cauti_dev", "title": "สายสวนปัสสาวะ", "theme": "purple", "fields": [{ "id": "has_foley", "type": "checkbox", "label": "คาสายสวนปัสสาวะ ณ DOE หรือดึงออก ≤ 2 วันก่อน DOE" }] },
      { "id": "uti_lab", "title": "ผลทางห้องปฏิบัติการ (Lab)", "theme": "blue", "fields": [{ "id": "urine_culture_pos", "type": "checkbox", "label": "Urine culture ≥ 10⁵ CFU/ml (≤ 2 ชนิดเชื้อ)", "children": [{ "id": "uti_org", "type": "text", "label": "เชื้อที่พบ:" }] }, { "id": "dipstick_pos", "type": "checkbox", "label": "Urine dipstick (Leukocyte/Nitrite) บวก" }, { "id": "pyuria", "type": "checkbox", "label": "Pyuria (WBC ≥ 10 cells/mm³)" }] },
      { "id": "uti_symp", "title": "อาการทางคลินิก", "theme": "yellow", "fields": [ { "id": "symp_uti_row", "type": "row_inline", "children": [ { "id": "fever_uti", "type": "checkbox", "label": "ไข้ > 38°C" }, { "id": "dysuria", "type": "checkbox", "label": "ปัสสาวะแสบขัด (Dysuria)" }, { "id": "urgency", "type": "checkbox", "label": "ปัสสาวะเร่งด่วน/บ่อย" }, { "id": "suprapubic_pain", "type": "checkbox", "label": "กดเจ็บหัวเหน่า" } ] } ] }
    ]
  },
  'GI': {
    "system_id": "GI", "name": "8. ทางเดินอาหาร (GI)", "short_name": "ทางเดินอาหาร",
    "rules": {
      "disease_paths": [
        { "base_disease": "GE (Gastroenteritis)", "criteria": [ { "type": "exact_match", "field": "gi_type", "value": "GE" }, { "type": "any_of", "pass_message": "เข้าเกณฑ์ Gastroenteritis", "conditions": [ { "type": "mandatory", "fields": ["ge_culture_pos"] }, { "type": "mandatory", "fields": ["ge_swab_pos"] }, { "type": "all_of", "conditions": [ { "type": "min_count", "count": 2, "fields": ["ge_nausea", "ge_diarrhea", "ge_abd_pain", "fever_adult"] }, { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["ge_antigen_pos"] } ] } ] } ] } ] },
        { "base_disease": "GI-CDI (C. difficile)", "criteria": [ { "type": "exact_match", "field": "gi_type", "value": "CDI" }, { "type": "any_of", "pass_message": "พบอาการลำไส้อักเสบเข้าเกณฑ์ CDI", "conditions": [ { "type": "mandatory", "fields": ["cdi_diarrhea"] }, { "type": "mandatory", "fields": ["cdi_ileus"] } ] }, { "type": "any_of", "pass_message": "พบหลักฐานห้องปฏิบัติการ C. difficile ยืนยัน", "conditions": [ { "type": "mandatory", "fields": ["cdi_toxin"] }, { "type": "mandatory", "fields": ["cdi_pcr"] }, { "type": "mandatory", "fields": ["cdi_culture"] }, { "type": "mandatory", "fields": ["cdi_colon"] } ] } ] },
        { "base_disease": "HEP (Hepatitis)", "criteria": [ { "type": "exact_match", "field": "gi_type", "value": "HEP" }, { "type": "any_of", "pass_message": "เข้าเกณฑ์ Hepatitis", "conditions": [ { "type": "all_of", "conditions": [ { "type": "min_count", "count": 2, "fields": ["hep_fever", "hep_nausea", "hep_jaundice", "hep_dark_urine", "hep_hepatomegaly"] }, { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["hep_sero_pos", "hep_alt_high"] } ] } ] }, { "type": "all_of", "conditions": [ { "type": "mandatory", "fields": ["hep_transfusion"] }, { "type": "mandatory", "fields": ["hep_sero_pos"] } ] } ] } ] }
      ]
    },
    "sections": [
      {
        "id": "gi_selector", "title": "เลือกประเภท GI ที่ต้องการวิเคราะห์", "theme": "orange",
        "fields": [
          { "id": "gi_type", "type": "radio_select", "options": [ { "label": "GE — Gastroenteritis", "value": "GE" }, { "label": "CDI — C. difficile Infection", "value": "CDI" }, { "label": "HEP — Hepatitis", "value": "HEP" } ] }
        ]
      },
      {
        "id": "ge_criteria", "title": "Gastroenteritis (GE)", "theme": "yellow", "depends_on": { "field": "gi_type", "value": "GE" },
        "fields": [
          { "id": "ge_culture_pos", "type": "checkbox", "label": "เพาะเชื้อจากอุจจาระ ได้ผลบวก" },
          { "id": "ge_swab_pos", "type": "checkbox", "label": "เพาะเชื้อจาก rectal swab ได้ผลบวก" },
          { "id": "ge_symp_group", "type": "checkbox", "label": "อาการทางคลินิก (≥2) ร่วมกับผลห้องปฏิบัติการ (≥1)",
            "children": [
              { "id": "alert_ge_symp", "type": "alert", "theme": "blue", "text": "อาการทางคลินิก (เลือกอย่างน้อย 2 ข้อ):" },
              { "id": "ge_nausea", "type": "checkbox", "label": "คลื่นไส้ หรือ อาเจียน" },
              { "id": "ge_diarrhea", "type": "checkbox", "label": "ท้องเสีย" },
              { "id": "ge_abd_pain", "type": "checkbox", "label": "ปวดท้อง" },
              { "id": "fever_adult", "type": "checkbox", "label": "ไข้ > 38°C" },
              { "id": "alert_ge_lab", "type": "alert", "theme": "purple", "text": "หลักฐานทางห้องปฏิบัติการ (เลือกอย่างน้อย 1 ข้อ):" },
              { "id": "ge_antigen_pos", "type": "checkbox", "label": "ตรวจพบแอนติเจนหรือท็อกซิน" }
            ]
          }
        ]
      },
      {
        "id": "cdi_criteria", "title": "C. difficile Infection (CDI)", "theme": "red", "depends_on": { "field": "gi_type", "value": "CDI" },
        "fields": [
          { "id": "cdi_diarrhea", "type": "checkbox", "label": "ท้องเสีย ≥ 3 ครั้ง ใน 24 ชั่วโมง" },
          { "id": "cdi_ileus", "type": "checkbox", "label": "ภาวะลำไส้อืดรุนแรง (Ileus)" },
          { "id": "alert_cdi_2", "type": "alert", "theme": "purple", "text": "หลักฐานยืนยันทางห้องปฏิบัติการ (≥ 1 ข้อ)" },
          { "id": "cdi_toxin", "type": "checkbox", "label": "Stool toxin assay ให้ผลบวก" },
          { "id": "cdi_pcr", "type": "checkbox", "label": "PCR/NAAT ตรวจพบยีนสร้างท็อกซิน" },
          { "id": "cdi_culture", "type": "checkbox", "label": "เพาะเชื้อพบ C. difficile สร้างท็อกซิน" }
        ]
      },
      {
        "id": "hep_criteria", "title": "Hepatitis (HEP)", "theme": "blue", "depends_on": { "field": "gi_type", "value": "HEP" },
        "fields": [
          { "id": "hep_fever", "type": "checkbox", "label": "ไข้ > 38°C" },
          { "id": "hep_jaundice", "type": "checkbox", "label": "ดีซ่าน (Jaundice)" },
          { "id": "hep_sero_pos", "type": "checkbox", "label": "ผล Hepatitis serology/virology บวก" },
          { "id": "hep_transfusion", "type": "checkbox", "label": "ได้รับเลือดใน 3 เดือนก่อนมีอาการ" }
        ]
      }
    ]
  },
  'REPR': { "system_id": "REPR", "name": "9. อวัยวะสืบพันธุ์ (REPR)", "short_name": "อวัยวะสืบพันธุ์", "rules": { "disease_paths": [] }, "sections": [ { "id": "repr_selector", "title": "เลือกประเภท REPR", "theme": "purple", "fields": [ { "id": "repr_type", "type": "radio_select", "options": [ { "label": "VCUF — Vaginal cuff infection", "value": "VCUF" }, { "label": "ENDOM — Endometritis", "value": "ENDOM" }, { "label": "EPIS — Episiotomy infection", "value": "EPIS" }, { "label": "OMPH — Omphalitis", "value": "OMPH" } ] } ] } ] },
  'OST': {
    "system_id": "OST", "name": "10. กระดูก/ข้อ (OST)", "short_name": "กระดูก/ข้อ",
    "rules": {
      "disease_paths": [
        { "base_disease": "BONE (Osteomyelitis)", "criteria": [ { "type": "exact_match", "field": "ost_type", "value": "BONE" }, { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["bone_culture_pos"] }, { "type": "all_of", "conditions": [ { "type": "min_count", "count": 2, "fields": ["bone_pain", "fever_adult"] }, { "type": "mandatory", "fields": ["bone_imaging_pos"] } ] } ] } ] },
        { "base_disease": "PJI (Periprosthetic Joint Infection)", "criteria": [ { "type": "exact_match", "field": "ost_type", "value": "PJI" }, { "type": "any_of", "conditions": [ { "type": "mandatory", "fields": ["pji_major"] }, { "type": "min_count", "count": 3, "fields": ["pji_minor_crp", "pji_minor_wbc", "pji_minor_culture"] } ] } ] }
      ]
    },
    "sections": [
      { "id": "ost_selector", "title": "เลือกประเภท OST", "theme": "blue", "fields": [ { "id": "ost_type", "type": "radio_select", "options": [ { "label": "BONE — Osteomyelitis", "value": "BONE" }, { "label": "PJI — ติดเชื้อรอบข้อเทียม", "value": "PJI" }, { "label": "JNT — ข้อต่ออักเสบ", "value": "JNT" } ] } ] },
      { "id": "bone_sec", "title": "Osteomyelitis (BONE)", "theme": "amber", "depends_on": { "field": "ost_type", "value": "BONE" }, "fields": [ { "id": "bone_culture_pos", "type": "checkbox", "label": "เพาะเชื้อจากกระดูกได้ผลบวก" }, { "id": "bone_pain", "type": "checkbox", "label": "บวม ปวด หรือกดเจ็บบริเวณกระดูก" }, { "id": "bone_imaging_pos", "type": "checkbox", "label": "ภาพถ่ายรังสี (X-ray/MRI) ยืนยัน" } ] },
      { "id": "pji_sec", "title": "Periprosthetic Joint Infection (PJI)", "theme": "red", "depends_on": { "field": "ost_type", "value": "PJI" }, "fields": [ { "id": "pji_major", "type": "checkbox", "label": "Major: Sinus tract หรือเพาะเชื้อ ≥ 2 ชิ้น" }, { "id": "alert_minor", "type": "alert", "theme": "blue", "text": "หรือมี Minor Criteria ครบ 3 ข้อ:" }, { "id": "pji_minor_crp", "type": "checkbox", "label": "Minor: Elevated serum CRP และ ESR" }, { "id": "pji_minor_wbc", "type": "checkbox", "label": "Minor: Elevated synovial WBC" }, { "id": "pji_minor_culture", "type": "checkbox", "label": "Minor: เพาะเชื้อจากเนื้อเยื่อรอบข้อเทียมบวก 1 ชิ้น" } ] }
    ]
  },
  'OTHER': { "system_id": "OTHER", "name": "11. การติดเชื้ออื่น ๆ", "short_name": "อื่น ๆ", "rules": { "disease_paths": [] }, "sections": [ { "id": "other_selector", "title": "เลือกประเภท OTHER", "theme": "amber", "fields": [ { "id": "other_type", "type": "radio_select", "options": [ { "label": "SKIN — Skin infection", "value": "SKIN" }, { "label": "ST — Soft tissue infection", "value": "ST" }, { "label": "DECU — Decubitus ulcer", "value": "DECU" }, { "label": "BURN — Burn infection", "value": "BURN" } ] } ] } ] }
};