import React from "react";

// ==========================================
// 🏷️ Helpers
// ==========================================
const getCategoryCode = (id) => {
  const codes = {
    BSI: "BSI / LCBI / CLABSI / MBI-LCBI",
    CVS: "CVS — Cardio & Vascular System",
    EENT: "EENT — Eye, Ear, Nose & Throat",
    LRI: "LRI — Lower Respiratory Tract",
    PNEU: "PNEU — Pneumonia / VAP",
    CNS: "CNS — Central Nervous System",
    SSI: "SSI — Surgical Site Infections",
    UTI: "UTI / SUTI / CAUTI / ABUTI",
    GI: "GI — Gastrointestinal Infections",
    REPR: "REPR — Reproductive Tract",
    OST: "OST — Bone & Joint Infections",
    OTHER: "OTHER — Skin / Soft Tissue / Burn / Breast",
  };
  return codes[id] || id;
};

// 📌 Fallback ชื่อย่อภาษาไทย
const FALLBACK_SHORT_NAMES = {
  BSI: "กระแสโลหิต",
  CVS: "หัวใจ/หลอดเลือด",
  EENT: "ตา หู จมูก",
  LRI: "ทางเดินหายใจ",
  PNEU: "ทางเดินหายใจ",
  CNS: "ระบบประสาท",
  SSI: "แผลผ่าตัด",
  UTI: "ทางเดินปัสสาวะ",
  GI: "ทางเดินอาหาร",
  REPR: "อวัยวะสืบพันธุ์",
  OST: "กระดูก/ข้อ",
  OTHER: "อื่น ๆ",
};

const getShortName = (cat) => {
  return cat?.short_name || FALLBACK_SHORT_NAMES[cat.id] || cat.id;
};

// ==========================================
// 🎨 Component
// ==========================================
export default function CategorySelector({
  categories = [],
  selected,
  onSelect,
}) {
  const displayCategories = categories.map((c) => ({
    id: c.id,
    name: c.name?.replace(/^\d+\.\s*/, "") || c.id,
    code: getCategoryCode(c.id),
    shortName: getShortName(c),
  }));

  return (
    <div className="p-4 md:p-5 border-b border-slate-100">
      <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
        🦠 เลือกหมวดหมู่การติดเชื้อ
      </h3>

      {/* 🆕 Grid — สวยงาม */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {displayCategories.map((cat) => {
          const isSelected = selected === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`
                relative flex flex-col items-center justify-center gap-1 px-3 py-3 
                rounded-xl border-2 transition-all duration-200 
                ${
                  isSelected
                    ? "border-teal-500 bg-teal-50 shadow-md shadow-teal-100 scale-105"
                    : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 hover:shadow-sm"
                }
              `}
              title={cat.name}
            >
              {/* รหัสหมวด */}
              <span
                className={`
                  text-sm font-extrabold tracking-wide
                  ${isSelected ? "text-teal-700" : "text-slate-700"}
                `}
              >
                {cat.id}
              </span>

              {/* ชื่อย่อภาษาไทย */}
              <span
                className={`
                  text-[11px] leading-tight text-center font-medium
                  ${isSelected ? "text-teal-600" : "text-slate-500"}
                `}
              >
                {cat.shortName}
              </span>

              {/* จุดบอกว่าเลือกอยู่ */}
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full border-2 border-white shadow-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* แสดงชื่อเต็มหมวดที่เลือก */}
      {selected && (
        <p className="mt-3 text-xs text-slate-500 font-medium">
          📋 <span className="font-bold text-teal-700">{selected}</span>
          {" — "}
          {getCategoryCode(selected)}
        </p>
      )}
    </div>
  );
}
