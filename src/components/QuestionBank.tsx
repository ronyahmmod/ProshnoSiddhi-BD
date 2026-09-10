import React, { useState, useEffect, useMemo } from 'react';
import { Question, QuestionFilter, ExamCategory, SubjectHierarchy, User } from '../types';
import {
  fetchQuestions,
  fetchCategoriesHierarchy,
  toggleBookmark,
  fetchBookmarks,
  askAiExplanation,
  saveNote,
  fetchNote,
  updateQuestion,
  deleteQuestion,
  adminQuickUpdateExplanation
} from '../api';
import { MathJaxView } from './MathJaxView';
import { ClientQuestionReviewModal } from './ClientQuestionReviewModal';
import {
  Search,
  BookOpen,
  Filter,
  Bookmark,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  EyeOff,
  StickyNote,
  Loader2,
  ChevronDown,
  X,
  Layers,
  Award,
  BookMarked,
  RotateCcw,
  Play,
  Edit3,
  Trash2,
  Save,
  AlertTriangle
} from 'lucide-react';

interface QuestionBankProps {
  onStartQuizWithQuestions?: (questions: Question[]) => void;
  currentUser?: User | null;
  onOpenAuth?: (reason?: string) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
  onStartQuizWithQuestions,
  currentUser,
  onOpenAuth
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<ExamCategory[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [hierarchy, setHierarchy] = useState<SubjectHierarchy[]>([]);
  const [subjectTopicsMap, setSubjectTopicsMap] = useState<Record<string, string[]>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedExam, setSelectedExam] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedSubtopic, setSelectedSubtopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unattempted' | 'correct' | 'incorrect'>('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>({});

