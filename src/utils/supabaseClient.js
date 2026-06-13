import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://bioucsjzpckimpgrfwto.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpb3Vjc2p6cGNraW1wZ3Jmd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDcyOTYsImV4cCI6MjA5NjkyMzI5Nn0.w71twqVPy_W9lIYN_dcHLRcAK88-v7ipJ_5kvGsdF_8"

if (!SUPABASE_URL || SUPABASE_URL.includes("import.meta")) {
  throw new Error('Missing VITE_SUPABASE_URL')
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("import.meta")) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
