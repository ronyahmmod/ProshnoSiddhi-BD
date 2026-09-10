import React, { useState, useEffect } from 'react';
import { Question, QuizQuestionResponse, QuizAttempt } from '../types';
import { submitQuiz } from '../api';
import { MathJaxView } from './MathJaxView';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flag,
  ArrowLeft,
  ArrowRight,
  Send,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';

interface QuizRunnerProps {
  quiz: {
    id: string;
    title: string;
    subject: string;
    mode: 'practice' | 'exam';
    durationMinutes: number;
    negativeMarking: boolean;
    negativeMarkPerWrong: number;
    questions: Question[];
  };
  onFinishQuiz: (attempt: QuizAttempt) => void;
  onCancelQuiz: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  quiz,
  onFinishQuiz,
  onCancelQuiz
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<QuizQuestionResponse[]>(() =>
    quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIndex: null,
      selectedOptionIndices: [],
      isMarkedForReview: false,
      timeSpentSeconds: 0,
    }))
  );

  // Timer
  const totalSecondsInitial = quiz.durationMinutes * 60;
  const [timeRemaining, setTimeRemaining] = useState(totalSecondsInitial);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitWarningModal, setShowExitWarningModal] = useState(false);

  // Accidental Navigation & Back-Button Trap Warning
  useEffect(() => {
    // 1. Warn on browser tab close or full page reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active exam/quiz in progress. Leaving will forfeit your exam session!';
      return e.returnValue;
    };

    // 2. Prevent accidental browser back button / mouse back click
    window.history.pushState({ examActive: true }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Re-push history state so browser doesn't immediately navigate away
      window.history.pushState({ examActive: true }, '', window.location.href);
      setShowExitWarningModal(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });

      // Track time spent on current question
      setResponses((prev) => {
        const next = [...prev];
        if (next[currentIndex]) {
          next[currentIndex] = {
            ...next[currentIndex],
            timeSpentSeconds: next[currentIndex].timeSpentSeconds + 1,
          };
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const currentQ = quiz.questions[currentIndex];
  const currentResp = responses[currentIndex];
  const isMulti = Boolean(currentQ?.isMultiSelect || (currentQ?.correctOptionIndices && currentQ.correctOptionIndices.length > 1));

  const handleSelectOption = (optIndex: number) => {
    setResponses((prev) => {
      const next = [...prev];
      const resp = next[currentIndex];
      if (!resp) return prev;

      if (!isMulti) {
        // Single choice
        next[currentIndex] = {
          ...resp,
          selectedOptionIndex: optIndex,
          selectedOptionIndices: [optIndex],
        };
      } else {
        // Multi choice toggle
        const currentSelected = resp.selectedOptionIndices || (resp.selectedOptionIndex !== null && resp.selectedOptionIndex !== undefined ? [resp.selectedOptionIndex] : []);
        let newSelected: number[];
        if (currentSelected.includes(optIndex)) {
          newSelected = currentSelected.filter((i) => i !== optIndex);
        } else {
          newSelected = [...currentSelected, optIndex].sort((a, b) => a - b);
        }

        next[currentIndex] = {
          ...resp,
          selectedOptionIndex: newSelected.length > 0 ? newSelected[0] : null,
          selectedOptionIndices: newSelected,
        };
      }
      return next;
    });
  };

  const handleToggleReview = () => {
    setResponses((prev) => {
      const next = [...prev];
      if (next[currentIndex]) {
        next[currentIndex] = {
          ...next[currentIndex],
          isMarkedForReview: !next[currentIndex].isMarkedForReview,
        };
      }
      return next;
    });
  };

  const handleAutoSubmit = async () => {
    await executeSubmission();
  };

  const executeSubmission = async () => {
    setSubmitting(true);
    try {
      const attempt = await submitQuiz({
        quizTitle: quiz.title,
        subject: quiz.subject,
        mode: quiz.mode,
        durationSeconds: totalSecondsInitial - timeRemaining,
        responses,
        negativeMarking: quiz.negativeMarking,
        negativeMarkPerWrong: quiz.negativeMarkPerWrong,
      });
      onFinishQuiz(attempt);
    } catch (err) {
      console.error('Quiz submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const minutesLeft = Math.floor(timeRemaining / 60);
  const secondsLeft = timeRemaining % 60;
  const isTimeLow = timeRemaining < 120; // < 2 minutes

  const isQuestionAnswered = (resp: QuizQuestionResponse) => {
    if (resp.selectedOptionIndices && resp.selectedOptionIndices.length > 0) return true;
    return resp.selectedOptionIndex !== null && resp.selectedOptionIndex !== undefined;
  };

  const answeredCount = responses.filter(isQuestionAnswered).length;
  const reviewCount = responses.filter((r) => r.isMarkedForReview).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Quiz Top Control Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E9EC] p-4 sm:p-5 shadow-xs sticky top-20 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExitWarningModal(true)}
            className="p-2 text-[#6F8498] hover:text-[#0A2540] hover:bg-[#F6F8FB] rounded-xl transition-colors"
            title="Exit Test (Warning Protected)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[#0A2540] text-sm sm:text-base">{quiz.title}</h2>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  quiz.mode === 'exam'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-[#8BC1E3]/25 text-[#1F54E7] border border-[#8BC1E3]/40'
                }`}
              >
                {quiz.mode}
              </span>
            </div>
            <span className="text-xs text-[#6F8498] font-medium">
              Question {currentIndex + 1} of {quiz.questions.length} • {answeredCount} Answered
            </span>
          </div>
        </div>

        {/* Timer Badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-colors ${
              isTimeLow
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                : 'bg-[#F6F8FB] text-[#0A2540] border-[#E5E9EC]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#1F54E7]" />
            <span>
              {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1F54E7] hover:bg-[#1742be] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </button>
        </div>
      </div>

      {/* Main Layout: Question + Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Question Card (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E9EC] p-5 sm:p-7 shadow-xs space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E9EC] pb-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-[#6F8498]">Q#{currentIndex + 1}</span>
              {currentQ.exam && (
                <span className="px-2.5 py-0.5 rounded-lg font-bold bg-[#8BC1E3]/25 text-[#1F54E7] border border-[#8BC1E3]/40 text-xs">
                  {currentQ.exam}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-lg font-bold bg-[#1F54E7]/10 text-[#1F54E7] text-xs">
                {currentQ.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg font-semibold bg-[#F6F8FB] text-[#0A2540] border border-[#E5E9EC] text-xs">
                {currentQ.topic}
              </span>
              {isMulti && (
                <span className="px-2 py-0.5 bg-[#36C18E]/20 text-[#0A2540] text-[10px] font-bold rounded-lg border border-[#36C18E]/40">
                  Multiple Choices
                </span>
              )}
            </div>

            <button
              onClick={handleToggleReview}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                currentResp?.isMarkedForReview
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#F6F8FB] text-[#6F8498] hover:bg-[#E5E9EC] hover:text-[#0A2540] border border-[#E5E9EC]'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${currentResp?.isMarkedForReview ? 'fill-amber-600 text-amber-600' : 'text-[#6F8498]'}`} />
              {currentResp?.isMarkedForReview ? 'Marked for Review' : 'Flag for Review'}
            </button>
          </div>

          {/* Question Text */}
          <div className="text-base sm:text-lg font-bold text-[#0A2540] leading-relaxed">
            <MathJaxView text={currentQ.text} as="div" />
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {currentQ.options.map((optionText, optIdx) => {
              const selectedIndices = currentResp?.selectedOptionIndices || (currentResp?.selectedOptionIndex !== null && currentResp?.selectedOptionIndex !== undefined ? [currentResp.selectedOptionIndex] : []);
              const isSelected = selectedIndices.includes(optIdx);

              let cardStyle = 'bg-[#F6F8FB] border-[#E5E9EC] hover:bg-[#E5E9EC]/50 hover:border-[#1F54E7]/40 text-[#0A2540]';

              if (isSelected) {
                cardStyle = 'bg-[#1F54E7]/10 border-[#1F54E7] text-[#0A2540] font-bold ring-2 ring-[#1F54E7]/20 shadow-xs';
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between transition-all min-h-[48px] ${cardStyle}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center border transition-colors flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#1F54E7] text-white border-[#1F54E7] shadow-xs'
                          : 'bg-white border-[#E5E9EC] text-[#0A2540]'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <MathJaxView text={optionText} inline />
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-[#1F54E7] flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Question Controls Row */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E9EC]">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="px-4 py-2 bg-[#F6F8FB] hover:bg-[#E5E9EC] text-[#0A2540] text-xs font-bold rounded-xl border border-[#E5E9EC] transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            {currentIndex < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-5 py-2 bg-[#0A2540] hover:bg-[#113860] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-5 py-2 bg-[#1F54E7] hover:bg-[#1742be] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                Finish Test <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question Palette Sidebar (1 col) */}
        <div className="bg-white rounded-2xl border border-[#E5E9EC] p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-[#0A2540] text-sm border-b pb-2 border-[#E5E9EC]">
            Question Palette
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {quiz.questions.map((q, idx) => {
              const resp = responses[idx];
              const isCurrent = idx === currentIndex;
              const isAnswered = isQuestionAnswered(resp);
              const isReview = resp.isMarkedForReview;

              let btnStyle = 'bg-[#F6F8FB] text-[#6F8498] border-[#E5E9EC] hover:bg-[#E5E9EC] hover:text-[#0A2540]';

              if (isReview) {
                btnStyle = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
              } else if (isAnswered) {
                btnStyle = 'bg-[#1F54E7] text-white border-[#1F54E7] font-bold';
              }

              if (isCurrent) {
                btnStyle += ' ring-2 ring-[#0A2540] ring-offset-1';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-9 h-9 rounded-xl text-xs flex items-center justify-center border transition-all ${btnStyle}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-3 border-t border-[#E5E9EC] text-xs font-semibold text-[#6F8498]">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-[#1F54E7]" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300" />
              <span>Marked for Review ({reviewCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-[#F6F8FB] border border-[#E5E9EC]" />
              <span>Unanswered ({quiz.questions.length - answeredCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2540]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#E5E9EC] space-y-4">
            <h3 className="text-lg font-bold text-[#0A2540]">Ready to Submit Quiz?</h3>
            <p className="text-xs text-[#6F8498] leading-relaxed">
              You have answered <strong className="text-[#0A2540]">{answeredCount}</strong> out of <strong className="text-[#0A2540]">{quiz.questions.length}</strong> questions.
              {quiz.questions.length - answeredCount > 0 && (
                <span className="text-rose-600 font-semibold block mt-1">
                  Notice: You have {quiz.questions.length - answeredCount} unanswered questions.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-[#6F8498] hover:bg-[#F6F8FB] rounded-xl text-xs font-bold"
              >
                Continue Test
              </button>
              <button
                disabled={submitting}
                onClick={executeSubmission}
                className="px-5 py-2 bg-[#1F54E7] hover:bg-[#1742be] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accidental Navigation / Mouse Back Click Warning Modal */}
      {showExitWarningModal && (
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
                আপনি কি নিশ্চিতভাবে এই পরীক্ষা/কুইজ থেকে বের হতে চান?
              </p>
              <p className="text-[#6F8498] leading-relaxed">
                বের হয়ে গেলে আপনার এ পর্যন্ত দেওয়া <strong>{answeredCount} টি উত্তরের স্কোর</strong> এবং অবশিষ্ট সময় গণনা বাতিল হয়ে যেতে পারে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExitWarningModal(false)}
                className="px-4 py-2.5 bg-[#1F54E7] hover:bg-[#1742be] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                পরীক্ষায় থাকুন (Continue Test)
              </button>
              <button
                onClick={() => {
                  setShowExitWarningModal(false);
                  onCancelQuiz();
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
};
