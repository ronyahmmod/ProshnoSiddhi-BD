import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { fetchAnalytics } from '../api';
import { AnalyticsOverview } from '../types';

export const AnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchAnalytics();
      setAnalytics(data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Performance Analytics</Text>

        <View style={styles.grid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{analytics?.totalQuizzesTaken || 12}</Text>
            <Text style={styles.metricLabel}>Total Tests Taken</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{analytics?.totalQuestionsAttempted || 180}</Text>
            <Text style={styles.metricLabel}>Questions Answered</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricVal, { color: '#059669' }]}>
              {analytics?.overallAccuracy || 78}%
            </Text>
            <Text style={styles.metricLabel}>Overall Accuracy</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{analytics?.averageSpeedSeconds || 24}s</Text>
            <Text style={styles.metricLabel}>Avg Time / Question</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>💪 Strong Subjects</Text>
          {analytics?.strongSubjects.map((sub) => (
            <View key={sub} style={styles.subjectPillGreen}>
              <Text style={styles.greenText}>✓ {sub}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>⚠️ Subjects Needing Focus</Text>
          {analytics?.weakSubjects.map((sub) => (
            <View key={sub} style={styles.subjectPillRed}>
              <Text style={styles.redText}>⚡ {sub}</Text>
            </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  subjectPillGreen: {
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  greenText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 13,
  },
  subjectPillRed: {
    backgroundColor: '#fff1f2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  redText: {
    color: '#e11d48',
    fontWeight: '700',
    fontSize: 13,
  },
});
