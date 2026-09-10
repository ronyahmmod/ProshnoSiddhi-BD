import React from 'react';
import { User } from '../types';
import {
  Zap,
  BookOpen,
  Sparkles,
  Swords,
  Crown,
  Smartphone,
  Headphones,
  ShieldCheck,
  Flame,
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface DesktopToolbarProps {
  user: User | null;
  activeTab: string;
  subjects: string[];
  onSelectSubject: (subject: string) => void;
  onStartQuickQuiz: () => void;
  onOpenQuestionBank: () => void;
  onOpenAiGenerator: () => void;
  onOpenPeerChallenge: () => void;
  onOpenSubscription: () => void;
  onOpenMobileGuide: () => void;
  onOpenSupport: () => void;
}

export const DesktopToolbar: React.FC<DesktopToolbarProps> = ({
  user,
  activeTab,
  subjects,
  onSelectSubject,
  onStartQuickQuiz,
  onOpenQuestionBank,
  onOpenAiGenerator,
  onOpenPeerChallenge,
  onOpenSubscription,
  onOpenMobileGuide,
  onOpenSupport
}) => {
  const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(user.role);

  const featuredSubjects = [
    'General Science',
    'Bangladesh Affairs',
    'English',
    'Mathematics',
    'ICT',
    'International Affairs'
  ];

  return (
    <div className="hidden md:block bg-slate-50/90 text-slate-800 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-2">
        <div className="flex items-center justify-between gap-2.5 lg:gap-4">
          
          {/* Left: Quick Subject Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            <span className="text-[10px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">Explore:</span>
            </span>

            <button
              onClick={onOpenQuestionBank}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 transition shrink-0 flex items-center gap-1.5"
            >
              <BookOpen className="w-3 h-3 text-indigo-600" />
              <span className="hidden xl:inline">All BCS Papers (10th-46th)</span>
              <span className="xl:hidden">All BCS Papers</span>
            </button>

            {featuredSubjects.map((sub, idx) => (
              <button
                key={sub}
                onClick={() => onSelectSubject(sub)}
                className={`px-3 py-1 rounded-xl text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shrink-0 shadow-2xs ${
                  idx > 3 ? 'hidden 2xl:block' : ''
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Right: Quick Action Buttons & Shortcuts */}
          <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
            <button
              onClick={onOpenPeerChallenge}
              className="flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-200/80 transition shrink-0"
              title="1v1 Real-time Peer Quiz duel"
            >
              <Swords className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden lg:inline">1v1 Battle</span>
              <span className="lg:hidden">1v1</span>
            </button>

            <button
              onClick={onOpenMobileGuide}
              className="flex items-center gap-1 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-bold rounded-xl border border-sky-200/80 transition shrink-0"
              title="Mobile App Download & Build Instructions"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden xl:inline">Mobile App</span>
              <span className="xl:hidden">App</span>
            </button>

            <button
              onClick={onOpenSupport}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-xl border border-indigo-200/80 transition shrink-0"
              title="Live Student Support Desk"
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">Support</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
