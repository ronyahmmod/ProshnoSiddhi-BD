import React, { useState } from 'react';
import { QuizAttempt, Question } from '../types';
import { MathJaxView } from './MathJaxView';
import { ClientQuestionReviewModal } from './ClientQuestionReviewModal';
import { getStoredUser } from '../api';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  LayoutDashboard,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  MinusCircle,
  AlertCircle
} from 'lucide-react';

interface QuizResultProps {
  attempt: QuizAttempt;
  questions: Question[];
  onBackToDashboard: () => void;
  onRetakeQuiz: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  attempt,
  questions,
  onBackToDashboard,
  onRetakeQuiz
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>(() => {
    // Expand all missed questions by default for quick review
    const initial: Record<string, boolean> = {};
    attempt.responses.forEach((resp) => {
      const q = questions.find((item) => item.id === resp.questionId);
      if (q) {
        const correctIndices = q.correctOptionIndices && q.correctOptionIndices.length > 0
          ? q.correctOptionIndices
          : (typeof q.correctOptionIndex === 'number' ? [q.correctOptionIndex] : [0]);
        const userIndices = resp.selectedOptionIndices && resp.selectedOptionIndices.length > 0
          ? resp.selectedOptionIndices
          : (resp.selectedOptionIndex !== null && resp.selectedOptionIndex !== undefined ? [resp.selectedOptionIndex] : []);
        
        const isCorrect = userIndices.length > 0 &&
          correctIndices.length === userIndices.length &&
          correctIndices.every((idx) => userIndices.includes(idx));

        if (!isCorrect) {
          initial[q.id] = true;
        }
      }
    });
    return initial;
  });

  const [selectedReviewQuestion, setSelectedReviewQuestion] = useState<Question | null>(null);
  const [successReviewMsg, setSuccessReviewMsg] = useState<string | null>(null);
  const currentUser = getStoredUser();

