'use client';

import React, { useState, useEffect, useRef } from 'react';
import { speechService } from '../services/speechService';

export interface AmbientGlowProps {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  isPatientSpeaking?: boolean;
  patientTranscript?: string;
  transcript?: string;
  className?: string;
  showStatusBadge?: boolean;
  onTriggerDemoVoice?: () => void;
}

/**
 * AmbientGlow - Signature NVIDIA Green & CareBridge Emerald Hardware Light Bar
 * Visualizes real-time audio reactivity, agent thinking state, and voice responses
 * using an ambient aura along the bottom edge of the smart display.
 * 
 * Powered by Web Audio API (AudioContext & AnalyserNode) with real-time waveform undulation
 * and dynamic frequency spectrum analysis.
 */
export function AmbientGlow({
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  isPatientSpeaking = false,
  patientTranscript = '',
  transcript = '',
  className = '',
  showStatusBadge = true,
  onTriggerDemoVoice,
}: AmbientGlowProps) {
  const isActive = isListening || isThinking || isSpeaking || isPatientSpeaking;

  // Real-time audio reactive metrics
  const [amplitude, setAmplitude] = useState<number>(0);
  const [freqBands, setFreqBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [wavePoints, setWavePoints] = useState<number[]>(new Array(16).fill(0));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // 1. Web Audio API Setup & Teardown for Microphone Listening
  useEffect(() => {
    if (!isListening) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      micAnalyserRef.current = null;
      return;
    }

    let isMounted = true;

    async function initMic() {
      try {
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }

        const source = audioCtxRef.current.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);

        micAnalyserRef.current = analyser;
      } catch (err) {
        console.debug('[AmbientGlow] Microphone Web Audio access note:', err);
      }
    }

    initMic();

    return () => {
      isMounted = false;
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      micAnalyserRef.current = null;
    };
  }, [isListening]);

  // 2. Real-Time Audio-Reactive Animation Loop
  useEffect(() => {
    if (!isActive) {
      setAmplitude(0);
      setWavePoints(new Array(16).fill(0));
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const freqData = new Uint8Array(32);
    const timeData = new Uint8Array(64);

    const updateVisuals = () => {
      phaseRef.current += 0.08;
      const phase = phaseRef.current;

      let currentAmp = 0;
      const bands = [0, 0, 0, 0, 0, 0, 0, 0];
      const points = new Array(16).fill(0);

      const activeAnalyser = isListening
        ? micAnalyserRef.current
        : isSpeaking
        ? speechService.getSpeechAnalyser()
        : null;

      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(freqData);
        activeAnalyser.getByteTimeDomainData(timeData);

        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        currentAmp = Math.min(1, rms * 3.5);

        for (let b = 0; b < 8; b++) {
          let sum = 0;
          const start = b * 2;
          for (let k = 0; k < 2; k++) {
            sum += freqData[start + k] || 0;
          }
          bands[b] = Math.min(1, sum / (2 * 255));
        }

        for (let i = 0; i < 16; i++) {
          const freqIndex = Math.min(31, Math.floor((i / 16) * freqData.length));
          const freqVal = freqData[freqIndex] / 255;
          const harmonic = Math.sin(phase * 1.5 + i * 0.5) * 0.3;
          points[i] = Math.max(0.1, (freqVal * 0.7 + harmonic * 0.3) * currentAmp);
        }
      } else {
        if (isSpeaking || isPatientSpeaking) {
          const syllable = Math.sin(phase * 1.8) * Math.cos(phase * 0.6);
          const vocalFormant = Math.sin(phase * 3.4) * 0.25;
          currentAmp = Math.max(0.2, (Math.abs(syllable) + vocalFormant) * 0.85);

          for (let b = 0; b < 8; b++) {
            bands[b] = Math.max(0.15, Math.abs(Math.sin(phase * 2 + b * 0.8)) * currentAmp);
          }
          for (let i = 0; i < 16; i++) {
            const ripple = Math.sin(phase * 2.2 + i * 0.6) * 0.5 + 0.5;
            points[i] = ripple * currentAmp;
          }
        } else if (isListening) {
          const ambientWave = Math.sin(phase * 1.2) * 0.35 + 0.45;
          currentAmp = ambientWave;
          for (let b = 0; b < 8; b++) {
            bands[b] = Math.sin(phase + b * 0.4) * 0.3 + 0.3;
          }
          for (let i = 0; i < 16; i++) {
            points[i] = (Math.sin(phase * 1.4 + i * 0.4) * 0.5 + 0.5) * 0.6;
          }
        } else if (isThinking) {
          currentAmp = 0.4 + Math.sin(phase * 2.5) * 0.2;
          for (let b = 0; b < 8; b++) {
            bands[b] = (Math.sin(phase * 3 + b) + 1) * 0.25;
          }
          for (let i = 0; i < 16; i++) {
            points[i] = 0.25 + Math.sin(phase * 3 + i * 0.8) * 0.15;
          }
        }
      }

      setAmplitude(currentAmp);
      setFreqBands(bands);
      setWavePoints(points);

      animFrameRef.current = requestAnimationFrame(updateVisuals);
    };

    animFrameRef.current = requestAnimationFrame(updateVisuals);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isActive, isListening, isSpeaking, isThinking, isPatientSpeaking]);

  // Construct SVG Waveform Path across bottom edge
  const svgWavePath = React.useMemo(() => {
    const width = 1000;
    const baseHeight = 28;
    const step = width / (wavePoints.length - 1);

    let d = `M 0 ${baseHeight}`;
    for (let i = 0; i < wavePoints.length; i++) {
      const x = i * step;
      const peak = wavePoints[i] * 20 * (amplitude > 0.1 ? 1 : 0.2);
      const y = Math.max(3, baseHeight - peak);

      if (i === 0) {
        d += ` L ${x} ${y}`;
      } else {
        const prevX = (i - 1) * step;
        const cpX = (prevX + x) / 2;
        d += ` Q ${prevX + (x - prevX) * 0.5} ${y}, ${x} ${y}`;
      }
    }
    d += ` L ${width} ${baseHeight} Z`;
    return d;
  }, [wavePoints, amplitude]);

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 pointer-events-none z-30 transition-all duration-500 ease-out overflow-hidden ${
        isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      } ${className}`}
      aria-hidden={!isActive}
    >
      {/* 1. UPWARD DIFFUSED AMBIENT AURA (NVIDIA Green & Emerald Gradient) */}
      <div
        className="w-full ambient-aura-plume pointer-events-none transition-all duration-150"
        style={{
          height: `${48 + amplitude * 52}px`,
          opacity: Math.min(1, 0.5 + amplitude * 0.5),
          filter: `drop-shadow(0 -10px ${20 + amplitude * 25}px rgba(118, 185, 0, ${0.4 + amplitude * 0.4}))`,
        }}
      />

      {/* 2. CONTEXTUAL STATUS PILL WITH EQUALIZER BARS */}
      {showStatusBadge && isActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0b1512]/95 border border-[#76B900]/50 backdrop-blur-md shadow-[0_0_20px_rgba(118,185,0,0.35)] transition-all animate-fadeIn">
          {/* Pulsing Dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#76B900] ${
              isPatientSpeaking
                ? 'bg-purple-400 animate-pulse'
                : isListening
                ? 'bg-[#76B900] animate-ping'
                : isThinking
                ? 'bg-[#10B981] animate-spin'
                : 'bg-[#76B900] animate-pulse'
            }`}
          />

          {/* Mini Real-Time Audio Reactive Equalizer Bars */}
          <div className="flex items-end gap-0.5 h-3 px-1">
            {freqBands.slice(0, 5).map((val, idx) => (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isPatientSpeaking ? 'bg-purple-400' : 'bg-[#76B900]'
                }`}
                style={{
                  height: `${Math.max(2, val * 12)}px`,
                  opacity: 0.6 + val * 0.4,
                }}
              />
            ))}
          </div>

          {/* Voice Context Text */}
          <span className="text-[12px] font-mono font-medium text-emerald-200 tracking-tight whitespace-nowrap">
            {isPatientSpeaking
              ? patientTranscript
                ? `🎙️ Eleanor (Simulated Voice): "${patientTranscript}"`
                : '🎙️ Eleanor (Simulated Voice)...'
              : isListening
              ? transcript
                ? `"${transcript}"`
                : 'Listening (Audio-Reactive)...'
              : isThinking
              ? 'Analyzing with NVIDIA Nemotron-3-Nano...'
              : 'CareBridge Ambient Speaking...'}
          </span>

          {/* Real-time Decibel / Gain Signal Badge */}
          {amplitude > 0.05 && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isPatientSpeaking
                  ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                  : 'bg-emerald-950/80 text-emerald-300 border-[#76B900]/40'
              }`}
            >
              {isPatientSpeaking ? 'SIM VOICE' : `${Math.round(amplitude * 100)}%`}
            </span>
          )}
        </div>
      )}

      {/* 2B. DEMO VOICE SIMULATOR BUTTON */}
      {onTriggerDemoVoice && (
        <div className="absolute bottom-4 right-4 pointer-events-auto z-40">
          <button
            onClick={onTriggerDemoVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d131f]/95 hover:bg-[#1e293b] border border-[#76B900]/50 hover:border-[#76B900] text-emerald-200 hover:text-white text-[11px] font-mono font-bold shadow-[0_0_16px_rgba(118,185,0,0.35)] transition-all active:scale-95"
            title="1-Click Dual-Turn Mock Voice Dialogue Simulator"
          >
            <span>🎭</span>
            <span>Demo Voice</span>
          </button>
        </div>
      )}

      {/* 3. DYNAMIC AUDIO-REACTIVE UNDULATING SVG WAVE RIBBON */}
      <div className="w-full h-7 absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <svg
          viewBox="0 0 1000 28"
          preserveAspectRatio="none"
          className="w-full h-full opacity-90 transition-all duration-75"
        >
          <defs>
            <linearGradient id="nemotronReactiveWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#76B900" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#10B981" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#10B981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#76B900" stopOpacity="0.95" />
            </linearGradient>
            <filter id="waveGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Liquid Ripple Wave Path */}
          <path
            d={svgWavePath}
            fill="url(#nemotronReactiveWaveGrad)"
            filter="url(#waveGlow)"
          />
        </svg>
      </div>

      {/* 4. CENTER DYNAMIC FOCAL WAVE PIP */}
      {(isListening || isSpeaking) && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] bg-white rounded-full shadow-[0_0_16px_#76B900,0_0_28px_#10B981] z-20 transition-all duration-75"
          style={{
            width: `${70 + amplitude * 180}px`,
            opacity: 0.75 + amplitude * 0.25,
          }}
        />
      )}

      {/* 5. TRAVELING LASER SHIMMER BEAM (Sweeps across the light bar during Nemotron inference) */}
      {isThinking && (
        <div className="absolute bottom-0 left-0 right-0 h-[4px] ambient-traveling-beam z-20" />
      )}

      {/* 6. HARDWARE CORE LIGHT BAR */}
      <div className="w-full h-[3.5px] ambient-lightbar z-10" />
    </div>
  );
}
