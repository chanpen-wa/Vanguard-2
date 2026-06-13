import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://sb_publishable__Z9a7k4JonIDnmh77-j-iw_BzxNmUwe"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ilp6OWE3azRKb25JRDNtaDc3LWotaXciLCJpYXQiOjE3MzQ5MjY4MDAsImV4cCI6MjA1MDUwMjgwMH0.RANDOM"

if (!SUPABASE_URL || SUPABASE_URL.includes("import.meta")) {
  throw new Error('Missing VITE_SUPABASE_URL')
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("import.meta")) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)