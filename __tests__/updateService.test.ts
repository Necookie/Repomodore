import {
  getAppUpdateInfo,
  checkForAppUpdate,
  fetchAndApplyUpdate,
} from '@/src/services/updateService';

describe('updateService', () => {
  it('retrieves app update information structure', () => {
    const info = getAppUpdateInfo();
    expect(info).toHaveProperty('isSupported');
    expect(info).toHaveProperty('isEnabled');
    expect(info).toHaveProperty('runtimeVersion');
  });

  it('checks for app update and returns structured response', async () => {
    const result = await checkForAppUpdate();
    expect(result).toHaveProperty('isAvailable');
    expect(result).toHaveProperty('message');
    expect(typeof result.isAvailable).toBe('boolean');
  });

  it('handles fetchAndApplyUpdate gracefully in test/dev environment', async () => {
    const result = await fetchAndApplyUpdate();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });
});
