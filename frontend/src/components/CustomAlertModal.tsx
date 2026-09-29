'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faCircleCheck,
  faCircleInfo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

interface CustomAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
}

export function CustomAlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: CustomAlertModalProps) {
  if (!isOpen) return null;

  const icon =
    type === 'success'
      ? faCircleCheck
      : type === 'warning'
      ? faTriangleExclamation
      : faCircleInfo;

  const colorClass =
    type === 'success'
      ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
      : type === 'warning'
      ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
      : 'text-[#FF5733] bg-[#FF5733]/15 border border-[#FF5733]/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/[0.08] text-white transform transition-all animate-scaleUp text-center">
        <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3 ${colorClass}`}>
          <FontAwesomeIcon icon={icon} className="text-xl" />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-semibold text-sm active:scale-[0.98] transition-all shadow-md"
        >
          OK
        </button>
      </div>
    </div>
  );
}
