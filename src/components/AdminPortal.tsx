import React, { useState, useEffect } from 'react';
import { User, UserRole, AiSubscriptionPackage, SecurityAuditLog, SystemSecurityStatus, ChatMessage, SslCommerzTransaction } from '../types';
import {
  fetchAdminUsers,
  updateUserRoleAndSubscription,
  fetchSecurityStatus,
  fetchAiPackages,
  fetchChatMessages,
  resolveChatMessage,
  sendChatMessage,
  fetchSslCommerzTransactions,
  createAdminUser,
  resetUserQuota,
  deleteAdminUser,
  fetchGithubStatus,
  configureGithubRemote,
  pushToGithub,
  adminResetUserPassword,
  changeOwnPassword,
  fetchPullRequests
} from '../api';
import {
  ShieldCheck,
  Users,
  Sparkles,
  MessageSquare,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Crown,
  BookOpen,
  Trash2,
  UserCheck,
  Search,
  Zap,
  Activity,
  Terminal,
  Clock,
  Send,
  CreditCard,
  DollarSign,
  UserPlus,
  RotateCcw,
  X,
  UserX,
  Filter,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Upload,
  Globe,
  FileSpreadsheet,
  Award,
  Key,
  HelpCircle,
  ExternalLink,
  BarChart3
} from 'lucide-react';
import { AdminQuestionImporter } from './AdminQuestionImporter';
import { AdminExamTopicManager } from './AdminExamTopicManager';
import { AdminSplashOfferManager } from './AdminSplashOfferManager';
import { AdminPullRequestsManager } from './AdminPullRequestsManager';
import { AdminAnalyticsTab } from './AdminAnalyticsTab';
import { AdminQuestionManagerTab } from './AdminQuestionManagerTab';
import { AdminLivePresenceTab } from './AdminLivePresenceTab';

interface AdminPortalProps {
  currentUser: User | null;
  initialTab?: string;
  onOpenQuestionAuthoring: () => void;
  onOpenAiGenerator: () => void;
}

