// ==========================================
// 🔐 Vanguard IC Session Management
// ==========================================

const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 ชั่วโมง (1 กะพยาบาล)
const SESSION_KEY = 'ic_system_user';

/**
 * สร้าง Session ใหม่ตอน Login สำเร็จ
 * @param {Object} user - ข้อมูลผู้ใช้จาก Supabase
 * @returns {Object} session object
 */
export function createSession(user) {
  const now = Date.now();
  
  const session = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    ward_id: user.ward_id,
    login_time: now,
    expires_at: now + SESSION_DURATION,
    last_activity: now
  };
  
  // ❌ ไม่เก็บ password ใน localStorage เด็ดขาด
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  return session;
}

/**
 * ตรวจสอบ Session ว่ายัง valid อยู่หรือไม่
 * - เรียกทุกครั้งตอน App โหลด หรือก่อนทำ operation สำคัญ
 * @returns {Object|null} session object หรือ null ถ้าหมดอายุ
 */
export function validateSession() {
  try {
    const sessionJson = localStorage.getItem(SESSION_KEY);
    if (!sessionJson) return null;
    
    const session = JSON.parse(sessionJson);
    const now = Date.now();
    
    // เช็คว่าหมดอายุหรือยัง
    if (now > session.expires_at) {
      console.log('⏰ Session หมดอายุ — Auto Logout');
      destroySession();
      return null;
    }
    
    // ✅ ยัง valid — ต่ออายุ activity
    session.last_activity = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    return session;
  } catch (error) {
    console.error('Session validation error:', error);
    destroySession();
    return null;
  }
}

/**
 * ต่ออายุ Session (Extend)
 * - เรียกเมื่อผู้ใช้ interact กับระบบ
 * @param {number} extensionMs - ระยะเวลาที่ต้องการต่อ (default: 8 ชม.)
 */
export function extendSession(extensionMs = SESSION_DURATION) {
  try {
    const sessionJson = localStorage.getItem(SESSION_KEY);
    if (!sessionJson) return;
    
    const session = JSON.parse(sessionJson);
    const now = Date.now();
    
    session.expires_at = now + extensionMs;
    session.last_activity = now;
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Session extension error:', error);
  }
}

/**
 * ล้าง Session (Logout)
 */
export function destroySession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * ตั้งค่า Activity Tracking — ต่ออายุ session อัตโนมัติเมื่อผู้ใช้ active
 * เรียกครั้งเดียวตอน App เริ่มทำงาน
 */
export function setupActivityTracking() {
  // รายการ event ที่ถือว่า "active"
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];
  
  // Debounce — ต่ออายุแค่ทุก 5 นาที (ไม่ต้องต่อทุกครั้งที่ขยับเมาส์)
  let lastExtension = 0;
  const EXTENSION_DEBOUNCE = 5 * 60 * 1000; // 5 นาที
  
  const handleActivity = () => {
    const now = Date.now();
    if (now - lastExtension > EXTENSION_DEBOUNCE) {
      extendSession();
      lastExtension = now;
    }
  };
  
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true });
  });
  
  // Cleanup function
  return () => {
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
  };
}

/**
 * แสดงเวลาที่เหลือก่อน Session หมดอายุ (สำหรับ UI)
 * @returns {Object} { hours, minutes, percentage }
 */
export function getSessionTimeRemaining() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (!session) return null;
    
    const now = Date.now();
    const remaining = session.expires_at - now;
    
    if (remaining <= 0) return null;
    
    return {
      total: SESSION_DURATION,
      remaining: remaining,
      hours: Math.floor(remaining / (1000 * 60 * 60)),
      minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      percentage: Math.round((remaining / SESSION_DURATION) * 100)
    };
  } catch {
    return null;
  }
}