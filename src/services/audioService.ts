import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type RingtoneId =
  | 'gentle_chime'
  | 'digital_alarm'
  | 'marimba'
  | 'clock_beep'
  | 'zen_gong';

export interface RingtoneOption {
  id: RingtoneId;
  label: string;
  description: string;
}

export const RINGTONE_OPTIONS: RingtoneOption[] = [
  {
    id: 'gentle_chime',
    label: 'Gentle Chime',
    description: 'Soothing harmonic chime chord with soft decay',
  },
  {
    id: 'digital_alarm',
    label: 'Digital Alarm',
    description: 'Crisp rhythmic dual-tone alert beeps',
  },
  {
    id: 'marimba',
    label: 'Energetic Marimba',
    description: 'Upbeat acoustic wooden arpeggio sequence',
  },
  {
    id: 'clock_beep',
    label: 'Classic Timer Beep',
    description: 'Traditional digital timer alarm pattern',
  },
  {
    id: 'zen_gong',
    label: 'Zen Singing Bowl',
    description: 'Deep resonant bowl tone with prolonged decay',
  },
];

let activeAudioContext: any = null;
let activeNativeSound: any = null;
let isCurrentlyPlaying = false;
let stopTimeoutHandle: any = null;

function getWebAudioContext(): any {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!activeAudioContext || activeAudioContext.state === 'closed') {
    activeAudioContext = new AudioCtx();
  }
  if (activeAudioContext.state === 'suspended') {
    activeAudioContext.resume().catch(() => {});
  }
  return activeAudioContext;
}

/**
 * Generate a short in-memory PCM 16-bit Mono WAV data URI for native audio playback
 */
function generateWavDataUri(notes: { freq: number; duration: number; wave?: OscillatorType }[], totalSeconds: number): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * totalSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // format chunk length
  view.setUint16(20, 1, true); // sample format: PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  // Synthesize samples
  let sampleIndex = 0;
  for (const note of notes) {
    const noteSamples = Math.floor(sampleRate * note.duration);
    for (let i = 0; i < noteSamples && sampleIndex < numSamples; i++, sampleIndex++) {
      const t = i / sampleRate;
      const progress = i / noteSamples;
      const envelope = Math.max(0, 1 - progress);
      // Simple sine or triangle wave
      const val = Math.sin(2 * Math.PI * note.freq * t) * envelope;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(val * 24000)));
      view.setInt16(44 + sampleIndex * 2, intSample, true);
    }
  }

  // Base64 encode
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : '';
  return `data:audio/wav;base64,${base64}`;
}

