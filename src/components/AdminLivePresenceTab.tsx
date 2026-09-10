import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Smartphone,
  Monitor,
  GitPullRequest,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Award,
  Sparkles,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { LiveUserStatus, ModeratorWorkSummary, User } from '../types';
import { fetchLiveUsers, fetchModeratorWorkSummaries } from '../api';

interface AdminLivePresenceTabProps {
  currentUser: User | null;
  onNavigateToProposals?: () => void;
}

export const AdminLivePresenceTab: React.FC<AdminLivePresenceTabProps> = ({
  currentUser,
  onNavigateToProposals
}) => {
  const [subView, setSubView] = useState<'live-users' | 'moderator-dossier'>('live-users');
  const [liveUsers, setLiveUsers] = useState<LiveUserStatus[]>([]);
  const [moderators, setModerators] = useState<ModeratorWorkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ONLINE' | 'STAFF' | 'CLIENT'>('ALL');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [usersData, modsData] = await Promise.all([
        fetchLiveUsers(),
        fetchModeratorWorkSummaries()
      ]);
      setLiveUsers(usersData || []);
      setModerators(modsData || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load live activity data', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-poll every 15 seconds for live real-time feel
    const interval = setInterval(() => {
      loadData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const onlineUsersCount = liveUsers.filter(u => u.isOnline).length;
  const onlineStaffCount = liveUsers.filter(u => u.isOnline && u.role !== 'CLIENT').length;

  const filteredUsers = liveUsers.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.targetExam && u.targetExam.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.currentActivity && u.currentActivity.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (roleFilter === 'ONLINE') return u.isOnline;
    if (roleFilter === 'STAFF') return u.role !== 'CLIENT';
    if (roleFilter === 'CLIENT') return u.role === 'CLIENT';

    return true;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">Super Admin</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Admin</span>;
      case 'MODERATOR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">Moderator</span>;
      case 'EDITOR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Editor</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">Candidate</span>;
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    const diffSeconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSeconds < 20) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner & Metric Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Live Active Users & Moderator Work Monitor
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Real-time presence tracking, active exam session monitoring, and comprehensive work dossiers for moderators and editors.
            </p>
          </div>

          {/* Quick Refresh & Timestamp */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="text-right text-[11px] text-slate-400 hidden sm:block">
              <div>Auto-refresh active</div>
              <div>Updated {formatRelativeTime(lastRefreshed.toISOString())}</div>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh Now'}</span>
            </button>
          </div>
        </div>

        {/* Live Counter Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">{onlineUsersCount}</div>
              <div className="text-[11px] text-emerald-300 font-semibold">Online Users Now</div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">{onlineStaffCount}</div>
              <div className="text-[11px] text-indigo-300 font-semibold">Staff & Mods Active</div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {moderators.reduce((acc, m) => acc + m.pendingPrsCount, 0)}
              </div>
              <div className="text-[11px] text-amber-300 font-semibold">Pending PRs in Review</div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-white">
                {moderators.reduce((acc, m) => acc + m.approvedPrsCount, 0)}
              </div>
              <div className="text-[11px] text-purple-300 font-semibold">Merged Mod Commits</div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub-view Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSubView('live-users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              subView === 'live-users'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Live Logged-In Users ({liveUsers.length})</span>
            {onlineUsersCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setSubView('moderator-dossier')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              subView === 'moderator-dossier'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>Moderator Work Dossier ({moderators.length})</span>
          </button>
        </div>

        {/* View specific filter / search */}
        {subView === 'live-users' && (
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, exam, activity..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e: any) => setRoleFilter(e.target.value)}
              className="p-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
            >
              <option value="ALL">All Roles</option>
              <option value="ONLINE">Online Now</option>
              <option value="STAFF">Staff Only</option>
              <option value="CLIENT">Candidates Only</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: LIVE USERS GRID / TABLE */}
      {subView === 'live-users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                Active User Sessions & Presence ({filteredUsers.length} listed)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Green indicator reflects real-time heartbeat within last 4 minutes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">User & Identity</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Current Live Activity</th>
                  <th className="py-3 px-3">Target Exam</th>
                  <th className="py-3 px-3">Merit XP</th>
                  <th className="py-3 px-4 text-right">Device / Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No active users found matching your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-indigo-50/30 transition ${
                        u.isOnline ? 'bg-emerald-50/10' : ''
                      }`}
                    >
                      {/* Avatar & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                            {u.isOnline ? (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                            ) : (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-300 ring-2 ring-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {currentUser?.id === u.id && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-3">{getRoleBadge(u.role)}</td>

                      {/* Online Status */}
                      <td className="py-3 px-3">
                        {u.isOnline ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Online</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeTime(u.lastActiveAt)}</span>
                          </div>
                        )}
                      </td>

                      {/* Current Activity */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          {u.currentActivity ? (
                            <span className="bg-slate-100 px-2 py-1 rounded-lg text-slate-800 text-[11px] font-medium border border-slate-200/60">
                              {u.currentActivity}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Idle / Browsing</span>
                          )}
                        </div>
                      </td>

                      {/* Target Exam */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">
                          {u.targetExam || 'General BCS'}
                        </span>
                      </td>

                      {/* Merit XP */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-indigo-600 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{u.xp || 0}</span>
                        </div>
                      </td>

                      {/* Device info */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] text-slate-500 font-mono flex items-center justify-end gap-1">
                          {u.deviceInfo?.toLowerCase().includes('mobile') || u.deviceInfo?.toLowerCase().includes('android') ? (
                            <Smartphone className="w-3 h-3 text-slate-400" />
                          ) : (
                            <Monitor className="w-3 h-3 text-slate-400" />
                          )}
                          <span className="truncate max-w-[130px]">{u.deviceInfo || 'Web Browser'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MODERATOR WORK DOSSIER */}
      {subView === 'moderator-dossier' && (
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Moderator Oversight Dashboard:</strong> Transparently tracks question authoring, pull requests, direct bank updates, and candidate inquiries resolved by each staff member.
              </span>
            </div>
            {onNavigateToProposals && (
              <button
                onClick={onNavigateToProposals}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 flex items-center gap-1 transition"
              >
                <span>Review Commits & PRs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {moderators.map((mod) => (
              <div
                key={mod.userId}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-indigo-300 transition"
              >
                {/* Staff Profile Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm shrink-0">
                      <img
                        src={mod.avatar}
                        alt={mod.name}
                        className="w-full h-full object-cover"
                      />
                      {mod.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{mod.name}</h4>
                        {getRoleBadge(mod.role)}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{mod.email}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${mod.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span>{mod.isOnline ? 'Active on Portal' : `Last active ${formatRelativeTime(mod.lastActiveAt)}`}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 truncate max-w-[180px]">{mod.currentActivity}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantitative Contribution Stats Matrix */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                    <div className="text-base font-black text-slate-900">{mod.totalPrsSubmitted}</div>
                    <div className="text-[10px] font-semibold text-slate-500">Total PRs</div>
                  </div>

                  <div className="bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-100">
                    <div className="text-base font-black text-emerald-700">{mod.approvedPrsCount}</div>
                    <div className="text-[10px] font-semibold text-emerald-700">Approved</div>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl text-center border border-amber-100">
                    <div className="text-base font-black text-amber-700">{mod.pendingPrsCount}</div>
                    <div className="text-[10px] font-semibold text-amber-700">Pending Review</div>
                  </div>

                  <div className="bg-indigo-50 p-2.5 rounded-xl text-center border border-indigo-100">
                    <div className="text-base font-black text-indigo-700">{mod.bulkImportsCount}</div>
                    <div className="text-[10px] font-semibold text-indigo-700">Bulk Imports</div>
                  </div>

                  <div className="bg-purple-50 p-2.5 rounded-xl text-center border border-purple-100">
                    <div className="text-base font-black text-purple-700">{mod.directQuestionsAdded}</div>
                    <div className="text-[10px] font-semibold text-purple-700">Authored MCQs</div>
                  </div>

                  <div className="bg-blue-50 p-2.5 rounded-xl text-center border border-blue-100">
                    <div className="text-base font-black text-blue-700">{mod.directQuestionsUpdated}</div>
                    <div className="text-[10px] font-semibold text-blue-700">Edits & Fixes</div>
                  </div>

                  <div className="bg-teal-50 p-2.5 rounded-xl text-center border border-teal-100 col-span-2">
                    <div className="text-base font-black text-teal-700">{mod.inquiriesResolvedCount}</div>
                    <div className="text-[10px] font-semibold text-teal-700">Student Inquiries Solved</div>
                  </div>
                </div>

                {/* Recent Actions & Commit Timeline */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Recent Activity & Commit Log</span>
                    <span className="text-[10px] lowercase text-slate-400">audit verified</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {mod.recentActions.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2 text-center">
                        No recent actions logged for this staff member.
                      </div>
                    ) : (
                      mod.recentActions.map((act) => (
                        <div
                          key={act.id}
                          className="text-xs p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition flex items-start justify-between gap-2 border border-slate-100"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              {act.description}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span className="font-mono text-slate-500">{act.actionType}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(act.timestamp)}</span>
                            </div>
                          </div>

                          {act.status && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                                act.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : act.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {act.status}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
