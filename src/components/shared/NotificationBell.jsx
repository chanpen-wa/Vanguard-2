import React from "react";
import { Bell, BellRing, X } from "lucide-react";
import { formatTimeAgo } from "../../utils/formatTimeAgo";

/**
 * 🔔 Vanguard IC — Notification Bell Component
 * ใช้ร่วมกันทั้ง ICCommandCenter และ WardNursePane
 *
 * @param {Object} props
 * @param {Array} props.notifications - รายการแจ้งเตือน
 * @param {number} props.unreadCount - จำนวนที่ยังไม่อ่าน
 * @param {boolean} props.showPanel - แสดง/ซ่อน panel
 * @param {Function} props.setShowPanel - toggle panel
 * @param {Function} props.markAsRead - อ่านแล้ว 1 รายการ
 * @param {Function} props.markAllAsRead - อ่านทั้งหมด
 * @param {Function} props.clearAll - ล้างทั้งหมด
 * @param {string} [props.title] - หัวข้อ panel (default: 'การแจ้งเตือน')
 * @param {string} [props.emptyMessage] - ข้อความเมื่อไม่มีแจ้งเตือน
 * @param {Object} [props.iconMap] - map type → { bg, text, icon }
 * @param {string} [props.variant] - 'ic' | 'nurse' (default: 'ic')
 */
export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  showPanel,
  setShowPanel,
  markAsRead,
  markAllAsRead,
  clearAll,
  title = "การแจ้งเตือน",
  emptyMessage = "ไม่มีการแจ้งเตือน",
  iconMap,
  variant = "ic",
}) {
  // Default icon map ตาม variant
  const defaultIconMap =
    variant === "nurse"
      ? {
          IC_RESPONSE: {
            bg: "bg-purple-100",
            text: "text-purple-600",
            icon: BellRing,
          },
          STATUS_UPDATE: {
            bg: "bg-blue-100",
            text: "text-blue-600",
            icon: BellRing,
          },
        }
      : {
          NEW_CASE: {
            bg: "bg-blue-100",
            text: "text-blue-600",
            icon: BellRing,
          },
          CANCELLED: {
            bg: "bg-amber-100",
            text: "text-amber-600",
            icon: BellRing,
          },
          OUTBREAK: {
            bg: "bg-rose-100",
            text: "text-rose-600",
            icon: BellRing,
          },
          DEVICE_ALERT: {
            bg: "bg-amber-100",
            text: "text-amber-600",
            icon: BellRing,
          },
          STATUS_UPDATE: {
            bg: "bg-purple-100",
            text: "text-purple-600",
            icon: BellRing,
          },
        };

  const map = { ...defaultIconMap, ...iconMap };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        title={title}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-indigo-600" />
        ) : (
          <Bell className="w-5 h-5 text-slate-400" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-50">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 top-12 w-80 max-h-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
              <BellRing className="w-4 h-4 text-indigo-500" />
              {title}
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-rose-500">
                  ({unreadCount})
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  อ่านทั้งหมด
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
              >
                ล้าง
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[340px] custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">
                  {emptyMessage}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const iconConfig = map[notification.type] || {
                    bg: "bg-slate-100",
                    text: "text-slate-500",
                    icon: BellRing,
                  };
                  const IconComponent = iconConfig.icon;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.caseId) {
                          setShowPanel(false);
                        }
                      }}
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notification.read
                          ? "bg-indigo-50/50 border-l-2 border-indigo-400"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${iconConfig.bg} ${iconConfig.text}`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 leading-tight">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 font-medium">
                            {notification.message}
                          </p>
                          {notification.detail &&
                            notification.detail !== "ไม่มีหมายเหตุ" && (
                              <p className="text-xs text-slate-400 mt-0.5 italic">
                                "{notification.detail}"
                              </p>
                            )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatTimeAgo(notification.timestamp)}
                          </p>
                        </div>

                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
