import React, { useState } from 'react';
import { User, NotificationType } from '../types';
import { createBroadcastNotification } from '../api';
import { X, Send, Megaphone, Smartphone, Bell, Sparkles, AlertCircle } from 'lucide-react';

interface BroadcastNotificationModalProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BroadcastNotificationModal({
  currentUser,
  isOpen,
  onClose,
  onSuccess
}: BroadcastNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('ANNOUNCEMENT');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('HIGH');
  const [targetGroup, setTargetGroup] = useState<'ALL' | 'PRO_ONLY' | 'FREE_ONLY'>('ALL');
  const [linkTab, setLinkTab] = useState<'dashboard' | 'bank' | 'blog' | 'subscription'>('bank');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createBroadcastNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        targetGroup,
        linkTab,
        senderName: currentUser?.name || 'Administrator',
        senderRole: currentUser?.role || 'ADMIN',
        senderAvatar: currentUser?.avatar
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Broadcast Notice / SMS Alert</h3>
              <p className="text-xs text-slate-500">Send live announcements to all registered candidates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Broadcast Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Broadcast Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('ANNOUNCEMENT')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  type === 'ANNOUNCEMENT'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <span>Notice</span>
              </button>
              <button
                type="button"
                onClick={() => setType('SMS_ALERT')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  type === 'SMS_ALERT'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>SMS Alert</span>
              </button>
              <button
                type="button"
                onClick={() => setType('EXAM_REMINDER')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  type === 'EXAM_REMINDER'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-4 h-4 text-blue-600" />
                <span>Exam Alert</span>
              </button>
              <button
                type="button"
                onClick={() => setType('OFFER')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  type === 'OFFER'
                    ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Offer/Ad</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notice Title / SMS Header <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 46th BCS Preliminary Seat Plan & Exam Date"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {/* Message Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Notice Message Content <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {message.length} chars {type === 'SMS_ALERT' ? '(~1 SMS unit)' : ''}
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter official instructions, exam time, circular highlights, or discount announcement..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          {/* Priority & Target Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">🚨 Urgent Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">All Candidates</option>
                <option value="PRO_ONLY">Pro Pass Users Only</option>
                <option value="FREE_ONLY">Free Candidates Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Direct Link Tab</label>
              <select
                value={linkTab}
                onChange={(e) => setLinkTab(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
              >
                <option value="bank">Question Bank</option>
                <option value="blog">Blog & News</option>
                <option value="subscription">Pro Pass Offer</option>
                <option value="dashboard">Dashboard</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Broadcasting...' : 'Send Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
