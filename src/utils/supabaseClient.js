import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cjontpdytqomyqitpvzv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqb250cGR5dHFvbXlxaXRwdnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTE3MzUsImV4cCI6MjA5NjIyNzczNX0.myEgvy54f3VUXxByObECW_PbCHJCif6ej8SOi6tWEM0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);