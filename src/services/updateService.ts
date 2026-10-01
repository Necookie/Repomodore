import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

export interface AppUpdateStatus {
  isSupported: boolean;
  isAvailable: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  message: string;
  updateId?: string | null;
  channel?: string | null;
  runtimeVersion?: string | null;
}

export interface CheckUpdateResult {
  isAvailable: boolean;
  isRollBackToEmbedded?: boolean;
  error?: string;
  message: string;
}

export interface ApplyUpdateResult {
  success: boolean;
  error?: string;
}

/**
 * Get current mobile update configuration info.
 */
export function getAppUpdateInfo(): {
  isSupported: boolean;
  isEnabled: boolean;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  isEmbeddedLaunch: boolean;
} {
  if (Platform.OS === 'web') {
    return {
      isSupported: false,
      isEnabled: false,
      updateId: null,
      channel: 'web',
      runtimeVersion: '1.0.0',
      isEmbeddedLaunch: true,
    };
  }

  return {
    isSupported: true,
    isEnabled: Updates.isEnabled,
    updateId: Updates.updateId ?? null,
    channel: Updates.channel ?? 'production',
    runtimeVersion: typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : '1.0.0',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch ?? true,
  };
}

/**
 * Check if a new Over-The-Air (OTA) update bundle is available for this mobile app.
 */
export async function checkForAppUpdate(): Promise<CheckUpdateResult> {
  if (Platform.OS === 'web') {
    return {
      isAvailable: false,
      message: 'Web apps update automatically on refresh.',
    };
  }

  if (!Updates.isEnabled) {
    return {
      isAvailable: false,
      message: 'Updates are active in EAS build / standalone mode. Currently in local development.',
    };
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      return {
        isAvailable: true,
        message: 'A new update is available! Tap "Update App" to install.',
      };
    }
    return {
      isAvailable: false,
      message: 'App is up to date! You have the latest version.',
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to check for updates.';
    return {
      isAvailable: false,
      error: errorMsg,
      message: `Could not check updates: ${errorMsg}`,
    };
  }
}

/**
 * Download and apply the latest update, restarting the app immediately.
 */
export async function fetchAndApplyUpdate(): Promise<ApplyUpdateResult> {
  if (Platform.OS === 'web' || !Updates.isEnabled) {
    return {
      success: false,
      error: 'Updates are only supported in mobile production/preview builds.',
    };
  }

  try {
    const fetchResult = await Updates.fetchUpdateAsync();
    if (fetchResult.isNew) {
      await Updates.reloadAsync();
      return { success: true };
    }
    return {
      success: false,
      error: 'No new update was found to apply.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to download update.',
    };
  }
}
