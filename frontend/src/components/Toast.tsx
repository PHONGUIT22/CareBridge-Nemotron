'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faCircleCheck,
  faCircleInfo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export interface ToastMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const icon =
          t.type === 'success'
            ? faCircleCheck
            : t.type === 'warning'
            ? faTriangleExclamation
            : t.type === 'error'
            ? faTriangleExclamation
            : faCircleInfo;

        const borderClass =
          t.type === 'success'
            ? 'border-emerald-500/40 bg-[#1E2330]/95 text-emerald-400'
            : t.type === 'warning'
            ? 'border-amber-500/40 bg-[#1E2330]/95 text-amber-400'
            : t.type === 'error'
            ? 'border-rose-500/40 bg-[#1E2330]/95 text-rose-400'
            : 'border-[#FF5733]/40 bg-[#1E2330]/95 text-[#FF5733]';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl p-3.5 border shadow-2xl backdrop-blur-md flex items-start gap-3 transform transition-all animate-fadeIn ${borderClass}`}
          >
            <FontAwesomeIcon icon={icon} className="text-base mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {t.title && <h5 className="text-xs font-semibold text-white tracking-tight">{t.title}</h5>}
              <p className="text-xs text-slate-300 font-normal leading-relaxed mt-0.5">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0 transition-colors"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
