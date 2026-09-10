import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { fetchQuestions, submitQuizAttempt } from '../api';
import { Question } from '../types';

interface QuizRunnerProps {
  subject: string;
  onFinish: () => void;
}

export const QuizRunnerScreen: React.FC<QuizRunnerProps> = ({ subject, onFinish }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes timer
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadQuiz();
  }, [subject]);

  useEffect(() => {
    if (loading || isCompleted) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isCompleted]);

  const loadQuiz = async () => {
    setLoading(true);
    const data = await fetchQuestions(subject);
    setQuestions(data);
    setLoading(false);
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: optionIndex });
  };

  const finishExam = async () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionIndex) {
        correctCount += 1;
      }
    });

    setScore(correctCount);
    setIsCompleted(true);

    await submitQuizAttempt({
      userId: 'u1',
      quizTitle: `${subject} Model Test`,
      subject: subject,
      mode: 'exam',
      startedAt: new Date(Date.now() - (300 - secondsRemaining) * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 300 - secondsRemaining,
      totalScore: correctCount,
      maxScore: questions.length,
      correctCount,
      incorrectCount: questions.length - correctCount,
      skippedCount: questions.length - Object.keys(selectedAnswers).length,
      accuracyPercentage: Math.round((correctCount / Math.max(questions.length, 1)) * 100),
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>No questions available for {subject}</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={onFinish}>
          <Text style={styles.btnPrimaryText}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isCompleted) {
    const accuracy = Math.round((score / questions.length) * 100);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>🎉 Model Test Completed!</Text>
          <Text style={styles.resultSubtitle}>{subject}</Text>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>{score} / {questions.length}</Text>
            <Text style={styles.accuracyText}>{accuracy}% Accuracy</Text>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={onFinish}>
            <Text style={styles.btnPrimaryText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIndex];
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.quizHeader}>
        <View>
          <Text style={styles.subjectHeader}>{subject}</Text>
          <Text style={styles.qCountText}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
        </View>
        <View style={styles.timerPill}>
          <Text style={styles.timerText}>⏱ {formatTime(secondsRemaining)}</Text>
        </View>
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.qText}>{currentQ.text}</Text>

        <View style={styles.optionsList}>
          {currentQ.options.map((opt, optIdx) => {
            const isSelected = selectedAnswers[currentIndex] === optIdx;
            return (
              <TouchableOpacity
                key={optIdx}
                style={[styles.optBtn, isSelected && styles.optBtnSelected]}
                onPress={() => handleSelectOption(optIdx)}
              >
                <Text style={[styles.optPrefix, isSelected && styles.optTextSelected]}>
                  {String.fromCharCode(65 + optIdx)}.
                </Text>
                <Text style={[styles.optText, isSelected && styles.optTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Navigation Footer */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.btnSecondary, currentIndex === 0 && styles.btnDisabled]}
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        >
          <Text style={styles.btnSecondaryText}>Previous</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.btnSubmit} onPress={finishExam}>
            <Text style={styles.btnSubmitText}>Submit Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          >
            <Text style={styles.btnPrimaryText}>Next ➔</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e11d48',
    marginBottom: 16,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  qCountText: {
    fontSize: 12,
    color: '#64748b',
  },
  timerPill: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 13,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  qText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 16,
  },
  optionsList: {
    marginTop: 4,
  },
  optBtn: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    marginBottom: 10,
  },
  optBtnSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  optPrefix: {
    fontWeight: '800',
    color: '#475569',
    marginRight: 8,
  },
  optText: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
  },
  optTextSelected: {
    color: '#047857',
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnSecondaryText: {
    fontWeight: '700',
    color: '#334155',
  },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#059669',
    borderRadius: 12,
  },
  btnPrimaryText: {
    fontWeight: '700',
    color: '#ffffff',
  },
  btnSubmit: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#dc2626',
    borderRadius: 12,
  },
  btnSubmitText: {
    fontWeight: '700',
    color: '#ffffff',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginVertical: 'auto',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ecfdf5',
    borderWidth: 4,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#047857',
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
});
