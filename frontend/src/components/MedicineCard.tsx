'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faPills,
  faPencil,
  faClock,
  faUtensils,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';

export interface MedicineCardItem {
  logId: string;
  medicineId: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  date?: string;
  status: 'pending' | 'taken' | 'skipped';
  isTaken: boolean;
  takenAt?: string;
  notes?: string;
  stockCount?: number;
  imageUri?: string;
  type?: 'medication' | 'routine';
}

export const isFutureDose = (dateStr?: string, scheduledTime?: string): boolean => {
  if (!dateStr || !scheduledTime) return false;
  const now = new Date();
  const doseDateTime = new Date(`${dateStr}T${scheduledTime}:00`);
  return doseDateTime.getTime() > now.getTime();
};

interface MedicineCardProps {
  item: MedicineCardItem;
  onToggleStatus: (logId: string, currentStatus: 'pending' | 'taken' | 'skipped') => void;
  onOpenNoteModal?: (item: MedicineCardItem) => void;
  onRefillStock?: (medicineId: string) => void;
  onEdit?: (item: MedicineCardItem) => void;
  onDelete?: (medicineId: string) => void;
}

export function MedicineCard({
  item,
  onToggleStatus,
  onOpenNoteModal,
  onEdit,
  onDelete,
}: MedicineCardProps) {
  const isTaken = item.status === 'taken';
  const isFuture = isFutureDose(item.date, item.scheduledTime) && item.status === 'pending';

  const handleToggle = () => {
    if (isFuture) return;
    if (!isTaken) {
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#2563EB', '#10B981', '#38BDF8'],
        });
      } catch (_) {}
    }
    onToggleStatus(item.logId, item.status);
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex items-start justify-between gap-3.5 sm:gap-4 transition-all hover:shadow-[0_8px_25px_rgba(0,0,0,0.07)]">
      {/* 1. LEFT STATUS CIRCLE BADGE (MATCHES image/3.png & image/6.png) */}
      <button
        type="button"
        disabled={isFuture}
        onClick={handleToggle}
        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform ${
          isFuture
            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
            : isTaken
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 active:scale-90'
            : 'bg-blue-50 text-blue-600 border border-blue-200/60 hover:bg-blue-100 active:scale-90'
        }`}
        title={
          isFuture
            ? 'Upcoming (Scheduled)'
            : isTaken
            ? 'Dose completed (Click to toggle)'
            : 'Click to mark dose as taken'
        }
      >
        <FontAwesomeIcon
          icon={isTaken ? faCheck : faClock}
          className={`text-lg ${
            isFuture ? 'text-slate-400' : isTaken ? 'text-emerald-600 stroke-[3]' : 'text-blue-600'
          }`}
        />
      </button>

      {/* 2. CENTER MEDICATION DETAILS (MATCHES image/3.png & image/6.png) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug truncate">
            {item.name}
          </h4>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Edit prescription"
              >
                <FontAwesomeIcon icon={faPencil} className="text-xs" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete this prescription (${item.name})?`)) {
                    onDelete(item.medicineId);
                  }
                }}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Delete prescription"
              >
                <FontAwesomeIcon icon={faTrashCan} className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Pill Stock Chip with Pencil */}
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => onEdit?.(item)}
            className="bg-blue-50/80 border border-blue-200/60 text-blue-700 hover:bg-blue-100 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Edit stock or prescription details"
          >
            <FontAwesomeIcon icon={faPills} className="text-[10px]" />
            <span>{item.stockCount ?? 60} pills</span>
            <FontAwesomeIcon icon={faPencil} className="text-[9px] text-blue-500" />
          </button>
        </div>

        {/* Dosage Info */}
        <p className="text-slate-700 text-xs font-semibold mt-1">
          {item.dosage} • Take 1 pill
        </p>

        {/* Taken / Scheduled Status Text */}
        <p
          className={`text-xs font-medium mt-0.5 ${
            isTaken ? 'text-emerald-600' : 'text-slate-600'
          }`}
        >
          {isTaken
            ? `Taken at ${item.takenAt || item.scheduledTime}`
            : isFuture
            ? `Upcoming • ${item.scheduledTime}`
            : `Scheduled at ${item.scheduledTime}`}
        </p>

        {/* Dietary / Clinical Note Chip with Pencil */}
        <button
          type="button"
          onClick={() => onOpenNoteModal?.(item)}
          className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-[11px] font-semibold rounded-lg px-2.5 py-1 mt-2 inline-flex items-center gap-1.5 transition-colors cursor-pointer text-left"
          title="Edit intake instruction or clinical observation note"
        >
          <FontAwesomeIcon icon={faUtensils} className="text-[10px] text-blue-700" />
          <span className="truncate max-w-[200px]">
            {item.notes || 'Taken with breakfast'}
          </span>
          <FontAwesomeIcon icon={faPencil} className="text-[9px] text-blue-600" />
        </button>
      </div>

      {/* 3. RIGHT STATUS BADGE / ACTION BUTTON (MATCHES image/3.png & image/6.png) */}
      <div className="shrink-0 flex items-center">
        {isTaken ? (
          <button
            type="button"
            onClick={handleToggle}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3.5 sm:px-4 py-2 rounded-full text-xs flex items-center gap-1.5 border border-emerald-200/60 shadow-2xs active:scale-95 transition-all"
            title="Mark as pending"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs" />
            <span>Taken</span>
          </button>
        ) : isFuture ? (
          <button
            type="button"
            disabled
            className="bg-slate-100 border border-slate-200 text-slate-400 font-semibold px-3.5 sm:px-4 py-2 rounded-full text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80"
            title="Upcoming (Scheduled)"
          >
            <FontAwesomeIcon icon={faClock} className="text-xs text-slate-400" />
            <span>Upcoming</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            className="bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-bold px-3.5 sm:px-4 py-2 rounded-full text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
            title="Mark dose as completed"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs" />
            <span>Mark Taken</span>
          </button>
        )}
      </div>
    </div>
  );
}