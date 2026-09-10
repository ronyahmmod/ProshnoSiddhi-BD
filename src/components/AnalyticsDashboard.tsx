import React, { useState } from 'react';
import { AnalyticsOverview, QuizAttempt } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  Brain,
  AlertTriangle,
  Award,
  History,
  Eye,
  Sparkles
} from 'lucide-react';

interface AnalyticsDashboardProps {
  overview: AnalyticsOverview | null;
  onReviewAttempt: (attemptId: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  overview,
  onReviewAttempt
}) => {
  const [historySearch, setHistorySearch] = useState('');

  if (!overview) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Loading performance analytics...
      </div>
    );
  }

  const filteredAttempts = (overview.recentAttempts || []).filter(
    (a) =>
      a.quizTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
      a.subject.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A2540] via-[#113860] to-[#1F54E7] rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#1F54E7]/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#8BC1E3]" />
            Performance Analytics & Mastery Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1">
            Track your accuracy trends over time, subject strengths, speed metrics, and historical test logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 bg-white/10 text-[#8BC1E3] text-xs font-bold rounded-xl border border-[#8BC1E3]/30">
            {overview.overallAccuracy}% Overall Accuracy
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9EC] shadow-xs">
          <span className="text-xs font-semibold text-[#6F8498] uppercase">Total Tests</span>
          <p className="text-2xl font-black text-[#0A2540] mt-1">{overview.totalQuizzesTaken}</p>
          <p className="text-[11px] text-[#6F8498] mt-0.5">{overview.totalQuestionsAttempted} Questions Solved</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E9EC] shadow-xs">
          <span className="text-xs font-semibold text-[#6F8498] uppercase">Average Accuracy</span>
          <p className="text-2xl font-black text-[#36C18E] mt-1">{overview.overallAccuracy}%</p>
          <p className="text-[11px] text-[#0A2540] font-bold mt-0.5">Target: &gt; 80%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E9EC] shadow-xs">
          <span className="text-xs font-semibold text-[#6F8498] uppercase">Solving Speed</span>
          <p className="text-2xl font-black text-[#0A2540] mt-1">{overview.averageSpeedSeconds}s</p>
          <p className="text-[11px] text-[#6F8498] mt-0.5">Average time per question</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E9EC] shadow-xs">
          <span className="text-xs font-semibold text-[#6F8498] uppercase">Practice Streak</span>
          <p className="text-2xl font-black text-[#1F54E7] mt-1">{overview.currentStreakDays} Days</p>
          <p className="text-[11px] text-[#6F8498] font-medium mt-0.5">Daily activity maintained</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Accuracy Trend Line Chart */}
        <div className="bg-white rounded-2xl border border-[#E5E9EC] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#0A2540] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1F54E7]" />
            Accuracy & Score Trend
          </h2>

          <div className="h-64 w-full">
            {overview.accuracyHistory && overview.accuracyHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.accuracyHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9EC" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6F8498' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6F8498' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A2540',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy %"
                    stroke="#36C18E"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#36C18E' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Score %"
                    stroke="#1F54E7"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#6F8498] text-xs">
                Take more quizzes to view timeline charts!
              </div>
            )}
          </div>
        </div>

        {/* Subject Mastery Bar Chart */}
        <div className="bg-white rounded-2xl border border-[#E5E9EC] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#0A2540] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1F54E7]" />
            Subject Accuracy Breakdown
          </h2>

          <div className="h-64 w-full">
            {overview.subjectPerformances && overview.subjectPerformances.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.subjectPerformances}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9EC" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6F8498' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6F8498' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A2540',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="accuracyPercentage" name="Accuracy %" fill="#1F54E7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#6F8498] text-xs">
                No subject stats recorded yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Strong vs Weak Area Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Strong Subjects */}
        <div className="bg-[#36C18E]/10 rounded-2xl border border-[#36C18E]/30 p-6 space-y-3">
          <h3 className="font-bold text-[#0A2540] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#36C18E]" />
            Top Stronghold Subjects (&gt; 70% Accuracy)
          </h3>
          <p className="text-xs text-[#6F8498]">
            You excel in these areas! Maintain speed and target difficult level practice questions here.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {overview.strongSubjects.map((sub) => (
              <span
                key={sub}
                className="px-3 py-1 bg-white border border-[#36C18E]/40 text-[#0A2540] font-bold text-xs rounded-xl shadow-2xs"
              >
                {sub}
              </span>
            ))}
          </div>
        </div>

        {/* Weak Subjects */}
        <div className="bg-[#8BC1E3]/15 rounded-2xl border border-[#8BC1E3]/40 p-6 space-y-3">
          <h3 className="font-bold text-[#0A2540] text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#1F54E7]" />
            Priority Focus Subjects (&lt; 70% Accuracy)
          </h3>
          <p className="text-xs text-[#6F8498]">
            Recommended focus for your upcoming daily practice sessions to boost overall score.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {overview.weakSubjects.map((sub) => (
              <span
                key={sub}
                className="px-3 py-1 bg-white border border-[#8BC1E3]/60 text-[#0A2540] font-bold text-xs rounded-xl shadow-2xs"
              >
                {sub}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Historical Attempt Log Table */}
      <div className="bg-white rounded-2xl border border-[#E5E9EC] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[#0A2540] flex items-center gap-2">
            <History className="w-5 h-5 text-[#1F54E7]" />
            Historical Test Attempts Log
          </h2>

          <input
            type="text"
            placeholder="Filter test history..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F54E7] w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E5E9EC] text-[#6F8498] font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Test Title</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Accuracy</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9EC] font-medium">
              {filteredAttempts.map((att) => (
                <tr key={att.id} className="hover:bg-[#F6F8FB] transition-colors">
                  <td className="py-3 px-3 font-bold text-[#0A2540]">{att.quizTitle}</td>
                  <td className="py-3 px-3 text-[#6F8498]">{att.subject}</td>
                  <td className="py-3 px-3 font-bold text-[#0A2540]">
                    {att.totalScore} / {att.maxScore}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#36C18E]">{att.accuracyPercentage}%</td>
                  <td className="py-3 px-3 text-[#6F8498]">{Math.round(att.durationSeconds / 60)} min</td>
                  <td className="py-3 px-3 text-[#6F8498]">{new Date(att.completedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onReviewAttempt(att.id)}
                      className="px-2.5 py-1 bg-[#F6F8FB] hover:bg-[#8BC1E3]/30 text-[#1F54E7] text-[11px] font-bold rounded-lg border border-[#E5E9EC] transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
