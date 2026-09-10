import React, { useState, useEffect, useRef } from 'react';
import { User, AppNotification } from '../types';
import { fetchNotifications, markNotificationRead, deleteNotification } from '../api';
import {
  Bell,
  Smartphone,
  Megaphone,
  Sparkles,
  Calendar,
  CheckCheck,
  Trash2,
  ExternalLink,
  Plus,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react';
import { BroadcastNotificationModal } from './BroadcastNotificationModal';

interface NotificationsDropdownProps {
  currentUser: User | null;
  onNavigateTab: (tab: string) => void;
  isFastConnection?: boolean;
}

export function NotificationsDropdown({
  currentUser,
  onNavigateTab,
  isFastConnection = false
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SMS_ALERT' | 'ANNOUNCEMENT'>('ALL');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isStaff = currentUser && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(currentUser.role);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to load notifications', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll notifications occasionally
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        (prev || []).map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = (notifications || []).filter((n) => !n.read);
    setNotifications((prev) => (prev || []).map((n) => ({ ...n, read: true })));
    for (const notif of unread) {
      markNotificationRead(notif.id).catch(() => {});
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => (prev || []).filter((n) => n.id !== id));
    } catch (err) {
      console.warn('Failed to delete notification', err);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        (prev || []).map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    if (notif.linkTab) {
      onNavigateTab(notif.linkTab);
      setIsOpen(false);
    }
  };

  const filteredNotifications = (notifications || []).filter((n) => {
    if (activeFilter === 'ALL') return true;
    return n.type === activeFilter;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shrink-0 ${
          isOpen ? 'bg-slate-100 text-indigo-600' : ''
        }`}
        title="Official Notifications & SMS Alerts"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />

        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-black text-white shadow-xs ${
              isFastConnection ? 'animate-pulse' : ''
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-12 z-50 w-[calc(100vw-16px)] sm:w-96 max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight">Notifications & SMS</h3>
                <p className="text-[11px] text-slate-500">Official BPSC, Bank & Moderator notices</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                  title="Mark all as read"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills & Admin Broadcast Action */}
          <div className="px-3 py-2 border-b border-slate-100 bg-white flex items-center justify-between gap-1 overflow-x-auto">
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  activeFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('SMS_ALERT')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  activeFilter === 'SMS_ALERT'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>SMS</span>
              </button>
              <button
                onClick={() => setActiveFilter('ANNOUNCEMENT')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  activeFilter === 'ANNOUNCEMENT'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                <Megaphone className="w-3 h-3" />
                <span>Notices</span>
              </button>
            </div>

            {/* Staff Broadcast Action */}
            {isStaff && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsBroadcastModalOpen(true);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition shrink-0"
                title="Send notification or SMS alert to all candidates"
              >
                <Plus className="w-3 h-3" />
                <span>Broadcast</span>
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs font-medium">No notices found in this category.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isSms = notif.type === 'SMS_ALERT';
                const isUrgent = notif.priority === 'URGENT';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 relative ${
                      !notif.read ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    {!notif.read && (
                      <div className="absolute left-1 top-4 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}

                    {/* Icon / Sender Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {isSms ? (
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <Smartphone className="w-4 h-4" />
                        </div>
                      ) : notif.senderAvatar ? (
                        <img
                          src={notif.senderAvatar}
                          alt={notif.senderName}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          <Megaphone className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Notification Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {notif.senderName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(notif.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {isUrgent && (
                          <span className="mr-1 inline-flex items-center px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                            Urgent
                          </span>
                        )}
                        {notif.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
                          <span>View in app</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>

                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="text-slate-400 hover:text-indigo-600 transition"
                              title="Mark as read"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isStaff && (
                            <button
                              onClick={(e) => handleDelete(notif.id, e)}
                              className="text-slate-400 hover:text-rose-600 transition"
                              title="Delete announcement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-400">
            Official BPSC & Bank notifications powered by ProshnoSiddhi BD
          </div>
        </div>
      )}

      {/* Broadcast Modal for Admins */}
      <BroadcastNotificationModal
        currentUser={currentUser}
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSuccess={() => {
          loadNotifications();
        }}
      />
    </div>
  );
}
