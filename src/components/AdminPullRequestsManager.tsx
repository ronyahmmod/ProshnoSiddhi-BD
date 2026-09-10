import React, { useState, useEffect, useMemo } from 'react';
import { User, QuestionPullRequest, PRStatus, PRActionType, AdminPrivileges, Question } from '../types';
import {
  fetchPullRequests,
  approvePullRequest,
  rejectPullRequest,
  updateAdminPrivileges,
  fetchAdminUsers
} from '../api';
import { MathJaxView } from './MathJaxView';
import {
  GitPullRequest,
  GitMerge,
  GitCommit,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  PlusCircle,
  Trash2,
  Edit3,
  FileSpreadsheet,
  AlertTriangle,
  Send,
  MessageSquare,
  ArrowRight,
  Info,
  Check,
  X,
  Layers,
  Sparkles,
  Award
} from 'lucide-react';

interface AdminPullRequestsManagerProps {
  currentUser: User | null;
  onRefreshQuestionBank?: () => void;
}

export const AdminPullRequestsManager: React.FC<AdminPullRequestsManagerProps> = ({
  currentUser,
  onRefreshQuestionBank
}) => {
  const [pullRequests, setPullRequests] = useState<QuestionPullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | PRStatus>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | PRActionType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);

  // Action Dialogs
  const [reviewPr, setReviewPr] = useState<QuestionPullRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Super Admin: Admin Privileges Management
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [showPrivilegesPanel, setShowPrivilegesPanel] = useState(false);
  const [updatingPrivsUserId, setUpdatingPrivsUserId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const userPrivileges: AdminPrivileges = currentUser?.role === 'SUPER_ADMIN'
    ? { canDirectAdd: true, canDirectEdit: true, canDirectDelete: true, canDirectBulkImport: true, canApprovePR: true }
    : (currentUser?.adminPrivileges || {
        canDirectAdd: currentUser?.role === 'ADMIN',
        canDirectEdit: currentUser?.role === 'ADMIN',
        canDirectDelete: currentUser?.role === 'ADMIN',
        canDirectBulkImport: currentUser?.role === 'ADMIN',
        canApprovePR: currentUser?.role === 'ADMIN'
      });

  const canReviewPRs = isSuperAdmin || Boolean(userPrivileges.canApprovePR);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const prs = await fetchPullRequests(statusFilter === 'ALL' ? undefined : statusFilter);
      setPullRequests(prs);

      if (isSuperAdmin) {
        const usersList = await fetchAdminUsers();
        setAdminUsers(usersList.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Pull Requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!reviewPr) return;
    setSubmittingReview(true);
    try {
      const res = await approvePullRequest(reviewPr.id, reviewComment || 'Approved and merged to Question Bank.');
      setSuccessMessage(`Pull Request #${res.pr.prNumber} successfully approved & merged!`);
      setReviewPr(null);
      setReviewAction(null);
      setReviewComment('');
      loadData();
      if (onRefreshQuestionBank) onRefreshQuestionBank();
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReject = async () => {
    if (!reviewPr) return;
    if (!reviewComment.trim()) {
      setError('A comment explaining the review decision is required for rejections.');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await rejectPullRequest(reviewPr.id, reviewComment.trim());
      setSuccessMessage(`Pull Request #${res.pr.prNumber} rejected with feedback.`);
      setReviewPr(null);
      setReviewAction(null);
      setReviewComment('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleTogglePrivilege = async (adminUser: User, field: keyof AdminPrivileges) => {
    if (!isSuperAdmin) return;
    setUpdatingPrivsUserId(adminUser.id);
    try {
      const current = adminUser.adminPrivileges || {
        canDirectAdd: true,
        canDirectEdit: true,
        canDirectDelete: true,
        canDirectBulkImport: true,
        canApprovePR: true
      };
      const updated = await updateAdminPrivileges(adminUser.id, {
        [field]: !current[field]
      });

      setAdminUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setSuccessMessage(`Updated direct privilege (${field}) for ${adminUser.name}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update admin privilege');
    } finally {
      setUpdatingPrivsUserId(null);
    }
  };

  // Filtered PR list
  const filteredPrs = useMemo(() => {
    return pullRequests.filter(pr => {
      if (actionFilter !== 'ALL' && pr.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = pr.title.toLowerCase().includes(q);
        const matchMsg = pr.commitMessage.toLowerCase().includes(q);
        const matchUser = pr.proposerName.toLowerCase().includes(q);
        const matchNum = String(pr.prNumber).includes(q);
        const matchSubject = pr.proposedQuestion?.subject?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchMsg && !matchUser && !matchNum && !matchSubject) {
          return false;
        }
      }
      return true;
    });
  }, [pullRequests, actionFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: pullRequests.length,
      pending: pullRequests.filter(p => p.status === 'PENDING').length,
      approved: pullRequests.filter(p => p.status === 'APPROVED').length,
      rejected: pullRequests.filter(p => p.status === 'REJECTED').length,
    };
  }, [pullRequests]);

  const getActionBadge = (action: PRActionType, count?: number) => {
    switch (action) {
      case 'ADD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <PlusCircle className="w-3 h-3" /> Add Question
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Edit3 className="w-3 h-3" /> Update Question
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Trash2 className="w-3 h-3" /> Delete Question
          </span>
        );
      case 'BULK_IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <FileSpreadsheet className="w-3 h-3" /> Bulk Import {count ? `(${count} Qs)` : ''}
          </span>
        );
    }
  };

  const getStatusBadge = (status: PRStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <GitMerge className="w-3 h-3 text-emerald-600" /> Merged & Live
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-500" /> Closed / Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Workflow Header & Privileges Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 flex items-center gap-1">
                <GitPullRequest className="w-3.5 h-3.5 text-indigo-300" /> GitHub-Style Pull Request Workflow
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Active Role: {currentUser?.role || 'CLIENT'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Question Bank Commit & Pull Requests
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Moderators & Editors submit commits to add, update, or delete questions. Admins review diffs and approve pull requests before they merge into the production question bank.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <button
                onClick={() => setShowPrivilegesPanel(!showPrivilegesPanel)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  showPrivilegesPanel
                    ? 'bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Super Admin: Manage Admin Privileges</span>
              </button>
            )}
            <button
              onClick={loadData}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-200 border border-slate-700 transition"
              title="Refresh PR List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* User Permission Pill Summary */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-medium">Your Direct Privileges:</span>
            <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
              userPrivileges.canDirectAdd
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950/70 text-amber-300 border border-amber-800'
            }`}>
              {userPrivileges.canDirectAdd ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Direct Add: {userPrivileges.canDirectAdd ? 'Enabled' : 'PR Required'}
            </span>
            <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
              userPrivileges.canDirectDelete
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950/70 text-amber-300 border border-amber-800'
            }`}>
              {userPrivileges.canDirectDelete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Direct Delete: {userPrivileges.canDirectDelete ? 'Enabled' : 'PR Required'}
            </span>
            <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
              canReviewPRs
                ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              PR Approval & Merge: {canReviewPRs ? 'Authorized' : 'Viewer Only'}
            </span>
          </div>

          <div className="flex items-center gap-3 font-medium text-slate-300">
            <span>Pending Review: <strong className="text-amber-400">{counts.pending}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Merged: <strong className="text-emerald-400">{counts.approved}</strong></span>
          </div>
        </div>
      </div>

      {/* Super Admin Privileges Management Panel (Collapsible) */}
      {isSuperAdmin && showPrivilegesPanel && (
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Super Admin Privilege Manager: Direct Actions & PR Approvals
                </h3>
                <p className="text-xs text-slate-500">
                  Configure whether individual Admins can directly bypass the Pull Request workflow or must submit proposals for review.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPrivilegesPanel(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Admin Name / Email</th>
                  <th className="py-3 px-3 text-center">Role</th>
                  <th className="py-3 px-3 text-center">Direct Add</th>
                  <th className="py-3 px-3 text-center">Direct Edit</th>
                  <th className="py-3 px-3 text-center">Direct Delete</th>
                  <th className="py-3 px-3 text-center">Direct Bulk Import</th>
                  <th className="py-3 px-3 text-center">Approve PRs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminUsers.map(adminUser => {
                  const privs = adminUser.adminPrivileges || {
                    canDirectAdd: true,
                    canDirectEdit: true,
                    canDirectDelete: true,
                    canDirectBulkImport: true,
                    canApprovePR: true
                  };
                  const isTargetSuper = adminUser.role === 'SUPER_ADMIN';

                  return (
                    <tr key={adminUser.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="font-bold">{adminUser.name}</div>
                        <div className="text-[11px] text-slate-500">{adminUser.email}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isTargetSuper ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {adminUser.role}
                        </span>
                      </td>

                      {/* Toggles */}
                      {(['canDirectAdd', 'canDirectEdit', 'canDirectDelete', 'canDirectBulkImport', 'canApprovePR'] as const).map(key => {
                        const isEnabled = isTargetSuper || Boolean(privs[key]);
                        return (
                          <td key={key} className="py-3 px-3 text-center">
                            <button
                              disabled={isTargetSuper || updatingPrivsUserId === adminUser.id}
                              onClick={() => handleTogglePrivilege(adminUser, key)}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto ${
                                isEnabled
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                              } ${isTargetSuper ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              {isEnabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {isEnabled ? 'Allowed' : 'Requires PR'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-[11px] font-bold underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[11px] font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All PRs ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'APPROVED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            Merged ({counts.approved})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'REJECTED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Closed ({counts.rejected})
          </button>
        </div>

        {/* Action Type Filter & Search Input */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Actions</option>
            <option value="ADD">Add Question</option>
            <option value="UPDATE">Update Question</option>
            <option value="DELETE">Delete Question</option>
            <option value="BULK_IMPORT">Bulk Import</option>
          </select>

          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PRs by title, commit, user..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* PR Cards List */}
      <div className="space-y-4">
        {filteredPrs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <GitPullRequest className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No Pull Requests match current filter</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              When Moderators or Editors propose question changes, additions, or deletions, they will appear here for Admin review and merging.
            </p>
          </div>
        ) : (
          filteredPrs.map((pr) => {
            const isExpanded = selectedPrId === pr.id;
            return (
              <div
                key={pr.id}
                className={`bg-white rounded-2xl border transition shadow-xs ${
                  isExpanded ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* PR Card Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 text-sm">
                        #{pr.prNumber}
                      </span>
                      {getActionBadge(pr.action, pr.bulkCount)}
                      {pr.clientReviewInfo?.isClientReview && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Award className="w-3 h-3 text-amber-600" /> Client Review Proposal
                        </span>
                      )}
                      {getStatusBadge(pr.status)}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(pr.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      {pr.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <GitCommit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700">
                        {pr.commitMessage}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">
                        Proposed by <strong>{pr.proposerName}</strong> ({pr.proposerRole})
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {pr.status === 'PENDING' && canReviewPRs && (
                      <>
                        <button
                          onClick={() => {
                            setReviewPr(pr);
                            setReviewAction('approve');
                            setReviewComment('Verified accuracy and aligned with exam syllabus. Approved and merged to Question Bank.');
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Approve & Merge</span>
                        </button>
                        <button
                          onClick={() => {
                            setReviewPr(pr);
                            setReviewAction('reject');
                            setReviewComment('');
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold border border-slate-200 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setSelectedPrId(isExpanded ? null : pr.id)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide Details' : 'Review Diff & Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Reviewer / Merged Resolution Details Banner */}
                {pr.reviewedAt && (
                  <div className={`px-5 py-2.5 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
                    pr.status === 'APPROVED'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      {pr.status === 'APPROVED' ? (
                        <GitMerge className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span>
                        Reviewed by <strong>{pr.reviewerName}</strong> ({pr.reviewerRole}) on {new Date(pr.reviewedAt).toLocaleString()}:
                      </span>
                      <span className="italic">"{pr.reviewComment}"</span>
                    </div>
                  </div>
                )}

                {/* Expanded Diff & Question Preview Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-6 bg-slate-50/50 space-y-5 animate-in fade-in-50 duration-150">
                    {/* Client Review & Contributor Payout Card */}
                    {pr.clientReviewInfo?.isClientReview && (
                      <div className="bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center">
                              <Award className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-amber-950">
                                Client Question Review Proposal (Candidate Reviewer)
                              </h4>
                              <p className="text-xs text-amber-800">
                                Category: <strong>{pr.clientReviewInfo.reviewType}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200/80 text-amber-950 border border-amber-300">
                              Honorarium: ৳{pr.clientReviewInfo.rewardAmount || 50} BDT
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white text-slate-700 border border-amber-200">
                              Status: {pr.status === 'APPROVED' ? 'APPROVED FOR PAYOUT' : 'PENDING APPROVAL'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                            <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1">Contributor Details</span>
                            <div className="font-bold text-slate-800">{pr.proposerName}</div>
                            <div className="text-slate-500 text-[11px]">{pr.proposerEmail}</div>
                          </div>

                          <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                            <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1">Mobile / Wallet (bKash/Nagad)</span>
                            <div className="font-bold text-slate-900 font-mono">
                              {pr.clientReviewInfo.contributorPhone || 'Not provided'}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-medium">Eligible for future reward transfers</div>
                          </div>

                          <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60">
                            <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1">Reference Source</span>
                            <div className="text-slate-800 font-medium italic">
                              {pr.clientReviewInfo.referenceSource || 'Candidate verified with official solution'}
                            </div>
                          </div>
                        </div>

                        {pr.clientReviewInfo.reviewReason && (
                          <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs">
                            <span className="font-bold text-amber-950">Reviewer Note / Justification: </span>
                            <span className="text-slate-700">{pr.clientReviewInfo.reviewReason}</span>
                          </div>
                        )}

                        <div className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Upon clicking <strong>Approve & Merge</strong>, the question will be updated in the live Question Bank immediately and visible to all candidates!</span>
                        </div>
                      </div>
                    )}

                    {/* Diff: ADD Action */}
                    {pr.action === 'ADD' && pr.proposedQuestion && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <PlusCircle className="w-4 h-4 text-emerald-600" /> Proposed New Question to Add
                          </h4>
                          <span className="text-[11px] font-mono bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                            Subject: {pr.proposedQuestion.subject} • Topic: {pr.proposedQuestion.topic || 'General'}
                          </span>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                          {/* Question Text */}
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Question Stem (LaTeX / KaTeX)</div>
                            <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                              <MathJaxView text={pr.proposedQuestion.text} />
                            </div>
                          </div>

                          {/* Options */}
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Options & Correct Answer</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {pr.proposedQuestion.options.map((opt, i) => {
                                const isCorrect = pr.proposedQuestion?.correctOptionIndices?.includes(i) ||
                                  pr.proposedQuestion?.correctOptionIndex === i;
                                return (
                                  <div
                                    key={i}
                                    className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                        : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {String.fromCharCode(65 + i)}
                                    </span>
                                    <div className="flex-1">
                                      <MathJaxView text={opt} />
                                    </div>
                                    {isCorrect && (
                                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                        Correct
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Explanation */}
                          {pr.proposedQuestion.explanation && (
                            <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80">
                              <div className="text-[11px] font-bold text-amber-900 uppercase mb-1 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Explanation / Solution
                              </div>
                              <div className="text-xs text-slate-800 leading-relaxed">
                                <MathJaxView text={pr.proposedQuestion.explanation} />
                              </div>
                            </div>
                          )}

                          {/* Metadata Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                            {pr.proposedQuestion.exam && (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                                Exam: {pr.proposedQuestion.exam}
                              </span>
                            )}
                            {pr.proposedQuestion.questionSource && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                                Source: {pr.proposedQuestion.questionSource}
                              </span>
                            )}
                            {pr.proposedQuestion.difficulty && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                                Difficulty: {pr.proposedQuestion.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Diff: UPDATE Action (Before vs After) */}
                    {pr.action === 'UPDATE' && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-blue-600" /> Side-by-Side Diff: Original vs. Proposed Changes
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Original */}
                          <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-4 space-y-3">
                            <div className="text-xs font-bold text-rose-800 uppercase flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Before (Current In Question Bank)
                            </div>
                            {pr.originalQuestion ? (
                              <div className="space-y-2 text-xs">
                                <div className="font-semibold text-slate-900">
                                  <MathJaxView text={pr.originalQuestion.text} />
                                </div>
                                <div className="space-y-1">
                                  {pr.originalQuestion.options.map((opt, i) => (
                                    <div key={i} className="text-slate-600">
                                      {String.fromCharCode(65 + i)}. <MathJaxView text={opt} />
                                    </div>
                                  ))}
                                </div>
                                <div className="text-slate-500 italic mt-2 border-t pt-2 border-rose-200/60">
                                  <MathJaxView text={pr.originalQuestion.explanation || 'No explanation'} />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">Original record not found or was removed.</div>
                            )}
                          </div>

                          {/* Proposed */}
                          <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-4 space-y-3">
                            <div className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> After (Proposed Commit)
                            </div>
                            {pr.proposedQuestion ? (
                              <div className="space-y-2 text-xs">
                                <div className="font-semibold text-slate-900">
                                  <MathJaxView text={pr.proposedQuestion.text} />
                                </div>
                                <div className="space-y-1">
                                  {pr.proposedQuestion.options.map((opt, i) => (
                                    <div key={i} className="text-slate-700 font-medium">
                                      {String.fromCharCode(65 + i)}. <MathJaxView text={opt} />
                                    </div>
                                  ))}
                                </div>
                                <div className="text-emerald-950 font-medium mt-2 border-t pt-2 border-emerald-200/60">
                                  <MathJaxView text={pr.proposedQuestion.explanation || ''} />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">No proposed updates.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Diff: DELETE Action */}
                    {pr.action === 'DELETE' && (
                      <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                        <div className="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                          <Trash2 className="w-4 h-4 text-rose-600" /> Target Question Marked for Deletion from Question Bank
                        </div>
                        <p className="text-xs text-slate-700">
                          Question ID: <code className="bg-white px-1.5 py-0.5 rounded border border-rose-200 font-mono text-[11px]">{pr.targetQuestionId}</code>
                        </p>
                        {pr.originalQuestion && (
                          <div className="bg-white p-3 rounded-lg border border-rose-200 text-xs text-slate-800">
                            <MathJaxView text={pr.originalQuestion.text} />
                          </div>
                        )}
                        <p className="text-xs text-rose-700 font-medium">
                          Approving this PR will permanently remove the question from the Question Bank database.
                        </p>
                      </div>
                    )}

                    {/* Diff: BULK_IMPORT Action */}
                    {pr.action === 'BULK_IMPORT' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Spreadsheet Batch Import ({pr.bulkQuestions?.length || pr.bulkCount || 0} Questions)
                          </h4>
                          <span className="text-xs text-slate-500">
                            Proposer submitted via Excel / CSV Spreadsheet Upload
                          </span>
                        </div>

                        {pr.bulkQuestions && pr.bulkQuestions.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-3 w-10">#</th>
                                  <th className="py-2 px-3">Question Text</th>
                                  <th className="py-2 px-3 w-44">Subject / Topic</th>
                                  <th className="py-2 px-3 w-28">Options</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {pr.bulkQuestions.map((bq, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                    <td className="py-2 px-3 font-medium text-slate-800">
                                      <div className="line-clamp-1">{bq.text}</div>
                                    </td>
                                    <td className="py-2 px-3 text-slate-600">
                                      {bq.subject} {bq.topic ? `• ${bq.topic}` : ''}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                                      {bq.options.length} options
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal Dialog (Approve / Reject) */}
      {reviewPr && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              reviewAction === 'approve'
                ? 'bg-gradient-to-r from-emerald-800 to-teal-900'
                : 'bg-gradient-to-r from-slate-900 to-rose-950'
            }`}>
              <div className="flex items-center gap-2">
                {reviewAction === 'approve' ? (
                  <GitMerge className="w-5 h-5 text-emerald-300" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-300" />
                )}
                <div>
                  <h3 className="font-bold text-base">
                    {reviewAction === 'approve' ? 'Approve & Merge Pull Request' : 'Reject Pull Request'}
                  </h3>
                  <p className="text-[11px] text-slate-200">
                    PR #{reviewPr.prNumber}: {reviewPr.action} proposed by {reviewPr.proposerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewPr(null);
                  setReviewAction(null);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{reviewPr.title}</div>
                <div className="font-mono text-[11px] text-slate-500">{reviewPr.commitMessage}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {reviewAction === 'approve' ? 'Merge / Approval Comments (Optional)' : 'Rejection Reason / Feedback (Required)'}
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    reviewAction === 'approve'
                      ? 'e.g. Verified syllabus alignment and LaTeX math formatting. Merged.'
                      : 'e.g. Explanation formula has sign error in step 2. Please correct and re-submit.'
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              {reviewAction === 'approve' ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    This action will immediately execute the change ({reviewPr.action}) on the live Question Bank. A notification will be dispatched to {reviewPr.proposerName}.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    The proposal will be marked as Rejected. Your comments will be sent as a Moderator notification to guide necessary fixes.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setReviewPr(null);
                    setReviewAction(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={reviewAction === 'approve' ? handleApprove : handleReject}
                  className={`px-5 py-2 text-white rounded-xl font-bold flex items-center gap-1.5 transition ${
                    reviewAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  } disabled:opacity-50`}
                >
                  {submittingReview && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{reviewAction === 'approve' ? 'Confirm & Merge to Bank' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
