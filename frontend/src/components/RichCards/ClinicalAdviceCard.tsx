'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faTriangleExclamation,
  faCircleCheck,
  faXmark,
  faStethoscope,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import { SMSDispatchInfo } from '@/types';

interface ClinicalAdviceCardProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actionAdvice?: string;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  clinicalExplanation?: string;
  smsDispatch?: SMSDispatchInfo | null;
}

export function ClinicalAdviceCard({
  isOpen,
  onClose,
  title = 'Clinical Triage Assessment',
  actionAdvice = 'Please sit down immediately and drink a glass of warm water. Rest for 15 minutes before checking blood pressure.',
  urgencyLevel = 'MEDIUM',
  clinicalExplanation = 'Transient orthostatic hypotension may occur shortly after taking anti-hypertensive medication such as Amlodipine.',
  smsDispatch,
}: ClinicalAdviceCardProps) {
  if (!isOpen) return null;

  const urgencyColors = {
    LOW: {
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: faCircleCheck,
    },
    MEDIUM: {
      border: 'border-[#FF5733]/40',
      badgeBg: 'bg-[#FF5733]/15 text-[#FF5733] border-[#FF5733]/30',
      icon: faTriangleExclamation,
    },
    HIGH: {
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: faTriangleExclamation,
    },
    EMERGENCY: {
      border: 'border-rose-500/60',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: faTriangleExclamation,
    },
  }[urgencyLevel] || {
    border: 'border-white/[0.08]',
    badgeBg: 'bg-white/[0.06] text-slate-300 border-white/[0.08]',
    icon: faStethoscope,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-[#1E2330] border-2 ${urgencyColors.border} w-full max-w-md rounded-3xl p-6 text-white shadow-2xl relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* Urgency Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium mb-4 ${urgencyColors.badgeBg}`}>
          <FontAwesomeIcon icon={urgencyColors.icon} className="text-xs" />
          <span>Bedrock Triage - {urgencyLevel} Urgency</span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>

        {/* Advice box */}
        <div className="bg-[#151922] rounded-2xl p-4 border border-white/[0.08] mt-3">
          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {actionAdvice}
          </p>
        </div>

        {/* Clinical Rationale */}
        {clinicalExplanation && (
          <div className="mt-3 text-xs text-slate-300 leading-relaxed bg-[#151922] p-3 rounded-xl border border-white/[0.06]">
            <strong className="text-[#FF5733] font-semibold block mb-1">Clinical insight:</strong>
            {clinicalExplanation}
          </div>
        )}

        {/* AWS SNS SMS Dispatch Notification Banner */}
        {smsDispatch && smsDispatch.delivered ? (
          <div className="mt-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                <span className="text-xs font-semibold tracking-tight">Urgent SMS Dispatched</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {smsDispatch.simulated ? 'AWS Sandbox' : 'AWS SNS Live'}
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-snug">
              Urgent triage alert sent to <strong className="text-white font-medium">{smsDispatch.recipient}</strong> (<span className="font-mono text-slate-300">{smsDispatch.phone}</span>).
            </p>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-rose-500/20">
              <span className="truncate max-w-[200px]" title={smsDispatch.messageId}>
                ID: {smsDispatch.messageId.substring(0, 16)}...
              </span>
              <span>
                {(() => {
                  try {
                    return new Date(smsDispatch.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                  } catch {
                    return 'Just now';
                  }
                })()}
              </span>
            </div>
          </div>
        ) : urgencyLevel === 'EMERGENCY' ? (
          <div className="mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-rose-400 text-sm shrink-0" />
            <span className="leading-snug">Emergency protocol triggered. Caregiver notified via AWS SNS.</span>
          </div>
        ) : null}

        <button
          onClick={onClose}
          className="w-full mt-5 py-3.5 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
          <span>I understand and acknowledge</span>
        </button>
      </div>
    </div>
  );
}