export function AdminPortal({ currentUser, initialTab, onOpenQuestionAuthoring, onOpenAiGenerator }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'questions' | 'users' | 'proposals' | 'importer' | 'exams-topics' | 'splash-offers' | 'ai-packages' | 'moderation' | 'security' | 'payments' | 'github' | 'live-activity'>('analytics');
  const [pendingPrsCount, setPendingPrsCount] = useState<number>(0);

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'proposals' || initialTab === 'admin-proposals') {
        setActiveTab('proposals');
      } else if (initialTab === 'questions' || initialTab === 'admin-questions') {
        setActiveTab('questions');
      } else if (initialTab === 'users' || initialTab === 'admin-users') {
        setActiveTab('users');
      } else if (initialTab === 'live-activity' || initialTab === 'admin-activity' || initialTab === 'live') {
        setActiveTab('live-activity');
      } else if (['analytics', 'importer', 'exams-topics', 'splash-offers', 'ai-packages', 'moderation', 'security', 'payments', 'github'].includes(initialTab)) {
        setActiveTab(initialTab as any);
      }
    }
  }, [initialTab]);

  // Industry-standard RBAC password reset verification:
  // - Super Admin can reset any password.
  // - Super Admin password can NEVER be changed by Moderators, Editors, or Admins.
  // - Admin can only reset lower-tier staff or clients.
  // - Moderator / Editor can NEVER change staff or Super Admin passwords.
  const canResetPassword = (targetUser: User | null): boolean => {
    if (!currentUser || !targetUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    if (targetUser.role === 'SUPER_ADMIN') return false;
    if (targetUser.role === 'ADMIN') return currentUser.id === targetUser.id;
    if (currentUser.role === 'MODERATOR' || currentUser.role === 'EDITOR') {
      return targetUser.role === 'CLIENT';
    }
    return true;
  };
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [aiPackages, setAiPackages] = useState<AiSubscriptionPackage[]>([]);
  const [securityStatus, setSecurityStatus] = useState<SystemSecurityStatus | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sslTransactions, setSslTransactions] = useState<SslCommerzTransaction[]>([]);
  const [replyText, setReplyText] = useState('');
  const [selectedChat, setSelectedChat] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [githubStatus, setGithubStatus] = useState<{
    branch: string;
    remoteUrl: string;
    lastCommit: string;
    hasUncommittedChanges: boolean;
    uncommittedFilesCount: number;
  } | null>(null);
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubCommitMsg, setGithubCommitMsg] = useState('');
  const [githubActionLoading, setGithubActionLoading] = useState(false);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR') {
        const uList = await fetchAdminUsers();
        setUsers(uList);
      }
      try {
        const pendingPrs = await fetchPullRequests({ status: 'PENDING' });
        setPendingPrsCount(pendingPrs.length);
      } catch (e) {}
      if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') {
        const sec = await fetchSecurityStatus();
        setSecurityStatus(sec);
        try {
          const gh = await fetchGithubStatus();
          setGithubStatus(gh);
          if (gh.remoteUrl) {
            setGithubRepoUrl(gh.remoteUrl.replace(/https:\/\/.*@/, 'https://'));
          }
        } catch (e) {}
      }
      const pkgs = await fetchAiPackages();
      setAiPackages(pkgs);
      const chats = await fetchChatMessages();
      setChatMessages(chats);
      if (chats.length > 0 && !selectedChat) {
        setSelectedChat(chats[0]);
      }
      const sslList = await fetchSslCommerzTransactions();
      setSslTransactions(sslList);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading admin portal data' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubRepoUrl.trim()) {
      setStatusMsg({ type: 'error', text: 'GitHub repository URL is required.' });
      return;
    }
    setGithubActionLoading(true);
    try {
      const msg = await configureGithubRemote(githubRepoUrl, githubToken);
      setStatusMsg({ type: 'success', text: msg });
      const updated = await fetchGithubStatus();
      setGithubStatus(updated);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to configure GitHub repository remote.' });
    } finally {
      setGithubActionLoading(false);
    }
  };

  const handlePushGithub = async () => {
    setGithubActionLoading(true);
    try {
      const res = await pushToGithub(githubCommitMsg || undefined);
      setStatusMsg({ type: 'success', text: res.message });
      setGithubCommitMsg('');
      const updated = await fetchGithubStatus();
      setGithubStatus(updated);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to push to GitHub. Verify Remote URL & Personal Access Token.' });
    } finally {
      setGithubActionLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [currentUser]);

  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'STAFF' | 'PRO' | 'FREE'>('ALL');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('EDITOR');
  const [newUserExam, setNewUserExam] = useState('BCS Preliminary (General)');
  const [newUserSubscribed, setNewUserSubscribed] = useState(true);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Admin Reset Password Modal
  const [targetUserForPasswordReset, setTargetUserForPasswordReset] = useState<User | null>(null);
  const [adminGivenNewPassword, setAdminGivenNewPassword] = useState('');
  const [adminResetLoading, setAdminResetLoading] = useState(false);

  // Self Password Change Modal
  const [isSelfPasswordModalOpen, setIsSelfPasswordModalOpen] = useState(false);
  const [selfCurrentPassword, setSelfCurrentPassword] = useState('');
  const [selfNewPassword, setSelfNewPassword] = useState('');
  const [selfConfirmPassword, setSelfConfirmPassword] = useState('');
  const [selfPasswordLoading, setSelfPasswordLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setStatusMsg({ type: 'error', text: 'Name and email are required.' });
      return;
    }
    setUserActionLoading(true);
    try {
      const created = await createAdminUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        targetExam: newUserExam,
        isSubscribed: newUserSubscribed,
        password: newUserPassword.trim() || undefined
      });
      setUsers([...users, created]);
      setIsCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setStatusMsg({ type: 'success', text: `Staff account for ${created.name} (${created.role}) successfully created!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create user' });
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleAdminResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPasswordReset) return;
    if (!canResetPassword(targetUserForPasswordReset)) {
      setStatusMsg({
        type: 'error',
        text: 'Access Denied: Industry standard security policy prevents changing Super Admin credentials.'
      });
      return;
    }
    if (!adminGivenNewPassword || adminGivenNewPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }
    setAdminResetLoading(true);
    try {
      await adminResetUserPassword(targetUserForPasswordReset.id, adminGivenNewPassword);
      setStatusMsg({
        type: 'success',
        text: `Password successfully updated for ${targetUserForPasswordReset.name} (${targetUserForPasswordReset.email})!`
      });
      setTargetUserForPasswordReset(null);
      setAdminGivenNewPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reset password' });
    } finally {
      setAdminResetLoading(false);
    }
  };

  const handleSelfPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfCurrentPassword || !selfNewPassword) {
      setStatusMsg({ type: 'error', text: 'Current password and new password are required' });
      return;
    }
    if (selfNewPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (selfNewPassword !== selfConfirmPassword) {
      setStatusMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSelfPasswordLoading(true);
    try {
      await changeOwnPassword(selfCurrentPassword, selfNewPassword);
      setStatusMsg({ type: 'success', text: 'Your password has been changed successfully!' });
      setIsSelfPasswordModalOpen(false);
      setSelfCurrentPassword('');
      setSelfNewPassword('');
      setSelfConfirmPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSelfPasswordLoading(false);
    }
  };

  const handleResetQuota = async (userId: string, userName: string) => {
    try {
      const updated = await resetUserQuota(userId);
      setUsers(users.map(u => u.id === userId ? updated : u));
      setStatusMsg({ type: 'success', text: `Reset daily question quota for ${userName}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reset quota' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;
    try {
      await deleteAdminUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setStatusMsg({ type: 'success', text: `Permanently removed user ${userName}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete user' });
    }
  };

  // User Access & Clearance Edit Modal
  const [targetUserForEdit, setTargetUserForEdit] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('CLIENT');
  const [editTargetExam, setEditTargetExam] = useState('BCS Preliminary (General)');
  const [editSubscribed, setEditSubscribed] = useState(false);
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);

  const openEditUserModal = (u: User) => {
    setTargetUserForEdit(u);
    setEditRole(u.role);
    setEditTargetExam(u.targetExam || (u.role === 'SUPER_ADMIN' ? 'All Exams (Global Unlimited)' : 'BCS Preliminary (General)'));
    setEditSubscribed(u.isSubscribed);
    setEditUserPassword('');
  };

  const handleSaveUserAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForEdit) return;
    setEditLoading(true);
    try {
      const finalExam = editRole === 'SUPER_ADMIN' ? 'All Exams (Global Unlimited)' : editTargetExam;
      const updated = await updateUserRoleAndSubscription(
        targetUserForEdit.id,
        editRole,
        editSubscribed,
        editSubscribed ? 'VIP_PASS' : 'FREE',
        finalExam
      );
      if (editUserPassword.trim() && editUserPassword.trim().length >= 6) {
        if (!canResetPassword(targetUserForEdit)) {
          setStatusMsg({
            type: 'error',
            text: 'Access Denied: Standard security policy forbids changing Super Admin credentials.'
          });
          return;
        }
        await adminResetUserPassword(targetUserForEdit.id, editUserPassword.trim());
      }
      setUsers(users.map(u => u.id === targetUserForEdit.id ? updated : u));
      setStatusMsg({
        type: 'success',
        text: `Permissions updated for ${updated.name}! Role: ${editRole}, Target Exam: ${finalExam}`
      });
      setTargetUserForEdit(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update user access' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleQuickRevokeAccess = async (u: User) => {
    if (!window.confirm(`Revoke all staff access for ${u.name} and demote to standard Student/Candidate?`)) return;
    try {
      const updated = await updateUserRoleAndSubscription(
        u.id,
        'CLIENT',
        u.isSubscribed,
        u.isSubscribed ? 'VIP_PASS' : 'FREE',
        u.targetExam === 'All Exams (Global Unlimited)' ? 'BCS Preliminary (General)' : u.targetExam
      );
      setUsers(users.map(usr => usr.id === u.id ? updated : usr));
      setStatusMsg({ type: 'success', text: `Revoked staff access. ${u.name} is now a standard Candidate.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to revoke staff access' });
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: UserRole, isSubscribed: boolean, targetExam?: string) => {
    try {
      const exam = targetExam || (newRole === 'SUPER_ADMIN' ? 'All Exams (Global Unlimited)' : undefined);
      const updated = await updateUserRoleAndSubscription(userId, newRole, isSubscribed, isSubscribed ? 'VIP_PASS' : 'FREE', exam);
      setUsers(users.map(u => (u.id === userId ? updated : u)));
      setStatusMsg({ type: 'success', text: `Updated ${updated.name}'s role to ${newRole}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  const handleSendChatReply = async () => {
    if (!selectedChat || !replyText.trim()) return;
    try {
      await sendChatMessage(replyText, selectedChat.questionId, selectedChat.senderId);
      await resolveChatMessage(selectedChat.id);
      setReplyText('');
      loadPortalData();
      setStatusMsg({ type: 'success', text: 'Reply sent and query marked as resolved!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to send reply' });
    }
  };

  const filteredUsers = (users || []).filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (userRoleFilter === 'STAFF') {
      return u.role !== 'CLIENT';
    } else if (userRoleFilter === 'PRO') {
      return u.isSubscribed;
    } else if (userRoleFilter === 'FREE') {
      return !u.isSubscribed && u.role === 'CLIENT';
    }
    return true;
  });

  const isStaff = currentUser && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(currentUser.role);

  if (!isStaff) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">Admin Subdomain Protected</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              This subdomain (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">admin.proshnosiddhi.com</code>) is reserved for authenticated staff, moderators, and system administrators.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                const modalTrigger = document.querySelector('[data-open-staff-modal]') as HTMLButtonElement;
                if (modalTrigger) modalTrigger.click();
                else window.location.hash = '#admin-login';
              }}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enter Staff Credentials</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Candidate looking for model tests?{' '}
            <a href="/" className="text-emerald-600 font-bold hover:underline">
              Return to Candidate Portal
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portal Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Command Center
            </span>
            <span className="text-xs text-slate-400">ProshnoSiddhi BD v3.2</span>
          </div>
          <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
            Admin & Staff Portal
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Role-Based Access Control • Question Bank Generator • Staff Passwords & GitHub Direct Sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSelfPasswordModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-600/50 text-purple-200 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Key className="w-3.5 h-3.5 text-purple-400" /> Change My Password
          </button>
          <button
            onClick={onOpenAiGenerator}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium text-sm shadow-md flex items-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4" /> AI Batch Generator
          </button>
          <button
            onClick={onOpenQuestionAuthoring}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm flex items-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4" /> Add Question
          </button>

          <button
            onClick={loadPortalData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hidden Gateway & Security Quick Reference Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 p-4 rounded-2xl border border-indigo-800/50 text-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>Hidden Administrative Route Activated</span>
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/30">
                Secured
              </span>
            </div>
            <div className="text-slate-400 mt-0.5">
              Direct access routes: <code className="text-indigo-300 font-mono">/admin-console</code>, <code className="text-indigo-300 font-mono">#staff-gateway</code>, or shortcut <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">Ctrl+Shift+A</kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Current Staff:</span>
          <span className="font-bold text-white bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            {currentUser?.email} ({currentUser?.role})
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-2xl p-2 shadow-xs gap-1.5">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <span>Admin Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'questions'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Question Manager & AI</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Users & Staff
        </button>

        <button
          onClick={() => setActiveTab('proposals')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            activeTab === 'proposals'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitPullRequest className="w-4 h-4 text-indigo-400" /> Commits & PRs
          {pendingPrsCount > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {pendingPrsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('live-activity')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            activeTab === 'live-activity'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Activity className="w-4 h-4 text-emerald-500" /> Live Users & Staff
        </button>

        <button
          onClick={() => setActiveTab('importer')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            activeTab === 'importer'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Upload Spreadsheet
        </button>

        <button
          onClick={() => setActiveTab('exams-topics')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            activeTab === 'exams-topics'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" /> Exams & Topics
        </button>

        <button
          onClick={() => setActiveTab('splash-offers')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            activeTab === 'splash-offers'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" /> Splash Offers & Ads
        </button>

        <button
          onClick={() => setActiveTab('ai-packages')}
          className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition ${
            activeTab === 'ai-packages'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" /> AI Packages
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'moderation'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-400" /> Moderator Desk
          {(chatMessages || []).filter(m => !m.isResolved).length > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {(chatMessages || []).filter(m => !m.isResolved).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4 text-rose-400" /> Security & Rate Limits
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'payments'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" /> SSLCommerz Gateway
          {(sslTransactions || []).length > 0 && (
            <span className="ml-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {(sslTransactions || []).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('github')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${
            activeTab === 'github'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitBranch className="w-4 h-4 text-sky-400" /> GitHub Direct Sync
          {githubStatus?.hasUncommittedChanges && (
            <span className="ml-1 bg-sky-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {githubStatus.uncommittedFilesCount} modified
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USER ROLES & SUBSCRIPTIONS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Top Metric Cards for User Directory */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Total Candidates</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{users.length}</div>
              <span className="text-[11px] text-slate-500 font-medium">Registered Accounts</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Staff & Admins</span>
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {(users || []).filter(u => u.role !== 'CLIENT').length}
              </div>
              <span className="text-[11px] text-purple-600 font-bold">Admins, Editors, Mods</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Pro VIP Passes</span>
                <Crown className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {(users || []).filter(u => u.isSubscribed).length}
              </div>
              <span className="text-[11px] text-amber-600 font-bold">Unlimited Access</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Free Tier</span>
                <BookOpen className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-700 mt-2">
                {(users || []).filter(u => !u.isSubscribed && u.role === 'CLIENT').length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">10 Questions / Day</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900">User Directory & Staff Management</h2>
                  <button
                    onClick={() => setShowRoleGuide(!showRoleGuide)}
                    className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showRoleGuide ? 'Hide Role Guide' : 'Role & Access Guide'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admins have universal root access to ALL exams. Staff and candidates can be granted, promoted, or revoked at any level.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, email, role..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Add User Button */}
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Register User / Staff
                </button>
              </div>
            </div>

            {/* Role & Permission Matrix Guide Banner (Collapsible) */}
            {showRoleGuide && (
              <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl space-y-3 border border-indigo-800/40 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> System Access & Exam Permission Matrix
                  </span>
                  <button onClick={() => setShowRoleGuide(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                  <div className="bg-white/5 border border-purple-400/30 p-3 rounded-xl">
                    <div className="font-black text-purple-300 flex items-center gap-1">👑 SUPER_ADMIN</div>
                    <div className="text-[11px] text-purple-100 font-bold mt-1">Scope: All Exams (Universal Root)</div>
                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                      Root authority across ALL exams, questions, users, security audits, GitHub sync, database backups & billing. Never limited by exam.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-amber-400/30 p-3 rounded-xl">
                    <div className="font-black text-amber-300 flex items-center gap-1">🛡️ ADMIN</div>
                    <div className="text-[11px] text-amber-100 font-bold mt-1">Scope: All or Assigned Exams</div>
                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                      Full examination controller. Generates AI questions, manages topics/subjects, imports data, and configures model tests.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-blue-400/30 p-3 rounded-xl">
                    <div className="font-black text-blue-300 flex items-center gap-1">✍️ EDITOR</div>
                    <div className="text-[11px] text-blue-100 font-bold mt-1">Scope: Content Curator</div>
                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                      Creates, modifies, and enriches questions, model solutions, and topic study materials for target streams.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-indigo-400/30 p-3 rounded-xl">
                    <div className="font-black text-indigo-300 flex items-center gap-1">💬 MODERATOR</div>
                    <div className="text-[11px] text-indigo-100 font-bold mt-1">Scope: Support & Quotas</div>
                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                      Assists candidates, answers question dispute queries, and resets daily quiz quotas for locked candidates.
                    </p>
                  </div>

                  <div className="bg-white/5 border border-slate-400/30 p-3 rounded-xl">
                    <div className="font-black text-emerald-300 flex items-center gap-1">🎓 CLIENT</div>
                    <div className="text-[11px] text-emerald-100 font-bold mt-1">Scope: Candidate / Student</div>
                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                      Standard user studying for a chosen target exam. Free tier gets 10 Qs/day; Pro VIP gets unlimited mock tests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                onClick={() => setUserRoleFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  userRoleFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setUserRoleFilter('STAFF')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  userRoleFilter === 'STAFF'
                    ? 'bg-purple-900 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Staff ({(users || []).filter(u => u.role !== 'CLIENT').length})
              </button>
              <button
                onClick={() => setUserRoleFilter('PRO')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  userRoleFilter === 'PRO'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Pro Passes ({(users || []).filter(u => u.isSubscribed).length})
              </button>
              <button
                onClick={() => setUserRoleFilter('FREE')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  userRoleFilter === 'FREE'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Free Tier ({(users || []).filter(u => !u.isSubscribed && u.role === 'CLIENT').length})
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="p-3.5">Candidate / User</th>
                    <th className="p-3.5">Target Exam / Scope</th>
                    <th className="p-3.5">System Role</th>
                    <th className="p-3.5">Subscription & Quota</th>
                    <th className="p-3.5 text-right">Actions & Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No users match the selected search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full bg-slate-200 object-cover shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                {u.name}
                                {u.isSubscribed && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                              </div>
                              <div className="text-[11px] text-slate-500">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">
                            {u.role === 'SUPER_ADMIN' ? (
                              <span className="text-purple-700 font-bold flex items-center gap-1">
                                🌐 All Exams (Global Root)
                              </span>
                            ) : (
                              u.targetExam || 'BCS Preliminary (General)'
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {u.role === 'SUPER_ADMIN'
                              ? 'Universal clearance across all subjects'
                              : u.role === 'CLIENT'
                              ? 'Target study stream'
                              : 'Staff exam assignment'}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
                              u.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : u.role === 'ADMIN'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : u.role === 'EDITOR'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : u.role === 'MODERATOR'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3.5">
                          {u.role !== 'CLIENT' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                                <CheckCircle2 className="w-3 h-3" /> STAFF UNLIMITED
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                Role: {u.role} (No quota cap)
                              </div>
                            </div>
                          ) : u.isSubscribed ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                <CheckCircle2 className="w-3 h-3" /> PRO VIP UNLIMITED
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                Unlimited Question Practice
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                FREE TIER
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                Daily Used: <span className="font-bold text-slate-800">{u.dailyQuestionsUsed || 0}</span> / {u.maxDailyFreeQuestions || 10}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Super Admin & Admin: Full Access & Permissions Editor */}
                            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                              <button
                                type="button"
                                onClick={() => openEditUserModal(u)}
                                title="Edit Role, Target Exam & Permissions"
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-sm"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Manage Access</span>
                              </button>
                            )}

                            {/* Quick Demote / Revoke if Staff */}
                            {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && u.role !== 'SUPER_ADMIN' && u.role !== 'ADMIN')) && u.role !== 'CLIENT' && u.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={() => handleQuickRevokeAccess(u)}
                                title="Revoke Staff Clearance (Demote to Candidate)"
                                className="px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition border border-rose-200 flex items-center gap-1 text-[10px] font-bold"
                              >
                                <UserX className="w-3.5 h-3.5 text-rose-600" />
                                <span>Revoke</span>
                              </button>
                            )}

                            {canResetPassword(u) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetUserForPasswordReset(u);
                                  setAdminGivenNewPassword('');
                                }}
                                title="Set or Reset User Password"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition flex items-center gap-1 border border-amber-200"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-[10px] font-bold">Pass</span>
                              </button>
                            ) : (
                              <span
                                title="Protected credential: Industry standard security policy forbids modifying Super Admin or higher-tier passwords."
                                className="p-1.5 rounded-lg text-slate-400 bg-slate-50 flex items-center gap-1 border border-slate-200 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500">Locked</span>
                              </span>
                            )}

                            {u.role === 'CLIENT' && !u.isSubscribed && (
                              <button
                                type="button"
                                onClick={() => handleResetQuota(u.id, u.name)}
                                title="Reset Daily Question Quota to 0"
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition flex items-center gap-1 border border-slate-200"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                                <span className="text-[10px] font-bold">Reset Quota</span>
                              </button>
                            )}

                            {currentUser?.role === 'SUPER_ADMIN' && u.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Delete User"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition border border-rose-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit User Access, Role, Target Exam & Permissions */}
      {targetUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Manage User Access & Permissions</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">
                    {targetUserForEdit.name} ({targetUserForEdit.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetUserForEdit(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserAccess} className="space-y-4">
              {/* User overview info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <img src={targetUserForEdit.avatar} alt={targetUserForEdit.name} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-xs truncate">{targetUserForEdit.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{targetUserForEdit.email}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Current: <span className="font-bold text-slate-700">{targetUserForEdit.role}</span> • {targetUserForEdit.targetExam}
                  </div>
                </div>
              </div>

              {/* System Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Role & Clearance Level</label>
                <select
                  value={editRole}
                  onChange={e => {
                    const newR = e.target.value as UserRole;
                    setEditRole(newR);
                    if (newR === 'SUPER_ADMIN') {
                      setEditTargetExam('All Exams (Global Unlimited)');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="CLIENT">CLIENT (Standard Candidate / Student)</option>
                  <option value="MODERATOR">MODERATOR (Community & Helpdesk Support)</option>
                  <option value="EDITOR">EDITOR (Question & Content Curator)</option>
                  <option value="ADMIN">ADMIN (Full Examination Controller)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Universal Root Clearance - All Exams)</option>
                </select>
              </div>

              {/* Contextual Role Info */}
              {editRole === 'SUPER_ADMIN' ? (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1 text-purple-950">
                    👑 Universal Super Admin Clearance
                  </div>
                  <p className="text-[11px] text-purple-800">
                    Super Admins are <strong>never limited to a single exam</strong>. They automatically have unrestricted root access across all BCS, Bank, Primary, NTRCA, Medical exams, question generators, and system logs.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Exam Assignment / Scope
                  </label>
                  <select
                    value={editTargetExam}
                    onChange={e => setEditTargetExam(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="All Exams (Global Coverage)">All Exams (Global Coverage)</option>
                    <option value="BCS Preliminary (General)">BCS Preliminary (General)</option>
                    <option value="Bank Officer & Cash Exam">Bank Officer & Cash Exam</option>
                    <option value="Primary Teacher Recruitment">Primary Teacher Recruitment</option>
                    <option value="NTRCA Lecturer & Teacher">NTRCA Lecturer & Teacher</option>
                    <option value="Medical & Dental Admission">Medical & Dental Admission</option>
                    <option value="University Admission Test">University Admission Test</option>
                    <option value="Govt Job Exam Prep">All Govt Job Exams</option>
                  </select>
                </div>
              )}

              {/* Subscription VIP Pass */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> PRO VIP Unlimited Pass
                  </div>
                  <div className="text-[10px] text-amber-700">
                    {editSubscribed ? 'Unlimited mock tests, AI explanations & mistake bank' : 'Restricted to 10 questions / day'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="editSubscribedCheck"
                  checked={editSubscribed}
                  onChange={e => setEditSubscribed(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {/* Direct Password Reset in Modal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Change / Set Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to keep existing password"
                  value={editUserPassword}
                  onChange={e => setEditUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {targetUserForEdit.role !== 'CLIENT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditRole('CLIENT');
                      setEditTargetExam('BCS Preliminary (General)');
                    }}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" /> Revoke Staff (Demote to Student)
                  </button>
                )}

                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetUserForEdit(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    {editLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save Permissions
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register New User / Staff */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Register New User / Staff</h3>
                  <p className="text-xs text-slate-500">Add candidates, moderators, editors, or admins</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abdullah Al Mamun"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="mamun@proshno.bd"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Password (Optional — min 6 characters, securely hashed)
                </label>
                <input
                  type="password"
                  placeholder="Set custom password or leave blank for default"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">System Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => {
                      const r = e.target.value as UserRole;
                      setNewUserRole(r);
                      if (r === 'SUPER_ADMIN') {
                        setNewUserExam('All Exams (Global Unlimited)');
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="CLIENT">CLIENT (Candidate)</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Exam Scope</label>
                  {newUserRole === 'SUPER_ADMIN' ? (
                    <input
                      type="text"
                      disabled
                      value="All Exams (Global Root)"
                      className="w-full px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900"
                    />
                  ) : (
                    <select
                      value={newUserExam}
                      onChange={e => setNewUserExam(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="All Exams (Global Coverage)">All Exams (Global Coverage)</option>
                      <option value="BCS Preliminary (General)">BCS Preliminary</option>
                      <option value="Bank Officer & Cash Exam">Bank Officer & Cash</option>
                      <option value="Primary Teacher Recruitment">Primary Teacher</option>
                      <option value="NTRCA Lecturer & Teacher">NTRCA Teacher</option>
                      <option value="Medical & Dental Admission">Medical Admission</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <input
                  type="checkbox"
                  id="grantProPass"
                  checked={newUserSubscribed}
                  onChange={e => setNewUserSubscribed(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="grantProPass" className="text-xs font-bold text-amber-900 cursor-pointer">
                  Grant Unlimited Pro VIP Pass immediately
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userActionLoading}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {userActionLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-emerald-400" /> Register Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Super Admin / Admin Reset User Password */}
      {targetUserForPasswordReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Reset Account Password</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px]">
                    {targetUserForPasswordReset.name} ({targetUserForPasswordReset.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetUserForPasswordReset(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPasswordSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900">
                You are setting a new password for <span className="font-bold">{targetUserForPasswordReset.email}</span>. The password will be cryptographically salted with PBKDF2.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Secure Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={adminGivenNewPassword}
                  onChange={e => setAdminGivenNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetUserForPasswordReset(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminResetLoading}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {adminResetLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" /> Save New Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Self Change Password */}
      {isSelfPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Change My Password</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[240px]">
                    {currentUser?.email} ({currentUser?.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSelfPasswordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSelfPasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={selfCurrentPassword}
                  onChange={e => setSelfCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={selfNewPassword}
                  onChange={e => setSelfNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={selfConfirmPassword}
                  onChange={e => setSelfConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSelfPasswordModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selfPasswordLoading}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {selfPasswordLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: ADMIN ANALYTICS INTELLIGENCE */}
      {activeTab === 'analytics' && (
        <AdminAnalyticsTab />
      )}

      {/* TAB: QUESTION MANAGER, CRUD & AI EXPLANATION STUDIO */}
      {activeTab === 'questions' && (
        <AdminQuestionManagerTab
          currentUser={currentUser}
          onOpenAddQuestionModal={onOpenQuestionAuthoring}
          onOpenImporterTab={() => setActiveTab('importer')}
        />
      )}

      {/* TAB: QUESTION BANK COMMITS & PULL REQUESTS */}
      {activeTab === 'proposals' && (
        <AdminPullRequestsManager
          currentUser={currentUser}
          onRefreshQuestionBank={() => {
            loadPortalData();
          }}
        />
      )}

      {/* TAB: LIVE USERS PRESENCE & MODERATOR WORK DOSSIER */}
      {activeTab === 'live-activity' && (
        <AdminLivePresenceTab
          currentUser={currentUser}
          onNavigateToProposals={() => setActiveTab('proposals')}
        />
      )}

      {/* TAB: SPREADSHEET QUESTION IMPORTER */}
      {activeTab === 'importer' && (
        <AdminQuestionImporter
          onImportComplete={() => {
            setStatusMsg({
              type: 'success',
              text: 'Spreadsheet questions successfully imported to Master Database! View them in the Question Bank.'
            });
          }}
        />
      )}

      {/* TAB: EXAMS & TOPICS HIERARCHY MANAGER */}
      {activeTab === 'exams-topics' && (
        <AdminExamTopicManager />
      )}

      {/* TAB: BOOTING SCREEN SPLASH OFFERS & ADS */}
      {activeTab === 'splash-offers' && (
        <AdminSplashOfferManager currentUser={currentUser} />
      )}

      {/* TAB 2: AI SUBSCRIPTION PACKAGES */}
      {activeTab === 'ai-packages' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-6 shadow-md border border-emerald-900/40">
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-300">
              <Sparkles className="w-5 h-5 text-emerald-400" /> Subscribe AI High-Value Question Generator Packages
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Equip your admins and editors with high-value AI generation tokens. Generate thousands of BCS, Bank, and Teacher exam questions with detailed step-by-step reasoning in seconds!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiPackages.map(pkg => (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition shadow-sm hover:shadow-md relative ${
                  pkg.isPopular ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                }`}
              >
                {pkg.badgeText && (
                  <span className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                    {pkg.badgeText}
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{pkg.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">৳{pkg.priceBdt}</span>
                    <span className="text-xs text-slate-500">/ package</span>
                  </div>

                  <div className="mt-3 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Quota: {pkg.questionsQuota.toLocaleString()} High-Value AI Questions
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    {pkg.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      onOpenAiGenerator();
                      setStatusMsg({
                        type: 'success',
                        text: `AI Package ${pkg.name} selected! Ready for high-value question generation.`
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Generate Questions Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MODERATOR DESK */}
      {activeTab === 'moderation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="md:col-span-1 border-r border-slate-200 pr-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
              <span>Student Inquiries</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                {chatMessages.length} Messages
              </span>
            </h3>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedChat(msg)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedChat?.id === msg.id
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs">{msg.senderName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        msg.isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {msg.isResolved ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1">{msg.text}</p>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 pl-2 space-y-4 flex flex-col justify-between">
            {selectedChat ? (
              <>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{selectedChat.senderName}</span>
                        <span className="text-xs text-slate-500 ml-2">({selectedChat.senderRole})</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(selectedChat.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-800 text-sm leading-relaxed">{selectedChat.text}</p>

                    {selectedChat.questionId && (
                      <div className="mt-3 text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-indigo-700 font-medium">
                        Reference Question ID: <strong>{selectedChat.questionId}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700">Moderator Response</label>
                  <textarea
                    rows={3}
                    placeholder="Type official explanation or response to student..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                  <button
                    onClick={handleSendChatReply}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow transition flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Send & Resolve Doubt
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                Select a message from the left inbox to view and respond.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & RATE LIMITS */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                <Activity className="w-4 h-4 text-emerald-500" /> Rate Limiter Engine
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {securityStatus?.rateLimiterActive ? 'ACTIVE (120 req/m)' : 'DISABLED'}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Sliding Window IP Monitor</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Blocked Excessive Reqs
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {securityStatus?.blockedRequestsCount || 0}
              </div>
              <span className="text-[11px] text-slate-400">Security Auto-Gated</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                <Users className="w-4 h-4 text-blue-500" /> Active User Sessions
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {securityStatus?.activeSessionsCount || users.length}
              </div>
              <span className="text-[11px] text-slate-400">Authenticated Roles</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI Credits Balance
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {(securityStatus?.aiCreditsRemaining || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-teal-700 font-medium">Smart Question Generator Quota</span>
            </div>
          </div>

          <div className="bg-slate-950 text-slate-200 rounded-2xl p-6 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" /> Real-Time Security Audit Log
              </h3>
              <span className="text-xs text-slate-400 font-mono">X-User-ID Token Validation</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Actor Email</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Details</th>
                    <th className="pb-2">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(securityStatus?.securityLogs || []).map(log => (
                    <tr key={log.id} className="hover:bg-slate-900/50">
                      <td className="py-2.5 text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 text-emerald-300 font-semibold">{log.actorEmail}</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px]">
                          {log.actorRole}
                        </span>
                      </td>
                      <td className="py-2.5 text-sky-400 font-bold">{log.action}</td>
                      <td className="py-2.5 text-slate-300 max-w-xs truncate">{log.details}</td>
                      <td className="py-2.5 text-slate-500">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SSLCOMMERZ PAYMENTS GATEWAY MONITOR */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Total Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                ৳{(sslTransactions || []).filter(t => t.status === 'VALIDATED').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} <span className="text-xs text-slate-400 font-normal">BDT</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">Processed via SSLCommerz</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Successful Orders</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {(sslTransactions || []).filter(t => t.status === 'VALIDATED').length}
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">Completed Subscriptions</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Active Gateway Store</span>
                <CreditCard className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-sm font-black text-slate-900 mt-2 font-mono truncate">
                proshnosiddhi_testbox
              </div>
              <span className="text-[11px] text-sky-600 font-semibold">SSLCOMMERZ SANDBOX MODE</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
                <span>Supported Channels</span>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-sm font-black text-slate-900 mt-2">
                bKash, Nagad, Cards, NetBank
              </div>
              <span className="text-[11px] text-amber-600 font-semibold">Instant IPN Handshake</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">SSLCommerz Live Transaction Ledger</h3>
                <p className="text-xs text-slate-500">
                  Real-time synchronization with SSLCommerz payment gateway callbacks & IPN validations.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
                {sslTransactions.length} Total Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <th className="p-3">Tran ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Plan / Item</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Validation Ref</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {sslTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No SSLCommerz transactions recorded yet. Initiate a subscription payment to test live logging!
                      </td>
                    </tr>
                  ) : (
                    sslTransactions.map(t => (
                      <tr key={t.tranId} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{t.tranId}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{t.cusName}</div>
                          <div className="text-[10px] text-slate-500">{t.cusEmail}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{t.planName}</td>
                        <td className="p-3 font-black text-amber-700">৳{t.amount}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px]">
                            {t.paymentMethod || t.paymentChannel}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              t.status === 'VALIDATED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : t.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">{t.valId || '-'}</td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: GITHUB DIRECT SYNC TOOL */}
      {activeTab === 'github' && (
        <div className="space-y-6">
          {/* Git Repository Status Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase">Active Git Branch</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{githubStatus?.branch || 'main'}</div>
                <span className="text-[11px] text-slate-400">Local workspace repository</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-bold uppercase">Connected Remote</div>
                <div className="text-xs font-mono font-bold text-slate-900 mt-1 truncate" title={githubStatus?.remoteUrl || 'Not configured'}>
                  {githubStatus?.remoteUrl ? githubStatus.remoteUrl.replace(/https:\/\/.*@/, 'https://') : 'No Remote Set'}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {githubStatus?.remoteUrl ? 'Target GitHub Repo' : 'Paste repo URL below'}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <GitCommit className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-slate-500 font-bold uppercase">Latest Commit</div>
                <div className="text-xs font-mono font-bold text-slate-900 mt-1 truncate" title={githubStatus?.lastCommit || 'None'}>
                  {githubStatus?.lastCommit || 'No commits yet'}
                </div>
                <span className="text-[11px] text-purple-600 font-semibold">
                  {githubStatus?.hasUncommittedChanges
                    ? `${githubStatus.uncommittedFilesCount} modified file(s) ready to push`
                    : 'Workspace clean & synchronized'}
                </span>
              </div>
            </div>
          </div>

          {/* Sync & Push Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Remote Configuration */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">1. Configure Target GitHub Repository</h3>
                  <p className="text-xs text-slate-500">Set repository URL & Personal Access Token for direct pushing</p>
                </div>
              </div>

              <form onSubmit={handleConfigureGithub} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GitHub Repository URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/your-username/your-repo-name.git"
                    value={githubRepoUrl}
                    onChange={e => setGithubRepoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    e.g. <code className="bg-slate-100 px-1 rounded text-slate-700">https://github.com/rony-jib/proshnosiddhi.git</code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generate at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-sky-600 underline font-semibold">github.com/settings/tokens</a> with <code className="bg-slate-100 px-1 rounded text-slate-700">repo</code> scope for seamless pushes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={githubActionLoading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {githubActionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-sky-400" />
                  )}
                  Save Remote Repository Settings
                </button>
              </form>
            </div>

            {/* Box 2: Instant Push Action */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">2. Push Workspace Code to GitHub</h3>
                    <p className="text-xs text-slate-500">Instantly stage, commit, and push all files with 1 click</p>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Commit Message (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Added SSLCommerz & direct GitHub sync integration"
                      value={githubCommitMsg}
                      onChange={e => setGithubCommitMsg(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                    <div className="text-xs font-extrabold text-sky-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-sky-600 fill-sky-600" /> Direct Sync Active
                    </div>
                    <p className="text-xs text-sky-800 leading-relaxed">
                      Clicking the button below immediately packages all current source files, components, and backend routes, commits them to the local git tree, and pushes directly to your GitHub target branch (<code className="font-mono bg-sky-100 px-1 rounded">main</code>).
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePushGithub}
                disabled={githubActionLoading || !githubStatus?.remoteUrl}
                className="w-full py-3.5 mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {githubActionLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    Pushing Workspace Code to GitHub...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-white" />
                    Push All Recent Changes to GitHub Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
