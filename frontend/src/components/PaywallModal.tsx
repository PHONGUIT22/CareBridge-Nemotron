'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faXmark,
  faCheck,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivatePro: () => void;
  onResetFreePlan?: () => void;
  isPro?: boolean;
}

export function PaywallModal({
  isOpen,
  onClose,
  onActivatePro,
  onResetFreePlan,
  isPro = false,
}: PaywallModalProps) {
  const [selectedTier, setSelectedTier] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');

  if (!isOpen) return null;

  const handleInstantUnlock = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#1E3A8A', '#2563EB', '#10B981', '#F59E0B'],
      });
    } catch (_) {}
    onActivatePro();
    onClose();
  };

  const handleResetFree = () => {
    onResetFreePlan?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-100 w-full max-w-[440px] rounded-[28px] p-6 sm:p-7 text-slate-900 shadow-2xl relative transform transition-all animate-scaleUp">
        {/* Close Button (image/5.png) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Close"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* Top Chip: CAREBRIDGE PRO PAYWALL */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-semibold shadow-2xs mb-2">
          <FontAwesomeIcon icon={faCrown} className="text-xs text-amber-600" />
          <span>CAREBRIDGE PRO PAYWALL</span>
        </div>

        {/* Title & Subtitle (image/5.png) */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Unlock Clinical Power
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 mb-5 leading-relaxed">
          You have reached the Free limit (2 prescriptions). Upgrade to Pro for unlimited tracking & doctor reports.
        </p>

        {/* Feature Checklist (image/5.png) */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-900">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
            </div>
            <span>Unlimited Prescription Punch-Cards (No 2-med limit)</span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-900">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
            </div>
            <span>Export Certified Clinical PDF Reports for Doctors</span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-900">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
            </div>
            <span>Family Cloud Caregiver Alerts (OneSignal)</span>
          </div>
        </div>

        {/* 3 Pricing Cards (image/5.png) */}
        <div className="space-y-3 mb-5">
          {/* 1. Monthly (POPULAR) */}
          <div
            onClick={() => setSelectedTier('monthly')}
            className={`border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${
              selectedTier === 'monthly'
                ? 'border-[#1E3A8A] bg-blue-50/30 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-[#1E3A8A]">Monthly</span>
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  POPULAR
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Unlimited punch-cards, PDF export & family alerts
              </p>
            </div>
            <span className="text-2xl font-bold text-[#1E3A8A]">$9.99</span>
          </div>

          {/* 2. Yearly */}
          <div
            onClick={() => setSelectedTier('yearly')}
            className={`border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${
              selectedTier === 'yearly'
                ? 'border-[#1E3A8A] bg-blue-50/30 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <span className="font-bold text-base text-[#1E3A8A]">Yearly</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Unlimited punch-cards, PDF export & family alerts
              </p>
            </div>
            <span className="text-2xl font-bold text-[#1E3A8A]">$79.99</span>
          </div>

          {/* 3. Lifetime */}
          <div
            onClick={() => setSelectedTier('lifetime')}
            className={`border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ${
              selectedTier === 'lifetime'
                ? 'border-[#1E3A8A] bg-blue-50/30 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <span className="font-bold text-base text-[#1E3A8A]">Lifetime</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Unlimited punch-cards, PDF export & family alerts
              </p>
            </div>
            <span className="text-2xl font-bold text-[#1E3A8A]">$99.99</span>
          </div>
        </div>

        {/* Primary CTA Button (image/5.png) */}
        <button
          type="button"
          onClick={handleInstantUnlock}
          className="w-full py-4 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span>START FREE TRIAL & UNLOCK PRO</span>
        </button>

        {/* Instant Demo Unlock Button */}
        <button
          type="button"
          onClick={handleInstantUnlock}
          className="w-full mt-2.5 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <FontAwesomeIcon icon={faBolt} className="text-xs" />
          <span>[Demo] Instant Unlock Pro (Bypass Store)</span>
        </button>

        {/* Judge Demo Reset Link */}
        <button
          type="button"
          onClick={handleResetFree}
          className="mt-3 text-red-500 hover:text-red-700 font-semibold text-xs text-center block w-full transition-colors cursor-pointer"
        >
          [Judge Demo] Reset to Free Plan (Lock Features)
        </button>
      </div>
    </div>
  );
}
