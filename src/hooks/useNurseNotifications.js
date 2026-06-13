import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { playNotificationSound } from '../utils/playNotificationSound';

/**
 * 🔔 Vanguard IC — Nurse Notification System
 */
export function useNurseNotifications(currentUser) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'NURSE' || !currentUser?.ward_id) return;

    const channelName = `nurse-notif-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assessments' },
        (payload) => {
          const updated = payload.new;
          const old = payload.old;
          
          if (updated.ward_id !== currentUser.ward_id) return;
          if (old.status === updated.status) return;
          if (old.status === 'Cancelled') return;
          
          const emoji = 
            updated.status === 'Confirmed' ? '🚨' :
            updated.status === 'POA' ? '🟠' :
            updated.status === 'Discarded' ? '🗑️' :
            updated.status === 'Pending' ? '🔄' : '📝';
          
          const titleText = 
            updated.status === 'Pending' ? 'IC ขอประเมินใหม่' :
            `IC ตอบกลับ: ${updated.status}`;
          
          const notification = {
            id: `nurse-${updated.id}-${Date.now()}`,
            type: 'IC_RESPONSE',
            title: `${emoji} ${titleText}`,
            message: `${updated.patient_name} (HN: ${updated.hn})`,
            detail: updated.ic_notes || 'ไม่มีหมายเหตุ',
            caseId: updated.id,
            timestamp: new Date().toISOString(),
            read: false
          };
          
          setNotifications(prev => [notification, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
          
          try {
            new Notification(`Vanguard IC — ${titleText}`, {
              body: `${updated.patient_name} (HN: ${updated.hn}) • ${updated.device_type}`,
              icon: '/favicon.ico',
              tag: `nurse-${updated.id}-${Date.now()}`
            });
          } catch (err) {}
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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