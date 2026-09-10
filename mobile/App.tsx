import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { QuestionBankScreen } from './src/screens/QuestionBankScreen';
import { QuizRunnerScreen } from './src/screens/QuizRunnerScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'bank' | 'analytics' | 'quiz'>('home');
  const [activeSubject, setActiveSubject] = useState<string>('General Science');

  const startQuizForSubject = (subject: string) => {
    setActiveSubject(subject);
    setCurrentTab('quiz');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.mainContent}>
        {currentTab === 'home' && <HomeScreen onStartQuiz={startQuizForSubject} />}
        {currentTab === 'bank' && <QuestionBankScreen />}
        {currentTab === 'analytics' && <AnalyticsScreen />}
        {currentTab === 'quiz' && (
          <QuizRunnerScreen subject={activeSubject} onFinish={() => setCurrentTab('home')} />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      {currentTab !== 'quiz' && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentTab('home')}
          >
            <Text style={[styles.tabIcon, currentTab === 'home' && styles.tabActiveText]}>🏠</Text>
            <Text style={[styles.tabLabel, currentTab === 'home' && styles.tabActiveText]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentTab('bank')}
          >
            <Text style={[styles.tabIcon, currentTab === 'bank' && styles.tabActiveText]}>📚</Text>
            <Text style={[styles.tabLabel, currentTab === 'bank' && styles.tabActiveText]}>
              Q-Bank
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setCurrentTab('analytics')}
          >
            <Text style={[styles.tabIcon, currentTab === 'analytics' && styles.tabActiveText]}>📊</Text>
            <Text style={[styles.tabLabel, currentTab === 'analytics' && styles.tabActiveText]}>
              Analytics
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  tabActiveText: {
    color: '#059669',
    opacity: 1,
  },
});
