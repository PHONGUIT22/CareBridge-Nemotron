/**
 * CareBridge Ambient Procedural Audio Engine
 * Zero-dependency browser Web Audio API sound effects.
 * 0ms latency, zero external MP3 assets, 100% offline resilient.
 */

class SoundFxService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * 1. Ambient 2-Tone Earcon Chime ("ba-ding!" ~ 440Hz -> 587Hz sine wave)
   */
  playAmbientEarcon() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // Tone 1: A4 (440Hz)
      osc1.frequency.setValueAtTime(440, now + 0.08);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(587.33, now + 0.09); // Tone 2: D5 (587.33Hz)

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start(now);
      osc1.stop(now + 0.09);

      osc2.start(now + 0.09);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('[SoundFx] Earcon playback suppressed:', e);
    }
  }

  /**
   * Backwards-compatible alias for playAmbientEarcon
   */
  playAlexaEarcon() {
    this.playAmbientEarcon();
  }

  /**
   * 2. Tactile mechanical pill bottle pop sound
   */
  playPillClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('[SoundFx] Pill click suppressed:', e);
    }
  }

  /**
   * 3. Warm major-seventh chord on dose taken (Fmaj7: F4, A4, C5, E5)
   */
  playCelebrationChord() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [349.23, 440.0, 523.25, 659.25]; // F4, A4, C5, E5
      const duration = 0.9;

      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.03);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05 + index * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.03);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('[SoundFx] Celebration chord suppressed:', e);
    }
  }

  /**
   * 4. Pulsing gentle warning tone when refusal or hesitation is detected
   */
  playWarningTone() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const pulses = [0, 0.18];

      pulses.forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(466.16, now + offset); // Bb4
        osc.frequency.exponentialRampToValueAtTime(415.3, now + offset + 0.12);

        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });
    } catch (e) {
      console.warn('[SoundFx] Warning tone suppressed:', e);
    }
  }

  /**
   * 5. Urgent telephone ring tone when Sarah Circuit-Breaker triggers
   * Dual frequency ringing pattern (440Hz + 480Hz telephone standard)
   */
  playDaughterPing() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const ringDur = 0.35;
      const pauses = [0, 0.45];

      pauses.forEach((offset) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now + offset); // North American standard 440Hz
        osc2.frequency.setValueAtTime(480, now + offset); // + 480Hz

        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset + ringDur - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + ringDur);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now + offset);
        osc1.stop(now + offset + ringDur);

        osc2.start(now + offset);
        osc2.stop(now + offset + ringDur);
      });
    } catch (e) {
      console.warn('[SoundFx] Daughter ping suppressed:', e);
    }
  }
}

export const soundFxService = new SoundFxService();
