import React, { useState } from 'react';
import { User } from '../types';
import { loginStaff, resetPassword } from '../api';
import {
  ShieldAlert,
  Key,
  Mail,
  Lock,
  X,
  CheckCircle2,
  ShieldCheck,
  Award,
  Users,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffAuthenticated: (user: User) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onStaffAuthenticated
}) => {
  if (!isOpen) return null;

  const [activeView, setActiveView] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'MODERATOR'>('SUPER_ADMIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset password states
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!email) throw new Error('Staff Email address is required');
      const staffUser = await loginStaff(email, password, role);
      onStaffAuthenticated(staffUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Staff authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!resetEmail) {
      setError('Please provide your registered staff or candidate email');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const user = await resetPassword(resetEmail, newPassword);
      setSuccessMsg(`Password successfully updated for ${user.email}! You are now logged in.`);
      setTimeout(() => {
        onStaffAuthenticated(user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check the email.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStaffLogin = async (staffEmail: string, staffRole: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'MODERATOR') => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const staffUser = await loginStaff(staffEmail, 'admin123', staffRole);
      onStaffAuthenticated(staffUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Staff demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Security Shield Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Internal Security Gateway
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Restricted Access</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Staff & Administrative Gateway
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Secure administrative console for Question Moderation, Staff Management, AI Quota & GitHub Direct Sync.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 mt-4">
            <button
              type="button"
              onClick={() => { setActiveView('login'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeView === 'login'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Staff Login
            </button>
            <button
              type="button"
              onClick={() => { setActiveView('reset'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeView === 'reset'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Password Reset
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-700/60 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeView === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Select Administrative Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'SUPER_ADMIN', label: 'Super Admin', color: 'border-purple-500 bg-purple-950/40 text-purple-200' },
                    { id: 'ADMIN', label: 'BCS Admin', color: 'border-amber-500 bg-amber-950/40 text-amber-200' },
                    { id: 'EDITOR', label: 'Editor', color: 'border-blue-500 bg-blue-950/40 text-blue-200' },
                    { id: 'MODERATOR', label: 'Moderator', color: 'border-indigo-500 bg-indigo-950/40 text-indigo-200' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setRole(item.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        role === item.id
                          ? `${item.color} ring-2 ring-white/20 shadow-md`
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="admin@proshno.bd"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Security Password / PIN Key
                  </label>
                  <button
                    type="button"
                    onClick={() => { setActiveView('reset'); setResetEmail(email); }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? 'Verifying Clearance...' : 'Authenticate & Enter Admin Console'}
              </button>
            </form>
          ) : (
            /* Reset Password Form */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-xs text-indigo-200">
                Enter your registered staff email and choose a new password. The updated credentials will be securely salted and hashed in PBKDF2 format.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. rony.jib@gmail.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  New Password (min 6 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('login')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {loading ? 'Updating Password...' : 'Reset & Log In Immediately'}
                </button>
              </div>
            </form>
          )}

          {/* Security Notice */}
          <div className="pt-3 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Administrative session activity is cryptographically signed and audited.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
