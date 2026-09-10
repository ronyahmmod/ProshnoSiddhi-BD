import React, { useState, useEffect } from 'react';
import { ExamCategory, Question, User, ScheduledExam } from '../types';
import {
  fetchExams,
  fetchExamQuestions,
  createExam,
  updateExamQuestions,
  fetchQuestions,
  scheduleExam,
  fetchScheduledExams,
  cancelScheduledExam
} from '../api';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  PlusCircle,
  Search,
  BookOpen,
  Filter,
  CheckSquare,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Info,
  X,
  Loader2,
  Settings2,
  ChevronRight,
  Bell,
  Trash2,
  Users,
  Flame,
  CalendarCheck
} from 'lucide-react';

interface ExamPortalProps {
  currentUser: User | null;
  onOpenAuth: (reason?: string) => void;
  onStartExamQuiz: (examTitle: string, questions: Question[], durationMinutes?: number, negativeMarking?: number) => void;
  onNavigateToAdmin?: () => void;
}

export const ExamPortal: React.FC<ExamPortalProps> = ({
  currentUser,
  onOpenAuth,
  onStartExamQuiz,
  onNavigateToAdmin
}) => {
  const [exams, setExams] = useState<ExamCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Scheduled Exams & Reminders state
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [schedulingExam, setSchedulingExam] = useState<ExamCategory | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleAlertMsg, setScheduleAlertMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Setting Questions Modal / Drawer
  const [activeExamForSetting, setActiveExamForSetting] = useState<ExamCategory | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [settingSuccessMsg, setSettingSuccessMsg] = useState<string | null>(null);

  // New Exam Modal
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamCategory, setNewExamCategory] = useState<'BCS' | 'BANK' | 'GRE' | 'PRIMARY' | 'NTRCA' | 'OTHER'>('BCS');
  const [newExamYear, setNewExamYear] = useState(new Date().getFullYear());
  const [newExamQuestions, setNewExamQuestions] = useState(100);
  const [newExamMarks, setNewExamMarks] = useState(100);
  const [newExamDuration, setNewExamDuration] = useState(60);
  const [newExamNegMarks, setNewExamNegMarks] = useState(0.5);
  const [newExamInstructions, setNewExamInstructions] = useState('প্রতিটি ভুল উত্তরের জন্য ০.৫০ নম্বর কাটা যাবে। কোনো ক্যালকুলেটর বা ইলেকট্রনিক ডিভাইস নিষিদ্ধ।');
  const [savingNewExam, setSavingNewExam] = useState(false);

  // Loading state when user starts an exam
  const [startingExamId, setStartingExamId] = useState<string | null>(null);

  const isStaff = currentUser && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(currentUser.role);

  const loadExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExams();
      setExams(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load exams.');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledExams = async () => {
    if (!currentUser) return;
    try {
      const list = await fetchScheduledExams();
      setScheduledExams(list);
    } catch (e) {
      console.warn('Could not load scheduled exams:', e);
    }
  };

  useEffect(() => {
    loadExams();
    loadScheduledExams();
  }, [currentUser]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const handleOpenScheduleModal = (exam: ExamCategory) => {
    if (!currentUser) {
      onOpenAuth('Please sign in to schedule an exam reminder.');
      return;
    }
    setSchedulingExam(exam);
    // Pre-fill with tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setScheduleDate(dateStr);
    setScheduleTime('10:00');
    setScheduleNotes('');
    setScheduleAlertMsg(null);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingExam || !scheduleDate || !scheduleTime) return;
    if (!currentUser) {
      onOpenAuth('Please sign in to schedule an exam reminder.');
      return;
    }

    const scheduledIso = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    setSubmittingSchedule(true);
    setScheduleAlertMsg(null);
    try {
      const res = await scheduleExam(
        schedulingExam.id,
        schedulingExam.name,
        scheduledIso,
        schedulingExam.durationMinutes || 60,
        scheduleNotes
      );
      setScheduledExams((prev) => [res.scheduled, ...prev]);
      setScheduleAlertMsg({
        type: 'success',
        message: 'পরীক্ষা সফলভাবে শিডিউল করা হয়েছে! নির্দিষ্ট সময়ে আপনার প্যানেলে নোটিফিকেশন অ্যালার্ট দেওয়া হবে।'
      });
      setTimeout(() => {
        setSchedulingExam(null);
        setScheduleDate('');
        setScheduleTime('');
        setScheduleNotes('');
        setScheduleAlertMsg(null);
      }, 1600);
    } catch (err: any) {
      setScheduleAlertMsg({
        type: 'error',
        message: err.message || 'Failed to schedule exam.'
      });
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled exam session?')) return;
    try {
      await cancelScheduledExam(id);
      setScheduledExams((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    }
  };

  const handleStartExam = async (exam: ExamCategory) => {
    if (!currentUser) {
      onOpenAuth('Please sign in to take this live competitive exam and track your model test score.');
      return;
    }

    setStartingExamId(exam.id);
    try {
      // 1. Fetch exam assigned questions
      let examQuestions: Question[] = [];
      try {
        const res = await fetchExamQuestions(exam.id);
        if (res.questions && res.questions.length > 0) {
          examQuestions = res.questions;
        }
      } catch (err) {
        console.warn('Exam questions fetch fallback:', err);
      }

      // 2. Fallback if no questions are assigned yet: fetch questions by exam category or general
      if (examQuestions.length === 0) {
        const bankData = await fetchQuestions({
          exam: exam.category || undefined
        });
        examQuestions = bankData.slice(0, exam.totalQuestions || 50);
      }

      if (examQuestions.length === 0) {
        // Last fallback: general questions
        const fallbackData = await fetchQuestions();
        examQuestions = fallbackData.slice(0, exam.totalQuestions || 30);
      }

      if (examQuestions.length === 0) {
        alert('No questions are currently configured for this exam. Please contact an instructor or admin.');
        return;
      }

      const duration = exam.durationMinutes || 60;
      const negMark = exam.negativeMarksPerWrong ?? 0.5;

      onStartExamQuiz(exam.name, examQuestions, duration, negMark);
    } catch (err: any) {
      alert('Could not start exam: ' + (err.message || 'Unknown error'));
    } finally {
      setStartingExamId(null);
    }
  };

  const handleOpenQuestionSetter = async (exam: ExamCategory) => {
    setActiveExamForSetting(exam);
    setSelectedQuestionIds(exam.questionIds || []);
    setSettingSuccessMsg(null);
    setLoadingQuestions(true);

    try {
      const data = await fetchQuestions();
      setAllQuestions(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleToggleQuestionSelection = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleSaveAssignedQuestions = async () => {
    if (!activeExamForSetting) return;
    setSavingQuestions(true);
    setSettingSuccessMsg(null);

    try {
      await updateExamQuestions(activeExamForSetting.id, selectedQuestionIds);
      setSettingSuccessMsg(`Successfully linked ${selectedQuestionIds.length} questions to ${activeExamForSetting.name}!`);
      // Update local exams state
      setExams((prev) =>
        prev.map((e) =>
          e.id === activeExamForSetting.id
            ? { ...e, questionIds: selectedQuestionIds, totalQuestions: selectedQuestionIds.length || e.totalQuestions }
            : e
        )
      );
      setTimeout(() => {
        setActiveExamForSetting(null);
      }, 1500);
    } catch (err: any) {
      alert('Failed to save questions: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingQuestions(false);
    }
  };

  const handleCreateNewExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) return;

    setSavingNewExam(true);
    try {
      const created = await createExam({
        name: newExamName.trim(),
        category: newExamCategory,
        year: Number(newExamYear),
        totalQuestions: Number(newExamQuestions),
        totalMarks: Number(newExamMarks),
        durationMinutes: Number(newExamDuration),
        negativeMarksPerWrong: Number(newExamNegMarks),
        instructions: newExamInstructions.trim(),
        isLive: true
      });

      setExams((prev) => [created, ...prev]);
      setIsCreatingExam(false);
      setNewExamName('');
      alert(`Exam "${created.name}" has been successfully created! You can now set questions for it.`);
    } catch (err: any) {
      alert('Failed to create exam: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingNewExam(false);
    }
  };

  const categories = ['ALL', 'BCS', 'BANK', 'PRIMARY', 'NTRCA', 'GRE', 'OTHER'];

  const filteredExams = exams.filter((exam) => {
    const matchCat = selectedCategory === 'ALL' || exam.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.year && exam.year.toString().includes(searchQuery));
    return matchCat && matchSearch;
  });

  const totalFilteredExams = filteredExams.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredExams / pageSize));
  const paginatedExams = filteredExams.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Marketing Aggregate Statistics
  const totalMarketingTakers = exams.reduce((acc, x) => acc + (x.candidatesAttendedCount || 34200), 0);
  const totalActiveLiveTakers = exams.reduce((acc, x) => acc + (x.activeTakersCount || 94), 0);

  return (
    <div id="exam-portal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <Award className="w-4 h-4" /> Live Exam & Model Test Hall
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              পরীক্ষা প্যানেল (Exam Panel)
            </h1>
            <p className="text-slate-600 text-sm max-w-2xl">
              বাছাইকৃত বিসিএস প্রিলিমিনারি, ব্যাংক অফিসার ও সরকারি চাকরির পূর্ণাঙ্গ মডেল টেস্টে অংশগ্রহণ করুন। তাৎক্ষণিক সময় নির্ধারণ (Schedule) এবং লাইভ স্কোরিং সুবিধা।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-my-scheduled-exams"
              onClick={() => setShowScheduledModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-xs hover:bg-emerald-100 transition shadow-xs"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>আমার নির্ধারিত পরীক্ষা</span>
              {scheduledExams.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                  {scheduledExams.length}
                </span>
              )}
            </button>

            {isStaff && (
              <button
                id="btn-create-exam"
                onClick={() => setIsCreatingExam(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>নতুন পরীক্ষা তৈরি করুন (Create Exam)</span>
              </button>
            )}
          </div>
        </div>

        {/* Marketing Social Proof Metrics Banner */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>মোট অংশগ্রহণকারী</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {(totalMarketingTakers || 142000).toLocaleString('en-US')}+
            </div>
            <div className="text-[10px] text-slate-500 font-medium">সফলভাবে মডেল টেস্ট সম্পন্ন</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>লাইভ পরীক্ষা দিচ্ছেন</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              {(totalActiveLiveTakers || 240).toLocaleString('en-US')} জন
            </div>
            <div className="text-[10px] text-slate-500 font-medium">এখন লাইভ হলে সক্রিয়</div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>গড় সন্তুষ্টি রেটিং</span>
            </div>
            <div className="text-lg font-black text-amber-600 mt-1">
              ★ ৪.৯ / ৫.০
            </div>
            <div className="text-[10px] text-slate-500 font-medium">হাজারো পরীক্ষার্থীর রিভিউ</div>
          </div>

          <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-purple-800 text-xs font-bold">
              <Bell className="w-3.5 h-3.5 text-purple-600" />
              <span>শিডিউল রিমাইন্ডার</span>
            </div>
            <div className="text-lg font-black text-purple-900 mt-1">
              {scheduledExams.length > 0 ? `${scheduledExams.length} টি নির্ধারিত` : 'সক্রিয় অ্যালার্ট'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">নির্দিষ্ট সময়ে প্যানেল নোটিফিকেশন</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {cat === 'ALL' ? 'সকল পরীক্ষা (All)' : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search exam title, year, code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading live examination hall...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadExams}
            className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Exam Grid */}
      {!loading && !error && filteredExams.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">কোনো পরীক্ষা পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            এই ক্যাটাগরি বা অনুসন্ধানে কোনো পরীক্ষা পাওয়া যায়নি। অনুগ্রহ করে অন্য ক্যাটাগরি বেছে নিন অথবা ফিল্টার ক্লিয়ার করুন।
          </p>
        </div>
      )}

      {!loading && !error && filteredExams.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedExams.map((exam) => {
              const isStarting = startingExamId === exam.id;
              const attendedDisplay = (exam.candidatesAttendedCount || 34200).toLocaleString('en-US');
              const liveTakersDisplay = exam.activeTakersCount || 94;
              const ratingDisplay = exam.rating || 4.9;

              return (
                <div
                  key={exam.id}
                  id={`exam-card-${exam.id}`}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-lg transition flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Category & Status badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                        {exam.category || 'EXAM'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live & Ready
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition">
                        {exam.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {exam.instructions || exam.description || 'মানসম্মত প্রশ্নমালা নিয়ে সময়ভিত্তিক মডেল টেস্ট। সঠিক আত্মমূল্যায়নের জন্য প্রস্তুত হন।'}
                      </p>
                    </div>

                    {/* Marketing Candidates Proof */}
                    <div className="p-3 bg-gradient-to-r from-emerald-50/90 to-teal-50/60 rounded-2xl border border-emerald-200/80 flex items-center justify-between gap-3 text-xs shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 leading-tight">
                            <span className="text-emerald-700 font-extrabold">{attendedDisplay}+</span> পরীক্ষার্থী
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <span className="text-amber-500 font-black">★ {ratingDisplay}</span>
                            <span className="text-slate-300">•</span>
                            <span>মডেল টেস্টে সম্পন্ন</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 bg-white border border-emerald-200/80 px-2.5 py-1 rounded-full shadow-2xs shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        <span>{liveTakersDisplay} লাইভ</span>
                      </div>
                    </div>

                    {/* Exam Attributes Box */}
                    <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">প্রশ্ন সংখ্যা</div>
                        <div className="text-sm font-black text-slate-800 mt-0.5">
                          {exam.questionIds?.length || exam.totalQuestions || 100}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">সময়</div>
                        <div className="text-sm font-black text-slate-800 mt-0.5">
                          {exam.durationMinutes || 60} মি.
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">নেগেটিভ মার্ক</div>
                        <div className="text-sm font-black text-rose-600 mt-0.5">
                          -{exam.negativeMarksPerWrong ?? 0.5}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions (Take Exam + Schedule) */}
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-take-exam-${exam.id}`}
                        onClick={() => handleStartExam(exam)}
                        disabled={isStarting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs hover:shadow-md disabled:opacity-50"
                      >
                        {isStarting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>শুরু হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>পরীক্ষা দিন (Take Now)</span>
                          </>
                        )}
                      </button>

                      <button
                        id={`btn-schedule-exam-${exam.id}`}
                        onClick={() => handleOpenScheduleModal(exam)}
                        className="px-3.5 py-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition flex items-center gap-1.5 shadow-xs shrink-0"
                        title="Schedule this exam and receive a timely alert on your panel"
                      >
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">শিডিউল</span>
                      </button>
                    </div>

                    {isStaff && (
                      <button
                        id={`btn-set-questions-${exam.id}`}
                        onClick={() => handleOpenQuestionSetter(exam)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>প্রশ্ন সেট করুন (Set Questions) • {exam.questionIds?.length || 0} টি সংযুক্ত</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exam Pagination Toolbar */}
          {totalPages > 1 && (
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-800">{Math.min(currentPage * pageSize, totalFilteredExams)}</strong> of{' '}
                <strong className="text-slate-800">{totalFilteredExams}</strong> exams
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 transition"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                      currentPage === p
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- QUESTION SETTER MODAL FOR EXAM --- */}
      {activeExamForSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Exam Question Linker</span>
                <h3 className="text-base font-bold text-white">
                  প্রশ্ন সেট করুন: {activeExamForSetting.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveExamForSetting(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-bar with count & Search */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-700">
                নির্বাচিত প্রশ্ন: <span className="font-bold text-emerald-700">{selectedQuestionIds.length}</span> টি
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter question bank..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {settingSuccessMsg && (
              <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{settingSuccessMsg}</span>
              </div>
            )}

            {/* Questions Selection List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {loadingQuestions ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  প্রশ্ন ব্যাংক থেকে প্রশ্ন লোড করা হচ্ছে...
                </div>
              ) : allQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  কোনো প্রশ্ন পাওয়া যায়নি।
                </div>
              ) : (
                allQuestions
                  .filter((q) =>
                    !questionSearch.trim() ||
                    q.questionText.toLowerCase().includes(questionSearch.toLowerCase()) ||
                    (q.subject && q.subject.toLowerCase().includes(questionSearch.toLowerCase()))
                  )
                  .map((q, idx) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestionSelection(q.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by div onClick
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                            {q.subject && (
                              <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {q.subject}
                              </span>
                            )}
                            {q.examName && (
                              <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                {q.examName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-900 leading-snug">
                            {q.questionText}
                          </p>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {q.options?.join(' • ')}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedQuestionIds(allQuestions.map((q) => q.id))}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                সকল প্রশ্ন নির্বাচন করুন (Select All)
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveExamForSetting(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignedQuestions}
                  disabled={savingQuestions}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingQuestions && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>সংরক্ষণ করুন (Save Exam Questions)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE NEW EXAM MODAL --- */}
      {isCreatingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Admin Exam Creation</span>
                <h3 className="text-base font-bold text-white">নতুন পরীক্ষা তৈরি করুন (Create Exam)</h3>
              </div>
              <button
                onClick={() => setIsCreatingExam(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পরীক্ষার নাম (Exam Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ৪৭তম বিসিএস স্পেশাল মডেল টেস্ট - ০১"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <select
                    value={newExamCategory}
                    onChange={(e) => setNewExamCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="BCS">BCS (বিসিএস)</option>
                    <option value="BANK">BANK (ব্যাংক)</option>
                    <option value="PRIMARY">PRIMARY (প্রাথমিক)</option>
                    <option value="NTRCA">NTRCA (শিক্ষক নিবন্ধন)</option>
                    <option value="GRE">GRE</option>
                    <option value="OTHER">OTHER (অন্যান্য)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">বছর (Year)</label>
                  <input
                    type="number"
                    value={newExamYear}
                    onChange={(e) => setNewExamYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মোট প্রশ্ন</label>
                  <input
                    type="number"
                    value={newExamQuestions}
                    onChange={(e) => setNewExamQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সময় (মিনিট)</label>
                  <input
                    type="number"
                    value={newExamDuration}
                    onChange={(e) => setNewExamDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">নেগেটিভ মার্ক</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newExamNegMarks}
                    onChange={(e) => setNewExamNegMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">পরীক্ষার নির্দেশনাবলী</label>
                <textarea
                  rows={2}
                  value={newExamInstructions}
                  onChange={(e) => setNewExamInstructions(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingExam(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewExam}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingNewExam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>পরীক্ষা প্রকাশ করুন (Create Exam)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SCHEDULE EXAM MODAL --- */}
      {schedulingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold">পরীক্ষার সময় নির্ধারণ (Schedule Exam)</h3>
                  <p className="text-[11px] text-emerald-200 truncate max-w-[260px]">{schedulingExam.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingExam(null)}
                className="p-1 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
              {scheduleAlertMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    scheduleAlertMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {scheduleAlertMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{scheduleAlertMsg.message}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1 text-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase">নির্বাচিত পরীক্ষা</div>
                <div className="font-bold text-slate-900">{schedulingExam.name}</div>
                <div className="text-slate-500 text-[11px]">
                  সময়সীমা: {schedulingExam.durationMinutes || 60} মিনিট • প্রশ্ন: {schedulingExam.totalQuestions || 100} টি
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    তারিখ (Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সময় (Time) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নোট / অনুস্মারক বার্তা (Optional Notes)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ৩য় রিভিশন শেষে পরীক্ষা দেব"
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                <Bell className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  নির্ধারিত সময় উপস্থিত হওয়ার সাথে সাথে আপনার স্টুডেন্ট প্যানেলে অ্যালার্ট নোটিফিকেশন ভেসে উঠবে।
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSchedulingExam(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSchedule}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>শিডিউল নিশ্চিত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MY SCHEDULED EXAMS DRAWER / MODAL --- */}
      {showScheduledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">আমার নির্ধারিত পরীক্ষা (My Scheduled Exams)</h3>
                  <p className="text-[11px] text-slate-400">অন-টাইম প্যানেল নোটিফিকেশন সহ আসন্ন মডেল টেস্ট</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduledModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {scheduledExams.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">কোনো পরীক্ষা এখনো শিডিউল করা হয়নি</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    পরীক্ষা তালিকা থেকে যেকোনো পরীক্ষার "শিডিউল" বাটনে ক্লিক করে আপনার সুবিধাজনক সময় নির্ধারণ করুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledExams.map((item) => {
                    const scheduledDate = new Date(item.scheduledTime);
                    const isUpcoming = scheduledDate > new Date();

                    return (
                      <div
                        key={item.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isUpcoming
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isUpcoming ? 'আসন্ন (Upcoming)' : 'সময় অতিক্রান্ত'}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {scheduledDate.toLocaleDateString('bn-BD', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })} • {scheduledDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm">{item.examName}</h4>
                          {item.notes && (
                            <p className="text-xs text-slate-500 italic">"{item.notes}"</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <button
                            onClick={() => {
                              setShowScheduledModal(false);
                              const found = exams.find((e) => e.id === item.examId);
                              if (found) {
                                handleStartExam(found);
                              } else {
                                alert('Exam found. Starting test...');
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>এখনই পরীক্ষা দিন</span>
                          </button>

                          <button
                            onClick={() => handleCancelScheduled(item.id)}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition"
                            title="Cancel Scheduled Exam"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                মোট নির্ধারিত পরীক্ষা: <strong className="text-slate-800">{scheduledExams.length}</strong>
              </span>
              <button
                onClick={() => setShowScheduledModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
