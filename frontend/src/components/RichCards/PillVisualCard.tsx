'use client';

import React from 'react';
import { AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCapsules, faXmark } from '@fortawesome/free-solid-svg-icons';

interface PillVisualCardProps {
  isOpen: boolean;
  onClose: () => void;
  medicineName?: string;
  dosage?: string;
  instructions?: string;
  pillColor?: string;
}

export function PillVisualCard({
  isOpen,
  onClose,
  medicineName = 'Amlodipine Besylate',
  dosage = '5 mg • Oral Tablet',
  instructions = 'Take 1 tablet daily with a full glass of water. Swallow whole.',
  pillColor = 'White, Round, Scored with "AML 5"',
}: PillVisualCardProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] border border-[#FF5733]/40 w-full max-w-sm sm:max-w-md rounded-3xl p-6 text-white shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* ECHO SHOW RICH CARD BADGE */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5733]/15 border border-[#FF5733]/30 text-[#FF5733] text-xs font-mono font-medium mb-4">
          <FontAwesomeIcon icon={faCapsules} className="text-xs" />
          <span>Visual pill recognition</span>
        </div>

        {/* LARGE PILL VISUAL CARD FOR SENIORS */}
        <div className="w-full h-36 rounded-2xl bg-[#151922] border border-white/[0.08] flex flex-col items-center justify-center shadow-inner my-2">
          {/* Stylized pill graphic */}
          <div className="w-24 h-14 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center rotate-[-12deg]">
            <span className="text-slate-800 font-mono font-bold text-xs tracking-wider select-none border-b border-slate-300 pb-0.5">
              AML 5
            </span>
          </div>
          <p className="text-xs text-slate-300 font-mono font-medium mt-3">{pillColor}</p>
        </div>

        {/* MEDICATION NAME AND INSTRUCTIONS */}
        <div className="mt-4">
          <h3 className="text-xl font-semibold text-white tracking-tight">{medicineName}</h3>
          <p className="text-xs font-mono font-medium text-[#FF5733] mt-0.5">{dosage}</p>
        </div>

        <div className="bg-[#151922] rounded-2xl p-3.5 border border-white/[0.08] mt-3 text-xs text-slate-300 leading-relaxed">
          <strong className="text-white font-medium block mb-1">Clinical instruction:</strong>
          {instructions}
        </div>

        {/* CONFIRM PILL MATCH BUTTON */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-3.5 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
        >
          <CheckCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Confirmed pill match</span>
        </button>
      </div>
    </div>
  );
}