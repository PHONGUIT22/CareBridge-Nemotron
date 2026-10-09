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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700">
            Active Health Guardian
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
            AI Persona
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Behavioral intervention engine
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {GUARDIAN_PERSONAS_LIST.map((persona) => {
          const isSelected = selectedId === persona.id;
          const isRecommended = persona.id === 'grandson_leo';

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona)}
              className={`relative p-2 sm:p-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-2 select-none active:scale-[0.98] ${
                isSelected
                  ? 'bg-blue-50/80 border-[#1E3A8A] ring-1 ring-[#1E3A8A] shadow-[0_4px_16px_rgba(30,58,138,0.12)] -translate-y-0.5'
                  : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Glow Avatar Circle */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base shadow-xs transition-transform ${
                  isSelected ? 'scale-105' : ''
                }`}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${persona.accentColor}25, ${persona.accentColor}10)`
                    : 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
                  boxShadow: isSelected ? `0 0 12px ${persona.accentColor}35` : 'none',
                }}
              >
                <span>{persona.avatarIcon}</span>
              </div>

              {/* Text Area without Aggressive Truncation */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[11px] font-bold leading-tight text-slate-900 line-clamp-1">
                    {persona.displayName}
                  </h4>
                  {isRecommended && (
                    <span className="shrink-0 border border-amber-300/50 bg-amber-500/10 text-amber-700 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full inline-flex items-center shadow-2xs">
                      Rec
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] leading-tight text-slate-500 font-medium line-clamp-1 mt-0.5">
                  {persona.roleTitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
