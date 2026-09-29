'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faBolt, faMicrophone, faPlay } from '@fortawesome/free-solid-svg-icons';
import { MOCK_VOICE_SCENARIOS, MockVoiceScenario } from '../services/mockVoiceScenarios';

export interface DemoVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: MockVoiceScenario) => void;
  activeScenarioId?: string | null;
  isBusy?: boolean;
}

/**
 * DemoVoiceModal - 1-Click Dual-Turn Mock Voice Dialogue Simulator
 * 
 * Enables zero-speech, seamless multimodal video demonstrations:
 * Turn 1: Eleanor Vance (patient voice) speaks clinical query aloud.
 * Turn 2: CareBridge Copilot triggers earcon chime, ripples Web Audio light bar,
 *         executes Nemotron/MCP tools, and speaks response.
 */
export function DemoVoiceModal({
  isOpen,
  onClose,
  onSelectScenario,
  activeScenarioId,
  isBusy = false,
}: DemoVoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0f172a] border border-[#76B900]/40 rounded-3xl w-full max-w-xl flex flex-col shadow-[0_0_40px_rgba(118,185,0,0.25)] overflow-hidden">
        {/* HEADER */}
        <div className="px-5 py-4 bg-[#1e293b] border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm shadow-md shadow-purple-600/30">
              <span>🎭</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Mock Voice Dialogue Simulator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Dual-Turn Audio
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Turn 1: Eleanor (Age 78) ➔ Turn 2: CareBridge Copilot (Nemotron-70B)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>

        {/* SCENARIOS LIST */}
        <div className="p-4 sm:p-5 flex flex-col gap-2.5 max-h-[68vh] overflow-y-auto">
          <p className="text-xs text-slate-300 mb-1 leading-relaxed">
            Select any scenario below to simulate a realistic, hands-free video recording turn without background noise or speech recognition stumbles:
          </p>

          {MOCK_VOICE_SCENARIOS.map((scenario, index) => {
            const isActive = activeScenarioId === scenario.id;
            return (
              <button
                key={scenario.id}
                disabled={isBusy}
                onClick={() => {
                  onSelectScenario(scenario);
                  onClose();
                }}
                className={`p-3 rounded-2xl text-left border transition-all flex items-start gap-3.5 group active:scale-[0.98] ${
                  isActive
                    ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                    : 'bg-[#161f33] hover:bg-[#1c2742] border-slate-700/80 hover:border-[#76B900]/50 text-slate-200'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5 shadow-sm"
                  style={{ backgroundColor: `${scenario.accentColor}25`, border: `1px solid ${scenario.accentColor}50` }}
                >
                  <span>{scenario.actionIcon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Scenario {index + 1}: {scenario.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {scenario.badge}
                    </span>
                  </div>

                  <p className="text-xs text-emerald-200/90 font-mono mt-1 italic">
                    &ldquo;{scenario.prompt}&rdquo;
                  </p>

                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    {scenario.description}
                  </p>
                </div>

                <div className="self-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                  <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                  <span>Simulate</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-[#1e293b] border-t border-slate-700 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Target Pacing: ~138 wpm (DEMO_SCRIPT_3MIN.md)</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
