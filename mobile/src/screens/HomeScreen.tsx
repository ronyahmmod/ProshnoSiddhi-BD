import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { fetchUser, fetchAnalytics } from '../api';
import { User, AnalyticsOverview } from '../types';

interface HomeScreenProps {
  onStartQuiz: (subject: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartQuiz }) => {
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const u = await fetchUser();
      const a = await fetchAnalytics();
      setUser(u);
      setAnalytics(a);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading ProshnoSiddhi BD...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner Header */}
        <View style={styles.headerCard}>
          <Text style={styles.badgeText}>BANGLADESH EXAM PREP</Text>
          <Text style={styles.headerTitle}>PROSHNOSIDDHI BD</Text>
          <Text style={styles.headerSubtitle}>
            Target Goal: {user?.targetExam || 'BCS & Competitive Exams'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>🔥 {user?.streakDays || 1} Days</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>⭐ {user?.xp || 120} XP</Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>🎯 {analytics?.overallAccuracy || 78}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        {/* Quick Launch Practice Subjects */}
        <Text style={styles.sectionTitle}>Select Subject Practice</Text>
        <View style={styles.gridContainer}>
          {[
            { name: 'General Science', color: '#059669', count: '120+ Qs' },
            { name: 'Bangladesh Affairs', color: '#0284c7', count: '150+ Qs' },
            { name: 'English Grammar', color: '#7c3aed', count: '110+ Qs' },
            { name: 'Mathematics', color: '#d97706', count: '90+ Qs' },
            { name: 'Computer & Tech', color: '#2563eb', count: '85+ Qs' },
            { name: 'International Affairs', color: '#e11d48', count: '95+ Qs' },
          ].map((sub) => (
            <TouchableOpacity
              key={sub.name}
              style={[styles.subjectCard, { borderColor: sub.color }]}
              onPress={() => onStartQuiz(sub.name)}
              activeOpacity={0.8}
            >
              <Text style={[styles.subjectName, { color: sub.color }]}>{sub.name}</Text>
              <Text style={styles.subjectCount}>{sub.count}</Text>
              <Text style={styles.startBtnText}>Start Model Test ➔</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  badgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 3,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  subjectCount: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  startBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
});
