import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { playNotificationSound } from '../utils/playNotificationSound';

/**
 * 🔔 Vanguard IC — Notification System (IC_HEAD, ICWN, ICN)
 */
export function useNotifications(currentUser) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  const isIC = ['IC_HEAD', 'ICWN', 'ICN'].includes(currentUser?.role);

  // 1. เคสใหม่ (INSERT)
  useEffect(() => {
    if (!isIC) return;

    const channelName = `notif-insert-${Date.now()}`;
    const insertChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'assessments' },
        (payload) => {
          const newCase = payload.new;
          const notification = {
            id: `new-case-${newCase.id}-${Date.now()}`,
            type: 'NEW_CASE',
            title: '🔔 มีเคสใหม่เข้ามา',
            message: `${newCase.patient_name} (HN: ${newCase.hn})`,
            detail: `${newCase.device_type} • ${newCase.ward_name || newCase.detailed_analysis_json?.ward_name || 'ไม่ระบุวอร์ด'}`,
            caseId: newCase.id,
            timestamp: new Date().toISOString(),
            read: false
          };
          setNotifications(prev => [notification, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
          showBrowserNotification('🔔 Vanguard IC — มีเคสใหม่', `${newCase.patient_name} • ${newCase.device_type}`);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(insertChannel); };
  }, [currentUser]);

  // 2. Nurse ดึงเรื่องกลับ (UPDATE → Cancelled)
  useEffect(() => {
    if (!isIC) return;

    const channelName = `notif-cancel-${Date.now()}`;
    const updateChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assessments' },
        (payload) => {
          const updatedCase = payload.new;
          const oldCase = payload.old;
          if (oldCase.status !== 'Cancelled' && updatedCase.status === 'Cancelled') {
            const notification = {
              id: `cancel-${updatedCase.id}-${Date.now()}`,
              type: 'CANCELLED',
              title: '↩️ พยาบาลดึงเคสกลับ',
              message: `${updatedCase.patient_name} (HN: ${updatedCase.hn})`,
              detail: `เคส ${updatedCase.device_type} ถูกยกเลิกเพื่อแก้ไข`,
              caseId: updatedCase.id,
              timestamp: new Date().toISOString(),
              read: false
            };
            setNotifications(prev => [notification, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(updateChannel); };
  }, [currentUser]);

  // 3. Device Duration Alerts (ทุก 5 นาที)
  useEffect(() => {
    if (!currentUser) return;

    const checkDeviceAlerts = async () => {
      try {
        const { data: pendingCases } = await supabase.from('assessments').select('*').eq('status', 'Pending');
        if (!pendingCases) return;

        const alerts = [];
        const today = new Date();

        pendingCases.forEach(assessment => {
          const detailData = assessment.detailed_analysis_json?.infectious_data;
          if (!detailData) return;

          if (detailData.cl_insert_date) {
            const insertDate = new Date(detailData.cl_insert_date);
            const daysSinceInsert = Math.floor((today - insertDate) / (1000 * 60 * 60 * 24));
            if (daysSinceInsert >= 7) {
              alerts.push({
                id: `device-cl-${assessment.id}`,
                type: 'DEVICE_ALERT',
                title: `⚠️ Central Line ${daysSinceInsert} วัน`,
                message: `${assessment.patient_name} (HN: ${assessment.hn})`,
                detail: `ใส่ Central Line มา ${daysSinceInsert} วัน • เสี่ยง CLABSI`,
                caseId: assessment.id,
                timestamp: new Date().toISOString(),
                read: false
              });
            }
          }

          if (detailData.has_foley && detailData.foley_insert_date) {
            const insertDate = new Date(detailData.foley_insert_date);
            const daysSinceInsert = Math.floor((today - insertDate) / (1000 * 60 * 60 * 24));
            if (daysSinceInsert >= 14) {
              alerts.push({
                id: `device-foley-${assessment.id}`,
                type: 'DEVICE_ALERT',
                title: `⚠️ Foley Catheter ${daysSinceInsert} วัน`,
                message: `${assessment.patient_name} (HN: ${assessment.hn})`,
                detail: `คาสายสวนปัสสาวะมา ${daysSinceInsert} วัน • เสี่ยง CAUTI`,
                caseId: assessment.id,
                timestamp: new Date().toISOString(),
                read: false
              });
            }
          }

          if (detailData.has_ett && detailData.ett_insert_date) {
            const insertDate = new Date(detailData.ett_insert_date);
            const daysSinceInsert = Math.floor((today - insertDate) / (1000 * 60 * 60 * 24));
            if (daysSinceInsert >= 7) {
              alerts.push({
                id: `device-ett-${assessment.id}`,
                type: 'DEVICE_ALERT',
                title: `⚠️ Ventilator ${daysSinceInsert} วัน`,
                message: `${assessment.patient_name} (HN: ${assessment.hn})`,
                detail: `ใช้เครื่องช่วยหายใจมา ${daysSinceInsert} วัน • เสี่ยง VAP`,
                caseId: assessment.id,
                timestamp: new Date().toISOString(),
                read: false
              });
            }
          }
        });

        if (alerts.length > 0) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newAlerts = alerts.filter(a => !existingIds.has(a.id));
            if (newAlerts.length > 0) {
              setUnreadCount(prev => prev + newAlerts.length);
            }
            return [...newAlerts, ...prev].slice(0, 50);
          });
        }
      } catch (error) {
        console.error('Device alert check error:', error);
      }
    };

    checkDeviceAlerts();
    const interval = setInterval(checkDeviceAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // 4. Outbreak Warning (ทุก 1 ชม.)
  useEffect(() => {
    if (!isIC) return;

    const checkOutbreak = async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentCases } = await supabase.from('assessments').select('*').eq('status', 'Confirmed').gte('created_at', sevenDaysAgo);
        if (!recentCases) return;

        const grouped = {};
        recentCases.forEach(c => {
          if (!grouped[c.device_type]) grouped[c.device_type] = [];
          grouped[c.device_type].push(c);
        });

        Object.entries(grouped).forEach(([type, cases]) => {
          if (cases.length >= 3) {
            const outbreakAlert = {
              id: `outbreak-${type}-${Date.now()}`,
              type: 'OUTBREAK',
              title: `🚨 การระบาดของ ${type}`,
              message: `พบ ${cases.length} เคส ใน 7 วัน`,
              detail: `ตรวจพบ ${cases.length} ราย ใน 7 วัน — อาจเกิดการระบาด`,
              caseId: null,
              timestamp: new Date().toISOString(),
              read: false
            };

            setNotifications(prev => {
              const exists = prev.some(n => n.type === 'OUTBREAK' && n.id.startsWith(`outbreak-${type}`) && Date.now() - new Date(n.timestamp).getTime() < 24 * 60 * 60 * 1000);
              if (!exists) {
                setUnreadCount(prev => prev + 1);
                return [outbreakAlert, ...prev].slice(0, 50);
              }
              return prev;
            });

            playNotificationSound();
            showBrowserNotification('🚨 Vanguard IC — Outbreak Warning', `พบการระบาดของ ${type} จำนวน ${cases.length} เคส`);
          }
        });
      } catch (error) {
        console.error('Outbreak check error:', error);
      }
    };

    checkOutbreak();
    const interval = setInterval(checkOutbreak, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setShowPanel(false);
  }, []);

  return { notifications, unreadCount, showPanel, setShowPanel, markAsRead, markAllAsRead, clearAll };
}

function showBrowserNotification(title, body) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico', tag: 'vanguard-ic' });
      }
    });
    return;
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', tag: 'vanguard-ic' });
  }
}