  const toggleExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const minutesSpent = Math.floor(attempt.durationSeconds / 60);
  const secondsSpent = attempt.durationSeconds % 60;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Scorecard Hero Box */}
      <div className="bg-gradient-to-r from-[#0A2540] via-[#113860] to-[#1F54E7] rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-[#1F54E7]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8BC1E3]">
              Exam Result • {attempt.subject}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">{attempt.quizTitle}</h1>
            <p className="text-xs text-slate-200 mt-0.5">
              Completed on {new Date(attempt.completedAt).toLocaleString()}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-[#8BC1E3]/40 rounded-2xl text-[#8BC1E3] font-bold text-sm">
            <Award className="w-5 h-5 text-amber-300" />
            Accuracy: {attempt.accuracyPercentage}%
          </div>
        </div>

        {/* Score Breakdown Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-200">Merit Score</span>
            <p className="text-2xl font-black text-white mt-1">
              {attempt.totalScore} <span className="text-xs text-slate-300">/ {attempt.maxScore}</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-200">Correct Answers</span>
            <p className="text-2xl font-black text-[#36C18E] mt-1">{attempt.correctCount}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-200">Incorrect</span>
            <p className="text-2xl font-black text-rose-300 mt-1">{attempt.incorrectCount}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-200">Time Spent</span>
            <p className="text-2xl font-black text-[#8BC1E3] mt-1">
              {minutesSpent}m {secondsSpent}s
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors border border-white/10"
          >
            <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
          </button>

          <button
            onClick={onRetakeQuiz}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#1F54E7] hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try Another Test
          </button>
        </div>
      </div>

      {/* Question-by-Question Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0A2540] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1F54E7]" />
            Detailed Question Review & Explanations
          </h2>
          <span className="text-xs text-[#6F8498] font-medium hidden sm:inline">
            Review answers with complete step-by-step reasoning
          </span>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const resp = attempt.responses.find((r) => r.questionId === q.id);
            
            const correctIndices = q.correctOptionIndices && q.correctOptionIndices.length > 0
              ? q.correctOptionIndices
              : (typeof q.correctOptionIndex === 'number' ? [q.correctOptionIndex] : [0]);

            const userIndices = resp?.selectedOptionIndices && resp.selectedOptionIndices.length > 0
              ? resp.selectedOptionIndices
              : (resp?.selectedOptionIndex !== null && resp?.selectedOptionIndex !== undefined ? [resp.selectedOptionIndex] : []);

            const isSkipped = userIndices.length === 0;
            const isCorrect = !isSkipped &&
              correctIndices.length === userIndices.length &&
              correctIndices.every((cIdx) => userIndices.includes(cIdx));

            const isExpanded = !!expandedQuestions[q.id];
            const isMulti = q.isMultiSelect || correctIndices.length > 1;

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all space-y-4 ${
                  isCorrect
                    ? 'border-[#36C18E]/50 shadow-2xs'
                    : isSkipped
                    ? 'border-[#E5E9EC]'
                    : 'border-rose-300 bg-rose-50/15 shadow-2xs'
                }`}
              >
                {/* Header with Tags for Exam & Topic */}
                <div className="flex flex-wrap items-center justify-between gap-2 cursor-pointer pb-2 border-b border-[#E5E9EC]" onClick={() => toggleExpand(q.id)}>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-[#6F8498]">Q#{idx + 1}</span>
                    
                    {/* Exam Tag */}
                    {q.exam && (
                      <span className="px-2.5 py-0.5 rounded-lg font-bold bg-[#8BC1E3]/25 text-[#1F54E7] border border-[#8BC1E3]/40 text-[11px]">
                        {q.exam}
                      </span>
                    )}

                    {/* Topic Tag */}
                    <span className="px-2.5 py-0.5 rounded-lg font-semibold bg-[#F6F8FB] text-[#0A2540] border border-[#E5E9EC] text-[11px]">
                      {q.topic}
                    </span>

                    {isMulti && (
                      <span className="px-2 py-0.5 bg-[#8BC1E3]/15 text-[#0A2540] text-[10px] font-bold rounded-md">
                        Multi-Answer
                      </span>
                    )}

                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 font-bold text-[#0A2540] bg-[#36C18E]/20 border border-[#36C18E]/30 px-2.5 py-0.5 rounded-lg text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#36C18E]" /> Correct (+1.0)
                      </span>
                    ) : isSkipped ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#6F8498] bg-[#F6F8FB] border border-[#E5E9EC] px-2.5 py-0.5 rounded-lg text-xs">
                        <MinusCircle className="w-3.5 h-3.5" /> Skipped (0.0)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-lg text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect (-0.25)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReviewQuestion(q);
                      }}
                      className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Report incorrect question or suggest revision (earn review bounty)"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>ভুল রিপোর্ট / রিভিউ</span>
                    </button>
                    <button className="text-[#6F8498] hover:text-[#0A2540] text-xs font-bold flex items-center gap-1">
                      <span>{isExpanded ? 'Hide Explanation' : 'View Explanation'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Question Stem */}
                <div className="text-sm sm:text-base font-bold text-[#0A2540] leading-relaxed">
                  <MathJaxView text={q.text} as="div" />
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-medium">
                  {q.options.map((optText, optIdx) => {
                    const isRightAnswer = correctIndices.includes(optIdx);
                    const isSelectedByCandidate = userIndices.includes(optIdx);

                    let optStyle = 'bg-[#F6F8FB] border-[#E5E9EC] text-[#0A2540]';

                    if (isRightAnswer) {
                      optStyle = 'bg-[#36C18E]/15 border-[#36C18E] text-[#0A2540] font-bold';
                    } else if (isSelectedByCandidate && !isRightAnswer) {
                      optStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-bold line-through';
                    }

                    return (
                      <div key={optIdx} className={`p-3 rounded-xl border flex items-center gap-2.5 ${optStyle}`}>
                        <span className="w-5 h-5 rounded-md bg-white border border-[#E5E9EC] text-[10px] font-bold flex items-center justify-center flex-shrink-0 text-[#0A2540]">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <div className="flex-1 leading-relaxed">
                          <MathJaxView text={optText} inline />
                        </div>
                        {isRightAnswer && <CheckCircle2 className="w-4 h-4 text-[#36C18E] flex-shrink-0 ml-1" />}
                        {isSelectedByCandidate && !isRightAnswer && (
                          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 ml-1" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Expanded Explanation Option Box */}
                {isExpanded && (
                  <div className="p-4 bg-[#F6F8FB] rounded-xl border border-[#8BC1E3] text-xs text-[#0A2540] space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1F54E7] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Detailed Explanation & Concept
                      </span>
                    </div>
                    <div className="leading-relaxed text-[#0A2540] pt-1 border-t border-[#E5E9EC]">
                      <MathJaxView text={q.explanation || 'Step-by-step mathematical reasoning and verified syllabus logic.'} as="div" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Review / Error Report Modal */}
      {selectedReviewQuestion && (
        <ClientQuestionReviewModal
          question={selectedReviewQuestion}
          isOpen={!!selectedReviewQuestion}
          currentUser={currentUser}
          onClose={() => setSelectedReviewQuestion(null)}
          onSuccess={(msg) => {
            setSuccessReviewMsg(msg);
            setSelectedReviewQuestion(null);
            setTimeout(() => setSuccessReviewMsg(null), 6000);
          }}
        />
      )}

      {/* Success Toast */}
      {successReviewMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-600 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <Award className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-bold">{successReviewMsg}</span>
        </div>
      )}

    </div>
  );
};