  // AI Explanation Modal
  const [aiModalQuestion, setAiModalQuestion] = useState<Question | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Note Modal
  const [noteModalQuestionId, setNoteModalQuestionId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Question CRUD States (Staff Clearance)
  const isStaff = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR' || currentUser?.role === 'EDITOR';
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState<{
    text: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
    subject: string;
    topic: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    exam: string;
  }>({
    text: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    subject: '',
    topic: '',
    difficulty: 'Medium',
    exam: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDraftingAiExpl, setIsDraftingAiExpl] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [crudBanner, setCrudBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Client Question Review State
  const [reviewingQuestion, setReviewingQuestion] = useState<Question | null>(null);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setEditForm({
      text: q.text,
      options: [...q.options],
      correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
      explanation: q.explanation || '',
      subject: q.subject || 'General Knowledge',
      topic: q.topic || '',
      difficulty: q.difficulty || 'Medium',
      exam: q.exam || '46th BCS Preliminary'
    });
  };

  const handleSaveQuestionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setIsSavingEdit(true);
    try {
      const res = await updateQuestion(editingQuestion.id, editForm);
      if (res.isProposal) {
        setCrudBanner({
          type: 'success',
          text: `Update logged as Pull Request #${res.pullRequest?.prNumber} for Admin review.`
        });
      } else {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...editForm } : q))
        );
        setCrudBanner({ type: 'success', text: 'Question updated successfully in live Question Bank!' });
      }
      setEditingQuestion(null);
    } catch (err: any) {
      setCrudBanner({ type: 'error', text: err.message || 'Failed to update question.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmQuestionDelete = async () => {
    if (!deletingQuestion) return;
    setIsDeleting(true);
    try {
      const res = await deleteQuestion(deletingQuestion.id);
      if (res.isProposal) {
        setCrudBanner({
          type: 'success',
          text: `Deletion submitted as Pull Request #${res.pullRequest?.prNumber} for Admin approval.`
        });
      } else {
        setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestion.id));
        setCrudBanner({ type: 'success', text: 'Question removed from Question Bank.' });
      }
      setDeletingQuestion(null);
    } catch (err: any) {
      setCrudBanner({ type: 'error', text: err.message || 'Failed to delete question.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDraftAiExplanationInEdit = async () => {
    if (!editingQuestion) return;
    setIsDraftingAiExpl(true);
    try {
      const generated = await askAiExplanation({
        ...editingQuestion,
        text: editForm.text,
        options: editForm.options,
        correctOptionIndex: editForm.correctOptionIndex
      });
      setEditForm((prev) => ({ ...prev, explanation: generated }));
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI explanation.');
    } finally {
      setIsDraftingAiExpl(false);
    }
  };

  const loadCategoriesData = async () => {
    try {
      const data = await fetchCategoriesHierarchy();
      setExams(data.exams || []);
      setSubjects(['All', ...(data.subjects || [])]);
      setHierarchy(data.hierarchy || []);
      setSubjectTopicsMap(data.subjectTopicsMap || {});
    } catch (e) {
      console.error('Failed to load categories hierarchy', e);
    }
  };

  const loadQuestionsData = async () => {
    setLoading(true);
    try {
      const filter: QuestionFilter = {
        exam: selectedExam !== 'All' ? selectedExam : undefined,
        subject: selectedSubject !== 'All' ? selectedSubject : undefined,
        topic: selectedTopic !== 'All' ? selectedTopic : undefined,
        subtopic: selectedSubtopic !== 'All' ? selectedSubtopic : undefined,
        difficulty: selectedDifficulty !== 'All' ? selectedDifficulty : undefined,
        search: search || undefined,
        bookmarkedOnly,
        statusFilter: selectedStatus
      };
      const qList = await fetchQuestions(filter);
      setQuestions(qList);

      const bm = await fetchBookmarks();
      setBookmarkedIds(bm);
    } catch (err) {
      console.error('Failed to load question bank', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoriesData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadQuestionsData();
    }, 250);
    return () => clearTimeout(timer);
  }, [
    search,
    selectedExam,
    selectedSubject,
    selectedTopic,
    selectedSubtopic,
    selectedDifficulty,
    selectedStatus,
    bookmarkedOnly
  ]);

  // Derived available topics based on selected subject
  const availableTopics = useMemo(() => {
    if (selectedSubject === 'All') return ['All'];
    return ['All', ...(subjectTopicsMap[selectedSubject] || [])];
  }, [selectedSubject, subjectTopicsMap]);

  // Derived available subtopics based on selected subject and topic
  const availableSubtopics = useMemo(() => {
    if (selectedSubject === 'All' || selectedTopic === 'All') return ['All'];
    const foundSubject = hierarchy.find(h => h.subject.toLowerCase() === selectedSubject.toLowerCase());
    if (!foundSubject) return ['All'];
    const foundTopic = foundSubject.topics.find(t => t.topic.toLowerCase() === selectedTopic.toLowerCase());
    if (!foundTopic || !foundTopic.subtopics || foundTopic.subtopics.length === 0) return ['All'];
    return ['All', ...foundTopic.subtopics];
  }, [selectedSubject, selectedTopic, hierarchy]);

  const handleToggleBookmark = async (qId: string) => {
    if (!currentUser) {
      onOpenAuth?.('Please sign in or create an account to bookmark questions and build your revision list.');
      return;
    }
    try {
      const isBookmarked = await toggleBookmark(qId);
      if (isBookmarked) {
        setBookmarkedIds(prev => [...prev, qId]);
      } else {
        setBookmarkedIds(prev => prev.filter(id => id !== qId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleReveal = (qId: string) => {
    setRevealedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleOpenAiExplanation = async (q: Question) => {
    if (!currentUser) {
      onOpenAuth?.('Please sign in or create an account to unlock AI-powered explanations and step-by-step solutions.');
      return;
    }
    setAiModalQuestion(q);
    setAiExplanation(null);
    setAiLoading(true);

    try {
      const result = await askAiExplanation(q);
      setAiExplanation(result);
    } catch (err: any) {
      setAiExplanation(`Error generating AI explanation: ${err.message || 'Server timeout'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenNoteModal = async (qId: string) => {
    if (!currentUser) {
      onOpenAuth?.('Please sign in or create an account to write and save personal revision notes.');
      return;
    }
    setNoteModalQuestionId(qId);
    try {
      const note = await fetchNote(qId);
      setNoteText(note || '');
    } catch (e) {
      setNoteText('');
    }
  };

  const handleSaveNote = async () => {
    if (!noteModalQuestionId) return;
    setNoteSaving(true);
    try {
      await saveNote(noteModalQuestionId, noteText);
      setNoteModalQuestionId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleLaunchQuizFromBank = () => {
    if (!currentUser) {
      onOpenAuth?.('Please sign in or create an account to take a quiz from these filtered questions.');
      return;
    }
    if (onStartQuizWithQuestions && questions.length > 0) {
      onStartQuizWithQuestions(questions.slice(0, 25));
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedExam('All');
    setSelectedSubject('All');
    setSelectedTopic('All');
    setSelectedSubtopic('All');
    setSelectedDifficulty('All');
    setSelectedStatus('all');
    setBookmarkedOnly(false);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0A2540] via-[#113860] to-[#1F54E7] rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#1F54E7]/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#8BC1E3]" />
            Comprehensive Question Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl">
            Filter questions by Exam (BCS, Bank, Govt Recruitment), Subject, Topic & Subtopic. Every question includes step-by-step verified explanations with MathJax LaTeX formatting.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold bg-[#0A2540]/80 text-[#8BC1E3] px-4 py-2.5 rounded-xl border border-[#8BC1E3]/30 shrink-0">
          <span>Available Questions: <strong className="text-white text-sm ml-1">{questions.length}</strong></span>
        </div>
      </div>

      {/* Advanced Filter Controls Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E9EC] p-5 shadow-xs space-y-4">
        
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6F8498]" />
            <input
              type="text"
              placeholder="Search by keywords, Bengali text, LaTeX formulas ($...$), exam names, topic tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7] focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-3 text-[#6F8498] hover:text-[#0A2540]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl cursor-pointer text-xs font-bold text-amber-900 transition-colors w-full sm:w-auto justify-center shrink-0">
            <Bookmark className={`w-4 h-4 ${bookmarkedOnly ? 'fill-amber-600 text-amber-600' : 'text-amber-700'}`} />
            <input
              type="checkbox"
              checked={bookmarkedOnly}
              onChange={(e) => setBookmarkedOnly(e.target.checked)}
              className="hidden"
            />
            Bookmarked ({bookmarkedIds.length})
          </label>
        </div>

        {/* Dynamic Multi-tier Filters: Exam -> Subject -> Topic -> Subtopic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E5E9EC]">
          
          {/* Exam Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#6F8498] mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#1F54E7]" /> Exam Tag
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7]"
            >
              <option value="All">All Exams (BCS, Bank, Govt...)</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.name}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#6F8498] mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#1F54E7]" /> Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic('All');
                setSelectedSubtopic('All');
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7]"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#6F8498] mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#1F54E7]" /> Topic Tag
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedSubtopic('All');
              }}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7]"
            >
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Subtopic Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#6F8498] mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#1F54E7]" /> Subtopic
            </label>
            <select
              value={selectedSubtopic}
              onChange={(e) => setSelectedSubtopic(e.target.value)}
              disabled={availableSubtopics.length <= 1}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7] disabled:opacity-50"
            >
              {availableSubtopics.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty & Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E5E9EC]">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#6F8498] mb-1">Difficulty</label>
            <div className="flex gap-1">
              {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                    selectedDifficulty === d
                      ? 'bg-[#1F54E7] text-white'
                      : 'bg-[#F6F8FB] text-[#6F8498] hover:bg-[#E5E9EC] hover:text-[#0A2540]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#6F8498] mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7]"
            >
              <option value="all">All Questions</option>
              <option value="unattempted">Unattempted</option>
              <option value="correct">Previously Correct</option>
              <option value="incorrect">Previously Incorrect (In Mistakes)</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-end justify-end gap-2.5 flex-wrap">
            <button
              onClick={handleLaunchQuizFromBank}
              disabled={questions.length === 0}
              className="px-4 py-2 bg-[#1F54E7] hover:bg-[#1742be] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              title="Practice these filtered questions in an interactive quiz"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Take Quiz ({questions.length})</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-[#F6F8FB] hover:bg-[#E5E9EC] text-[#0A2540] text-xs font-bold rounded-xl border border-[#E5E9EC] transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#6F8498]" />
              Reset All Filters
            </button>
          </div>
        </div>

      </div>

      {/* CRUD Banner */}
      {crudBanner && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border shadow-2xs ${
            crudBanner.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {crudBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{crudBanner.text}</span>
          </div>
          <button
            onClick={() => setCrudBanner(null)}
            className="text-[11px] font-bold underline text-slate-600 hover:text-slate-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Question Cards List */}
      {loading ? (
        <div className="p-12 text-center text-[#6F8498] bg-white rounded-2xl border border-[#E5E9EC] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1F54E7]" />
          <p className="text-xs font-bold text-[#0A2540]">Loading questions with MathJax LaTeX typesetting...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E9EC] space-y-3">
          <HelpCircle className="w-12 h-12 text-[#6F8498]/50 mx-auto" />
          <h3 className="font-bold text-[#0A2540]">No matching questions found</h3>
          <p className="text-xs text-[#6F8498] max-w-sm mx-auto">
            Try adjusting your search query, exam, or topic filters to view more questions.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-[#1F54E7] text-white text-xs font-bold rounded-xl hover:bg-[#1742be] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isBookmarked = bookmarkedIds.includes(q.id);
            const isRevealed = !!revealedQuestions[q.id];

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-[#E5E9EC] p-5 sm:p-6 shadow-xs space-y-4 hover:border-[#1F54E7]/40 transition-all"
              >
                {/* Question Header: Tags for Exam & Topic */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E9EC] pb-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-[#6F8498]">Q{idx + 1}</span>
                    
                    {/* Exam Name Tag */}
                    {q.exam && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold bg-[#8BC1E3]/25 text-[#1F54E7] border border-[#8BC1E3]/40 text-xs">
                        <Award className="w-3 h-3 text-[#1F54E7]" />
                        {q.exam}
                      </span>
                    )}

                    {/* Subject Tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold bg-[#1F54E7]/10 text-[#1F54E7] text-xs">
                      <BookOpen className="w-3 h-3" />
                      {q.subject}
                    </span>

                    {/* Topic Name Tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-semibold bg-[#F6F8FB] text-[#0A2540] border border-[#E5E9EC] text-xs">
                      <Layers className="w-3 h-3 text-[#6F8498]" />
                      {q.topic}
                    </span>

                    {/* Subtopic Tag if exists */}
                    {q.subtopic && (
                      <span className="px-2 py-0.5 rounded-lg font-medium bg-[#8BC1E3]/15 text-[#0A2540] text-[11px] border border-[#8BC1E3]/30">
                        {q.subtopic}
                      </span>
                    )}

                    {/* Difficulty Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase ${
                        q.difficulty === 'Easy'
                          ? 'bg-[#36C18E]/20 text-[#0A2540] border border-[#36C18E]/30'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isStaff && (
                      <>
                        <button
                          onClick={() => handleOpenEditQuestion(q)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition flex items-center gap-1"
                          title="Edit Question, Options & Explanation"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        <button
                          onClick={() => setDeletingQuestion(q)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {/* Client Propose Review & Correction Button */}
                    <button
                      onClick={() => setReviewingQuestion(q)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 transition flex items-center gap-1 active:scale-95"
                      title="Propose Review, Answer Correction or Enhanced Solution"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline">Propose Review</span>
                    </button>

                    <button
                      onClick={() => handleOpenNoteModal(q.id)}
                      className="p-1.5 text-[#6F8498] hover:text-[#0A2540] hover:bg-[#F6F8FB] rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                      title="Add or Edit Personal Study Note"
                    >
                      <StickyNote className="w-4 h-4 text-[#1F54E7]" />
                      <span className="hidden sm:inline">Note</span>
                    </button>

                    <button
                      onClick={() => handleToggleBookmark(q.id)}
                      className="p-1.5 text-[#6F8498] hover:text-amber-500 rounded-lg transition-colors"
                      title="Bookmark Question"
                    >
                      <Bookmark
                        className={`w-5 h-5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-[#6F8498]'}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Question Text (Rendered with MathJax) */}
                <div className="text-base font-bold text-[#0A2540] leading-relaxed">
                  <MathJaxView text={q.text} />
                </div>

                {/* Options Grid (Rendered with MathJax) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((option, optIdx) => {
                    const correctIndices = q.correctOptionIndices && q.correctOptionIndices.length > 0
                      ? q.correctOptionIndices
                      : (typeof q.correctOptionIndex === 'number' ? [q.correctOptionIndex] : [0]);

                    const isCorrect = correctIndices.includes(optIdx);
                    let optionStyle = 'bg-[#F6F8FB] border-[#E5E9EC] text-[#0A2540]';

                    if (isRevealed) {
                      if (isCorrect) {
                        optionStyle = 'bg-[#36C18E]/15 border-[#36C18E] text-[#0A2540] font-bold';
                      } else {
                        optionStyle = 'bg-[#F6F8FB] border-[#E5E9EC] text-[#6F8498] opacity-60';
                      }
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition-all ${optionStyle}`}
                      >
                        <span className="w-5 h-5 rounded-md bg-white border border-[#E5E9EC] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#0A2540] shadow-2xs">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <div className="flex-1">
                          <MathJaxView text={option} />
                        </div>
                        {isRevealed && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-[#36C18E] flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Option Box (Rendered with MathJax) */}
                {isRevealed && (
                  <div className="p-4 bg-[#F6F8FB] rounded-xl border border-[#8BC1E3] text-xs text-[#0A2540] space-y-2 animate-in fade-in duration-200">
                    <div className="font-bold text-[#1F54E7] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#36C18E]" /> Correct Answer:{' '}
                        {(q.correctOptionIndices && q.correctOptionIndices.length > 0 ? q.correctOptionIndices : [q.correctOptionIndex ?? 0])
                          .map((idx) => `Option ${String.fromCharCode(65 + idx)} (${q.options[idx] || ''})`)
                          .join(', ')}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F8498] bg-white px-2 py-0.5 rounded-md border border-[#E5E9EC]">
                        Verified Explanation
                      </span>
                    </div>
                    <div className="text-[#0A2540] leading-relaxed pt-1.5 border-t border-[#E5E9EC]">
                      <MathJaxView text={q.explanation || 'Detailed step-by-step reasoning is provided based on the official curriculum and past question keys.'} />
                    </div>
                  </div>
                )}

                {/* Actions Row: Explanation Options */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => handleToggleReveal(q.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F6F8FB] hover:bg-[#E5E9EC] text-[#0A2540] text-xs font-bold rounded-xl border border-[#E5E9EC] transition-colors"
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-[#6F8498]" /> : <Eye className="w-3.5 h-3.5 text-[#1F54E7]" />}
                    {isRevealed ? 'Hide Explanation' : 'View Explanation & Solution'}
                  </button>

                  <button
                    onClick={() => handleOpenAiExplanation(q)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1F54E7] hover:bg-[#1742be] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#8BC1E3]" />
                    Tutor Explanation
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tutor Explanation Slide-over Modal with MathJax */}
      {aiModalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E9EC] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="bg-gradient-to-r from-[#0A2540] via-[#113860] to-[#1F54E7] p-5 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8BC1E3]" />
                <h3 className="font-bold text-base">Academic Tutor - Step-by-Step Breakdown</h3>
              </div>
              <button
                onClick={() => setAiModalQuestion(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 bg-[#F6F8FB] border border-[#E5E9EC] rounded-xl">
                <span className="text-[10px] font-bold uppercase text-[#6F8498]">Question Stem</span>
                <div className="font-bold text-sm text-[#0A2540] mt-1">
                  <MathJaxView text={aiModalQuestion.text} />
                </div>
              </div>

              {aiLoading ? (
                <div className="py-12 text-center text-[#6F8498] space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1F54E7] mx-auto" />
                  <p className="text-xs font-bold text-[#0A2540]">Analyzing theoretical concepts, equations & shortcuts...</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-[#0A2540] text-xs sm:text-sm whitespace-pre-wrap leading-relaxed bg-[#F6F8FB] p-4 rounded-xl border border-[#8BC1E3]/40">
                  <MathJaxView text={aiExplanation || ''} />
                </div>
              )}
            </div>

            <div className="p-4 bg-[#F6F8FB] border-t border-[#E5E9EC] flex justify-end">
              <button
                onClick={() => setAiModalQuestion(null)}
                className="px-4 py-2 bg-[#0A2540] text-white text-xs font-bold rounded-xl hover:bg-[#113860]"
              >
                Close Explanation
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {noteModalQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E5E9EC] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-[#E5E9EC]">
              <h3 className="font-bold text-[#0A2540] flex items-center gap-2 text-sm">
                <StickyNote className="w-4 h-4 text-[#1F54E7]" />
                Personal Study Note
              </h3>
              <button
                onClick={() => setNoteModalQuestionId(null)}
                className="text-[#6F8498] hover:text-[#0A2540]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6F8498] mb-1">
                Write key formulas, mnemonic tricks, or personal references:
              </label>
              <textarea
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. For ratio $a:b = c:d$, $ad = bc$..."
                className="w-full p-3 text-xs bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNoteModalQuestionId(null)}
                className="px-3 py-1.5 text-xs text-[#6F8498] hover:bg-[#F6F8FB] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={noteSaving}
                className="px-4 py-2 bg-[#1F54E7] text-white text-xs font-bold rounded-xl hover:bg-[#1742be] disabled:opacity-50 flex items-center gap-1.5"
              >
                {noteSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal (Staff) */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Edit Question Details
                </h3>
                <p className="text-[11px] text-slate-400">
                  Question ID: #{editingQuestion.id.slice(-6)} • {editingQuestion.subject}
                </p>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Question Text *</label>
                  <textarea
                    rows={3}
                    required
                    value={editForm.text}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, text: e.target.value }))}
                    className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Options & Correct Answer *</label>
                  <div className="space-y-2">
                    {editForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="bankCorrectOption"
                          checked={editForm.correctOptionIndex === idx}
                          onChange={() => setEditForm((prev) => ({ ...prev, correctOptionIndex: idx }))}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                          title="Select as correct option"
                        />
                        <span className="w-6 h-6 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-700 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...editForm.options];
                            newOptions[idx] = e.target.value;
                            setEditForm((prev) => ({ ...prev, options: newOptions }));
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 p-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Difficulty</label>
                    <select
                      value={editForm.difficulty}
                      onChange={(e: any) => setEditForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Topic</label>
                    <input
                      type="text"
                      value={editForm.topic}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, topic: e.target.value }))}
                      className="w-full p-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Exam Target</label>
                    <input
                      type="text"
                      value={editForm.exam}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, exam: e.target.value }))}
                      className="w-full p-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Detailed Explanation</label>
                    <button
                      type="button"
                      onClick={handleDraftAiExplanationInEdit}
                      disabled={isDraftingAiExpl}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isDraftingAiExpl ? 'animate-spin' : ''}`} />
                      <span>{isDraftingAiExpl ? 'Consulting Gemini...' : 'Draft with AI'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={editForm.explanation}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Step-by-step reasoning or mathematical formulas with MathJax $...$"
                    className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation Modal (Staff) */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Question?</h3>
                <p className="text-xs text-slate-400">ID: #{deletingQuestion.id.slice(-6)}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <MathJaxView text={deletingQuestion.text} />
            </div>

            <p className="text-xs text-slate-500">
              Are you sure you want to delete this question? This action will remove it or log a removal proposal for Admin sign-off.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmQuestionDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Question Review Modal */}
      {reviewingQuestion && (
        <ClientQuestionReviewModal
          question={reviewingQuestion}
          isOpen={!!reviewingQuestion}
          currentUser={currentUser}
          onClose={() => setReviewingQuestion(null)}
          onSuccess={(msg) => {
            setReviewSuccessMessage(msg);
            setTimeout(() => setReviewSuccessMessage(null), 8000);
          }}
        />
      )}

      {/* Review Submission Success Toast */}
      {reviewSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-bold text-xs text-white">Review Proposal Submitted!</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">{reviewSuccessMessage}</p>
            </div>
            <button
              onClick={() => setReviewSuccessMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
