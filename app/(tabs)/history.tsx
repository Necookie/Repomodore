import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { Colors, Radius, Spacing } from '@/src/constants/theme';
import { Card } from '@/src/components/Card';
import { Mascot } from '@/src/components/Mascot';
import { activityRepository } from '@/src/storage/ActivityRepository';
import { ActivityRecord, DailyStats } from '@/src/storage/schema';

export default function HistoryScreen() {
  const { userId } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = userId ?? 'guest';

  const loadData = useCallback(async () => {
    try {
      const [acts, stats] = await Promise.all([
        activityRepository.getActivities(currentUserId),
        activityRepository.getDailyStats(currentUserId, 7),
      ]);
      setActivities(acts);
      setDailyStats(stats);
    } catch (err) {
      console.warn('Error loading history data:', err);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Compute 7-day cumulative totals
  const totalBlocks = dailyStats.reduce((sum, d) => sum + d.focusBlocks, 0);
  const totalReps = dailyStats.reduce((sum, d) => sum + d.reportedReps, 0);
  const totalMinutes = dailyStats.reduce((sum, d) => sum + d.focusMinutes, 0);
  const totalSkipped = dailyStats.reduce((sum, d) => sum + d.skippedBreaks, 0);

  const maxMinutes = Math.max(...dailyStats.map((d) => d.focusMinutes), 60);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        <Text style={styles.pageTitle}>History & Stats</Text>
        <Text style={styles.pageSubtitle}>Your focus and movement over the past 7 days</Text>

        {/* 4 Stat Cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{totalBlocks}</Text>
            <Text style={styles.statLabel}>Repomodoros</Text>
            <Text style={styles.statSub}>Completed blocks</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{totalReps}</Text>
            <Text style={styles.statLabel}>Squats</Text>
            <Text style={styles.statSub}>Total reps logged</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>
              {totalMinutes >= 60
                ? `${(totalMinutes / 60).toFixed(1)}h`
                : `${totalMinutes}m`}
            </Text>
            <Text style={styles.statLabel}>Focus Time</Text>
            <Text style={styles.statSub}>Deep work</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{totalSkipped}</Text>
            <Text style={styles.statLabel}>Skipped</Text>
            <Text style={styles.statSub}>Rest breaks</Text>
          </Card>
        </View>

        {/* 7-Day Focus & Movement Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.cardHeaderTitle}>Daily Focus Minutes</Text>
          <Text style={styles.cardHeaderSub}>Last 7 local calendar days</Text>

          <View style={styles.barChartContainer}>
            {dailyStats.map((day) => {
              const heightPercent = Math.min(100, Math.round((day.focusMinutes / maxMinutes) * 100));
              return (
                <View key={day.dateKey} style={styles.barColumn}>
                  {/* Numerical value on top */}
                  <Text style={styles.barValue}>{day.focusMinutes}m</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${Math.max(6, heightPercent)}%` },
                        day.focusMinutes > 0 && styles.barFillActive,
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day.dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Recent Sessions List */}
        <Card style={styles.sessionsCard}>
          <Text style={styles.cardHeaderTitle}>Recent Sessions</Text>
          <Text style={styles.cardHeaderSub}>Completed focus cycles</Text>

          {activities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Mascot pose="focus" size={100} alt="Ready to focus" />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptySub}>
                Start a session on the Timer tab to log your first Repomodore!
              </Text>
            </View>
          ) : (
            <View style={styles.sessionList}>
              {activities.slice(0, 10).map((session) => {
                const date = new Date(session.completedAt);
                const timeString = date.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                });
                const dateString = date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <View key={session.id} style={styles.sessionRow}>
                    <View style={styles.sessionIconCircle}>
                      <Text style={styles.sessionIconText}>🍅</Text>
                    </View>
                    <View style={styles.sessionDetails}>
                      <Text style={styles.sessionTitle}>
                        {session.mode === 'study_squats'
                          ? `Focus → ${session.reportedReps} squats`
                          : 'Focus Session'}
                      </Text>
                      <Text style={styles.sessionSub}>
                        {Math.round(session.focusSeconds / 60)}m focus
                        {session.mode === 'study_squats'
                          ? ` • ${
                              session.breakOutcome === 'done'
                                ? `${session.reportedReps} squats`
                                : session.breakOutcome === 'rest_only'
                                ? 'Rest only'
                                : 'Skipped'
                            }`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.sessionTimeContainer}>
                      <Text style={styles.sessionTime}>{timeString}</Text>
                      <Text style={styles.sessionDate}>{dateString}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.xxl,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: Spacing.xs,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statCard: {
    width: '48%',
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.ink,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    marginTop: 2,
  },
  statSub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  chartCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  cardHeaderSub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 4,
    fontWeight: '500',
  },
  barTrack: {
    width: 22,
    height: 90,
    backgroundColor: '#F3EFEA',
    borderRadius: Radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#DDD5CD',
    borderRadius: Radius.sm,
  },
  barFillActive: {
    backgroundColor: Colors.accent,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 6,
    fontWeight: '500',
  },
  sessionsCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: Spacing.md,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  sessionList: {
    marginTop: Spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sessionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 2,
  },
  sessionIconText: {
    fontSize: 18,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  sessionSub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  sessionTimeContainer: {
    alignItems: 'flex-end',
  },
  sessionTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  sessionDate: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2,
  },
});
