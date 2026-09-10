import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Save,
  Check,
  Eye,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Zap,
  HelpCircle,
  Copy,
  ArrowRight
} from 'lucide-react';
import { Question, User } from '../types';
import {
  fetchQuestions,
  fetchCategoriesHierarchy,
  updateQuestion,
  deleteQuestion,
  adminQuickUpdateExplanation,
  askAiExplanation,
  scanDuplicateQuestionsApi,
  mergeDuplicateQuestionsApi
} from '../api';
import { MathJaxView } from './MathJaxView';
import { SmartFormulaEditor } from './SmartFormulaEditor';

interface AdminQuestionManagerTabProps {
  currentUser: User | null;
  onOpenAddQuestionModal?: () => void;
  onOpenImporterTab?: () => void;
}

export const AdminQuestionManagerTab: React.FC<AdminQuestionManagerTabProps> = ({
  currentUser,
  onOpenAddQuestionModal,
  onOpenImporterTab
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [exams, setExams] = useState<string[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedExam, setSelectedExam] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [selectedExplanationStatus, setSelectedExplanationStatus] = useState<'all' | 'missing' | 'has'>('all');

  // Expanded question explanations
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

  // AI Explanation Modal State
  const [aiModalQuestion, setAiModalQuestion] = useState<Question | null>(null);
  const [aiGeneratedExplanation, setAiGeneratedExplanation] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiSaving, setIsAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState<{
    text: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
    subject: string;
    topic: string;
    subtopic: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    exam: string;
  }>({
    text: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    subject: '',
    topic: '',
    subtopic: '',
    difficulty: 'Medium',
    exam: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Notification
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Duplicate Scanner State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [scanningDuplicates, setScanningDuplicates] = useState(false);
  const [duplicateClusters, setDuplicateClusters] = useState<Array<{
    primaryQuestion: Question;
    duplicates: Array<{ question: Question; similarity: number; reason: string }>;
    highestSimilarity: number;
  }>>([]);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [mergeFeedback, setMergeFeedback] = useState<string | null>(null);

  const handleScanDuplicates = async () => {
    try {
      setScanningDuplicates(true);
      setMergeFeedback(null);
      const res = await scanDuplicateQuestionsApi(0.68);
      setDuplicateClusters(res.clusters);
      setShowDuplicateModal(true);
    } catch (err: any) {
      alert(err.message || 'Failed to scan question duplicates');
    } finally {
      setScanningDuplicates(false);
    }
  };

  const handleMergeCluster = async (primaryId: string, duplicateIds: string[]) => {
    if (!confirm(`Are you sure you want to merge ${duplicateIds.length} duplicate question(s) into Question #${primaryId.slice(-6)}? This will merge tags, exams, explanations and delete the redundant questions.`)) return;
    try {
      setMergingId(primaryId);
      await mergeDuplicateQuestionsApi(primaryId, duplicateIds);
      setMergeFeedback(`Successfully merged ${duplicateIds.length} duplicate(s) into Question #${primaryId.slice(-6)}!`);
      // Remove cluster from state
      setDuplicateClusters((prev) => prev.filter(c => c.primaryQuestion.id !== primaryId));
      // Reload main questions list
      loadData();
    } catch (err: any) {
      alert(err.message || 'Merge failed');
    } finally {
      setMergingId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [qs, catData] = await Promise.all([fetchQuestions(), fetchCategoriesHierarchy()]);
      setQuestions(qs);
      setSubjects(catData.subjects || []);
      setExams(catData.exams ? catData.exams.map(e => e.name) : []);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Failed to load question bank.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      search.trim() === '' ||
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      q.explanation?.toLowerCase().includes(search.toLowerCase()) ||
      q.topic?.toLowerCase().includes(search.toLowerCase()) ||
      q.options.some((opt) => opt.toLowerCase().includes(search.toLowerCase()));

    const matchesSubject = selectedSubject === 'All' || q.subject === selectedSubject;
    const matchesExam = selectedExam === 'All' || q.exam === selectedExam;
    const matchesDifficulty = selectedDifficulty === 'All' || q.difficulty === selectedDifficulty;

    const hasExpl = !!q.explanation && q.explanation.trim().length > 0;
    const matchesExplanation =
      selectedExplanationStatus === 'all' ||
      (selectedExplanationStatus === 'missing' && !hasExpl) ||
      (selectedExplanationStatus === 'has' && hasExpl);

    return matchesSearch && matchesSubject && matchesExam && matchesDifficulty && matchesExplanation;
  });

  const missingExplanationCount = questions.filter((q) => !q.explanation || q.explanation.trim().length === 0).length;

  const toggleExpandExplanation = (id: string) => {
    setExpandedQuestionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open AI Tool Modal for a Question
  const handleOpenAiModal = async (q: Question) => {
    setAiModalQuestion(q);
    setAiGeneratedExplanation(q.explanation || '');
    setAiError(null);

    // If explanation is empty, auto-trigger generation
    if (!q.explanation || q.explanation.trim().length === 0) {
      handleTriggerAiGeneration(q);
    }
  };

  const handleTriggerAiGeneration = async (targetQ?: Question) => {
    const q = targetQ || aiModalQuestion;
    if (!q) return;
    setIsAiGenerating(true);
    setAiError(null);
    try {
      const generated = await askAiExplanation(q);
      setAiGeneratedExplanation(generated);
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI explanation. Please verify Gemini API key.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveAiExplanation = async () => {
    if (!aiModalQuestion) return;
    setIsAiSaving(true);
    try {
      await adminQuickUpdateExplanation(aiModalQuestion.id, aiGeneratedExplanation);
      setQuestions((prev) =>
        prev.map((q) => (q.id === aiModalQuestion.id ? { ...q, explanation: aiGeneratedExplanation } : q))
      );
      setStatusMsg({ type: 'success', text: `Explanation successfully updated for question #${aiModalQuestion.id.slice(-6)}!` });
      setAiModalQuestion(null);
    } catch (err: any) {
      setAiError(err.message || 'Failed to save explanation.');
    } finally {
      setIsAiSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setEditForm({
      text: q.text,
      options: [...q.options],
      correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
      explanation: q.explanation || '',
      subject: q.subject || subjects[0] || 'General Science',
      topic: q.topic || '',
      subtopic: q.subtopic || '',
      difficulty: q.difficulty || 'Medium',
      exam: q.exam || '46th BCS Preliminary'
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setIsSavingEdit(true);
    try {
      const res = await updateQuestion(editingQuestion.id, {
        text: editForm.text,
        options: editForm.options,
        correctOptionIndex: editForm.correctOptionIndex,
        explanation: editForm.explanation,
        subject: editForm.subject,
        topic: editForm.topic,
        subtopic: editForm.subtopic,
        difficulty: editForm.difficulty,
        exam: editForm.exam
      });

      if (res.isProposal) {
        setStatusMsg({
          type: 'success',
          text: `Update commit logged as Pull Request #${res.pullRequest?.prNumber} for Admin approval.`
        });
      } else {
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...editForm } : q))
        );
        setStatusMsg({ type: 'success', text: 'Question updated successfully in live Question Bank!' });
      }
      setEditingQuestion(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update question.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Question
  const handleConfirmDelete = async () => {
    if (!deletingQuestion) return;
    setIsDeleting(true);
    try {
      const res = await deleteQuestion(deletingQuestion.id);
      if (res.isProposal) {
        setStatusMsg({
          type: 'success',
          text: `Deletion proposed as Pull Request #${res.pullRequest?.prNumber} for Admin approval.`
        });
      } else {
        setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestion.id));
        setStatusMsg({ type: 'success', text: 'Question removed from question bank.' });
      }
      setDeletingQuestion(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete question.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Status banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border shadow-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Fast Action Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Question Bank Control Center</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Question Manager, CRUD & AI Explanation Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Directly update question text, options, correct answers, topics, or draft step-by-step LaTeX explanations using Gemini AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenAddQuestionModal && (
            <button
              onClick={onOpenAddQuestionModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Question</span>
            </button>
          )}

          {onOpenImporterTab && (
            <button
              onClick={onOpenImporterTab}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Excel / CSV</span>
            </button>
          )}

          <button
            onClick={handleScanDuplicates}
            disabled={scanningDuplicates}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 disabled:opacity-50"
            title="Scan whole question bank for potential duplicate or redundant questions"
          >
            <Copy className={`w-4 h-4 ${scanningDuplicates ? 'animate-spin' : ''}`} />
            <span>{scanningDuplicates ? 'Scanning Duplicates...' : 'Find Duplicates'}</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition"
            title="Refresh Questions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Questions</p>
            <p className="text-2xl font-extrabold text-slate-900">{questions.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Missing Explanations</p>
            <p className="text-2xl font-extrabold text-amber-600">{missingExplanationCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Needs AI drafting</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filtered Results</p>
            <p className="text-2xl font-extrabold text-indigo-600">{filteredQuestions.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ready for editing</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by question text, explanation, topic, or option words..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none"
            >
              <option value="All">All Subjects ({subjects.length})</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none"
            >
              <option value="All">All Exams</option>
              {exams.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e: any) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              value={selectedExplanationStatus}
              onChange={(e: any) => setSelectedExplanationStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none"
            >
              <option value="all">All Explanations</option>
              <option value="missing">Missing Explanation ({missingExplanationCount})</option>
              <option value="has">Has Explanation</option>
            </select>

            {(search || selectedSubject !== 'All' || selectedExam !== 'All' || selectedDifficulty !== 'All' || selectedExplanationStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedSubject('All');
                  setSelectedExam('All');
                  setSelectedDifficulty('All');
                  setSelectedExplanationStatus('all');
                }}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Loading Questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No questions match your current filters</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords or resetting difficulty and subject filters.
            </p>
          </div>
        ) : (
          filteredQuestions.map((q, qIndex) => {
            const hasExplanation = !!q.explanation && q.explanation.trim().length > 0;
            const isExpanded = !!expandedQuestionIds[q.id];

            return (
              <div
                key={q.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-indigo-300 transition space-y-4 group"
              >
                {/* Card Header Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-[11px]">
                      Q#{qIndex + 1}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                      {q.subject}
                    </span>
                    {q.topic && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 font-medium text-[11px] border border-slate-200">
                        {q.topic}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    {q.exam && (
                      <span className="px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 font-semibold text-[10px] border border-violet-200">
                        {q.exam}
                      </span>
                    )}
                  </div>

                  {/* Top Right Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* AI Tool Button */}
                    <button
                      onClick={() => handleOpenAiModal(q)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                        hasExplanation
                          ? 'bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200'
                          : 'bg-amber-500 hover:bg-amber-600 text-white font-extrabold animate-pulse'
                      }`}
                      title="Generate or update explanation with Gemini AI"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{hasExplanation ? 'AI Polish' : 'AI Author'}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(q)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition flex items-center gap-1 text-xs font-bold"
                      title="Edit Question & Options"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeletingQuestion(q)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition flex items-center gap-1 text-xs font-bold"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                  <MathJaxView text={q.text} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((option, optIdx) => {
                    const isCorrect = optIdx === q.correctOptionIndex;
                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-2xl border text-xs sm:text-sm flex items-start gap-2.5 transition ${
                          isCorrect
                            ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 font-semibold'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <MathJaxView text={option} />
                        </div>
                        {isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Strip */}
                <div className="pt-2">
                  {hasExplanation ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleExpandExplanation(q.id)}
                          className="font-bold text-indigo-700 flex items-center gap-1.5 hover:underline"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Detailed Solution & Explanation</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleOpenAiModal(q)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>AI Polish</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-200 leading-relaxed font-sans text-slate-800">
                          <MathJaxView text={q.explanation} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-800 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No explanation written yet for this question.</span>
                      </div>
                      <button
                        onClick={() => handleOpenAiModal(q)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate with AI</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= MODAL: AI EXPLANATION STUDIO ================= */}
      {aiModalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    AI Explanation Generator & Polish
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Question #{aiModalQuestion.id.slice(-6)} • {aiModalQuestion.subject}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAiModalQuestion(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Question Preview Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm space-y-2">
                <p className="font-bold text-slate-900">
                  <MathJaxView text={aiModalQuestion.text} />
                </p>
                <div className="text-[11px] text-emerald-700 font-bold">
                  Correct Option: {String.fromCharCode(65 + aiModalQuestion.correctOptionIndex)} ({aiModalQuestion.options[aiModalQuestion.correctOptionIndex]})
                </div>
              </div>

              {aiError && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Explanation Draft (Supports LaTeX MathJax $...$)
                </label>
                <button
                  type="button"
                  onClick={() => handleTriggerAiGeneration()}
                  disabled={isAiGenerating}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                  <span>{isAiGenerating ? 'Consulting Gemini AI...' : 'Regenerate with AI'}</span>
                </button>
              </div>

              {/* Smart Formula Editor for AI Explanation */}
              <SmartFormulaEditor
                label="Generated Explanation & Solution"
                value={aiGeneratedExplanation}
                onChange={(val) => setAiGeneratedExplanation(val)}
                rows={5}
                placeholder="Step-by-step reasoning or mathematical formulas with MathJax $x^2 + y^2$..."
                helperText="You can refine the AI generated solution, add special symbols or plain math."
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAiModalQuestion(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAiExplanation}
                disabled={isAiSaving || !aiGeneratedExplanation.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isAiSaving ? 'Saving...' : 'Save & Update Explanation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT QUESTION ================= */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Edit Question Details
                </h3>
                <p className="text-[11px] text-slate-400">
                  Question ID: #{editingQuestion.id.slice(-6)}
                </p>
              </div>

              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {/* Question Text with Smart Formula / Plain-Text Editor */}
                <SmartFormulaEditor
                  label="Question Text"
                  required
                  value={editForm.text}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, text: val }))}
                  rows={3}
                  placeholder="Type question here. E.g., একটি চৌবাচ্চা ১/৫ অংশ বা x² + 2x + 1 = 0..."
                  helperText="Supports plain math (১/৫, x², √x) and LaTeX ($x^2$). Use 'Format Math' to auto-convert."
                />

                {/* 4 Options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Options & Correct Answer Radio *
                  </label>
                  <div className="space-y-2">
                    {editForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
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

                {/* Metadata Row: Subject, Difficulty, Exam */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Subject</label>
                    <select
                      value={editForm.subject}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      {subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

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
                    <label className="text-[11px] font-bold text-slate-700">Exam Target</label>
                    <input
                      type="text"
                      value={editForm.exam}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, exam: e.target.value }))}
                      placeholder="e.g. 46th BCS"
                      className="w-full p-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                {/* Topic & Subtopic */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Topic</label>
                    <input
                      type="text"
                      value={editForm.topic}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g. Algebra"
                      className="w-full p-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Subtopic</label>
                    <input
                      type="text"
                      value={editForm.subtopic}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, subtopic: e.target.value }))}
                      placeholder="e.g. Quadratic Roots"
                      className="w-full p-2 text-xs rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                {/* Explanation with Smart Formula / Plain-Text Editor */}
                <div className="space-y-1">
                  <div className="flex items-center justify-end mb-1">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await askAiExplanation({
                            ...editingQuestion,
                            text: editForm.text,
                            options: editForm.options,
                            correctOptionIndex: editForm.correctOptionIndex
                          });
                          setEditForm((prev) => ({ ...prev, explanation: res }));
                        } catch (e: any) {
                          alert(e.message || 'AI generation failed');
                        }
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Draft with AI</span>
                    </button>
                  </div>
                  <SmartFormulaEditor
                    label="Explanation / Solution"
                    value={editForm.explanation}
                    onChange={(val) => setEditForm((prev) => ({ ...prev, explanation: val }))}
                    rows={4}
                    placeholder="Provide step-by-step reasoning with formulas or plain text..."
                    helperText="Candidates see this full step-by-step solution after quiz submission."
                  />
                </div>
              </div>

              {/* Modal Footer */}
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
                  <span>{isSavingEdit ? 'Saving...' : 'Save Question Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE QUESTION CONFIRMATION ================= */}
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
              Are you sure you want to remove this question from the active bank? This action cannot be undone unless restored by a Super Admin.
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
                onClick={handleConfirmDelete}
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
      {/* ================= MODAL: DUPLICATE QUESTIONS SCANNER & CLEANER ================= */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Question Bank Duplicate Scanner & Merger
                  </h3>
                  <p className="text-xs text-amber-100">
                    Fuzzy text similarity, n-gram matching, and choice overlap detection
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleScanDuplicates}
                  disabled={scanningDuplicates}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${scanningDuplicates ? 'animate-spin' : ''}`} />
                  <span>Rescan</span>
                </button>
                <button
                  onClick={() => setShowDuplicateModal(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {mergeFeedback && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{mergeFeedback}</span>
                </div>
              )}

              {duplicateClusters.length === 0 ? (
                <div className="p-10 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="font-extrabold text-slate-800 text-base">No Duplicates Found</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    The question bank is clean! All questions passed the fuzzy similarity and option overlap tests with no high-confidence duplicates detected.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-900">
                      Found {duplicateClusters.length} duplicate cluster(s) across the question bank.
                    </span>
                    <span className="text-[11px] text-amber-700">
                      Merging retains the master question and merges exam tags.
                    </span>
                  </div>

                  {duplicateClusters.map((cluster, cIdx) => (
                    <div
                      key={cluster.primaryQuestion.id}
                      className="bg-white rounded-2xl border-2 border-slate-200 p-4 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold">
                            Cluster #{cIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {Math.round(cluster.highestSimilarity * 100)}% Max Similarity
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            handleMergeCluster(
                              cluster.primaryQuestion.id,
                              cluster.duplicates.map((d) => d.question.id)
                            )
                          }
                          disabled={mergingId === cluster.primaryQuestion.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {mergingId === cluster.primaryQuestion.id
                              ? 'Merging...'
                              : `Merge ${cluster.duplicates.length} Duplicate(s) into Master`}
                          </span>
                        </button>
                      </div>

                      {/* Primary Master Question Card */}
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                          <span>Master Question (#{cluster.primaryQuestion.id.slice(-6)})</span>
                          <span className="bg-indigo-200 text-indigo-950 px-2 py-0.5 rounded">
                            {cluster.primaryQuestion.subject} • {cluster.primaryQuestion.exam || 'General'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-900 font-medium">
                          <MathJaxView text={cluster.primaryQuestion.text} />
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                          {cluster.primaryQuestion.options?.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className={`px-2 py-0.5 rounded ${
                                cluster.primaryQuestion.correctOptionIndex === oIdx
                                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                                  : 'bg-white border border-slate-200'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Redundant Questions */}
                      <div className="space-y-2 pl-2 sm:pl-4 border-l-2 border-amber-300">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Redundant Copies:
                        </p>
                        {cluster.duplicates.map((dup) => (
                          <div
                            key={dup.question.id}
                            className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-amber-900">
                                Duplicate #{dup.question.id.slice(-6)} ({Math.round(dup.similarity * 100)}% match)
                              </span>
                              <span className="text-amber-800 text-[10px]">{dup.reason}</span>
                            </div>
                            <div className="text-slate-800">
                              <MathJaxView text={dup.question.text} />
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Subject: {dup.question.subject} | Exam: {dup.question.exam || 'None'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition"
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
