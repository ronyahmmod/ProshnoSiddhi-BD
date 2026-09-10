import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { fetchQuestions } from '../api';
import { Question } from '../types';

export const QuestionBankScreen = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const subjects = ['All', 'General Science', 'Bangladesh Affairs', 'English Grammar', 'Mathematics', 'Computer & Tech'];

  useEffect(() => {
    loadQuestions();
  }, [selectedSubject, search]);

  const loadQuestions = async () => {
    setLoading(true);
    const data = await fetchQuestions(selectedSubject, search);
    setQuestions(data);
    setLoading(false);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderQuestionItem = ({ item, index }: { item: Question; index: number }) => {
    const isRevealed = !!revealedIds[item.id];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.questionNum}>#{index + 1}</Text>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{item.subject}</Text>
          </View>
          <View style={styles.difficultyPill}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>

        <Text style={styles.questionText}>{item.text}</Text>

        <View style={styles.optionsContainer}>
          {item.options.map((opt, optIdx) => {
            const isCorrect = optIdx === item.correctOptionIndex;
            let optStyle = styles.optionItem;
            if (isRevealed) {
              if (isCorrect) optStyle = [styles.optionItem, styles.optionCorrect];
              else optStyle = [styles.optionItem, styles.optionMuted];
            }

            return (
              <View key={optIdx} style={optStyle}>
                <Text style={styles.optionLetter}>{String.fromCharCode(65 + optIdx)}.</Text>
                <Text style={styles.optionText}>{opt}</Text>
              </View>
            );
          })}
        </View>

        {isRevealed && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>✔ Explanation:</Text>
            <Text style={styles.explanationBody}>{item.explanation}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.revealBtn}
          onPress={() => toggleReveal(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.revealBtnText}>
            {isRevealed ? 'Hide Answer' : 'Show Answer & Explanation'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>Question Bank</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search questions or keywords..."
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          horizontal
          data={subjects}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectFilterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedSubject === item && styles.filterPillActive,
              ]}
              onPress={() => setSelectedSubject(item)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedSubject === item && styles.filterPillTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderQuestionItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerArea: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 12,
  },
  subjectFilterList: {
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#059669',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    marginRight: 8,
  },
  tagPill: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  tagText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '700',
  },
  difficultyPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 20,
    marginBottom: 12,
  },
  optionsContainer: {
    marginBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  optionCorrect: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  optionMuted: {
    opacity: 0.5,
  },
  optionLetter: {
    fontWeight: '800',
    fontSize: 12,
    color: '#334155',
    marginRight: 8,
  },
  optionText: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
  },
  revealBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginTop: 4,
  },
  revealBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  explanationBox: {
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 2,
  },
  explanationBody: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
});
