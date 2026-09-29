export const Platform = {
  OS: 'ios',
  select: (obj: any) => obj.ios ?? obj.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
  absoluteFillObject: {},
};

export const Dimensions = {
  get: () => ({ width: 375, height: 812 }),
};

export default {
  Platform,
  StyleSheet,
  Dimensions,
};
