export const GITHUB_REPO_URL = 'https://github.com/Necookie/Repomodore';

/**
 * Direct link to download the latest compiled Android APK.
 * Can be overridden via EXPO_PUBLIC_APK_DOWNLOAD_URL in production environment.
 */
export const APK_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL ||
  `${GITHUB_REPO_URL}/releases/latest/download/Repomodore-release.apk`;

export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
