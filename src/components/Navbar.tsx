import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Flame,
  Award,
  UserCheck,
  LogOut,
  Play,
  RotateCcw,
  Newspaper,
  Crown,
  Swords,
  MessageSquare,
  ShieldCheck,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Target,
  Sparkles,
  CheckCircle2,
  Zap,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { NotificationsDropdown } from './NotificationsDropdown';
import { useNetworkSpeed } from '../hooks/useNetworkSpeed';

interface NavbarProps {
  user: User | null;
  activeTab: 'dashboard' | 'bank' | 'mistakes' | 'blog' | 'analytics' | 'admin' | 'exams';
  setActiveTab: (tab: 'dashboard' | 'bank' | 'mistakes' | 'blog' | 'analytics' | 'admin' | 'exams') => void;
  onOpenAuth: () => void;
  onOpenAddQuestion: () => void;
  onStartQuickQuiz: () => void;
  onOpenSubscription?: () => void;
  onOpenPeerChallenge: () => void;
  onOpenModeratorChat: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenAddQuestion,
  onStartQuickQuiz,
  onOpenSubscription,
  onOpenPeerChallenge,
  onOpenModeratorChat,
  onLogout
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { isFastConnection, speedTier } = useNetworkSpeed();
  const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(user.role);

  const checkNavScroll = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      navScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkNavScroll();
    window.addEventListener('resize', checkNavScroll);
    return () => window.removeEventListener('resize', checkNavScroll);
  }, [activeTab]);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        {/* Main Navbar Top Row */}
        <div className="flex items-center justify-between h-15 sm:h-16 gap-2">
          
          {/* Distinct Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0 group" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-50 shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg xl:text-xl tracking-tight text-slate-900">
                  PROSHNOSIDDHI
                </span>
                <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  BD
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="hidden md:block text-[11px] text-slate-500 font-medium">Smart Exam Prep & Question Bank</p>
                {isFastConnection && (
                  <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    <Zap className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                    <span>Fast 4G</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons, PWA Install, Notifications & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* PWA Install Button */}
            <PWAInstallButton compact />

            {/* Official Notifications & SMS Center Dropdown */}
            <NotificationsDropdown
              currentUser={user}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              isFastConnection={isFastConnection}
            />

            {/* Desktop Take Quiz button */}
            <button
              onClick={onStartQuickQuiz}
              className={`hidden sm:flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm shadow-indigo-500/20 transition-all shrink-0 active:scale-98 ${
                isFastConnection ? 'hover:shadow-md duration-150' : ''
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Take Quiz</span>
            </button>

            {/* LOGGED IN USER PROFILE WITH DROPDOWN */}
            {user ? (
              <div className="relative shrink-0" ref={profileDropdownRef}>
                <button
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 sm:gap-2 p-1 sm:px-3 sm:py-1.5 rounded-2xl border transition-all ${
                    isProfileOpen
                      ? 'bg-slate-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300'
                  }`}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  title="My Profile & Settings"
                >
                  <div className="relative shrink-0 w-8 h-8">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-2xs aspect-square">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  <div className="hidden lg:flex flex-col items-start text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs max-w-[110px] truncate">
                        {user.name}
                      </span>
                      {user.isSubscribed && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                          PRO
                        </span>
                      )}
                      {isStaff && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-black bg-indigo-100 text-indigo-700 uppercase">
                          STAFF
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600">
                      {user.xp || 0} Merit Score
                    </span>
                  </div>

                  <div className="text-slate-400 ml-0.5">
                    {isProfileOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Professional User Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* User Profile Header Card */}
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-4.5 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full shrink-0 aspect-square overflow-hidden border-2 border-white/30 shadow-md">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover aspect-square shrink-0 block"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm sm:text-base text-white truncate">
                              {user.name}
                            </h4>
                            {user.isSubscribed && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase shrink-0">
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 truncate">{user.email}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-200">
                            <Target className="w-3 h-3 text-indigo-300 shrink-0" />
                            <span className="truncate">{user.targetExam || '46th BCS Preliminary'}</span>
                          </div>
                        </div>
                      </div>

                      {/* User Stats Ribbon */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
                        <div className="bg-white/10 rounded-2xl p-2">
                          <span className="text-[10px] text-slate-300 uppercase font-semibold">Daily Streak</span>
                          <p className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {user.streakDays || 1} Days
                          </p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-2">
                          <span className="text-[10px] text-slate-300 uppercase font-semibold">Merit Score</span>
                          <p className="text-xs font-black text-indigo-200 flex items-center justify-center gap-1">
                            <Award className="w-3.5 h-3.5 text-indigo-300" />
                            {user.xp || 0} Pts
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Navigation & Professional Items */}
                    <div className="p-2.5 space-y-1 max-h-[60vh] overflow-y-auto">
                      
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Study & Performance
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('dashboard');
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          activeTab === 'dashboard'
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="flex-1">Dashboard & Practice Hub</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('bank');
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          activeTab === 'bank'
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="flex-1">Question Bank & PYQs</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('mistakes');
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          activeTab === 'mistakes'
                            ? 'bg-rose-50 text-rose-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="flex-1">Mistakes Revision Notebook</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('analytics');
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          activeTab === 'analytics'
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="flex-1">Performance Analytics & History</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('blog');
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          activeTab === 'blog'
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Newspaper className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="flex-1">Job Circulars & Study Blog</span>
                      </button>

                      <div className="pt-2 border-t border-slate-100 my-1" />

                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Interactive & Community
                      </div>

                      <button
                        onClick={() => {
                          onOpenPeerChallenge();
                          setIsProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Swords className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="flex-1">1v1 Live Exam Battle</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                          Duel
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          onOpenModeratorChat();
                          setIsProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="flex-1">Community & Mentor Chat</span>
                      </button>

                      {/* Staff & Authoring Section */}
                      {isStaff && (
                        <>
                          <div className="pt-2 border-t border-slate-100 my-1" />
                          <div className="px-3 py-1 text-[10px] font-bold uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Staff Management
                          </div>

                          <button
                            onClick={() => {
                              setActiveTab('admin');
                              setIsProfileOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                              activeTab === 'admin'
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="flex-1">Admin Portal & Moderation</span>
                          </button>

                          <button
                            onClick={() => {
                              onOpenAddQuestion();
                              setIsProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="flex-1">Author / Upload Question</span>
                          </button>
                        </>
                      )}

                      {/* LOGOUT BUTTON INSIDE MENU */}
                      <div className="pt-2 border-t border-slate-100 my-1" />

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="flex-1">Sign Out / Logout</span>
                      </button>

                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* DEDICATED RESPONSIVE PILL ICONS NAVIGATION ROW */}
        <div className="border-t border-slate-100/90 bg-slate-50/70 py-1.5 px-0.5 sm:px-1 -mx-3 sm:-mx-4 lg:-mx-6 xl:-mx-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 flex items-center gap-1.5 relative">
            {/* Scroll Left Pagination Arrow */}
            {canScrollLeft && (
              <button
                onClick={() => scrollNav('left')}
                className="hidden sm:flex items-center justify-center w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-2xs transition shrink-0 z-10 active:scale-95"
                title="Previous pills"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Scrollable Nav Pills Container */}
            <nav
              ref={navScrollRef}
              onScroll={checkNavScroll}
              className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none scroll-smooth flex-1 py-0.5"
            >
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
                } ${isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('bank')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === 'bank'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
                } ${isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Question Bank</span>
              </button>

              <button
                onClick={() => setActiveTab('exams')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === 'exams'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 border border-slate-200/70'
                } ${isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''}`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exams (পরীক্ষা)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                  Live
                </span>
              </button>

              <button
                onClick={() => setActiveTab('mistakes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === 'mistakes'
                    ? 'bg-rose-500 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50/60 border border-slate-200/70'
                } ${isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''}`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span>Mistakes</span>
              </button>

              <button
                onClick={() => setActiveTab('blog')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === 'blog'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 border border-slate-200/70'
                } ${isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''}`}
              >
                <Newspaper className="w-3.5 h-3.5 text-indigo-500" />
                <span>Blog & Articles</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                  New
                </span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
                } ${isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button
                onClick={onOpenPeerChallenge}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-white text-amber-700 hover:bg-amber-50 border border-amber-200/70 transition-all shrink-0 shadow-2xs ${
                  isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''
                }`}
              >
                <Swords className="w-3.5 h-3.5 text-amber-600" />
                <span>1v1 Challenge</span>
              </button>

              <button
                onClick={onOpenModeratorChat}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200/70 transition-all shrink-0 shadow-2xs ${
                  isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ask Moderator</span>
              </button>

              {isStaff && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    activeTab === 'admin'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 font-bold'
                  } ${isFastConnection ? 'hover:-translate-y-0.5 duration-150' : ''}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin Portal</span>
                </button>
              )}
            </nav>

            {/* Scroll Right Pagination Arrow */}
            {canScrollRight && (
              <button
                onClick={() => scrollNav('right')}
                className="hidden sm:flex items-center justify-center w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-2xs transition shrink-0 z-10 active:scale-95"
                title="More pills"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Mobile Action Row (Fits Take Quiz and Sign In smoothly on its own row without horizontal overflow) */}
        <div className="sm:hidden flex items-center gap-2 pb-2.5 pt-1 border-t border-slate-100">
          <button
            onClick={onStartQuickQuiz}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Take Quiz</span>
          </button>

          {!user ? (
            <button
              onClick={onOpenAuth}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 active:bg-slate-200 text-slate-900 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sign In</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-2 py-1.5 text-xs shadow-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'dashboard' ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'exams' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 mb-0.5 text-emerald-600" />
          <span className="text-[10px]">Exams</span>
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'bank' ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Bank</span>
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'mistakes' ? 'text-rose-600 font-bold bg-rose-50' : 'text-slate-500'
          }`}
        >
          <RotateCcw className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Mistakes</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors ${
            activeTab === 'analytics' ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Stats</span>
        </button>
      </div>
    </header>
  );
};

