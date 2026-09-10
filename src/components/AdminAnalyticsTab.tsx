import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  RefreshCw,
  GitPullRequest,
  Sparkles,
  BarChart3,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Search,
  Filter,
  Layers,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { AdminAnalyticsOverview } from '../types';
import { fetchAdminAnalytics } from '../api';

export const AdminAnalyticsTab: React.FC = () => {
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTopic, setSearchTopic] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAnalytics();
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load administrative analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading Platform Intelligence & Analytics...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating system-wide student attempts and question health</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Error loading administrative analytics</span>
        </div>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          onClick={loadData}
          className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const totalQuestions = data.totalQuestions || 0;
  const questionsWithExplanation = data.questionsWithExplanation || 0;
  const questionsMissingExplanation = data.questionsMissingExplanation ?? data.questionsWithoutExplanation ?? 0;
  const avgAccuracy = data.platformAverageScore ?? data.averageStudentAccuracy ?? 0;
  const totalQuizzes = data.totalQuizzesTaken ?? data.totalAttemptsLogged ?? 0;
  const questionsBySubject = data.questionsBySubject || [];
  const challengingTopics = data.mostChallengingTopics || data.topicDifficultyInsights || [];
  const recentAttempts = data.recentAttemptsList || data.recentAttempts || [];

  const explanationCoveragePct = totalQuestions > 0
    ? Math.round((questionsWithExplanation / totalQuestions) * 100)
    : 0;

  const filteredTopics = challengingTopics.filter(t =>
    (t.topic || '').toLowerCase().includes(searchTopic.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(searchTopic.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin Intelligence Console</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            System-Wide Platform Analytics & Health
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Real-time telemetry across registered candidates, staff governance, question explanation completeness, and student error distribution.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition self-start md:self-auto shrink-0 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Candidate Base</p>
            <p className="text-2xl font-extrabold text-slate-900">{data.totalStudents ?? 0}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              +{data.totalStaff ?? 0} staff & moderators ({data.totalUsers ?? 0} total)
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Question Bank</p>
            <p className="text-2xl font-extrabold text-slate-900">{totalQuestions}</p>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
              Across {questionsBySubject.length} active subjects
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className={`p-3 rounded-2xl border ${
            explanationCoveragePct >= 80
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Explanation Coverage</p>
            <p className="text-2xl font-extrabold text-slate-900">{explanationCoveragePct}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {questionsWithExplanation} covered / {questionsMissingExplanation} pending
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Student Score</p>
            <p className="text-2xl font-extrabold text-slate-900">{avgAccuracy}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              From {totalQuizzes} total student tests
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Row: Subject Inventory Breakdown + Explanations Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subject Inventory Distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Question Bank Distribution by Subject
            </h3>
            <span className="text-xs font-bold text-slate-400">
              Total {totalQuestions} Questions
            </span>
          </div>

          <div className="space-y-3">
            {questionsBySubject.map((item) => {
              const pct = totalQuestions > 0 ? Math.round((item.count / totalQuestions) * 100) : 0;
              return (
                <div key={item.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{item.subject}</span>
                    <span className="font-semibold text-slate-500">{item.count} qs ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Quality & Explanations Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Explanations & AI Readiness
            </h3>
            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800">Has Verified Explanation</p>
                  <p className="text-[11px] text-emerald-600">LaTeX, MathJax or detailed note</p>
                </div>
                <span className="text-xl font-extrabold text-emerald-700">{questionsWithExplanation}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-800">Missing Explanation</p>
                  <p className="text-[11px] text-amber-600">Needs AI authoring or review</p>
                </div>
                <span className="text-xl font-extrabold text-amber-700">{questionsMissingExplanation}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Pending Commits / PRs</p>
                  <p className="text-[11px] text-slate-500">Moderator proposals awaiting review</p>
                </div>
                <span className="text-xl font-extrabold text-slate-700">{data.pendingPullRequests ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Use the <strong>Question Bank Manager</strong> to batch generate or polish explanations with Gemini AI in one click.
            </p>
          </div>
        </div>
      </div>

      {/* Most Challenging Topics Across Candidates */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Challenging Topics Across All Candidates (Highest Error Rates)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identify syllabus weak spots across candidates to guide model test design and explanation quality.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter topics or subjects..."
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <th className="py-2.5 px-3">Topic</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Total Answered</th>
                <th className="py-2.5 px-3">Candidate Error Rate</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTopics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No topic error data matching filter
                  </td>
                </tr>
              ) : (
                filteredTopics.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">{item.topic}</td>
                    <td className="py-3 px-3 text-slate-600">{item.subject}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{item.totalAttempts ?? item.totalAnswered ?? 0} questions</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-rose-600">{item.errorRate}%</span>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-rose-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, item.errorRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.errorRate >= 60
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.errorRate >= 60 ? 'Critical Need' : 'Moderate Difficulty'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Student Quiz Submissions Live Feed */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Recent Candidate Test Submissions (Audit Log)
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Latest attempts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <th className="py-2.5 px-3">Candidate</th>
                <th className="py-2.5 px-3">Quiz / Test Title</th>
                <th className="py-2.5 px-3">Score</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAttempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No student quiz submissions logged yet.
                  </td>
                </tr>
              ) : (
                recentAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">{attempt.userName}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{attempt.subject || attempt.quizTitle || 'Model Test'}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {attempt.score} / {attempt.total}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        attempt.accuracy >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : attempt.accuracy >= 50
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {attempt.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(attempt.completedAt || attempt.createdAt || Date.now()).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
