import React, { useState, useEffect } from 'react';
import { User, AnalyticsOverview, QuizConfig, QuizAttempt, Question, SplashOffer } from './types';
import {
  fetchCurrentUser,
  fetchAnalytics,
  fetchCategories,
  generateQuiz,
  fetchAttemptDetails,
  fetchQuestions,
  logoutUser,
  fetchSplashOffer,
  getStoredUser,
  sendUserHeartbeat
} from './api';

import { Navbar } from './components/Navbar';
import { DesktopToolbar } from './components/DesktopToolbar';
import { Dashboard } from './components/Dashboard';
import { QuestionBank } from './components/QuestionBank';
import { MistakesNotebook } from './components/MistakesNotebook';
import { BlogPortal } from './components/BlogPortal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { QuizRunner } from './components/QuizRunner';
import { QuizResult } from './components/QuizResult';
import { AuthModal } from './components/AuthModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { MobileDeployGuideModal } from './components/MobileDeployGuideModal';
import { AiQuizGeneratorModal } from './components/AiQuizGeneratorModal';
import { QuestionAuthoringModal } from './components/QuestionAuthoringModal';
import { AdminPortal } from './components/AdminPortal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { PeerChallengeModal } from './components/PeerChallengeModal';
import { ModeratorChatModal } from './components/ModeratorChatModal';
import { SplashScreenOfferModal } from './components/SplashScreenOfferModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ExamPortal } from './components/ExamPortal';
import { Lock, Smartphone, ShieldCheck, BookOpen, GraduationCap, Sparkles, FileText, ClipboardCheck, AlertTriangle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [splashOffer, setSplashOffer] = useState<SplashOffer | null>(null);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bank' | 'mistakes' | 'blog' | 'analytics' | 'admin' | 'exams'>('dashboard');

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState<{
    id: string;
    title: string;
    subject: string;
    mode: 'practice' | 'exam';
    durationMinutes: number;
    negativeMarking: boolean;
    negativeMarkPerWrong: number;
    questions: Question[];
  } | null>(null);

  // Active attempt review state
  const [activeAttemptReview, setActiveAttemptReview] = useState<{
    attempt: QuizAttempt;
    questions: Question[];
  } | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'quiz'; config: QuizConfig }
    | { type: 'quick-quiz'; sub?: string }
    | { type: 'custom-questions'; title: string; questions: Question[] }
    | { type: 'peer-challenge' }
    | { type: 'moderator-chat' }
    | { type: 'ai-gen' }
    | { type: 'add-question' }
    | { type: 'subscription' }
    | null
  >(null);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isPeerChallengeOpen, setIsPeerChallengeOpen] = useState(false);
  const [isModeratorChatOpen, setIsModeratorChatOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<string>('analytics');
  const [pendingNavigationTab, setPendingNavigationTab] = useState<string | null>(null);

  const handleTabNavigation = (tab: string) => {
    if (tab === 'ai-gen') {
      handleOpenAiGenerator();
      return;
    }
    if (activeQuiz) {
      setPendingNavigationTab(tab);
      return;
    }
    proceedWithTabNavigation(tab);
  };

  const proceedWithTabNavigation = (tab: string) => {
    setActiveQuiz(null);
    setActiveAttemptReview(null);

    if (tab.startsWith('admin-') || tab === 'admin' || tab === 'proposals' || tab === 'live-activity') {
      if (tab === 'admin-proposals' || tab === 'proposals') {
        setAdminInitialTab('proposals');
      } else if (tab === 'admin-questions') {
        setAdminInitialTab('questions');
      } else if (tab === 'admin-users') {
        setAdminInitialTab('users');
      } else if (tab === 'admin-activity' || tab === 'live-activity') {
        setAdminInitialTab('live-activity');
      } else if (tab === 'admin-importer') {
        setAdminInitialTab('importer');
      } else if (tab === 'admin-moderation') {
        setAdminInitialTab('moderation');
      } else if (tab === 'admin-security') {
        setAdminInitialTab('security');
      }
      setActiveTab('admin');
    } else {
      setActiveTab(tab as any);
    }
  };

  const loadUserData = async () => {
    try {
      const u = await fetchCurrentUser();
      setUser(u);
      const a = await fetchAnalytics();
      setAnalytics(a);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCategories = async () => {
    try {
      const cat = await fetchCategories();
      setSubjects(cat.subjects);
    } catch (e) {
      console.error(e);
    }
  };

  // Check URL route parameters or hash for staff / admin route
  const checkIsAdminRoute = () => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    return (
      host.startsWith('admin.') ||
      host.startsWith('staff.') ||
      search.includes('subdomain=admin') ||
      search.includes('portal=admin') ||
      search.includes('gateway=staff') ||
      search.includes('secret=admin') ||
      path.startsWith('/admin') ||
      path.startsWith('/staff') ||
      path.startsWith('/secret-portal') ||
      hash === '#admin' ||
      hash === '#admin-console' ||
      hash === '#staff-gateway' ||
      hash === '#admin-login'
    );
  };

  useEffect(() => {
    loadUserData();
    loadCategories();
    fetchSplashOffer().then(setSplashOffer).catch(() => {});

    const handleRouteCheck = () => {
      if (checkIsAdminRoute()) {
        const storedUser = localStorage.getItem('proshno_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(parsed.role)) {
              setActiveTab('admin');
              return;
            }
          } catch (e) {}
        }
        setIsAdminLoginOpen(true);
      }
    };

    handleRouteCheck();

    // Listen for hash changes in URL
    window.addEventListener('hashchange', handleRouteCheck);

    // Secret keybinding for staff access (Ctrl + Shift + A or Cmd + Shift + A)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminLoginOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleRouteCheck);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Periodic User Presence & Activity Heartbeat
  useEffect(() => {
    if (!user) return;

    const computeActivityDescription = () => {
      if (activeQuiz) {
        return `Taking ${activeQuiz.examType || 'Mock'} Exam (${activeQuiz.subject})`;
      }
      if (activeAttemptReview) {
        return `Reviewing Exam Solution & Analysis`;
      }
      if (activeTab === 'admin') {
        if (user.role !== 'CLIENT') {
          return `${user.role} on Admin Portal (${adminInitialTab || 'overview'})`;
        }
        return `Browsing Admin Portal`;
      }
      if (activeTab === 'bank') {
        return `Studying Master Question Bank`;
      }
      if (activeTab === 'mistakes') {
        return `Practicing Mistake Review Notebook`;
      }
      if (activeTab === 'blog') {
        return `Reading BCS Study Guides & Articles`;
      }
      if (activeTab === 'analytics') {
        return `Reviewing Personal Performance Analytics`;
      }
      return `Active on Dashboard (${user.targetExam || 'BCS'})`;
    };

    const sendHeartbeat = () => {
      sendUserHeartbeat(computeActivityDescription()).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 45000);
    return () => clearInterval(interval);
  }, [user, activeQuiz, activeAttemptReview, activeTab, adminInitialTab]);

  const executePendingAction = (authenticatedUser: User) => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setAuthReason(null);

    if (action.type === 'quiz') {
      handleStartQuiz(action.config, authenticatedUser);
    } else if (action.type === 'quick-quiz') {
      handleStartQuickQuiz(action.sub, authenticatedUser);
    } else if (action.type === 'custom-questions') {
      handleStartQuizWithQuestions(action.title, action.questions, authenticatedUser);
    } else if (action.type === 'peer-challenge') {
      setIsPeerChallengeOpen(true);
    } else if (action.type === 'moderator-chat') {
      setIsModeratorChatOpen(true);
    } else if (action.type === 'ai-gen') {
      setIsAiModalOpen(true);
    } else if (action.type === 'add-question') {
      setIsAddQuestionOpen(true);
    } else if (action.type === 'subscription') {
      setIsSubscriptionOpen(true);
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    loadUserData();
    executePendingAction(updatedUser);
  };

  const handleStaffAuthenticated = (staffUser: User) => {
    setUser(staffUser);
    setActiveTab('admin');
    loadUserData();
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setAnalytics(null);
    setActiveTab('dashboard');
    setActiveQuiz(null);
    setActiveAttemptReview(null);
    setPendingAction(null);
    setAuthReason(null);
  };

  const handleStartQuiz = async (config: QuizConfig, activeUser?: User) => {
    const currentUser = activeUser || user;
    if (!currentUser) {
      setAuthReason('Please sign in or create an account to start this quiz. Your results, score breakdown, and merit rank will be saved.');
      setPendingAction({ type: 'quiz', config });
      setIsAuthOpen(true);
      return;
    }
    try {
      const generated = await generateQuiz(config);
      setActiveAttemptReview(null);
      setActiveQuiz(generated);
    } catch (err: any) {
      alert(err.message || 'Could not generate quiz for selected filters.');
    }
  };

  const handleFinishQuiz = (attempt: QuizAttempt) => {
    setActiveQuiz(null);
    handleReviewAttempt(attempt.id);
    loadUserData(); // refresh stats
  };

  const handleReviewAttempt = async (attemptId: string) => {
    try {
      const details = await fetchAttemptDetails(attemptId);
      setActiveQuiz(null);
      setActiveAttemptReview(details);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartQuickQuiz = async (selectedSub?: string, activeUser?: User) => {
    const currentUser = activeUser || user;
    if (!currentUser) {
      setAuthReason('Please sign in or create an account to start this quick test.');
      setPendingAction({ type: 'quick-quiz', sub: selectedSub });
      setIsAuthOpen(true);
      return;
    }
    const targetSub = selectedSub || subjects[0] || 'General Science';
    handleStartQuiz({
      title: `${targetSub} Quick Test`,
      subject: targetSub,
      questionCount: 5,
      durationMinutes: 5,
      mode: 'practice',
      negativeMarking: true,
      negativeMarkPerWrong: 0.25
    }, currentUser);
  };

  const handleStartQuizWithQuestions = (title: string, questions: Question[], activeUser?: User) => {
    const currentUser = activeUser || user;
    if (!currentUser) {
      setAuthReason('Please sign in or create an account to start this revision quiz.');
      setPendingAction({ type: 'custom-questions', title, questions });
      setIsAuthOpen(true);
      return;
    }
    if (!questions || questions.length === 0) return;
    setActiveAttemptReview(null);
    setActiveQuiz({
      id: 'mistakes_revision_' + Date.now(),
      title,
      subject: questions[0]?.subject || 'Revision',
      mode: 'practice',
      durationMinutes: Math.max(5, questions.length * 2),
      negativeMarking: false,
      negativeMarkPerWrong: 0,
      questions
    });
  };

  const handleOpenPeerChallenge = () => {
    if (!user) {
      setAuthReason('Please sign in or create an account to enter 1v1 live competitive duels.');
      setPendingAction({ type: 'peer-challenge' });
      setIsAuthOpen(true);
      return;
    }
    setIsPeerChallengeOpen(true);
  };

  const handleOpenModeratorChat = () => {
    if (!user) {
      setAuthReason('Please sign in or create an account to message moderators and teachers.');
      setPendingAction({ type: 'moderator-chat' });
      setIsAuthOpen(true);
      return;
    }
    setIsModeratorChatOpen(true);
  };

  const handleOpenAiGenerator = () => {
    if (!user) {
      setAuthReason('Please sign in or create an account to generate custom AI exams.');
      setPendingAction({ type: 'ai-gen' });
      setIsAuthOpen(true);
      return;
    }
    setIsAiModalOpen(true);
  };

  const handleOpenAddQuestion = () => {
    if (!user) {
      setAuthReason('Please sign in or create an account to contribute new exam questions.');
      setPendingAction({ type: 'add-question' });
      setIsAuthOpen(true);
      return;
    }
    setIsAddQuestionOpen(true);
  };

  const handleOpenSubscription = () => {
    if (!user) {
      setAuthReason('Please sign in or create an account to access unlimited practice benefits.');
      setPendingAction({ type: 'subscription' });
      setIsAuthOpen(true);
      return;
    }
    setIsSubscriptionOpen(true);
  };

  const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(user.role);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-teal-600 selection:text-white flex flex-col">
      
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleTabNavigation}
        onOpenAuth={() => {
          setAuthReason(null);
          setPendingAction(null);
          setIsAuthOpen(true);
        }}
        onOpenAddQuestion={handleOpenAddQuestion}
        onStartQuickQuiz={() => handleStartQuickQuiz()}
        onOpenSubscription={handleOpenSubscription}
        onOpenPeerChallenge={handleOpenPeerChallenge}
        onOpenModeratorChat={handleOpenModeratorChat}
        onLogout={handleLogout}
      />

      {/* Desktop Secondary Toolbar (under navbar) */}
      {!activeQuiz && (
        <DesktopToolbar
          user={user}
          activeTab={activeTab}
          subjects={subjects}
          onSelectSubject={(sub) => handleStartQuickQuiz(sub)}
          onStartQuickQuiz={() => handleStartQuickQuiz()}
          onOpenQuestionBank={() => {
            setActiveQuiz(null);
            setActiveAttemptReview(null);
            setActiveTab('bank');
          }}
          onOpenAiGenerator={handleOpenAiGenerator}
          onOpenPeerChallenge={handleOpenPeerChallenge}
          onOpenSubscription={handleOpenSubscription}
          onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
          onOpenSupport={handleOpenModeratorChat}
        />
      )}

      {/* Main Container View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeQuiz ? (
          <QuizRunner
            quiz={activeQuiz}
            onFinishQuiz={handleFinishQuiz}
            onCancelQuiz={() => setActiveQuiz(null)}
          />
        ) : activeAttemptReview ? (
          <QuizResult
            attempt={activeAttemptReview.attempt}
            questions={activeAttemptReview.questions}
            onBackToDashboard={() => {
              setActiveAttemptReview(null);
              setActiveTab('dashboard');
            }}
            onRetakeQuiz={() => {
              setActiveAttemptReview(null);
              handleStartQuickQuiz();
            }}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                user={user}
                analytics={analytics}
                subjects={subjects}
                onStartQuiz={handleStartQuiz}
                onNavigateTab={(tab) => {
                  setActiveQuiz(null);
                  setActiveAttemptReview(null);
                  setActiveTab(tab);
                }}
                onReviewAttempt={handleReviewAttempt}
                onOpenAuth={(reason) => {
                  setAuthReason(reason || 'Please log in to continue.');
                  setIsAuthOpen(true);
                }}
              />
            )}

            {activeTab === 'exams' && (
              <ExamPortal
                currentUser={user}
                onOpenAuth={(reason) => {
                  setAuthReason(reason || 'Please log in to take competitive exams.');
                  setIsAuthOpen(true);
                }}
                onStartExamQuiz={(title, questions, durationMinutes, negMarks) => {
                  setActiveQuiz({
                    id: 'exam-' + Date.now(),
                    title,
                    questions,
                    mode: 'timed',
                    durationMinutes: durationMinutes || 60,
                    negativeMarking: true,
                    negativeMarkPerWrong: negMarks ?? 0.5
                  });
                }}
                onNavigateToAdmin={() => {
                  setActiveTab('admin');
                }}
              />
            )}

            {activeTab === 'bank' && (
              <QuestionBank
                currentUser={user}
                onOpenAuth={(reason) => {
                  setAuthReason(reason || 'Please log in to continue.');
                  setIsAuthOpen(true);
                }}
                onStartQuizWithQuestions={(qs) => {
                  handleStartQuizWithQuestions('Question Bank Practice Test', qs);
                }}
              />
            )}

            {activeTab === 'mistakes' && (
              <MistakesNotebook
                onStartQuizWithQuestions={handleStartQuizWithQuestions}
                isLoggedIn={!!user}
                onOpenAuth={(reason) => {
                  setAuthReason(reason || 'Please log in to access your personal mistakes notebook and revision quizzes.');
                  setIsAuthOpen(true);
                }}
              />
            )}

            {activeTab === 'blog' && (
              <BlogPortal
                currentUser={user}
                onOpenAuth={(reason) => {
                  setAuthReason(reason || 'Please log in to bookmark articles or participate in discussions.');
                  setIsAuthOpen(true);
                }}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                overview={analytics}
                onReviewAttempt={handleReviewAttempt}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPortal
                currentUser={user}
                initialTab={adminInitialTab}
                onOpenQuestionAuthoring={() => setIsAddQuestionOpen(true)}
                onOpenAiGenerator={() => setIsAiModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer: Restructured into Two Main Rows */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
          
          {/* Main Row 1: Special Link & Feature Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-850">
            {/* Left: Brand Identity & Exam Focus */}
            <div className="text-center lg:text-left space-y-1 max-w-md">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                  PROSHNOSIDDHI BD
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  প্রশ্নসিদ্ধি
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Smart BCS, Bank, Primary & Govt Job Competitive Exam Question Bank & Interactive Testing Platform.
              </p>
            </div>

            {/* Right: Special Features Navigation Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 text-xs">
              <button
                onClick={() => { setActiveTab('exams'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exams (পরীক্ষা)</span>
              </button>

              <button
                onClick={() => { setActiveTab('bank'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Question Bank</span>
              </button>

              <button
                onClick={() => { setActiveTab('mistakes'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>Mistakes Notebook</span>
              </button>

              <button
                onClick={() => { setActiveTab('blog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Editorial Blog</span>
              </button>

              <button
                onClick={() => setIsAiModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Custom Quiz</span>
              </button>

              <button
                onClick={() => setIsMobileGuideOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/50 hover:border-indigo-600 transition flex items-center gap-1.5 font-semibold shadow-2xs cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mobile App Guide</span>
              </button>
            </div>
          </div>

          {/* Main Row 2: Copyright & Developer Information */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            {/* Copyright Info */}
            <div className="text-center sm:text-left text-slate-500 text-[11px] sm:text-xs">
              <p>
                © {new Date().getFullYear()} <span className="font-semibold text-slate-300">PROSHNOSIDDHI BD (প্রশ্নসিদ্ধি)</span>. All rights reserved.
              </p>
              <p className="text-slate-600 text-[10px] mt-0.5">
                Empowering Bangladesh BCS, Bank & Govt Job Aspirants with High-Yield Practice & Analytics.
              </p>
            </div>

            {/* Developer Information with Facebook Profile Badge */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 bg-slate-900/90 py-2 px-4 rounded-2xl border border-slate-800/90 shadow-2xs">
              <span className="text-slate-400 font-medium text-[11px] sm:text-xs">Designed & Developed by</span>
              <span className="font-bold text-white text-[11px] sm:text-xs tracking-wide">Engineer Md. Rony Ahmmod</span>
              <a
                href="https://www.facebook.com/rony.ahmmod.9"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-200 border border-indigo-700/60 transition-all text-[11px] font-semibold active:scale-95 shadow-2xs"
                title="Connect with Engineer Md. Rony Ahmmod on Facebook"
              >
                <svg className="w-3 h-3 fill-current text-indigo-400" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook Profile ↗</span>
              </a>
            </div>
          </div>

        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthReason(null);
          setPendingAction(null);
        }}
        currentUser={user}
        onUserUpdate={handleUserUpdate}
        reason={authReason}
        onSuccessCallback={(authenticatedUser) => {
          executePendingAction(authenticatedUser);
        }}
        onSwitchToAdmin={() => {
          setIsAuthOpen(false);
          setAuthReason(null);
          setIsAdminLoginOpen(true);
        }}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onStaffAuthenticated={handleStaffAuthenticated}
      />

      <MobileDeployGuideModal
        isOpen={isMobileGuideOpen}
        onClose={() => setIsMobileGuideOpen(false)}
      />

      <AiQuizGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        subjects={subjects}
        onStartGeneratedQuiz={(config) => {
          setIsAiModalOpen(false);
          handleStartQuiz(config);
        }}
      />

      <QuestionAuthoringModal
        isOpen={isAddQuestionOpen}
        onClose={() => setIsAddQuestionOpen(false)}
        subjects={subjects}
        currentUser={user}
        onQuestionAdded={() => {
          loadCategories();
          loadUserData();
        }}
      />

      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        currentUser={user}
        onUserUpgraded={handleUserUpdate}
      />

      <PeerChallengeModal
        isOpen={isPeerChallengeOpen}
        onClose={() => setIsPeerChallengeOpen(false)}
        currentUser={user}
        onStartQuiz={(questions, title) => {
          setActiveQuiz({
            id: `chal-quiz-${Date.now()}`,
            title,
            subject: 'General Science',
            mode: 'exam',
            durationMinutes: 10,
            negativeMarking: true,
            negativeMarkPerWrong: 0.25,
            questions
          });
        }}
      />

      <ModeratorChatModal
        isOpen={isModeratorChatOpen}
        onClose={() => setIsModeratorChatOpen(false)}
        currentUser={user}
      />

      {/* Progressive Web App Network Status Indicator */}
      <OfflineIndicator />

      {/* Booting Screen Ad & Offer Popup Modal */}
      <SplashScreenOfferModal
        offer={splashOffer}
        onNavigateTab={(tab) => {
          if (tab === 'subscription') {
            handleOpenSubscription();
          } else if (['dashboard', 'bank', 'mistakes', 'blog', 'analytics', 'admin'].includes(tab)) {
            setActiveTab(tab as any);
          }
        }}
      />

      {/* Accidental Navigation Warning Modal during Exam/Quiz */}
      {pendingNavigationTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0A2540]">
                  পরীক্ষা চলাকালীন প্রস্থান সতর্কতা
                </h3>
                <p className="text-xs font-medium text-rose-600">Active Test In Progress</p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 text-xs text-[#0A2540] space-y-1.5">
              <p className="font-semibold text-rose-800">
                আপনি কি নিশ্চিতভাবে এই পরীক্ষা থেকে বের হয়ে অন্য পেজে যেতে চান?
              </p>
              <p className="text-[#6F8498] leading-relaxed">
                বের হয়ে গেলে আপনার চলমান পরীক্ষা ও দেওয়া উত্তরের অগ্রগতি বাতিল হয়ে যেতে পারে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingNavigationTab(null)}
                className="px-4 py-2.5 bg-[#1F54E7] hover:bg-[#1742be] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                পরীক্ষায় থাকুন (Continue Test)
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingNavigationTab;
                  setPendingNavigationTab(null);
                  proceedWithTabNavigation(target);
                }}
                className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
              >
                বের হয়ে যান (Exit Test)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