function synthesizeWebTone(
  ctx: any,
  ringtoneId: RingtoneId,
  volume: number,
  isFullAlarm: boolean
) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume)), ctx.currentTime);
  masterGain.connect(ctx.destination);

  const startTime = ctx.currentTime;
  const loopCount = isFullAlarm ? 3 : 1;

  if (ringtoneId === 'gentle_chime') {
    // Elegant bell/chime arpeggio: C5, E5, G5, B5, C6
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5];
    for (let l = 0; l < loopCount; l++) {
      const loopOffset = l * 1.5;
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + loopOffset + idx * 0.12);

        noteGain.gain.setValueAtTime(0.0001, startTime + loopOffset + idx * 0.12);
        noteGain.gain.exponentialRampToValueAtTime(0.5 / freqs.length, startTime + loopOffset + idx * 0.12 + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + loopOffset + idx * 0.12 + 1.2);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime + loopOffset + idx * 0.12);
        osc.stop(startTime + loopOffset + idx * 0.12 + 1.3);
      });
    }
  } else if (ringtoneId === 'digital_alarm') {
    // Sharp dual-tone pulse: 880Hz & 1760Hz
    const beepsPerLoop = 4;
    for (let l = 0; l < loopCount; l++) {
      const loopOffset = l * 1.4;
      for (let b = 0; b < beepsPerLoop; b++) {
        const beepOffset = loopOffset + b * 0.22;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(b % 2 === 0 ? 880 : 1760, startTime + beepOffset);

        noteGain.gain.setValueAtTime(0.0001, startTime + beepOffset);
        noteGain.gain.linearRampToValueAtTime(0.18, startTime + beepOffset + 0.01);
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + beepOffset + 0.14);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime + beepOffset);
        osc.stop(startTime + beepOffset + 0.15);
      }
    }
  } else if (ringtoneId === 'marimba') {
    // Warm wooden percussive arpeggio: C5 -> E5 -> G5 -> C6
    const freqs = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    for (let l = 0; l < loopCount; l++) {
      const loopOffset = l * 1.3;
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + loopOffset + idx * 0.14);

        noteGain.gain.setValueAtTime(0.0001, startTime + loopOffset + idx * 0.14);
        noteGain.gain.exponentialRampToValueAtTime(0.4, startTime + loopOffset + idx * 0.14 + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + loopOffset + idx * 0.14 + 0.35);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime + loopOffset + idx * 0.14);
        osc.stop(startTime + loopOffset + idx * 0.14 + 0.38);
      });
    }
  } else if (ringtoneId === 'clock_beep') {
    // Retro double-beeps
    const pulses = isFullAlarm ? 6 : 2;
    for (let p = 0; p < pulses; p++) {
      const pOffset = p * 0.45;
      [0, 0.1].forEach((sub) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, startTime + pOffset + sub);

        noteGain.gain.setValueAtTime(0.0001, startTime + pOffset + sub);
        noteGain.gain.linearRampToValueAtTime(0.25, startTime + pOffset + sub + 0.01);
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + pOffset + sub + 0.07);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime + pOffset + sub);
        osc.stop(startTime + pOffset + sub + 0.08);
      });
    }
  } else if (ringtoneId === 'zen_gong') {
    // Singing bowl fundamental with harmonic overtones
    const tones = [
      { freq: 216, gain: 0.5 },
      { freq: 432, gain: 0.25 },
      { freq: 648, gain: 0.15 },
      { freq: 864, gain: 0.08 },
    ];
    for (let l = 0; l < (isFullAlarm ? 2 : 1); l++) {
      const loopOffset = l * 2.2;
      tones.forEach(({ freq, gain }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + loopOffset);

        noteGain.gain.setValueAtTime(0.0001, startTime + loopOffset);
        noteGain.gain.exponentialRampToValueAtTime(gain * 0.5, startTime + loopOffset + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + loopOffset + 2.1);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(startTime + loopOffset);
        osc.stop(startTime + loopOffset + 2.2);
      });
    }
  }
}

/**
 * Stop any active alarm or preview sound currently playing.
 */
export async function stopAlarm(): Promise<void> {
  if (stopTimeoutHandle) {
    clearTimeout(stopTimeoutHandle);
    stopTimeoutHandle = null;
  }
  isCurrentlyPlaying = false;

  if (activeNativeSound) {
    try {
      await activeNativeSound.stopAsync();
      await activeNativeSound.unloadAsync();
    } catch {
      // ignore
    }
    activeNativeSound = null;
  }

  if (activeAudioContext && activeAudioContext.state !== 'closed') {
    try {
      await activeAudioContext.suspend();
    } catch {
      // ignore
    }
  }
}

/**
 * Play a short preview of the selected ringtone (for Settings).
 */
