-- ==========================================
-- 🏥 Vanguard IC — Complete Installation
-- ==========================================

-- ==========================================
-- 📦 1. CREATE TABLES
-- ==========================================

-- wards
CREATE TABLE IF NOT EXISTS wards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- system_users
CREATE TABLE IF NOT EXISTS system_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'NURSE' CHECK (role IN ('NURSE', 'IC_HEAD', 'ICWN', 'ICN')),
  ward_id INTEGER REFERENCES wards(id),
  locked BOOLEAN DEFAULT false,
  login_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- assessments
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  hn TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  ward_id INTEGER,
  ward_name TEXT,
  device_type TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_by INTEGER REFERENCES system_users(id),
  auto_assess_result TEXT,
  detailed_analysis_json JSONB DEFAULT '{}',
  vital_temp NUMERIC,
  vital_pulse NUMERIC,
  vital_rr NUMERIC,
  vital_bp_sys NUMERIC,
  vital_bp_dia NUMERIC,
  vital_spo2 NUMERIC,
  admission_date DATE,
  date_of_event DATE,
  age_text TEXT,
  gender TEXT,
  ic_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  assessment_id TEXT,
  user_id INTEGER,
  action_type TEXT NOT NULL,
  action TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by INTEGER,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cdc_configs
CREATE TABLE IF NOT EXISTS cdc_configs (
  system_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  rules JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- schema_versions
CREATE TABLE IF NOT EXISTS schema_versions (
  id SERIAL PRIMARY KEY,
  system_id TEXT,
  name TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  rules JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- archived_assessments
CREATE TABLE IF NOT EXISTS archived_assessments (
  id TEXT PRIMARY KEY,
  hn TEXT,
  patient_name TEXT,
  ward_id INTEGER,
  ward_name TEXT,
  device_type TEXT,
  status TEXT,
  created_by INTEGER,
  auto_assess_result TEXT,
  detailed_analysis_json JSONB DEFAULT '{}',
  vital_temp NUMERIC,
  vital_pulse NUMERIC,
  vital_bp_sys NUMERIC,
  vital_bp_dia NUMERIC,
  vital_spo2 NUMERIC,
  admission_date DATE,
  date_of_event DATE,
  age_text TEXT,
  gender TEXT,
  ic_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- archived_audit_logs
CREATE TABLE IF NOT EXISTS archived_audit_logs (
  id SERIAL PRIMARY KEY,
  assessment_id TEXT,
  action_type TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by INTEGER,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- login_attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  username TEXT,
  success BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- unlock_logs
CREATE TABLE IF NOT EXISTS unlock_logs (
  id SERIAL PRIMARY KEY,
  username TEXT,
  unlocked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 🔐 2. ENABLE EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- ⚡ 3. CREATE FUNCTIONS
-- ==========================================

-- verify_user
CREATE OR REPLACE FUNCTION verify_user(p_username TEXT, p_password TEXT)
RETURNS TABLE(id INTEGER, username TEXT, role TEXT, full_name TEXT, ward_id INTEGER, error_msg TEXT) AS $$
DECLARE
  user_record system_users%ROWTYPE;
BEGIN
  SELECT * INTO user_record FROM system_users WHERE username = p_username;
  
  IF user_record.id IS NULL THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER, 'ไม่พบบัญชีผู้ใช้'::TEXT;
    RETURN;
  END IF;
  
  IF user_record.locked THEN
    INSERT INTO login_attempts(username, success, ip_address) VALUES(p_username, false, 'system');
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER, '🔒 บัญชีถูกล็อค — กรุณาติดต่อผู้ดูแลระบบ'::TEXT;
    RETURN;
  END IF;
  
  IF user_record.password_hash = crypt(p_password, user_record.password_hash) THEN
    UPDATE system_users SET login_attempts = 0 WHERE id = user_record.id;
    INSERT INTO login_attempts(username, success, ip_address) VALUES(p_username, true, 'system');
    RETURN QUERY SELECT user_record.id, user_record.username, user_record.role, user_record.full_name, user_record.ward_id, NULL::TEXT;
  ELSE
    UPDATE system_users SET login_attempts = login_attempts + 1 WHERE id = user_record.id;
    INSERT INTO login_attempts(username, success, ip_address) VALUES(p_username, false, 'system');
    
    IF user_record.login_attempts >= 5 THEN
      UPDATE system_users SET locked = true WHERE id = user_record.id;
    END IF;
    
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER, '❌ รหัสผ่านไม่ถูกต้อง'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_user_with_hash
CREATE OR REPLACE FUNCTION create_user_with_hash(
  p_username TEXT, p_password TEXT, p_full_name TEXT, p_role TEXT, p_ward_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO system_users(username, password_hash, full_name, role, ward_id)
  VALUES(p_username, crypt(p_password, gen_salt('bf')), p_full_name, p_role, p_ward_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- unlock_user
CREATE OR REPLACE FUNCTION unlock_user(p_username TEXT, p_unlocked_by TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE system_users SET locked = false, login_attempts = 0 WHERE username = p_username;
  INSERT INTO unlock_logs(username, unlocked_by) VALUES(p_username, p_unlocked_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- reset_user_password
CREATE OR REPLACE FUNCTION reset_user_password(p_user_id INTEGER, p_username TEXT, p_reset_by TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE system_users SET password_hash = crypt('123', gen_salt('bf')), login_attempts = 0 WHERE id = p_user_id;
  
  INSERT INTO audit_logs(action_type, old_value, new_value, changed_by, details)
  VALUES('RESET_PASSWORD', '{"password": "***"}'::jsonb, '{"password": "123"}'::jsonb, p_user_id, 'Password reset by ' || p_reset_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_user_password
CREATE OR REPLACE FUNCTION update_user_password(p_user_id INTEGER, p_new_password TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE system_users SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- cleanup_old_logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '3 years';
  DELETE FROM unlock_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 🌱 4. SEED DATA
-- ==========================================

-- IC Head (password: admin123)
INSERT INTO system_users(username, password_hash, full_name, role) 
VALUES('ic_head', crypt('admin123', gen_salt('bf')), 'IC Head', 'IC_HEAD')
ON CONFLICT(username) DO NOTHING;

-- CDC Categories
INSERT INTO cdc_configs(system_id, name, short_name, rules, sections, sort_order) VALUES
('BSI', 'การติดเชื้อในกระแสโลหิต (BSI/LCBI/CLABSI)', 'กระแสโลหิต', '{"disease_paths":[]}', '[]', 1),
('CVS', 'หัวใจ/หลอดเลือด (CVS)', 'หัวใจ/หลอดเลือด', '{"disease_paths":[]}', '[]', 2),
('EENT', 'ตา/หู/คอ/จมูก (EENT)', 'ตา หู จมูก', '{"disease_paths":[]}', '[]', 3),
('PNEU', 'ทางเดินหายใจ (PNEU/VAP)', 'ทางเดินหายใจ', '{"disease_paths":[]}', '[]', 4),
('CNS', 'ระบบประสาท (CNS)', 'ระบบประสาท', '{"disease_paths":[]}', '[]', 5),
('SSI', 'ตำแหน่งผ่าตัด (SSI)', 'แผลผ่าตัด', '{"disease_paths":[]}', '[]', 6),
('UTI', 'ทางเดินปัสสาวะ (UTI/CAUTI)', 'ทางเดินปัสสาวะ', '{"disease_paths":[]}', '[]', 7),
('GI', 'ทางเดินอาหาร (GI)', 'ทางเดินอาหาร', '{"disease_paths":[]}', '[]', 8),
('REPR', 'อวัยวะสืบพันธุ์ (REPR)', 'อวัยวะสืบพันธุ์', '{"disease_paths":[]}', '[]', 9),
('OST', 'กระดูก/ข้อ (OST)', 'กระดูก/ข้อ', '{"disease_paths":[]}', '[]', 10),
('OTHER', 'การติดเชื้ออื่น ๆ', 'อื่น ๆ', '{"disease_paths":[]}', '[]', 11)
ON CONFLICT(system_id) DO NOTHING;

-- ==========================================
-- ✅ DONE
-- ==========================================
-- 🎉 Installation Complete!
-- Login: ic_head / admin123
-- ==========================================