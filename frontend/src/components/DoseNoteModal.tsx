'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNotesMedical, faTag, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';

interface DoseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  medicineName: string;
  scheduledTime?: string;
  initialNote?: string;
}

const QUICK_TAGS = [
  'Taken with breakfast',
  'Taken with food',
  'Taken with warm water',
  'Normal / No side effects',
  'Mild dizziness',
  'Slight fatigue',
  'Mild nausea',
  'Taken 15 mins late',
];

export function DoseNoteModal({
  isOpen,
  onClose,
  onSave,
  medicineName,
  scheduledTime = '08:00',
  initialNote = '',
}: DoseNoteModalProps) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  const handleToggleTag = (tag: string) => {
    if (note.includes(tag)) {
      setNote(note.replace(tag, '').replace(/,\s*,/g, ',').trim());
    } else {
      setNote((prev) => (prev.trim() ? `${prev.trim()}, ${tag}` : tag));
    }
  };

  const handleSave = () => {
    onSave(note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200/60 flex items-center justify-center">
              <FontAwesomeIcon icon={faNotesMedical} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Clinical intake note</h3>
              <p className="text-xs text-slate-500 font-normal">
                {medicineName} • {scheduledTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* 1-TOUCH CLINICAL TAGS */}
        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
            <FontAwesomeIcon icon={faTag} className="text-xs text-[#1E3A8A]" />
            <span>Quick clinical tags</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const isSelected = note.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* FREE-FORM CLINICAL NOTE TEXTAREA */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Detailed observations and symptoms
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Felt slight lightheadedness 15 mins after taking, drank water and resolved."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#1E3A8A] focus:bg-white text-xs text-slate-900 placeholder-slate-400 resize-none shadow-inner transition-colors leading-relaxed"
          />
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1E3A8A] hover:bg-[#1E40AF] text-white active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs" />
            <span>Save observation</span>
          </button>
        </div>
      </div>
    </div>
  );
}