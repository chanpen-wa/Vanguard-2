import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ ENV Validation
if (!SUPABASE_URL) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_URL\n' +
    'กรุณาสร้างไฟล์ .env และเพิ่ม:\n' +
    'VITE_SUPABASE_URL=your-project-url'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_ANON_KEY\n' +
    'กรุณาสร้างไฟล์ .env และเพิ่ม:\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);