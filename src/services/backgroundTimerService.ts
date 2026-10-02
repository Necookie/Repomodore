import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimerSnapshot } from '@/src/engine/timerEngine';

const STORAGE_KEY = '@repomodore_background_timer';
const NOTIFICATION_CHANNEL_ID = 'repomodore-alarms';

// Configure how foreground notifications are handled
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure high-priority alarm notification channel for Android.
 */
export async function setupAlarmNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Timer Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        sound: 'default',
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (err) {
      console.warn('Could not setup Android notification channel:', err);
    }
  }
}

/**
 * Request notification permissions from the user.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
    }
    return false;
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;

    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return request.granted;
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return false;
  }
}

/**
 * Schedule a high-priority system alarm notification that will fire
 * even if the app is backgrounded or the phone screen is locked.
 */
export async function scheduleBackgroundTimerAlarm(
  phase: 'focus' | 'break',
  secondsRemaining: number,
  repGoal: number = 10
): Promise<string | null> {
  if (secondsRemaining <= 0) return null;

  // Cancel any existing pending notification first
  await cancelBackgroundTimerAlarm();

  if (Platform.OS === 'web') {
    return null;
  }

  const isFocus = phase === 'focus';
  const title = isFocus ? '🔔 Focus Session Finished!' : '🔔 Movement Break Finished!';
  const body = isFocus
    ? `Great focus! Time for ${repGoal} squats. Tap to open and silence alarm.`
    : 'Break complete! Ready for your next focus session? Tap to silence.';

  try {
    await setupAlarmNotificationChannel();

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: 'timer_complete', phase },
      },
      trigger: {
        seconds: Math.max(1, Math.round(secondsRemaining)),
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });

    return notificationId;
  } catch (err) {
    console.warn('Failed to schedule background notification alarm:', err);
    return null;
  }
}

/**
 * Cancel pending scheduled alarms (e.g. when timer paused or reset).
 */
export async function cancelBackgroundTimerAlarm(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('Error cancelling scheduled notifications:', err);
  }
}

/**
 * Dismiss any delivered/presented notifications (e.g. when alarm silenced).
 */
export async function dismissActiveNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (err) {
    console.warn('Error dismissing notifications:', err);
  }
}

/**
 * Persist the current running timer state so it survives app closure.
 */
export async function saveBackgroundTimerSnapshot(snapshot: TimerSnapshot): Promise<void> {
  try {
    if (snapshot.state === 'running_focus' || snapshot.state === 'running_break') {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Error saving timer state to storage:', err);
  }
}

/**
 * Retrieve persisted timer state on app boot or foregrounding.
 */
export async function getBackgroundTimerSnapshot(): Promise<TimerSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TimerSnapshot;
  } catch (err) {
    console.warn('Error reading timer state from storage:', err);
    return null;
  }
}

/**
 * Clear stored background timer state.
 */
export async function clearBackgroundTimerSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Error clearing timer state from storage:', err);
  }
}

/**
 * Show a browser notification on web when in another tab.
 */
export function showWebNotification(title: string, body: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Could not display web notification:', err);
      }
    }
  }
}
