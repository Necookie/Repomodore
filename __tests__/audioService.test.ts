import {
  RINGTONE_OPTIONS,
  playAlarm,
  stopAlarm,
  previewRingtone,
  isAlarmPlaying,
  RingtoneId,
} from '@/src/services/audioService';

describe('audioService', () => {
  afterEach(async () => {
    await stopAlarm();
  });

  it('exposes 5 distinct customizable ringtone options', () => {
    expect(RINGTONE_OPTIONS.length).toBe(5);
    const ids = RINGTONE_OPTIONS.map((o) => o.id);
    expect(ids).toContain('gentle_chime');
    expect(ids).toContain('digital_alarm');
    expect(ids).toContain('marimba');
    expect(ids).toContain('clock_beep');
    expect(ids).toContain('zen_gong');
  });

  it('plays alarm and updates playing state', async () => {
    await playAlarm('gentle_chime', 0.8);
    expect(isAlarmPlaying()).toBe(true);

    await stopAlarm();
    expect(isAlarmPlaying()).toBe(false);
  });

  it('previews ringtone for each option without crashing', async () => {
    const ringtoneIds: RingtoneId[] = [
      'gentle_chime',
      'digital_alarm',
      'marimba',
      'clock_beep',
      'zen_gong',
    ];

    for (const id of ringtoneIds) {
      await previewRingtone(id, 0.5);
      expect(isAlarmPlaying()).toBe(true);
      await stopAlarm();
      expect(isAlarmPlaying()).toBe(false);
    }
  });
});
