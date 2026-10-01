export const checkForUpdateAsync = jest.fn().mockResolvedValue({ isAvailable: false });
export const fetchUpdateAsync = jest.fn().mockResolvedValue({ isNew: false });
export const reloadAsync = jest.fn().mockResolvedValue(undefined);
export const isEnabled = false;
export const updateId = 'mock-update-id';
export const channel = 'preview';
export const runtimeVersion = '1.0.0';
export const isEmbeddedLaunch = true;

export default {
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
  isEnabled,
  updateId,
  channel,
  runtimeVersion,
  isEmbeddedLaunch,
};
