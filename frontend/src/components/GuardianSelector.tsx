'use client';

import React, { useState, useEffect } from 'react';
import { GuardianPersonaId, GuardianPersona } from '../types';

export const GUARDIAN_PERSONAS_LIST: GuardianPersona[] = [
  {
    id: 'nurse_betty',
    displayName: 'Nurse Betty',
    roleTitle: 'Geriatric Care',
    avatarIcon: '🩺',
    voiceTone: 'Gentle & Comforting',
    accentColor: '#10B981',
    themeColor: 'emerald',
    description: 'Offers warm water & promises a TV show after the pill.',
  },
  {
    id: 'dr_reynolds',
    displayName: 'Dr. Reynolds',
    roleTitle: 'Attending Physician',
    avatarIcon: '👨‍⚕️',
    voiceTone: 'Clinical & Exact',
    accentColor: '#1E3A8A',
    themeColor: 'blue',
    description: 'Strict, authoritative hemodynamic risk data.',
  },
  {
    id: 'grandson_leo',
    displayName: 'Grandson Leo',
    roleTitle: '7-Year-Old Grandson',
    avatarIcon: '👦',
    voiceTone: 'Loving & Innocent',
    accentColor: '#F59E0B',
    themeColor: 'amber',
    description: 'Zoo trip promise and heart-melting family bond.',
  },
  {
    id: 'sergeant_miller',
    displayName: 'Sgt. Miller',
    roleTitle: 'Drill Sergeant',
    avatarIcon: '🎖️',
    voiceTone: 'Crisp & Disciplined',
    accentColor: '#E11D48',
    themeColor: 'rose',
    description: 'Down the hatch in 3... 2... 1! No excuses.',
  },
];

interface GuardianSelectorProps {
  activePersonaId?: GuardianPersonaId;
  onSelectPersona?: (persona: GuardianPersona) => void;
  compact?: boolean;
}

export function GuardianSelector({
  activePersonaId: propActiveId,
  onSelectPersona,
  compact = false,
}: GuardianSelectorProps) {
  const [selectedId, setSelectedId] = useState<GuardianPersonaId>('grandson_leo');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('carebridge_active_guardian') as GuardianPersonaId;
      if (saved && GUARDIAN_PERSONAS_LIST.some((p) => p.id === saved)) {
        setSelectedId(saved);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (propActiveId) {
      setSelectedId(propActiveId);
    }
  }, [propActiveId]);

  const handleSelect = (persona: GuardianPersona) => {
    setSelectedId(persona.id);
    try {
      localStorage.setItem('carebridge_active_guardian', persona.id);
    } catch (_) {}
    if (onSelectPersona) {
      onSelectPersona(persona);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-wider font-mono ${
              compact ? 'text-slate-400' : 'text-slate-700'
            }`}
          >
            Active Health Guardian
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
            AI Persona
          </span>
        </div>
        <span className={`text-[11px] font-medium ${compact ? 'text-slate-400' : 'text-slate-500'}`}>
          Behavioral intervention engine
        </span>
      </div>

      <div
        className={`grid ${
          compact
            ? 'grid-cols-2 sm:grid-cols-4 gap-2'
            : 'grid-cols-2 sm:grid-cols-4 gap-2.5'
        }`}
      >
        {GUARDIAN_PERSONAS_LIST.map((persona) => {
          const isSelected = selectedId === persona.id;
          const isRecommended = persona.id === 'grandson_leo';

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona)}
              className={`relative flex flex-col items-center text-center p-2.5 rounded-2xl transition-all duration-200 border select-none ${
                compact
                  ? isSelected
                    ? 'bg-[#0B1528] ring-2 ring-blue-500 shadow-md translate-y-[-1px]'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                  : isSelected
                  ? 'bg-blue-50/80 border-2 border-[#1E3A8A] shadow-sm translate-y-[-1px]'
                  : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-2 right-1.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-amber-200 text-amber-950 border border-amber-400 font-mono shadow-2xs">
                  Rec
                </span>
              )}
              {/* Centered Avatar Icon */}
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 mb-1.5 ${
                  compact ? 'bg-white/10' : isSelected ? 'bg-blue-100/80' : 'bg-slate-100'
                }`}
              >
                {persona.avatarIcon}
              </span>
              {/* Display Name - Full Width Without Ugly Truncation */}
              <h4
                className={`text-xs font-bold leading-tight w-full ${
                  compact ? 'text-white' : 'text-slate-900'
                }`}
              >
                {persona.displayName}
              </h4>
              {/* Role Subtitle */}
              <p
                className={`text-[10px] leading-tight mt-0.5 font-medium truncate w-full ${
                  compact ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {persona.roleTitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
