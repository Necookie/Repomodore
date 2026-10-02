import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { APK_DOWNLOAD_URL } from '@/src/constants/links';

/**
 * Triggers an immediate browser download of the standalone APK on web,
 * and launches the download URL on native platforms.
 */
export function downloadApk(url: string = APK_DOWNLOAD_URL) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'Repomodore-release.apk');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    void Linking.openURL(url);
  }
}
