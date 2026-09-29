'use client';

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faXmark,
  faPhone,
  faCheck,
  faTriangleExclamation,
  faWaveSquare,
  faHeartPulse,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';
import { GuardianNegotiationCardData } from '../../types';
import { soundFxService } from '../../services/soundFxService';

interface GuardianNegotiationCardProps {
  isOpen: boolean;
  onClose: () => void;
  data?: GuardianNegotiationCardData | null;
  onTakeDose: (medicineName?: string) => void;
  onCallSarah?: () => void;
  patientName?: string;
  caregiverName?: string;
}

export function GuardianNegotiationCard({
  isOpen,
  onClose,
  data,
  onTakeDose,
  onCallSarah,
  patientName = 'Eleanor',
  caregiverName = 'Sarah Connor',
}: GuardianNegotiationCardProps) {
  const [sarahCalling, setSarahCalling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (data?.escalationLevel === 'SARAH_CIRCUIT_BREAKER') {
        soundFxService.playDaughterPing();
      } else {
        soundFxService.playWarningTone();
      }
    } else {
      setSarahCalling(false);
    }
  }, [isOpen, data?.escalationLevel]);

  if (!isOpen || !data) return null;

  const isCircuitBreaker = data.escalationLevel === 'SARAH_CIRCUIT_BREAKER';

  // Distinct persona themes
  const personaTheme = (() => {
    const name = data.guardianName.toLowerCase();
    if (name.includes('betty')) {
      return {
        accent: '#10B981',
        border: 'border-emerald-500',
        glow: 'shadow-[0_0_25px_rgba(16,185,129,0.25)]',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        avatarBg: 'bg-emerald-500/20 text-emerald-300',
      };
    }
    if (name.includes('reynolds')) {
      return {
        accent: '#2563EB',
        border: 'border-blue-500',
        glow: 'shadow-[0_0_25px_rgba(37,99,235,0.25)]',
        badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        avatarBg: 'bg-blue-500/20 text-blue-300',
      };
    }
    if (name.includes('miller')) {
      return {
        accent: '#E11D48',
        border: 'border-rose-600',
        glow: 'shadow-[0_0_25px_rgba(225,29,72,0.25)]',
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        avatarBg: 'bg-rose-500/20 text-rose-300',
      };
    }
    // Default Grandson Leo (Amber / Sunshine)
    return {
      accent: '#F59E0B',
      border: 'border-amber-500',
      glow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)]',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      avatarBg: 'bg-amber-500/20 text-amber-300',
    };
  })();

  const handleTakePill = () => {
    soundFxService.playPillClick();
    soundFxService.playCelebrationChord();

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10B981', '#00CAFF', '#F59E0B', '#38BDF8'],
    });

    onTakeDose(data.medicineName);
    onClose();
  };

  const handleTriggerSarahCall = () => {
    setSarahCalling(true);
    soundFxService.playDaughterPing();
    if (onCallSarah) {
      onCallSarah();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/85 backdrop-blur-lg animate-fadeIn">
      <div
        className={`bg-[#1E2330] border-2 ${
          isCircuitBreaker ? 'border-rose-500' : personaTheme.border
        } ${personaTheme.glow} w-full max-w-lg rounded-[28px] p-6 text-white shadow-2xl relative overflow-hidden flex flex-col gap-4`}
      >
        {/* Top ambient highlight bar matching Alexa Cyan glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00CAFF] via-[#FF5733] to-[#00CAFF] animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          title="Dismiss"
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>

        {/* Header: Persona Avatar & Role */}
        <div className="flex items-start gap-3.5 pr-8">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-white/10 shrink-0 shadow-inner ${personaTheme.avatarBg}`}
          >
            {data.avatar || '🛡️'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                {data.guardianName}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
                  isCircuitBreaker
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : personaTheme.badge
                }`}
              >
                {isCircuitBreaker ? '🚨 SARAH CIRCUIT-BREAKER' : `${data.escalationLevel} PERSUASION`}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              {data.roleTitle || 'AI Health Guardian'} - Negotiation Turn {data.turnCount}
            </p>
          </div>
        </div>

        {/* Alexa Cyan Audio Waveform Pulse Indicator */}
        <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#151922] border border-[#00CAFF]/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00CAFF] animate-ping" />
            <span className="font-mono text-xs text-[#00CAFF] font-medium">
              Alexa Echo Show Ambient Audio
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#00CAFF]">
            <FontAwesomeIcon icon={faWaveSquare} className="text-xs animate-pulse" />
            <span className="text-[11px] font-mono">Neural Polly</span>
          </div>
        </div>

        {/* High-Contrast Guardian Quote Bubble (WCAG AAA) */}
        <div className="bg-[#151922] border border-white/10 rounded-2xl p-4.5 relative shadow-inner">
          <div className="flex items-start gap-2.5">
            <span className="text-xl leading-none text-slate-400 select-none">“</span>
            <p className="text-sm text-slate-100 font-medium leading-relaxed select-text font-sans">
              {data.quote}
            </p>
          </div>
          <div className="mt-2 text-right">
            <span className="text-[11px] font-mono text-slate-400">
              Target: {data.medicineName}
            </span>
          </div>
        </div>

        {/* Sarah Connor Circuit-Breaker Status Card */}
        {isCircuitBreaker && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />
                <span className="text-xs font-semibold tracking-tight">
                  Mandatory Family Safety Protocol
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                AWS SNS Dispatched
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-snug">
              {patientName} has refused critical medication. Primary caregiver{' '}
              <strong className="text-white">{caregiverName}</strong> has been dispatched an urgent
              AWS SNS SMS alert for clinical skip approval.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-xs font-mono text-slate-300">
              <span>Contact: {data.sarahPhone || '+1 555-0199'}</span>
              <span className="text-[10px] text-slate-400">
                {data.snsMessageId ? `Ref: ${data.snsMessageId.substring(0, 12)}...` : 'Status: Alerting'}
              </span>
            </div>
          </div>
        )}

        {/* Live Call Sarah Calling Status Feedback */}
        {sarahCalling && (
          <div className="p-3 rounded-2xl bg-[#00CAFF]/10 border border-[#00CAFF]/40 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5 text-[#00CAFF]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00CAFF] animate-ping" />
              <span className="font-medium text-white">
                Connecting audio call to {caregiverName} at work (+1 555-0199)...
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#00CAFF]">Ringing</span>
          </div>
        )}

        {/* TWO LARGE TREMOR-TOLERANT ACTION BUTTONS (56px+ height) */}
        <div className="flex flex-col gap-2.5 mt-1">
          {/* 1. Primary (Emerald): "You're right, I'll take it now!" */}
          <button
            type="button"
            onClick={handleTakePill}
            className="w-full h-14 min-h-[56px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base tracking-normal flex items-center justify-center gap-3 shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="text-sm text-white" />
            </div>
            <span>You&apos;re right, I&apos;ll take it now!</span>
          </button>

          {/* 2. Danger / Sarah Gateway: "Call Sarah to approve skip" */}
          <button
            type="button"
            onClick={handleTriggerSarahCall}
            className={`w-full h-14 min-h-[56px] rounded-2xl font-bold text-sm tracking-normal flex items-center justify-center gap-3 active:scale-[0.98] transition-all border ${
              isCircuitBreaker
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg hover:shadow-rose-500/25'
                : 'bg-[#151922] hover:bg-[#1E2330] text-rose-300 hover:text-white border-rose-500/40 hover:border-rose-500'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faPhone} className="text-sm text-rose-300" />
            </div>
            <span>
              {sarahCalling
                ? 'Calling Sarah (+1 555-0199)...'
                : 'Call Sarah to approve skip (+1 555-0199)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
