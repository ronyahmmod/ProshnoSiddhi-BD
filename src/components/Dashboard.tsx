import React from 'react';
import { User, AnalyticsOverview, QuizConfig } from '../types';
import {
  Sparkles,
  Flame,
  Award,
  Play,
  CheckCircle2,
  Clock,
  Zap,
  BarChart2,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Brain,
  ChevronRight,
  ShieldAlert,
  Target,
  Lock,
  UserCheck,
  Edit3,
  Check,
  X
} from 'lucide-react';

interface DashboardProps {
  user: User | null;
  analytics: AnalyticsOverview | null;
  subjects: string[];
  onStartQuiz: (config: QuizConfig) => void;
  onNavigateTab: (tab: 'dashboard' | 'bank' | 'mistakes' | 'blog' | 'analytics' | 'admin' | 'exams') => void;
  onReviewAttempt: (attemptId: string) => void;
  onOpenAuth?: (reason?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  analytics,
  subjects,
  onStartQuiz,
  onNavigateTab,
  onReviewAttempt,
  onOpenAuth
}) => {
  const [selectedSubject, setSelectedSubject] = React.useState<string>(subjects[0] || 'General Science');
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<'Easy' | 'Medium' | 'Hard' | 'All'>('All');
  const [questionCount, setQuestionCount] = React.useState<number>(5);

  const handleLaunchCustomQuiz = (mode: 'practice' | 'exam') => {
    onStartQuiz({
      title: `${selectedSubject} ${mode === 'exam' ? 'Model Test' : 'Practice Sprint'}`,
      subject: selectedSubject,
      difficulty: selectedDifficulty,
      questionCount,
      durationMinutes: mode === 'exam' ? Math.max(3, Math.ceil(questionCount * 1.2)) : 10,
      mode,
      negativeMarking: mode === 'exam',
      negativeMarkPerWrong: 0.25
    });
  };

  const [customWelcomeText, setCustomWelcomeText] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('proshno_welcome_text') || 
        'Elevate your preparation for BCS, Bank, Primary & Govt Competitive Exams. Take full-length model tests, revise flagged questions in your personal notebook, or master subject-wise questions with step-by-step verified explanations.';
    }
    return 'Elevate your preparation for BCS, Bank, Primary & Govt Competitive Exams. Take full-length model tests, revise flagged questions in your personal notebook, or master subject-wise questions with step-by-step verified explanations.';
  });
  const [isEditingWelcome, setIsEditingWelcome] = React.useState(false);
  const [tempWelcomeText, setTempWelcomeText] = React.useState(customWelcomeText);

  const handleSaveWelcomeText = () => {
    const trimmed = tempWelcomeText.trim();
    if (trimmed) {
      setCustomWelcomeText(trimmed);
      localStorage.setItem('proshno_welcome_text', trimmed);
    }
    setIsEditingWelcome(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-12 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Target: {user?.targetExam || '46th BCS & Govt Competitive Exams'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempWelcomeText(customWelcomeText);
                  setIsEditingWelcome(!isEditingWelcome);
                }}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
                title="Customize welcome text to your own words"
              >
                <Edit3 className="w-3 h-3 text-indigo-300" />
                <span>{isEditingWelcome ? 'Cancel Edit' : 'Edit Text'}</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-amber-200">{user?.name || 'Aspirant'}</span> 👋
            </h1>

            {isEditingWelcome ? (
              <div className="space-y-2 pt-1 max-w-xl">
                <textarea
                  value={tempWelcomeText}
                  onChange={(e) => setTempWelcomeText(e.target.value)}
                  rows={3}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-800/90 border border-indigo-400/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
                  placeholder="Enter your custom welcome text in Bengali or English..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveWelcomeText}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Custom Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultText = 'Elevate your preparation for BCS, Bank, Primary & Govt Competitive Exams. Take full-length model tests, revise flagged questions in your personal notebook, or master subject-wise questions with step-by-step verified explanations.';
                      setTempWelcomeText(defaultText);
                      setCustomWelcomeText(defaultText);
                      localStorage.setItem('proshno_welcome_text', defaultText);
                      setIsEditingWelcome(false);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                {customWelcomeText}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onNavigateTab('exams')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
              >
                <Target className="w-4 h-4" />
                <span>Take Live Exam (পরীক্ষা দিন)</span>
              </button>
              {!user && (
                <button
                  onClick={() => onOpenAuth?.('Please sign in or create an account to start taking quizzes and tracking merit ranks.')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition active:scale-95"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-inner">
            <div className="text-center px-3.5 border-r border-white/15">
              <div className="flex items-center justify-center gap-1.5 text-amber-400 font-extrabold text-xl">
                <Flame className="w-5 h-5 fill-amber-400" />
                <span>{user ? `${analytics?.currentStreakDays || user?.streakDays || 1}d` : '0d'}</span>
              </div>
              <span className="text-[10px] text-slate-300 uppercase font-semibold">Streak</span>
            </div>

            <div className="text-center px-3.5">
              <div className="flex items-center justify-center gap-1.5 text-indigo-300 font-extrabold text-xl">
                <Award className="w-5 h-5 text-indigo-300" />
                <span>{user ? (user.xp || 0) : '—'}</span>
              </div>
              <span className="text-[10px] text-slate-300 uppercase font-semibold">Merit Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-indigo-300 transition-all group">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Solved</p>
            <p className="text-2xl font-extrabold text-slate-900">{user ? (analytics?.totalQuestionsAttempted || 0) : '0'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{user ? `${analytics?.totalQuizzesTaken || 0} Quizzes Completed` : 'Sign in to record'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition-all group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Accuracy</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {user && analytics && analytics.totalQuestionsAttempted > 0 ? `${analytics.overallAccuracy}%` : '—'}
            </p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{user ? 'Personalized Accuracy' : 'Recorded after quiz'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-amber-300 transition-all group">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Speed / Q</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {user && analytics && analytics.averageSpeedSeconds > 0 ? `${analytics.averageSpeedSeconds}s` : '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{user ? 'Target: < 60s per question' : 'Recorded on practice'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-violet-300 transition-all group">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100 group-hover:scale-105 transition-transform">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Subject</p>
            <p className="text-base font-extrabold text-slate-900 truncate max-w-[140px]">
              {user && analytics?.strongSubjects?.[0] ? analytics.strongSubjects[0] : '—'}
            </p>
            <p className="text-[11px] text-violet-600 font-bold mt-0.5">{user ? 'Strongest Topic Area' : 'Identified with tests'}</p>
          </div>
        </div>
      </div>

      {/* Quick Quiz Launcher Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                <Play className="w-4 h-4 fill-current" />
              </div>
              Take Model Test / Quick Quiz
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure topic, difficulty and mode to launch an interactive test immediately.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateTab('mistakes')}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 rounded-xl transition-colors"
            >
              <span>Revise Missed Questions</span>
            </button>
            <button
              onClick={() => onNavigateTab('bank')}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 rounded-xl transition-colors"
            >
              <span>Explore Question Bank</span>
            </button>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Number of Questions</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            >
              <option value={3}>3 Questions (Express Sprint)</option>
              <option value={5}>5 Questions (Standard)</option>
              <option value={10}>10 Questions (Full Test)</option>
            </select>
          </div>
        </div>

        {/* Launch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              if (!user) {
                onOpenAuth?.('Please sign in or create an account to take custom practice tests.');
                return;
              }
              handleLaunchCustomQuiz('practice');
            }}
            className="p-5 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 transition-all text-left group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                Practice Mode
              </span>
              {!user ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Sign In Required
                </span>
              ) : (
                <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
              )}
            </div>
            <h3 className="font-bold text-slate-900 mt-2.5">Instant Solution Feedback</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Relaxed timer with immediate step-by-step explanations and formulas after answering.</p>
          </button>

          <button
            onClick={() => {
              if (!user) {
                onOpenAuth?.('Please sign in or create an account to take timed competitive model tests.');
                return;
              }
              handleLaunchCustomQuiz('exam');
            }}
            className="p-5 rounded-2xl bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 transition-all text-left group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                Timed Model Test
              </span>
              {!user ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Sign In Required
                </span>
              ) : (
                <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition-transform" />
              )}
            </div>
            <h3 className="font-bold text-slate-900 mt-2.5">Strict Exam Simulation</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">Strict countdown, negative marking (-0.25 penalty per wrong answer), and final rank scorecard.</p>
          </button>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Subject Mastery Progress (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Subject Proficiency Breakdown
            </h2>
            <button
              onClick={() => onNavigateTab('bank')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              Browse All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {analytics?.subjectPerformances && analytics.subjectPerformances.length > 0 ? (
              analytics.subjectPerformances.map((sp) => (
                <div key={sp.subject} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 hover:border-indigo-200 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900">{sp.subject}</span>
                      <span className="text-xs text-slate-500 ml-2">({sp.totalQuestionsAttempted} questions solved)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          sp.masteryLevel === 'Master'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : sp.masteryLevel === 'Proficient'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {sp.masteryLevel}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">{sp.accuracyPercentage}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, sp.accuracyPercentage))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No quiz activity recorded yet. Take a quiz to populate subject proficiency!
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Sidebar (1 col) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Recent Quiz History
            </h2>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Full Stats
            </button>
          </div>

          <div className="space-y-3">
            {analytics?.recentAttempts && analytics.recentAttempts.length > 0 ? (
              analytics.recentAttempts.map((att) => (
                <div
                  key={att.id}
                  onClick={() => onReviewAttempt(att.id)}
                  className="p-3.5 bg-slate-50/80 hover:bg-indigo-50/60 rounded-2xl border border-slate-200/80 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate max-w-[170px]">{att.quizTitle}</span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {att.accuracyPercentage}% Acc
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Score: <strong className="text-slate-900">{att.totalScore}/{att.maxScore}</strong>
                    </span>
                    <span>{new Date(att.completedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                No recent attempts found.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
