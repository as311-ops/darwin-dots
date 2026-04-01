// Retro game sound system using Web Audio API
// Evokes early 90s strategy game aesthetics (Civilization I era)
// Square/triangle waves, pentatonic scales, short melodic phrases

const STORAGE_KEY = 'darwin-dots-sound';

let audioCtx: AudioContext | null = null;
let soundEnabled: boolean = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? false : stored === 'true';
  } catch {
    return false;
  }
})();

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // localStorage unavailable
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

// --- Helper: play a single note with envelope ---

function playNote(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  startTime: number,
  ctx: AudioContext,
  destination?: AudioNode
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Envelope: attack 5ms, sustain, then release over duration * 0.3
  const attackEnd = startTime + 0.005;
  const releaseStart = startTime + duration - duration * 0.3;
  const releaseEnd = startTime + duration;

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, attackEnd);
  gainNode.gain.setValueAtTime(gain, releaseStart);
  gainNode.gain.linearRampToValueAtTime(0, releaseEnd);

  osc.connect(gainNode);
  gainNode.connect(destination ?? ctx.destination);

  osc.start(startTime);
  osc.stop(releaseEnd + 0.01);

  return osc;
}

// --- Helper: add vibrato to an oscillator ---

function addVibrato(
  osc: OscillatorNode,
  ctx: AudioContext,
  startTime: number,
  rate: number = 5,
  depth: number = 3
): void {
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(rate, startTime);
  lfoGain.gain.setValueAtTime(depth, startTime);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  lfo.start(startTime);
  lfo.stop(startTime + 5);
}

// --- Note frequencies (Hz) ---

const NOTE = {
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
} as const;

// ============================================================
// Sound functions
// ============================================================

/** Game start fanfare. Ascending C major arpeggio with square wave. */
export function playStart(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5];
  const dur = 0.1;
  const gain = 0.2;

  notes.forEach((freq, i) => {
    playNote(freq, dur, 'square', gain, now + i * dur, ctx);
  });

  // Final note gets a slight hold for reverb-like tail
  const tailStart = now + notes.length * dur;
  playNote(NOTE.C5, 0.25, 'square', 0.1, tailStart, ctx);
}

/** Subtle turn-change tick. Very quiet square wave blip. */
export function playGenerationTick(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNote(800, 0.03, 'square', 0.06, now, ctx);
}

/** Discovery/breakthrough jingle. Ascending pentatonic run with triangle wave. */
export function playBreakthrough(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5];
  const shortDur = 0.08;
  const gain = 0.2;

  notes.forEach((freq, i) => {
    const isLast = i === notes.length - 1;
    const dur = isLast ? 0.2 : shortDur;
    playNote(freq, dur, 'triangle', isLast ? gain * 0.8 : gain, now + i * shortDur, ctx);
  });
}

/** Defeat/loss sound. Descending minor with slight detuning. */
export function playWipeout(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [NOTE.E4, NOTE.D4, NOTE.C4, NOTE.A3];
  const dur = 0.12;
  const gain = 0.15;

  notes.forEach((freq, i) => {
    // Slight detuning for sadness: lower each successive note by 1-3 Hz
    const detune = freq - (i * 1.5);
    playNote(detune, dur, 'square', gain, now + i * dur, ctx);
  });
}

/** Achievement reached. Two-note fanfare with slight vibrato on second note. */
export function playMilestone(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  playNote(NOTE.G4, 0.1, 'square', 0.2, now, ctx);

  const osc = playNote(NOTE.C5, 0.2, 'square', 0.2, now + 0.1, ctx);
  addVibrato(osc, ctx, now + 0.1, 5, 3);
}

/** UI click / unit select. Very short, crisp square wave. */
export function playClick(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNote(1000, 0.02, 'square', 0.1, now, ctx);
}

/** Genome shared. Quick ascending two-note confirmation. */
export function playShare(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNote(NOTE.C5, 0.06, 'triangle', 0.18, now, ctx);
  playNote(NOTE.G5, 0.06, 'triangle', 0.18, now + 0.06, ctx);
}

/** End-of-match victory fanfare. Majestic ascending phrase with vibrato finish. */
export function playVictory(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // C4 - E4 - G4, each 100ms
  playNote(NOTE.C4, 0.1, 'square', 0.25, now, ctx);
  playNote(NOTE.E4, 0.1, 'square', 0.25, now + 0.1, ctx);
  playNote(NOTE.G4, 0.1, 'square', 0.25, now + 0.2, ctx);

  // Pause 50ms, then C5 held 400ms with vibrato
  const finalStart = now + 0.35;
  const osc = playNote(NOTE.C5, 0.4, 'square', 0.3, finalStart, ctx);
  addVibrato(osc, ctx, finalStart, 6, 4);
}
