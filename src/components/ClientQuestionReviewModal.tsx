import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Send,
  BookOpen,
  DollarSign,
  Phone,
  FileText,
  Sigma,
  Eye,
  Check,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Question, User } from '../types';
import { proposeQuestionReview } from '../api';
import { MathJaxView } from './MathJaxView';
import { MathFormulaToolbar } from './MathFormulaToolbar';

interface ClientQuestionReviewModalProps {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSuccess?: (message: string) => void;
}

export const ClientQuestionReviewModal: React.FC<ClientQuestionReviewModalProps> = ({
  question,
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  if (!isOpen || !question) return null;

  const [reviewType, setReviewType] = useState<
    'ANSWER_CORRECTION' | 'EXPLANATION_ENHANCEMENT' | 'LATEX_FIX' | 'TYPO_FIX' | 'GENERAL_UPDATE'
  >('ANSWER_CORRECTION');

  const [proposedText, setProposedText] = useState(question.text);
  const [proposedOptions, setProposedOptions] = useState<string[]>([...question.options]);
  const [proposedCorrectIndex, setProposedCorrectIndex] = useState<number>(
    typeof question.correctOptionIndex === 'number' ? question.correctOptionIndex : 0
  );
  const [proposedExplanation, setProposedExplanation] = useState(question.explanation || '');
  const [referenceSource, setReferenceSource] = useState('');
  const [reviewReason, setReviewReason] = useState('');

  // Contributor contact info (especially for future rewards)
  const [contributorName, setContributorName] = useState(currentUser?.name || '');
  const [contributorEmail, setContributorEmail] = useState(currentUser?.email || '');
  const [contributorPhone, setContributorPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...proposedOptions];
    updated[idx] = val;
    setProposedOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewReason.trim()) {
      setError('Please provide a brief reason or explanation note for your review.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await proposeQuestionReview(question.id, {
        proposedQuestion: {
          text: proposedText.trim(),
          options: proposedOptions.map(o => o.trim()),
          correctOptionIndex: proposedCorrectIndex,
          correctOptionIndices: [proposedCorrectIndex],
          explanation: proposedExplanation.trim(),
          subject: question.subject,
          topic: question.topic,
          subtopic: question.subtopic,
          exam: question.exam,
          difficulty: question.difficulty
        },
        reviewType,
        reviewReason: reviewReason.trim(),
        referenceSource: referenceSource.trim() || undefined,
        contributorName: contributorName.trim() || undefined,
        contributorEmail: contributorEmail.trim() || undefined,
        contributorPhone: contributorPhone.trim() || undefined
      });

      if (res.success) {
        if (onSuccess) {
          onSuccess(res.message);
        }
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit question review proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Propose Question Review & Correction
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Earn Rewards
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                Submit corrections to the Editorial Board. Approved reviews go live and earn contributor payouts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Future Payout Banner */}
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-950 shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Reviewer Honorarium:</strong> Future approved reviews qualify for direct mobile wallet payouts (bKash/Nagad)!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline shrink-0"
          >
            {showLivePreview ? 'Edit Proposal' : 'Preview Changes'}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Question Reference Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="font-bold text-slate-700">Currently Published Question in Bank:</span>
              <span className="font-mono text-indigo-600">ID: #{question.id.slice(-8)}</span>
            </div>
            <div className="font-bold text-slate-800 text-sm">
              <MathJaxView text={question.text} />
            </div>
            <div className="text-slate-500 text-[11px]">
              Current Answer: Option {String.fromCharCode(65 + (question.correctOptionIndex ?? 0))} ({question.options[question.correctOptionIndex ?? 0] || 'N/A'})
            </div>
          </div>

          {!showLivePreview ? (
            <>
              {/* Review Type Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  What are you proposing to correct or enhance?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ANSWER_CORRECTION', label: 'Answer Key', desc: 'Wrong answer fixed' },
                    { id: 'EXPLANATION_ENHANCEMENT', label: 'Rich Solution', desc: 'Step-by-step logic' },
                    { id: 'LATEX_FIX', label: 'Math / KaTeX', desc: 'Equation syntax fix' },
                    { id: 'TYPO_FIX', label: 'Typo / Bangla', desc: 'Spelling or wording' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setReviewType(tab.id as any)}
                      className={`p-2.5 rounded-xl text-left border transition ${
                        reviewType === tab.id
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-2 ring-indigo-200'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs">{tab.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{tab.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Proposed Question Stem */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Proposed Question Stem (Supports KaTeX/LaTeX & Unicode Bangla)
                  </label>
                  <span className="text-[11px] text-slate-400">Wrap math with $...$</span>
                </div>
                <MathFormulaToolbar
                  targetTextareaId="proposed-stem-textarea"
                  onInsertLatex={(latex) => {
                    setProposedText(prev => prev + ' ' + latex);
                  }}
                />
                <textarea
                  id="proposed-stem-textarea"
                  rows={3}
                  value={proposedText}
                  onChange={(e) => setProposedText(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-xs"
                  placeholder="Enter corrected question stem..."
                />
              </div>

              {/* Proposed Options & Correct Answer */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800">
                  Options & Correct Answer Selection (Click radio to mark correct answer)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {proposedOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                        proposedCorrectIndex === idx
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`opt-radio-${idx}`}
                        name="correct-option"
                        checked={proposedCorrectIndex === idx}
                        onChange={() => setProposedCorrectIndex(idx)}
                        className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-slate-500 w-5">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs focus:outline-hidden text-slate-800"
                        placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Explanation */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">
                  Proposed Step-by-Step Explanation / Solution
                </label>
                <textarea
                  rows={3}
                  value={proposedExplanation}
                  onChange={(e) => setProposedExplanation(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-xs"
                  placeholder="Explain why this answer is correct step-by-step..."
                />
              </div>

              {/* Review Reason & Reference Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Review Reason / Justification <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder="e.g., Question answer key was mistakenly marked as B instead of A."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Authentic Reference Source (Optional)
                  </label>
                  <input
                    type="text"
                    value={referenceSource}
                    onChange={(e) => setReferenceSource(e.target.value)}
                    placeholder="e.g., NCTB Class 9-10 Math page 142 / 46th BCS Gazette"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Reviewer Reward Contact Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Contributor Information & Honorarium Payout Number
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Your Name</label>
                    <input
                      type="text"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      placeholder="Candidate / Reviewer Name"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Email</label>
                    <input
                      type="email"
                      value={contributorEmail}
                      onChange={(e) => setContributorEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      bKash / Nagad Mobile (For Future Reward)
                    </label>
                    <input
                      type="tel"
                      value={contributorPhone}
                      onChange={(e) => setContributorPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Live Preview of How the Question will Look */
            <div className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Live Preview of Proposed Question (How candidates will view it):
                </span>
                
                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-900 text-sm">
                    <MathJaxView text={proposedText} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {proposedOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          proposedCorrectIndex === idx
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-bold text-slate-500">{String.fromCharCode(65 + idx)}.</span>
                        <MathJaxView text={opt} inline />
                        {proposedCorrectIndex === idx && (
                          <span className="ml-auto text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {proposedExplanation && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1">
                      <span className="font-bold text-indigo-950 text-xs">Solution / Explanation:</span>
                      <div className="text-slate-700 text-xs">
                        <MathJaxView text={proposedExplanation} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-2 active:scale-95"
            >
              {submitting ? (
                <span>Submitting Proposal...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Review to Admin</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