export async function previewRingtone(
  ringtoneId: RingtoneId = 'gentle_chime',
  volume: number = 0.8
): Promise<void> {
  await stopAlarm();
  isCurrentlyPlaying = true;

  try {
    if (Platform.OS === 'web') {
      const ctx = getWebAudioContext();
      if (ctx) {
        synthesizeWebTone(ctx, ringtoneId, volume, false);
      }
    } else {
      // Native preview with expo-av and Haptics
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      try {
        const { Audio } = require('expo-av');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const notesMap: Record<RingtoneId, { freq: number; duration: number }[]> = {
          gentle_chime: [
            { freq: 523.25, duration: 0.15 },
            { freq: 659.25, duration: 0.15 },
            { freq: 783.99, duration: 0.2 },
            { freq: 1046.5, duration: 0.5 },
          ],
          digital_alarm: [
            { freq: 880, duration: 0.15 },
            { freq: 0, duration: 0.05 },
            { freq: 1760, duration: 0.15 },
            { freq: 0, duration: 0.05 },
            { freq: 880, duration: 0.15 },
          ],
          marimba: [
            { freq: 523.25, duration: 0.12 },
            { freq: 659.25, duration: 0.12 },
            { freq: 783.99, duration: 0.12 },
            { freq: 1046.5, duration: 0.35 },
          ],
          clock_beep: [
            { freq: 1046.5, duration: 0.08 },
            { freq: 0, duration: 0.05 },
            { freq: 1046.5, duration: 0.08 },
          ],
          zen_gong: [
            { freq: 216, duration: 0.8 },
            { freq: 432, duration: 0.6 },
          ],
        };

        const notes = notesMap[ringtoneId] || notesMap.gentle_chime;
        const totalSec = notes.reduce((acc, n) => acc + n.duration, 0) + 0.2;
        const wavUri = generateWavDataUri(notes, totalSec);

        const { sound } = await Audio.Sound.createAsync(
          { uri: wavUri },
          { shouldPlay: true, volume: Math.max(0.1, Math.min(1, volume)) }
        );
        activeNativeSound = sound;
      } catch {
        // Fallback haptics
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }

    stopTimeoutHandle = setTimeout(() => {
      stopAlarm();
    }, 2500);
  } catch (err) {
    console.warn('Error playing preview ringtone:', err);
    isCurrentlyPlaying = false;
  }
}

/**
 * Play the full alarm ringtone when a timer phase completes.
 */
export async function playAlarm(
  ringtoneId: RingtoneId = 'gentle_chime',
  volume: number = 0.8
): Promise<void> {
  await stopAlarm();
  isCurrentlyPlaying = true;

  try {
    // Rich tactile vibration cue
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (Platform.OS === 'web') {
      const ctx = getWebAudioContext();
      if (ctx) {
        synthesizeWebTone(ctx, ringtoneId, volume, true);
      }
    } else {
      try {
        const { Audio } = require('expo-av');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        const notesMap: Record<RingtoneId, { freq: number; duration: number }[]> = {
          gentle_chime: [
            { freq: 523.25, duration: 0.15 },
            { freq: 659.25, duration: 0.15 },
            { freq: 783.99, duration: 0.2 },
            { freq: 1046.5, duration: 0.5 },
            { freq: 0, duration: 0.2 },
            { freq: 523.25, duration: 0.15 },
            { freq: 659.25, duration: 0.15 },
            { freq: 783.99, duration: 0.2 },
            { freq: 1046.5, duration: 0.8 },
          ],
          digital_alarm: [
            { freq: 880, duration: 0.14 },
            { freq: 0, duration: 0.06 },
            { freq: 1760, duration: 0.14 },
            { freq: 0, duration: 0.06 },
            { freq: 880, duration: 0.14 },
            { freq: 0, duration: 0.2 },
            { freq: 880, duration: 0.14 },
            { freq: 0, duration: 0.06 },
            { freq: 1760, duration: 0.14 },
            { freq: 0, duration: 0.06 },
            { freq: 880, duration: 0.14 },
          ],
          marimba: [
            { freq: 523.25, duration: 0.12 },
            { freq: 659.25, duration: 0.12 },
            { freq: 783.99, duration: 0.12 },
            { freq: 1046.5, duration: 0.2 },
            { freq: 783.99, duration: 0.12 },
            { freq: 1046.5, duration: 0.4 },
            { freq: 0, duration: 0.15 },
            { freq: 523.25, duration: 0.12 },
            { freq: 659.25, duration: 0.12 },
            { freq: 783.99, duration: 0.12 },
            { freq: 1046.5, duration: 0.5 },
          ],
          clock_beep: [
            { freq: 1046.5, duration: 0.08 },
            { freq: 0, duration: 0.05 },
            { freq: 1046.5, duration: 0.08 },
            { freq: 0, duration: 0.3 },
            { freq: 1046.5, duration: 0.08 },
            { freq: 0, duration: 0.05 },
            { freq: 1046.5, duration: 0.08 },
            { freq: 0, duration: 0.3 },
            { freq: 1046.5, duration: 0.08 },
            { freq: 0, duration: 0.05 },
            { freq: 1046.5, duration: 0.08 },
          ],
          zen_gong: [
            { freq: 216, duration: 1.2 },
            { freq: 432, duration: 1.0 },
            { freq: 216, duration: 1.5 },
          ],
        };

        const notes = notesMap[ringtoneId] || notesMap.gentle_chime;
        const totalSec = notes.reduce((acc, n) => acc + n.duration, 0) + 0.3;
        const wavUri = generateWavDataUri(notes, totalSec);

        const { sound } = await Audio.Sound.createAsync(
          { uri: wavUri },
          { shouldPlay: true, volume: Math.max(0.1, Math.min(1, volume)) }
        );
        activeNativeSound = sound;
      } catch {
        // Fallback haptics
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }

    // Auto-stop alarm after 5 seconds if not manually dismissed
    stopTimeoutHandle = setTimeout(() => {
      stopAlarm();
    }, 5000);
  } catch (err) {
    console.warn('Error playing alarm:', err);
    isCurrentlyPlaying = false;
  }
}

export function isAlarmPlaying(): boolean {
  return isCurrentlyPlaying;
}
