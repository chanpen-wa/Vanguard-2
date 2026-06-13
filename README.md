# 🏥 Vanguard IC — คู่มือการติดตั้ง

## 📋 สิ่งที่ต้องเตรียม

- [ ] Supabase Account (ฟรี) — https://supabase.com
- [ ] Cloudflare Account (ฟรี) — https://pages.cloudflare.com
- [ ] GitHub Account (ฟรี) — https://github.com

---

## 🚀 ขั้นตอนการติดตั้ง (15 นาที)

### ขั้นตอนที่ 1: สร้าง Supabase Project

1. ไปที่ https://supabase.com → Sign In
2. กด **New Project**
3. กรอก:
   - **Name:** โรงพยาบาล (เช่น `ram-hospital`)
   - **Database Password:** ตั้งรหัสผ่าน (จำไว้ด้วย!)
   - **Region:** Southeast Asia (Singapore)
4. กด **Create Project** → รอ 2 นาที

---

### ขั้นตอนที่ 2: ติดตั้งฐานข้อมูล

1. ใน Supabase Dashboard → **SQL Editor** (ไอคอนมุมซ้าย)
2. กด **New Query**
3. เปิดไฟล์ `install.sql` → Copy ทั้งหมด → วางลงใน SQL Editor
4. กด **Run** (Ctrl+Enter)
5. ✅ รอจนขึ้นว่า "Success"

---

### ขั้นตอนที่ 3: ตั้งค่า Supabase Keys

1. ใน Supabase Dashboard → **Settings** → **API**
2. คัดลอก:
   - **Project URL** (เช่น `https://xxxxx.supabase.co`)
   - **anon public key** (ยาวๆ)

---

### ขั้นตอนที่ 4: Deploy ขึ้น Cloudflare Pages

1. อัปโหลดโค้ด Vanguard IC ขึ้น GitHub
2. ไปที่ https://pages.cloudflare.com → **Create Project**
3. เชื่อมต่อ GitHub → เลือก Repository
4. ตั้งค่า Build:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Environment Variables:**
     - `VITE_SUPABASE_URL` = `https://xxxxx.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJh...`
5. กด **Save and Deploy** → รอ 2-5 นาที
6. ✅ จะได้ URL เช่น `https://vanguard-ic.pages.dev`

---

## 🔐 การเข้าใช้งานครั้งแรก

- **Username:** `ic_head`
- **Password:** `admin123`
- **⚠️ เปลี่ยนรหัสผ่านทันที!**

---

## 🏥 การเพิ่มหอผู้ป่วย

1. Login เป็น `ic_head`
2. ไปที่ Tab **Wards & Users**
3. พิมพ์ชื่อหอผู้ป่วย → กด **เพิ่มวอร์ด**
4. ✅ ระบบสร้างบัญชี Nurse อัตโนมัติ (รหัสผ่าน: `123`)

---
