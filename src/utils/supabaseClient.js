import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = https://sb_publishable__Z9a7k4JonIDnmh77-j-iw_BzxNmUwe
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpb3Vjc2p6cGNraW1wZ3Jmd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDcyOTYsImV4cCI6MjA5NjkyMzI5Nn0.w71twqVPy_W9lIYN_dcHLRcAK88-v7ipJ_5kvGsdF_8
"@ | Out-File -FilePath .env.production -Encoding UTF8

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