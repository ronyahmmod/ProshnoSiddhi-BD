import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../api';
import {
  X,
  UserCheck,
  Target,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  User as UserIcon
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpdate: (user: User) => void;
  reason?: string | null;
  initialMode?: 'login' | 'register';
  onSuccessCallback?: () => void;
  onSwitchToAdmin?: () => void;
}

const EXAM_GOALS = [
  '46th BCS Preliminary',
  '45th BCS Written Exam',
  'Combined 10 Banks Officer & Senior Officer',
  'Primary Assistant Teacher Recruitment',
  'Medical & Engineering University Admission',
  'General Skill & Knowledge Upgrade'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
  reason,
  initialMode = 'login',
  onSuccessCallback,
  onSwitchToAdmin
}) => {
  if (!isOpen) return null;

  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [targetExam, setTargetExam] = useState(EXAM_GOALS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminAccountAttempt, setIsAdminAccountAttempt] = useState(false);

  React.useEffect(() => {
    if (initialMode) {
      setIsRegister(initialMode === 'register');
    }
  }, [initialMode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!name.trim() || !email.trim()) {
        setError('Full name and email are required.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }
    } else {
      if (!email.trim()) {
        setError('Email address is required.');
        return;
      }
      if (!password) {
        setError('Please enter your account password.');
        return;
      }
    }

    setLoading(true);

    try {
      let u: User;
      if (isRegister) {
        u = await registerUser(name.trim(), email.trim(), password, targetExam);
      } else {
        u = await loginUser(email.trim(), password, name || email.split('@')[0], targetExam);
      }
      onUserUpdate(u);
      if (onSuccessCallback) {
        onSuccessCallback();
      }
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
      if (err.isAdminAccount || msg.toLowerCase().includes('admin') || msg.toLowerCase().includes('clearance')) {
        setIsAdminAccountAttempt(true);
      } else {
        setIsAdminAccountAttempt(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with Security Badge */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> High-Security Student Portal
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {currentUser ? 'Manage Your Account' : isRegister ? 'Create Secure Account' : 'Candidate Secure Sign In'}
          </h2>
          <p className="text-emerald-100/90 text-xs mt-1">
            {isRegister
              ? 'Register with your email and a strong password to protect your mock exams and progress.'
              : 'Sign in with your registered email and password to access BCS & Bank question banks.'}
          </p>
        </div>

        {/* Current Active User Banner */}
        {currentUser && (
          <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center gap-3">
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-full shrink-0 aspect-square overflow-hidden border-2 border-emerald-300">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full rounded-full object-cover aspect-square shrink-0 block"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate">{currentUser.email}</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                Target: {currentUser.targetExam || 'General Prep'}
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {reason && (
            <div className="p-3.5 bg-amber-50/95 border border-amber-300/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 shadow-2xs animate-in fade-in">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-extrabold text-amber-950 block">Account Required</span>
                <span className="text-amber-800 text-[11px] leading-relaxed block mt-0.5">{reason}</span>
              </div>
            </div>
          )}

          {/* Quick Tab Switcher */}
          {!currentUser && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  !isRegister
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  isRegister
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {isAdminAccountAttempt ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-amber-900 text-xs sm:text-sm">Admin Access Notice</div>
                  <div className="text-amber-800 leading-relaxed font-medium">
                    Admin cannot access through the user panel. Please use the Staff &amp; Admin Portal to log in.
                  </div>
                </div>
              </div>
              {onSwitchToAdmin && (
                <button
                  type="button"
                  id="btn-switch-to-admin-portal"
                  onClick={onSwitchToAdmin}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Go to Staff &amp; Admin Portal</span>
                </button>
              )}
            </div>
          ) : error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Hossain"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="candidate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={isRegister ? 'Min 6 characters (e.g. student123)' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Competitive Exam
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <select
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    {EXAM_GOALS.map((goal) => (
                      <option key={goal} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {loading ? 'Verifying Credentials...' : isRegister ? 'Create Protected Account' : 'Sign In Securely'}
            </button>
          </form>

          {/* Switch tab option */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline"
            >
              {isRegister
                ? 'Already have an account? Sign in with Email & Password'
                : "Don't have an account yet? Register with Password"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
