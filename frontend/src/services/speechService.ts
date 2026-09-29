/**
 * Speech Service: Provides ambient voice feedback for seniors via:
 * 1. Neural Audio TTS (/api/tts)
 * 2. Web Speech API (window.speechSynthesis) - Resilient local fallback
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_MCP_URL ||
  'http://localhost:3001';

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  voiceId?: string; // Neural voice profile identifier
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

class SpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  private activeAbortController: AbortController | null = null;
  private playbackId: number = 0;
  private isSpeakingInternal: boolean = false;
  private audioContext: AudioContext | null = null;
  private speechAnalyser: AnalyserNode | null = null;

  public getSpeechAnalyser(): AnalyserNode | null {
    return this.isSpeakingInternal ? this.speechAnalyser : null;
  }

  public getPollyAnalyser(): AnalyserNode | null {
    return this.getSpeechAnalyser();
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  public isSpeaking(): boolean {
    if (this.isSpeakingInternal) return true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }

  /**
   * Plays an immediate earcon chime (0ms) via Web Audio API
   * 2-tone melodic beep: 587Hz (D5) -> 880Hz (A5) over 175ms with gentle gain envelope
   */
  public playChime(): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.16, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.085);

      // Tone 2: 880.00 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.07);

      gain2.gain.setValueAtTime(0, now + 0.07);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.085);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.175);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.18);

      // Dispose AudioContext after playback finishes
      setTimeout(() => {
        try {
          ctx.close();
        } catch (_) {}
      }, 250);
    } catch (err) {
      console.warn('[SpeechService] Earcon chime failed:', err);
    }
  }

  /**
   * Cancels all currently playing speech (both Neural TTS stream and Web Speech API)
   */
  public cancel(): void {
    // 1. Increment playback ID to invalidate pending async callbacks
    this.playbackId++;

    // 2. Abort ongoing fetch request to /api/tts
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch (_) {}
      this.activeAbortController = null;
    }

    // 3. Stop and clean up Neural Audio element
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (_) {}
      this.currentAudio = null;
    }

    // 4. Stop Web Speech API
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    this.isSpeakingInternal = false;
  }

  /**
   * Plays speech with two-tier resilience:
   * Tier 1: Backend Neural TTS (/api/tts) -> Tier 2: Fallback window.speechSynthesis
   */
  public async speak(text: string, options?: SpeechOptions): Promise<void> {
    if (!this.isSupported()) {
      options?.onEnd?.();
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    // Cancel any ongoing speech
    this.cancel();

    const currentId = ++this.playbackId;
    this.isSpeakingInternal = true;

    // TIER 1: Attempt Backend Neural TTS via backend
    try {
      this.activeAbortController = new AbortController();
      const timeoutId = setTimeout(() => {
        this.activeAbortController?.abort();
      }, 2500);

      const response = await fetch(`${API_BASE_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voiceId: options?.voiceId || 'CareBridgeVoice',
        }),
        signal: this.activeAbortController.signal,
      });

      clearTimeout(timeoutId);

      // Check if session was cancelled while awaiting fetch
      if (currentId !== this.playbackId) return;

      if (response.ok) {
        const data = await response.json();

        if (currentId !== this.playbackId) return;

        if (data.success && data.audioBase64) {
          console.log('[SpeechService] Playing audio via Neural Voice Engine');
          const audioUrl = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`;
          const audio = new Audio(audioUrl);
          this.currentAudio = audio;

          // Wire up Web Audio AnalyserNode for Reactive Ambient Glow
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              if (!this.audioContext || this.audioContext.state === 'closed') {
                this.audioContext = new AudioCtx();
              }
              if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
              }
              if (!this.speechAnalyser) {
                this.speechAnalyser = this.audioContext.createAnalyser();
                this.speechAnalyser.fftSize = 64;
                this.speechAnalyser.smoothingTimeConstant = 0.75;
              }
              const source = this.audioContext.createMediaElementSource(audio);
              source.connect(this.speechAnalyser);
              this.speechAnalyser.connect(this.audioContext.destination);
            }
          } catch (audioCtxErr) {
            // Non-blocking: audio element can still play standalone if AudioContext restricted
            console.debug('[SpeechService] Web Audio pipeline note:', audioCtxErr);
          }

          audio.onended = () => {
            if (currentId === this.playbackId) {
              this.currentAudio = null;
              this.isSpeakingInternal = false;
              options?.onEnd?.();
            }
          };

          audio.onerror = (e) => {
            console.warn('[SpeechService] Audio element failed playing audio stream:', e);
            if (currentId === this.playbackId) {
              this.currentAudio = null;
              this.fallbackToSpeechSynthesis(cleanText, options, currentId);
            }
          };

          options?.onStart?.();
          await audio.play();
          return;
        } else if (data.fallback) {
          console.info('[SpeechService] Backend requested fallback -> switching to Web Speech API');
        }
      }
    } catch (err: any) {
      // If cancel() called abort(), do not fallback
      if (currentId !== this.playbackId) return;
      if (err.name === 'AbortError') {
        console.info('[SpeechService] Backend TTS exceeded 2500ms -> Fast Fallback to Web Speech API immediately');
      } else {
        console.warn('[SpeechService] Could not connect to TTS endpoint, fallback to Web Speech API:', err.message);
      }
    }

    // TIER 2: Fallback to Web Speech API
    if (currentId === this.playbackId) {
      this.fallbackToSpeechSynthesis(cleanText, options, currentId);
    }
  }

  /**
   * Browser local Web Speech API fallback
   */
  private fallbackToSpeechSynthesis(
    text: string,
    options?: SpeechOptions,
    currentId?: number
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeakingInternal = false;
      options?.onEnd?.();
      return;
    }

    if (currentId !== undefined && currentId !== this.playbackId) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = options?.lang ?? 'en-US';

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        if (currentId === undefined || currentId === this.playbackId) {
          this.isSpeakingInternal = false;
          options?.onEnd?.();
        }
      };

      utterance.onerror = (err) => {
        console.warn('[SpeechService] SpeechSynthesis error:', err);
        if (currentId === undefined || currentId === this.playbackId) {
          this.isSpeakingInternal = false;
          options?.onEnd?.();
        }
      };

      // Select warm natural English voice
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Samantha') ||
            v.name.includes('Victoria') ||
            v.name.includes('Natural') ||
            v.name.includes('Google US English') ||
            v.name.includes('Zira') ||
            v.name.includes('Jenny'))
      );

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[SpeechService] SpeechSynthesis initialization error:', err);
      this.isSpeakingInternal = false;
      options?.onEnd?.();
    }
  }
}

export const speechService = new SpeechService();
