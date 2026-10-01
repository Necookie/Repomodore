export const Audio = {
  Sound: {
    createAsync: jest.fn().mockResolvedValue({
      sound: {
        playAsync: jest.fn().mockResolvedValue(undefined),
        stopAsync: jest.fn().mockResolvedValue(undefined),
        unloadAsync: jest.fn().mockResolvedValue(undefined),
        setVolumeAsync: jest.fn().mockResolvedValue(undefined),
        setIsLoopingAsync: jest.fn().mockResolvedValue(undefined),
      },
      status: { isLoaded: true },
    }),
  },
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};

export default { Audio };
