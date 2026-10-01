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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Colors, Radius, Spacing } from '@/src/constants/theme';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { Mascot } from '@/src/components/Mascot';
import { AccountControl } from '@/src/components/AccountControl';
import { activityRepository } from '@/src/storage/ActivityRepository';
import { UserSettings, DEFAULT_USER_SETTINGS } from '@/src/storage/schema';
import { syncNow, deleteRemoteData } from '@/src/services/syncService';
import {
  RingtoneId,
  RINGTONE_OPTIONS,
  previewRingtone,
  stopAlarm,
} from '@/src/services/audioService';
import {
  checkForAppUpdate,
  fetchAndApplyUpdate,
  getAppUpdateInfo,
} from '@/src/services/updateService';

export default function SettingsScreen() {
  const { userId, getToken } = useAuth();
  const currentUserId = userId ?? 'guest';

  const [settings, setSettings] = useState<UserSettings>(() =>
    DEFAULT_USER_SETTINGS(currentUserId)
  );
  const [syncStatus, setSyncStatus] = useState<string>('Saved on this device');
  const [syncing, setSyncing] = useState<boolean>(false);

  const [previewingRingtone, setPreviewingRingtone] = useState<string | null>(null);

  const [updateInfo] = useState(() => getAppUpdateInfo());
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updatingApp, setUpdatingApp] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const handleTestRingtone = async (ringtoneId: RingtoneId) => {
    if (previewingRingtone === ringtoneId) {
      await stopAlarm();
      setPreviewingRingtone(null);
    } else {
      setPreviewingRingtone(ringtoneId);
      await previewRingtone(ringtoneId, settings.alarmVolume ?? 0.8);
      setTimeout(() => {
        setPreviewingRingtone((curr) => (curr === ringtoneId ? null : curr));
      }, 2500);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMessage(null);
    const result = await checkForAppUpdate();
    setCheckingUpdate(false);
    setUpdateAvailable(result.isAvailable);
    setUpdateMessage(result.message);
  };

  const handleApplyUpdate = async () => {
    setUpdatingApp(true);
    const result = await fetchAndApplyUpdate();
    setUpdatingApp(false);
    if (!result.success && result.error) {
      setUpdateMessage(`Update failed: ${result.error}`);
    }
  };

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
              <Text style={styles.settingHint}>Play audible alarm when timer phase ends</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(val) => updateSetting('soundEnabled', val)}
              trackColor={{ false: '#DDD', true: Colors.accent }}
            />
          </View>

          {settings.soundEnabled && (
            <>
              <View style={styles.divider} />

              <Text style={styles.subheading}>Timer Alarm Ringtone</Text>
              <Text style={styles.subheadingHint}>
                Choose the ringtone to play when your study session or break completes:
              </Text>

              <View style={styles.ringtoneList}>
                {RINGTONE_OPTIONS.map((opt) => {
                  const isSelected = (settings.ringtone || 'gentle_chime') === opt.id;
                  const isPlayingThis = previewingRingtone === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.ringtoneItem,
                        isSelected && styles.ringtoneItemSelected,
                        Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                      ]}
                      onPress={() => updateSetting('ringtone', opt.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${opt.label}, ${opt.description}`}
                    >
                      <View style={styles.radioDotContainer}>
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </View>
                      <View style={styles.ringtoneTextCol}>
                        <Text style={[styles.ringtoneLabel, isSelected && styles.ringtoneLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.ringtoneDescription}>{opt.description}</Text>
                      </View>
                      <Button
                        title={isPlayingThis ? '■ Stop' : '▶ Test'}
                        size="small"
                        variant={isPlayingThis ? 'primary' : 'secondary'}
                        onPress={() => handleTestRingtone(opt.id)}
                        style={styles.previewBtn}
                        accessibilityLabel={`Preview ${opt.label} ringtone`}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.divider} />

              {/* Volume Selection */}
              <View style={styles.settingRow}>
                <View style={styles.settingLabelCol}>
                  <Text style={styles.settingLabel}>Alarm Volume</Text>
                  <Text style={styles.settingHint}>Sound output level</Text>
                </View>
                <View style={styles.volumeButtons}>
                  {[
                    { label: '30%', val: 0.3 },
                    { label: '70%', val: 0.7 },
                    { label: '100%', val: 1.0 },
                  ].map((lvl) => {
                    const isSelected =
                      Math.abs((settings.alarmVolume ?? 0.8) - lvl.val) < 0.18;
                    return (
                      <Button
                        key={lvl.label}
                        title={lvl.label}
                        size="small"
                        variant={isSelected ? 'primary' : 'secondary'}
                        onPress={() => updateSetting('alarmVolume', lvl.val)}
                        style={styles.volumeBtn}
                      />
                    );
                  })}
                </View>
              </View>
            </>
          )}

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

        {/* Section: Mascot & Motion */}
        <Text style={styles.sectionHeader}>Mascot & Motion</Text>
        <Card style={styles.card}>
          <View style={styles.mascotPreviewRow}>
            <Mascot pose="welcome" size={64} motion="calm" />
            <View style={styles.mascotPreviewText}>
              <Text style={styles.settingLabel}>Interactive Mascot Studio</Text>
              <Text style={styles.settingHint}>
                Preview articulated squat demonstrations, focus companion motions, and animation states.
              </Text>
            </View>
          </View>
          <View style={styles.btnRow}>
            <Button
              title="Open Mascot Studio"
              variant="secondary"
              onPress={() => router.push('/mascot-preview')}
              style={styles.actionBtn}
            />
          </View>
        </Card>

        {/* Section: Mobile App & Updates */}
        <Text style={styles.sectionHeader}>Mobile App & Updates</Text>
        <Card style={styles.card}>
          <View style={styles.updateStatusRow}>
            <View style={styles.settingLabelCol}>
              <Text style={styles.settingLabel}>Installed App Version</Text>
              <Text style={styles.settingHint}>
                v{updateInfo.runtimeVersion} · Channel: {updateInfo.channel || 'production'}
              </Text>
            </View>
            <View style={styles.updateBadge}>
              <Text style={styles.updateBadgeText}>
                {updateInfo.isEnabled
                  ? 'OTA Active'
                  : Platform.OS === 'web'
                  ? 'Web'
                  : 'Standalone'}
              </Text>
            </View>
          </View>

          {updateMessage ? (
            <View style={[styles.updateAlertBox, updateAvailable && styles.updateAlertSuccess]}>
              <Text style={[styles.updateAlertText, updateAvailable && styles.updateAlertTextSuccess]}>
                {updateMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.btnRow}>
            {updateAvailable ? (
              <Button
                title="Restart & Apply Update Now"
                variant="primary"
                loading={updatingApp}
                onPress={handleApplyUpdate}
                style={styles.actionBtn}
              />
            ) : (
              <Button
                title="Check for Mobile Updates"
                variant="secondary"
                loading={checkingUpdate}
                onPress={handleCheckUpdate}
                style={styles.actionBtn}
              />
            )}
          </View>
          <Text style={styles.updateNoteText}>
            Over-the-air updates deliver fixes and improvements directly to your phone without reinstalling the APK.
          </Text>
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
  subheading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 2,
    marginBottom: 2,
  },
  subheadingHint: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: Spacing.sm,
  },
  ringtoneList: {
    gap: 8,
    marginVertical: 4,
  },
  ringtoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.canvas,
  },
  ringtoneItemSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  radioDotContainer: {
    marginRight: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  ringtoneTextCol: {
    flex: 1,
    marginRight: 8,
  },
  ringtoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  ringtoneLabelSelected: {
    color: Colors.accent,
    fontWeight: '700',
  },
  ringtoneDescription: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 1,
  },
  previewBtn: {
    minHeight: 32,
    paddingHorizontal: 10,
  },
  volumeButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  volumeBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
  },
  mascotPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: Spacing.md,
  },
  mascotPreviewText: {
    flex: 1,
  },
  updateStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  updateBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  updateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  updateAlertBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.sm,
    padding: 10,
    marginTop: Spacing.sm,
  },
  updateAlertSuccess: {
    backgroundColor: '#DEF7EC',
  },
  updateAlertText: {
    fontSize: 12,
    color: Colors.ink,
  },
  updateAlertTextSuccess: {
    color: '#03543F',
    fontWeight: '600',
  },
  updateNoteText: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
});
