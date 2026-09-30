import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { Colors, Radius, Spacing } from '@/src/constants/theme';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { AccountControl } from '@/src/components/AccountControl';
import { activityRepository } from '@/src/storage/ActivityRepository';
import { UserSettings, DEFAULT_USER_SETTINGS } from '@/src/storage/schema';

import { syncNow, deleteRemoteData } from '@/src/services/syncService';

export default function SettingsScreen() {
  const { userId, getToken } = useAuth();
  const currentUserId = userId ?? 'guest';

  const [settings, setSettings] = useState<UserSettings>(() =>
    DEFAULT_USER_SETTINGS(currentUserId)
  );
  const [syncStatus, setSyncStatus] = useState<string>('Saved on this device');
  const [syncing, setSyncing] = useState<boolean>(false);

  const loadSettings = useCallback(async () => {
    try {
      const s = await activityRepository.getSettings(currentUserId);
      setSettings(s);
      if (s.syncEnabled) {
        setSyncStatus('Synced');
      }
    } catch (err) {
      console.warn('Error loading settings:', err);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const updated: UserSettings = {
      ...settings,
      [key]: value,
      updatedAt: new Date().toISOString(),
    };
    setSettings(updated);
    await activityRepository.saveSettings(updated);
  };

  const handleManualSync = async () => {
    if (!settings.syncEnabled) return;
    setSyncing(true);
    setSyncStatus('Syncing...');
    const res = await syncNow(currentUserId, getToken);
    setSyncing(false);
    if (res.success) {
      setSyncStatus('Synced');
      if (Platform.OS === 'web') {
        alert(`Sync complete! Pushed: ${res.pushedCount}, Pulled: ${res.pulledCount}`);
      } else {
        Alert.alert('Sync Complete', `Pushed: ${res.pushedCount}, Pulled: ${res.pulledCount}`);
      }
    } else {
      setSyncStatus('Sync needs retry');
      const err = res.error || 'Failed to sync with remote server.';
      if (Platform.OS === 'web') {
        alert(`Sync failed: ${err}`);
      } else {
        Alert.alert('Sync Failed', err);
      }
    }
  };

  const handleFocusChange = (deltaMinutes: number) => {
    const currentMins = Math.round(settings.focusDurationSeconds / 60);
    const newMins = Math.min(180, Math.max(1, currentMins + deltaMinutes));
    updateSetting('focusDurationSeconds', newMins * 60);
  };

  const handleBreakChange = (deltaMinutes: number) => {
    const currentMins = Math.round(settings.breakDurationSeconds / 60);
    const newMins = Math.min(60, Math.max(1, currentMins + deltaMinutes));
    updateSetting('breakDurationSeconds', newMins * 60);
  };

  const handleRepChange = (deltaReps: number) => {
    const newReps = Math.min(100, Math.max(1, settings.repGoal + deltaReps));
    updateSetting('repGoal', newReps);
  };

  const handleSyncToggle = async (enabled: boolean) => {
    if (enabled) {
      const msg =
        'Enable Cloud Sync?\n\nThis will synchronize your completed focus records and timer settings with Turso libSQL. All data is scoped strictly to your Clerk account.';
      if (Platform.OS === 'web') {
        if (window.confirm(msg)) {
          await updateSetting('syncEnabled', true);
          setSyncStatus('Syncing...');
          const res = await syncNow(currentUserId, getToken);
          setSyncStatus(res.success ? 'Synced' : 'Sync needs retry');
        }
      } else {
        Alert.alert('Enable Cloud Sync', msg, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              await updateSetting('syncEnabled', true);
              setSyncStatus('Syncing...');
              const res = await syncNow(currentUserId, getToken);
              setSyncStatus(res.success ? 'Synced' : 'Sync needs retry');
            },
          },
        ]);
      }
    } else {
      await updateSetting('syncEnabled', false);
      setSyncStatus('Saved on this device');
    }
  };

  const handleExportData = async () => {
    try {
      const json = await activityRepository.exportDataJSON(currentUserId);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repomodore-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'Repomodore Data Export',
          message: json,
        });
      }
    } catch (err: any) {
      console.warn('Export error:', err);
      const msg = err?.message || 'Could not export data.';
      if (Platform.OS === 'web') {
        alert(`Export failed: ${msg}`);
      } else {
        Alert.alert('Export Failed', msg);
      }
    }
  };

  const handleClearLocalData = () => {
    const msg =
      'Clear all local activity data for this account on this device?\nThis action cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        activityRepository
          .clearLocalData(currentUserId)
          .then(() => {
            alert('Local data cleared successfully.');
          })
          .catch((err: any) => {
            alert(`Failed to clear local data: ${err?.message || err}`);
          });
      }
    } else {
      Alert.alert('Clear Local Data', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await activityRepository.clearLocalData(currentUserId);
              Alert.alert('Success', 'Local data cleared successfully.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to clear local data.');
            }
          },
        },
      ]);
    }
  };

  const handleDeleteCloudData = () => {
    const msg =
      'Delete remote cloud history on Turso?\nYour local copy on this device will be retained.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        deleteRemoteData(currentUserId, getToken).then((res) => {
          if (res.success) {
            alert('Remote data deleted successfully from Turso.');
          } else {
            alert(`Error: ${res.error || 'Failed to delete remote data'}`);
          }
        });
      }
    } else {
      Alert.alert('Delete Cloud Data', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Remote Data',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteRemoteData(currentUserId, getToken);
            if (res.success) {
              Alert.alert('Success', 'Remote data deleted successfully from Turso.');
            } else {
              Alert.alert('Error', res.error || 'Failed to delete remote data.');
            }
          },
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Durations, targets, and data preferences</Text>

        {/* Section: Account */}
        <Text style={styles.sectionHeader}>Account</Text>
        <Card style={styles.card}>
          <AccountControl />
        </Card>

        {/* Section: Timer Durations */}
        <Text style={styles.sectionHeader}>Timer Configuration</Text>
        <Card style={styles.card}>
          {/* Focus Duration */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Focus Duration</Text>
              <Text style={styles.settingHint}>Default: 45 min (1–180 min)</Text>
            </View>
            <View style={styles.stepperContainer}>
              <Button
                title="-5"
                size="small"
                variant="secondary"
                disabled={Math.round(settings.focusDurationSeconds / 60) <= 1}
                onPress={() => handleFocusChange(-5)}
                style={styles.stepperBtn}
                accessibilityLabel="Decrease focus duration by 5 minutes"
              />
              <Text style={styles.stepperValue}>
                {Math.round(settings.focusDurationSeconds / 60)}m
              </Text>
              <Button
                title="+5"
                size="small"
                variant="secondary"
                disabled={Math.round(settings.focusDurationSeconds / 60) >= 180}
                onPress={() => handleFocusChange(5)}
                style={styles.stepperBtn}
                accessibilityLabel="Increase focus duration by 5 minutes"
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Break Duration */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Break Duration</Text>
              <Text style={styles.settingHint}>Rest period: 5 min (1–60 min)</Text>
            </View>
            <View style={styles.stepperContainer}>
              <Button
                title="-1"
                size="small"
                variant="secondary"
                disabled={Math.round(settings.breakDurationSeconds / 60) <= 1}
                onPress={() => handleBreakChange(-1)}
                style={styles.stepperBtn}
                accessibilityLabel="Decrease break duration by 1 minute"
              />
              <Text style={styles.stepperValue}>
                {Math.round(settings.breakDurationSeconds / 60)}m
              </Text>
              <Button
                title="+1"
                size="small"
                variant="secondary"
                disabled={Math.round(settings.breakDurationSeconds / 60) >= 60}
                onPress={() => handleBreakChange(1)}
                style={styles.stepperBtn}
                accessibilityLabel="Increase break duration by 1 minute"
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Squat Target */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Squat Goal</Text>
              <Text style={styles.settingHint}>Reps per break: 10 (1–100)</Text>
            </View>
            <View style={styles.stepperContainer}>
              <Button
                title="-5"
                size="small"
                variant="secondary"
                disabled={settings.repGoal <= 1}
                onPress={() => handleRepChange(-5)}
                style={styles.stepperBtn}
                accessibilityLabel="Decrease squat goal by 5 reps"
              />
              <Text style={styles.stepperValue}>{settings.repGoal}</Text>
              <Button
                title="+5"
                size="small"
                variant="secondary"
                disabled={settings.repGoal >= 100}
                onPress={() => handleRepChange(5)}
                style={styles.stepperBtn}
                accessibilityLabel="Increase squat goal by 5 reps"
              />
            </View>
          </View>
        </Card>

        {/* Section: Notifications & Feedback */}
        <Text style={styles.sectionHeader}>Alerts & Sound</Text>
        <Card style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingHint}>Gentle chime when phases end</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(val) => updateSetting('soundEnabled', val)}
              trackColor={{ false: '#DDD', true: Colors.accent }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Platform Notifications</Text>
              <Text style={styles.settingHint}>
                Best-effort reminder prompts. Timer progress remains authoritative.
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(val) => updateSetting('notificationsEnabled', val)}
              trackColor={{ false: '#DDD', true: Colors.accent }}
            />
          </View>
        </Card>

        {/* Section: Data & Storage */}
        <Text style={styles.sectionHeader}>Data Location & Cloud Sync</Text>
        <Card style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Turso Cloud Sync</Text>
              <Text style={styles.settingHint}>
                {settings.syncEnabled
                  ? 'Syncing active. Records are backed up to your Turso cloud database.'
                  : 'On this device. Local-only data is never uploaded without explicit opt-in.'}
              </Text>
            </View>
            <Switch
              value={settings.syncEnabled}
              onValueChange={handleSyncToggle}
              trackColor={{ false: '#DDD', true: Colors.accent }}
            />
          </View>

          <View style={styles.statusBadgeRow}>
            <Text style={styles.statusLabel}>Current Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{syncStatus}</Text>
            </View>
          </View>

          {settings.syncEnabled ? (
            <View style={styles.btnRow}>
              <Button
                title="Sync Now"
                variant="primary"
                loading={syncing}
                onPress={handleManualSync}
                style={styles.actionBtn}
              />
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.btnRow}>
            <Button
              title="Export Data (JSON)"
              variant="secondary"
              onPress={handleExportData}
              style={styles.actionBtn}
            />
          </View>

          <View style={styles.btnRow}>
            <Button
              title="Clear Local History"
              variant="danger"
              onPress={handleClearLocalData}
              style={styles.actionBtn}
            />
          </View>

          {settings.syncEnabled ? (
            <View style={styles.btnRow}>
              <Button
                title="Delete Remote Cloud Data"
                variant="danger"
                onPress={handleDeleteCloudData}
                style={styles.actionBtn}
              />
            </View>
          ) : null}
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  card: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  settingLabelCol: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
  },
  settingHint: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    marginHorizontal: Spacing.sm,
    minWidth: 42,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    backgroundColor: '#EAE6E1',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.ink,
  },
  btnRow: {
    marginTop: Spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
});
