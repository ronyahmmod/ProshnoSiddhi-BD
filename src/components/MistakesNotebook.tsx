import React, { useState, useEffect } from 'react';
import { WrongQuestionRecord, Question } from '../types';
import {
  fetchWrongQuestions,
  resolveWrongQuestion,
  generateRevisionQuestions,
  askAiExplanation
} from '../api';
import { MathJaxView } from './MathJaxView';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Play,
  Trash2,
  BookOpen,
  Filter,
  Search,
  Loader2,
  AlertTriangle,
  Award,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface MistakesNotebookProps {
  onStartQuizWithQuestions?: ((questions: Question[]) => void) | ((title: string, questions: Question[]) => void);
  onOpenAuth?: () => void;
  isLoggedIn: boolean;
}

export const MistakesNotebook: React.FC<MistakesNotebookProps> = ({
  onStartQuizWithQuestions,
  onOpenAuth,
  isLoggedIn
}) => {
  const [mistakes, setMistakes] = useState<WrongQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  // AI Modal
  const [aiModalQuestion, setAiModalQuestion] = useState<Question | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadMistakes = async () => {
    setLoading(true);
    try {
      const records = await fetchWrongQuestions();
      setMistakes(Array.isArray(records) ? records : []);
    } catch (e) {
      console.error('Failed to load wrong questions', e);
      setMistakes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMistakes();
  }, [isLoggedIn]);

  const handleResolve = async (questionId: string) => {
    try {
      await resolveWrongQuestion(questionId);
      setMistakes((prev) => prev.filter((m) => m.questionId !== questionId));
    } catch (e) {
      console.error('Failed to resolve mistake', e);
    }
  };

  const handleStartRevisionQuiz = async () => {
    if (!isLoggedIn) {
      onOpenAuth?.();
      return;
    }
    setGeneratingQuiz(true);
    try {
      const questions = await generateRevisionQuestions(selectedSubject !== 'All' ? selectedSubject : undefined, 10);
      if (questions.length === 0) {
        alert('No wrong questions found in this category to create a revision quiz!');
        return;
      }
      if (onStartQuizWithQuestions) {
        (onStartQuizWithQuestions as any)(`Mistakes Revision (${selectedSubject})`, questions);
      }
    } catch (e) {
      console.error('Failed to start revision quiz', e);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleOpenAiExplanation = async (q: Question) => {
    if (!isLoggedIn) {
      onOpenAuth?.();
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

  const subjects = ['All', ...Array.from(new Set((mistakes || []).map((m) => m?.question?.subject).filter(Boolean)))];

  const filteredMistakes = (mistakes || []).filter((m) => {
    const q = m?.question;
    if (!q) return false;
    const matchesSubject = selectedSubject === 'All' || (q.subject || '').toLowerCase() === selectedSubject.toLowerCase();
    const matchesSearch =
      !search ||
      (q.text || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.topic || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.subject || '').toLowerCase().includes(search.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0A2540] via-[#113860] to-[#1F54E7] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-[#1F54E7]/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#8BC1E3]/30 text-[#8BC1E3] text-xs font-bold uppercase tracking-wider">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Personalized Mistake Notebook</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Revise & Master Your Missed Questions
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Every wrong answer you make during Model Tests or Practice Sessions is automatically archived here.
              Review step-by-step explanations, solve formulas with MathJax LaTeX, and remove them once mastered!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleStartRevisionQuiz}
              disabled={generatingQuiz || mistakes.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-[#1F54E7] hover:bg-slate-100 active:scale-95 text-xs sm:text-sm font-black rounded-xl shadow-lg transition disabled:opacity-50"
            >
              {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-[#1F54E7]" />}
              <span>Take Revision Quiz ({mistakes.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E9EC] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#6F8498]" />
            <input
              type="text"
              placeholder="Search in wrong answers, tags, topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7] focus:outline-none"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold bg-[#F6F8FB] border border-[#E5E9EC] text-[#0A2540] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F54E7]"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold text-[#0A2540] bg-[#F6F8FB] border border-[#E5E9EC] px-3.5 py-2 rounded-xl shrink-0">
          Missed Questions: <span className="text-rose-600 font-black ml-1">{filteredMistakes.length}</span>
        </div>
      </div>

      {/* Questions List */}
      {!isLoggedIn ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-amber-200/80 space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-amber-200">
            <RotateCcw className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-extrabold text-[#0A2540]">Sign In Required for Revision Notebook</h3>
            <p className="text-xs text-[#6F8498] leading-relaxed">
              Log in or create a candidate account to automatically archive wrong answers from your model tests, review detailed step-by-step solutions, and take customized revision quizzes.
            </p>
          </div>
          <button
            onClick={() => onOpenAuth?.()}
            className="px-6 py-2.5 bg-[#1F54E7] hover:bg-[#1742be] text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            Sign In / Create Account
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-[#6F8498] bg-white rounded-2xl border border-[#E5E9EC] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1F54E7]" />
          <p className="text-xs font-bold text-[#0A2540]">Loading your revision notebook...</p>
        </div>
      ) : filteredMistakes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E9EC] space-y-4">
          <div className="w-16 h-16 bg-[#36C18E]/20 text-[#36C18E] rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-[#36C18E]/30">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#0A2540]">Your Revision Notebook is Clean!</h3>
            <p className="text-xs text-[#6F8498] max-w-md mx-auto">
              You have solved all saved wrong answers or haven't made any mistakes yet. Keep taking practice tests to track weak topics!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map((record, idx) => {
            const q = record.question;
            const isRevealed = !!revealedIds[q.id];

            return (
              <div
                key={record.id}
                className="bg-white rounded-2xl border border-[#E5E9EC] hover:border-[#1F54E7]/40 p-5 sm:p-6 shadow-xs space-y-4 transition"
              >
                {/* Header with Tags for Exam & Topic */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E9EC] pb-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-rose-600">Mistake #{idx + 1}</span>
                    {q.exam && (
                      <span className="px-2.5 py-0.5 rounded-lg font-bold bg-[#8BC1E3]/25 text-[#1F54E7] border border-[#8BC1E3]/40 text-xs">
                        {q.exam}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-lg font-bold bg-[#1F54E7]/10 text-[#1F54E7] text-xs">
                      {q.subject}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg font-semibold bg-[#F6F8FB] text-[#0A2540] border border-[#E5E9EC] text-xs">
                      {q.topic}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-200">
                      Failed {record.attemptsCount} {record.attemptsCount > 1 ? 'times' : 'time'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolve(q.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-[#36C18E]/20 hover:bg-[#36C18E]/30 text-[#0A2540] border border-[#36C18E]/30 rounded-xl transition"
                      title="Mark as learned and remove from mistake notebook"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#36C18E]" />
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-base font-bold text-[#0A2540] leading-relaxed">
                  <MathJaxView text={q.text} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((option, optIdx) => {
                    const correctIndices = q.correctOptionIndices && q.correctOptionIndices.length > 0
                      ? q.correctOptionIndices
                      : (typeof q.correctOptionIndex === 'number' ? [q.correctOptionIndex] : [0]);

                    const isCorrect = correctIndices.includes(optIdx);
                    const isUserChoice = optIdx === record.selectedOptionIndex;

                    let optionStyle = 'bg-[#F6F8FB] border-[#E5E9EC] text-[#0A2540]';

                    if (isUserChoice && !isCorrect) {
                      optionStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-semibold';
                    }

                    if (isRevealed && isCorrect) {
                      optionStyle = 'bg-[#36C18E]/15 border-[#36C18E] text-[#0A2540] font-bold';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition-all ${optionStyle}`}
                      >
                        <span className="w-5 h-5 rounded-md bg-white border border-[#E5E9EC] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#0A2540]">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <div className="flex-1">
                          <MathJaxView text={option} />
                        </div>
                        {isUserChoice && !isCorrect && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            Your Previous Answer
                          </span>
                        )}
                        {isRevealed && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-[#36C18E] flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Option Box */}
                {isRevealed && (
                  <div className="p-4 bg-[#F6F8FB] rounded-xl border border-[#8BC1E3] text-xs text-[#0A2540] space-y-2 animate-in fade-in duration-200">
                    <div className="font-bold text-[#1F54E7] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#36C18E]" /> Correct Answer:{' '}
                      {(q.correctOptionIndices && q.correctOptionIndices.length > 0 ? q.correctOptionIndices : [q.correctOptionIndex ?? 0])
                        .map((idx) => `Option ${String.fromCharCode(65 + idx)} (${q.options[idx] || ''})`)
                        .join(', ')}
                    </div>
                    <div className="text-[#0A2540] leading-relaxed pt-1.5 border-t border-[#E5E9EC]">
                      <MathJaxView text={q.explanation || 'Step-by-step verified conceptual breakdown.'} />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setRevealedIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F6F8FB] hover:bg-[#E5E9EC] text-[#0A2540] text-xs font-bold rounded-xl border border-[#E5E9EC] transition-colors"
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-[#6F8498]" /> : <Eye className="w-3.5 h-3.5 text-[#1F54E7]" />}
                    {isRevealed ? 'Hide Explanation' : 'View Correct Solution & Explanation'}
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

      {/* Tutor Explanation Modal */}
      {aiModalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E9EC] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#0A2540] via-[#113860] to-[#1F54E7] p-5 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8BC1E3]" />
                <h3 className="font-bold text-base">Academic Tutor - Step-by-Step Analysis</h3>
              </div>
              <button
                onClick={() => setAiModalQuestion(null)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 bg-[#F6F8FB] border border-[#E5E9EC] rounded-xl">
                <span className="text-[10px] font-bold uppercase text-[#6F8498]">Question</span>
                <div className="font-bold text-sm text-[#0A2540] mt-1">
                  <MathJaxView text={aiModalQuestion.text} />
                </div>
              </div>

              {aiLoading ? (
                <div className="py-12 text-center text-[#6F8498] space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1F54E7] mx-auto" />
                  <p className="text-xs font-bold text-[#0A2540]">Tutor is analyzing common pitfalls and shortest formulas...</p>
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
