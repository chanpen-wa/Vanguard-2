# 🛡️ Vanguard IC — ระบบเฝ้าระวังการติดเชื้อในโรงพยาบาล

ระบบ AI Triage สำหรับประเมินและเฝ้าระวังการติดเชื้อในโรงพยาบาล

---

## 📋 Requirements

- **Node.js** 18+
- **npm** 9+
- **Supabase Account** (Free)

---

## 🚀 Installation

### Step 1: Setup Supabase

1. สมัครที่ [supabase.com](https://supabase.com)
2. สร้าง **New Project**
3. ไปที่ **SQL Editor** → รันไฟล์ `setup.sql`
4. ไปที่ **Settings → API** → คัดลอก `Project URL` และ `anon public key`

### Step 2: Setup Environment

สร้างไฟล์ `.env` จาก `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
