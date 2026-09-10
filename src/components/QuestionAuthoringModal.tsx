import React, { useState, useEffect } from 'react';
import { createQuestion, checkQuestionDuplicateApi } from '../api';
import { Difficulty, User, Question } from '../types';
import { PlusCircle, X, CheckCircle2, Sigma, Sparkles, Eye, Code, Wand2, Plus, Trash2, CheckSquare, Square, GitPullRequest, GitCommit, AlertTriangle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { MathJaxView } from './MathJaxView';
import { MathFormulaToolbar } from './MathFormulaToolbar';
import { SmartFormulaEditor } from './SmartFormulaEditor';
import { normalizeMixedContentToLatex, validateTextWithKatex } from '../utils/mathNormalizer';

interface QuestionAuthoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: string[];
  currentUser?: User | null;
  onQuestionAdded: () => void;
}

export const QuestionAuthoringModal: React.FC<QuestionAuthoringModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentUser,
  onQuestionAdded
}) => {
  if (!isOpen) return null;

  const userCanDirectAdd = currentUser?.role === 'SUPER_ADMIN' ||
    (currentUser?.role === 'ADMIN' && (currentUser.adminPrivileges?.canDirectAdd ?? true));

  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '', '']); // Default 5 options
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>([0]);
  const [subject, setSubject] = useState(subjects[0] || 'Mathematics');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [exam, setExam] = useState('');
  const [questionSource, setQuestionSource] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [autoNormalizeMath, setAutoNormalizeMath] = useState(true);

  // Commit & Pull Request fields
  const [submitAsProposal, setSubmitAsProposal] = useState(!userCanDirectAdd);
  const [commitTitle, setCommitTitle] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  // Duplicate Detection State
  const [duplicateStatus, setDuplicateStatus] = useState<{
    isDuplicate: boolean;
    similarity: number;
    topMatch?: { question: Question; similarity: number; reason: string };
    matches: Array<{ question: Question; similarity: number; reason: string }>;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Debounced duplicate detection
  useEffect(() => {
    if (!text || text.trim().length < 15) {
      setDuplicateStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicate(true);
        const res = await checkQuestionDuplicateApi({
          text,
          options: options.filter(o => o.trim().length > 0),
          subject
        });
        setDuplicateStatus(res);
      } catch (err) {
        console.warn('Duplicate check error', err);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [text, subject]);

  // Active target field to insert math snippet
  const [activeField, setActiveField] = useState<'text' | 'explanation' | number>('text');

  const handleOptionChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = val;
    setOptions(next);
  };

  const handleAddOption = () => {
    if (options.length >= 8) return;
    setOptions([...options, '']);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, idx) => idx !== indexToRemove);
    setOptions(newOptions);
    // Update correctOptionIndices
    const newCorrect = correctOptionIndices
      .filter((idx) => idx !== indexToRemove)
      .map((idx) => (idx > indexToRemove ? idx - 1 : idx));
    setCorrectOptionIndices(newCorrect.length > 0 ? newCorrect : [0]);
  };

  const toggleCorrectIndex = (index: number) => {
    if (!isMultiSelect) {
      setCorrectOptionIndices([index]);
    } else {
      if (correctOptionIndices.includes(index)) {
        if (correctOptionIndices.length > 1) {
          setCorrectOptionIndices(correctOptionIndices.filter((i) => i !== index));
        }
      } else {
        setCorrectOptionIndices([...correctOptionIndices, index].sort((a, b) => a - b));
      }
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    if (activeField === 'text') {
      setText((prev) => prev + ' ' + snippet);
    } else if (activeField === 'explanation') {
      setExplanation((prev) => prev + ' ' + snippet);
    } else if (typeof activeField === 'number') {
      handleOptionChange(activeField, (options[activeField] || '') + ' ' + snippet);
    }
  };

  const handleConvertPlainMath = () => {
    const normText = normalizeMixedContentToLatex(text).normalized;
    const normOptions = options.map((opt) => normalizeMixedContentToLatex(opt).normalized);
    const normExplanation = normalizeMixedContentToLatex(explanation).normalized;

    setText(normText);
    setOptions(normOptions);
    setExplanation(normExplanation);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Question text is required.');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setError('All option fields must be filled.');
      return;
    }
    if (correctOptionIndices.length === 0) {
      setError('Please select at least one correct answer.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Auto-normalize if enabled
      const finalRawText = text.trim();
      const finalText = autoNormalizeMath ? normalizeMixedContentToLatex(finalRawText).normalized : finalRawText;
      const finalOptions = autoNormalizeMath
        ? options.map((o) => normalizeMixedContentToLatex(o.trim()).normalized)
        : options.map((o) => o.trim());
      const finalExplanation = autoNormalizeMath && explanation.trim()
        ? normalizeMixedContentToLatex(explanation.trim()).normalized
        : (explanation.trim() || 'Detailed step-by-step solution provided.');

      const result = await createQuestion({
        text: finalText,
        options: finalOptions,
        correctOptionIndex: correctOptionIndices[0] ?? 0,
        correctOptionIndices: correctOptionIndices,
        isMultiSelect: isMultiSelect || correctOptionIndices.length > 1,
        explanation: finalExplanation,
        subject,
        topic: topic || 'General',
        subtopic: subtopic.trim() || undefined,
        exam: exam.trim() || undefined,
        questionSource: questionSource.trim() || undefined,
        difficulty,
        tags: [subject, topic || 'General', isMultiSelect ? 'Multi-Answer' : 'Single-Answer'],
      }, {
        asProposal: submitAsProposal,
        commitTitle: commitTitle.trim() || `feat(${subject}): Add question on ${topic || 'General'}`,
        commitMessage: commitMessage.trim() || 'Authored question with verified options and solution'
      });

      if (result.isProposal) {
        setSuccessInfo(`🚀 Pull Request #${result.pullRequest?.prNumber} created! Waiting for Admin review and merge.`);
        setTimeout(() => {
          onQuestionAdded();
          onClose();
        }, 1800);
      } else {
        setSuccessInfo(`🎉 Question added directly to Master Question Bank!`);
        setTimeout(() => {
          onQuestionAdded();
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Author Question (Single or Multi-Answer, 2-8 Choices)</h2>
              <p className="text-[11px] text-teal-200/80">Supports plain math conversion, KaTeX, LaTeX ($...$), 5+ options & multi-select answers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Quick Action Bar for Math Normalization & Question Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-teal-950">
              <input
                type="checkbox"
                checked={autoNormalizeMath}
                onChange={(e) => setAutoNormalizeMath(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 accent-teal-600"
              />
              <span>Auto-Normalize Plain Math (e.g. x^2, 1/2, sqrt(25), 30 deg to LaTeX)</span>
            </label>

            <button
              type="button"
              onClick={handleConvertPlainMath}
              className="px-3 py-1 bg-white hover:bg-teal-100 text-teal-800 font-bold text-[11px] rounded-lg border border-teal-300 shadow-xs flex items-center gap-1.5 transition"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Convert Fields to LaTeX</span>
            </button>
          </div>

          {/* Question Type Toggle: Single Choice vs Multi-Select */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="font-bold text-slate-800 text-xs block">Question Answer Mode</span>
              <p className="text-[11px] text-slate-500">Enable if the question has 2 or 3 correct answers that candidates must select.</p>
            </div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => {
                  setIsMultiSelect(false);
                  setCorrectOptionIndices([correctOptionIndices[0] ?? 0]);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  !isMultiSelect ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Choice
              </button>
              <button
                type="button"
                onClick={() => setIsMultiSelect(true)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  isMultiSelect ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Multi-Answer (2+ Correct)
              </button>
            </div>
          </div>

          {/* Math Quick Insert Toolbar */}
          <MathFormulaToolbar onInsertSnippet={handleInsertSnippet} />

          {/* Question Text with Smart Formula / Plain-Text Editor & Duplicate Warning */}
          <div className="space-y-2">
            <SmartFormulaEditor
              id="question-stem-editor"
              label="Question Stem / Problem (Plain text or LaTeX)"
              required
              rows={3}
              value={text}
              onChange={(val) => setText(val)}
              placeholder="e.g. সম্পূর্ণ খালি একটি চৌবাচ্চা একটি পাইপ দিয়ে ৫ ঘণ্টায় ভর্তি করা যায়... বা x² - 5x + 6 = 0..."
              helperText="You can type plain Bengali math (১/৫, x², √x) or click 'Format Math' to auto-convert to LaTeX."
            />

            {/* Live Duplicate Warning Indicator */}
            {checkingDuplicate && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 animate-pulse px-1">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                <span>Checking question bank for duplicates...</span>
              </div>
            )}

            {duplicateStatus?.isDuplicate && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Possible Duplicate Detected ({Math.round(duplicateStatus.similarity * 100)}% Match)</span>
                  </div>
                  {duplicateStatus.topMatch?.question && (
                    <span className="font-mono text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-md">
                      #{duplicateStatus.topMatch.question.id.slice(-6)}
                    </span>
                  )}
                </div>

                {duplicateStatus.topMatch?.question && (
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1 font-sans">
                    <p className="font-semibold text-slate-800 line-clamp-2">
                      &quot;{duplicateStatus.topMatch.question.text}&quot;
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span>Subject: <strong>{duplicateStatus.topMatch.question.subject}</strong></span>
                      <span>Exam: <strong>{duplicateStatus.topMatch.question.exam || 'General'}</strong></span>
                      <span className="text-amber-700">{duplicateStatus.topMatch.reason}</span>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-amber-700">
                  Please verify this question does not already exist before creating a duplicate.
                </p>
              </div>
            )}
          </div>

          {/* Options List with Dynamic 5+ choices and Multi-Select Checkboxes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Choices / Options ({options.length} choices)</span>
                {isMultiSelect && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    Multi-Select Mode: Check all correct answers
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                disabled={options.length >= 8}
                className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Choice ({options.length}/8)</span>
              </button>
            </div>

            {options.map((opt, i) => {
              const isChecked = correctOptionIndices.includes(i);
              return (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrectIndex(i)}
                    className={`p-1.5 rounded-md border transition ${
                      isChecked
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-400 border-slate-300 hover:border-slate-400'
                    }`}
                    title={isChecked ? 'Selected as Correct Answer' : 'Click to mark as Correct Answer'}
                  >
                    {isMultiSelect ? (
                      isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />
                    ) : (
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isChecked ? 'border-white bg-white' : 'border-slate-400'}`}>
                        {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-emerald-700" />}
                      </div>
                    )}
                  </button>
                  <span className="font-bold text-slate-500 w-5">{String.fromCharCode(65 + i)}:</span>
                  <input
                    type="text"
                    required
                    placeholder={`Option ${String.fromCharCode(65 + i)} (e.g. x = 2, 3 or 1/2)`}
                    value={opt}
                    onFocus={() => setActiveField(i)}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className={`flex-1 p-2 bg-slate-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 text-xs ${
                      activeField === i ? 'border-teal-500 ring-1 ring-teal-500/30' : 'border-slate-300'
                    }`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remove this option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <p className="text-[10px] text-slate-500 font-medium">
              * Click the checkmark/circle next to an option to mark it as correct. Selected correct answers:{' '}
              <strong className="text-emerald-700">{correctOptionIndices.map((idx) => String.fromCharCode(65 + idx)).join(', ')}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              >
                {subjects.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Topic</label>
              <input
                type="text"
                placeholder="e.g. Algebra & Equations"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subtopic / Unit</label>
              <input
                type="text"
                placeholder="e.g. Pipes and Cistern / Logarithm"
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Exam</label>
              <input
                type="text"
                placeholder="e.g. BUET-2024 / 45th BCS"
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Question Source / Reference</label>
              <input
                type="text"
                placeholder="e.g. KGDCL – Technician-2024"
                value={questionSource}
                onChange={(e) => setQuestionSource(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Explanation with Smart Formula / Plain-Text Editor */}
          <div>
            <SmartFormulaEditor
              id="explanation-editor"
              label="Explanation / Solution (KaTeX / Plain Math)"
              rows={3}
              value={explanation}
              onChange={(val) => setExplanation(val)}
              placeholder="e.g. সমীকরণ: x² - 5x + 6 = 0 => (x-2)(x-3) = 0. সুতরাং x = 2 অথবা x = 3."
              helperText="Candidates see this detailed step-by-step reasoning after completing their test."
            />
          </div>

          {/* Live MathJax Preview Accordion */}
          <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-950 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Live KaTeX & MathJax Render Preview
              </span>
              <button
                type="button"
                onClick={() => setShowLivePreview(!showLivePreview)}
                className="text-[11px] font-semibold text-teal-700 hover:underline"
              >
                {showLivePreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>

            {showLivePreview && (
              <div className="space-y-2 pt-1 border-t border-teal-200/60">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Question Stem:</span>
                  <div className="text-slate-900 font-semibold text-xs mt-0.5 min-h-[1.5rem]">
                    {text ? <MathJaxView text={text} /> : <span className="text-slate-400 italic">No question text entered yet...</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {options.map((opt, i) => {
                    const isCorrect = correctOptionIndices.includes(i);
                    return (
                      <div
                        key={i}
                        className={`p-2 rounded-lg text-[11px] border ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-400 font-semibold text-emerald-950 ring-1 ring-emerald-400/30'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span>
                        {opt ? <MathJaxView text={opt} inline /> : <span className="text-slate-400 italic">Empty</span>}
                        {isCorrect && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.2 bg-emerald-600 text-white rounded font-bold">
                            CORRECT
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {explanation && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Explanation:</span>
                    <div className="text-slate-800 text-[11px] mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200">
                      <MathJaxView text={explanation} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Commit & Pull Request Submission Mode */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-800 text-xs">Commit & Merging Flow</span>
              </div>

              {userCanDirectAdd ? (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700">
                    <input
                      type="radio"
                      name="commitMode"
                      checked={!submitAsProposal}
                      onChange={() => setSubmitAsProposal(false)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Direct Push to Bank</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-indigo-700">
                    <input
                      type="radio"
                      name="commitMode"
                      checked={submitAsProposal}
                      onChange={() => setSubmitAsProposal(true)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Open Pull Request (Peer Review)</span>
                  </label>
                </div>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <GitCommit className="w-3 h-3" /> Moderator Commit (Admin Approval Required)
                </span>
              )}
            </div>

            {submitAsProposal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Commit Title
                  </label>
                  <input
                    type="text"
                    placeholder={`feat(${subject}): Add question on ${topic || 'Syllabus'}`}
                    value={commitTitle}
                    onChange={(e) => setCommitTitle(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Commit Message / Change Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Added past exam question with verified step-by-step KaTeX solution"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                submitAsProposal
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              {submitAsProposal ? <GitPullRequest className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting
                ? 'Processing...'
                : submitAsProposal
                ? 'Submit as Pull Request (Proposal)'
                : 'Commit Directly to Question Bank'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default QuestionAuthoringModal;
