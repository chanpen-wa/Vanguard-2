const SESSION_DURATION = 8 * 60 * 60 * 1000;
const SESSION_KEY = 'ic_system_user';

export function createSession(user) {
  const now = Date.now();
  
  const session = {
    id: user.id,
    username: user.username,
    role: user.role,
    ward_id: user.ward_id,        // ✅ ต้องมี
    full_name: user.full_name,     // ✅ เพิ่มด้วย (ใช้ใน Header)
    login_time: now,
    expires_at: now + SESSION_DURATION,
    last_activity: now
  };
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function validateSession() {
  try {
    const sessionJson = localStorage.getItem(SESSION_KEY);
    if (!sessionJson) return null;
    
    const session = JSON.parse(sessionJson);
    const now = Date.now();
    
    if (now > session.expires_at) {
      destroySession();
      return null;
    }
    
    session.last_activity = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    return session;
  } catch (error) {
    destroySession();
    return null;
  }
}

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

export function destroySession() {
  localStorage.removeItem(SESSION_KEY);
}

export function setupActivityTracking() {
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  let lastExtension = 0;
  const EXTENSION_DEBOUNCE = 5 * 60 * 1000;
  
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
  
  return () => {
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
  };
}

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