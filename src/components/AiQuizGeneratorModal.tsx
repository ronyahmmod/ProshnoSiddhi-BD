import React, { useState } from 'react';
import { generateAiQuiz } from '../api';
import { Question, QuizConfig } from '../types';
import { Sparkles, X, Loader2, Play, BookOpen, Brain, CheckCircle2 } from 'lucide-react';

interface AiQuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: string[];
  onStartGeneratedQuiz: (config: QuizConfig) => void;
}

export const AiQuizGeneratorModal: React.FC<AiQuizGeneratorModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onStartGeneratedQuiz
}) => {
  if (!isOpen) return null;

  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState(subjects[0] || 'General Science');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [questionCount, setQuestionCount] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[] | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a target topic or syllabus area.');
      return;
    }

    setError(null);
    setLoading(true);
    setGeneratedQuestions(null);

    try {
      const qList = await generateAiQuiz(topic, subject, difficulty, questionCount);
      if (!qList || qList.length === 0) {
        throw new Error('No questions could be assembled for this topic.');
      }
      setGeneratedQuestions(qList);
    } catch (err: any) {
      setError(err.message || 'Question generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchQuiz = (mode: 'practice' | 'exam') => {
    if (!generatedQuestions) return;

    onStartGeneratedQuiz({
      title: `Custom Test: ${topic}`,
      subject,
      topic,
      difficulty,
      questionCount: generatedQuestions.length,
      durationMinutes: Math.max(3, Math.ceil(generatedQuestions.length * 1.5)),
      mode,
      negativeMarking: mode === 'exam',
      negativeMarkPerWrong: 0.25
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1 text-teal-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Targeted Drill Engine
          </div>
          <h2 className="text-xl font-bold">Generate Custom Practice Quiz</h2>
          <p className="text-teal-100/80 text-xs mt-1">
            Specify any topic, chapter, or syllabus concept to instantly generate tailored multiple choice questions with mathematical formatting.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {!generatedQuestions ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topic or Syllabus Keyword
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quadratic Equations, Organic Chemistry, Trigonometry, Bangladesh History"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Category</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600"
                  >
                    {subjects.filter((s) => s !== 'All').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Question Count: {questionCount}
                </label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>3 Questions</span>
                  <span>5 Questions</span>
                  <span>10 Questions</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 text-teal-300" />
                    Assemble Practice Quiz
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-teal-700 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {generatedQuestions.length} Questions Assembled!
                </h3>
                <p className="text-xs text-slate-600">
                  Topic: <strong>{topic}</strong> ({subject} • {difficulty})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleLaunchQuiz('practice')}
                  className="p-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Practice Mode
                </button>

                <button
                  onClick={() => handleLaunchQuiz('exam')}
                  className="p-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Timed Exam
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
