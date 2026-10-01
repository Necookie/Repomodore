export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
};

export const notificationAsync = jest.fn().mockResolvedValue(undefined);
export const impactAsync = jest.fn().mockResolvedValue(undefined);
export const selectionAsync = jest.fn().mockResolvedValue(undefined);

export default {
  NotificationFeedbackType,
  ImpactFeedbackStyle,
  notificationAsync,
  impactAsync,
  selectionAsync,
};
