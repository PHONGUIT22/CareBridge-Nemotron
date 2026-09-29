'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SeniorClock } from '../components/SeniorClock';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { DailyLogItem } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolumeHigh,
  faCheck,
  faCapsules,
  faShieldHalved,
  faChevronRight,
  faBan,
  faHeartPulse,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';
import { GuardianSelector } from '../components/GuardianSelector';
import { soundFxService } from '../services/soundFxService';
import { isFutureDose } from '../components/MedicineCard';
import { AuthSession } from '../components/AuthGate';

interface DeskModeViewProps {
  authSession?: AuthSession | null;
  onSwitchToCaregiver?: () => void;
  onTakeDose?: (logId: string) => void;
  onTriggerGuardianRefusal?: (medicineName: string) => void;
  refreshTrigger?: number;
  patientName?: string;
}

export function DeskModeView({
  authSession,
  onSwitchToCaregiver,
  onTakeDose,
  onTriggerGuardianRefusal,
  refreshTrigger = 0,
  patientName,
}: DeskModeViewProps) {
  const effectivePatientName = authSession?.patientName || patientName;
  const [schedule, setSchedule] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.getSchedule();
      if (data?.schedule) {
        setSchedule(data.schedule);
      }
    } catch (e) {
      console.warn('DeskModeView: failed to fetch today schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [refreshTrigger, fetchSchedule]);

  // Find next pending dose
  const upcomingDose = useMemo(() => {
    const pendingList = schedule.filter((s) => s.status === 'pending');
    if (pendingList.length === 0) return null;

    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const sorted = [...pendingList].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const nextAfterNow = sorted.find((s) => s.scheduledTime >= currentHourMin);

    return nextAfterNow || sorted[0];
  }, [schedule]);

  const isUpcomingFuture = useMemo(() => {
    if (!upcomingDose) return false;
    return isFutureDose(upcomingDose.date, upcomingDose.scheduledTime) && upcomingDose.status === 'pending';
  }, [upcomingDose]);

  const totalDoses = schedule.length || 4;
  const completedDoses = schedule.filter((s) => s.status === 'taken').length;
  const progressPercent = Math.round((completedDoses / totalDoses) * 100);

  const handleSpeakMedicine = () => {
    if (!upcomingDose) return;
    const textToSpeak = `CareBridge reminder. Time for your scheduled medication: ${upcomingDose.name}, ${upcomingDose.dosage}.`;
    speechService.speak(textToSpeak);
  };

  const handleTakePill = async () => {
    if (!upcomingDose || isUpcomingFuture) return;

    soundFxService.playPillClick();
    soundFxService.playCelebrationChord();

    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.75 },
      colors: ['#00CAFF', '#10B981', '#38BDF8', '#F59E0B'],
    });

    const takingLogId = upcomingDose.logId;
    const medName = upcomingDose.name;

    setSchedule((prev) =>
      prev.map((item) =>
        item.logId === takingLogId
          ? { ...item, status: 'taken', isTaken: true, takenAt: new Date().toLocaleTimeString() }
          : item
      )
    );

    speechService.speak(`Great job! I've marked your ${medName} as taken.`);

    try {
      await mcpClient.toggleDose(takingLogId, 'pending');
      await fetchSchedule();
    } catch (err) {
      console.warn('Persisted toggle locally');
    }

    if (onTakeDose) {
      onTakeDose(takingLogId);
    }
  };

  return (
    <div className="min-h-full bg-[#050811] text-white flex flex-col justify-between p-4 sm:p-6 select-none font-sans pb-28">
      {/* 1. TOP STATUS BAR (MATCHES image/8.png) */}
      <div className="flex items-center justify-between w-full max-w-lg mx-auto pt-1">
        {/* Senior Nightstand Mode Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-teal-400 text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>SENIOR NIGHTSTAND • {effectivePatientName ? effectivePatientName.toUpperCase() : 'PATIENT'}</span>
        </div>

        {/* Caregiver Hub Button */}
        <button
          onClick={onSwitchToCaregiver}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-800 shadow-sm"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-sky-400" />
          <span>Caregiver Hub</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </button>
      </div>

      {/* 2. GIANT HARDWARE CLOCK (MATCHES image/8.png) */}
      <div className="my-auto py-8">
        <SeniorClock />
      </div>

      {/* 3. ADHERENCE & UPCOMING DOSE CARDS (MATCHES image/8.png) */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
        {/* Compliance Progress Track Card (image/8.png) */}
        <div className="bg-[#0B1528] rounded-2xl p-4 border border-blue-900/40 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-400 tracking-wider uppercase font-mono text-[11px]">
              TODAY&apos;S ADHERENCE
            </span>
            <span className="text-sky-400 font-mono tabular-nums">
              {completedDoses} / {totalDoses} Doses
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10B981] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Active Health Guardian Persona Selector */}
        <div className="bg-[#0B1528] rounded-2xl p-3 border border-blue-900/40 shadow-sm">
          <GuardianSelector compact />
        </div>

        {/* Next Dose Card (image/8.png) */}
        {upcomingDose ? (
          <div className="border-2 border-blue-600/50 bg-[#0B1528] rounded-[24px] p-5 sm:p-6 shadow-xl relative">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <FontAwesomeIcon icon={faCapsules} className="text-xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                    UPCOMING DOSE AT {upcomingDose.scheduledTime}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5 tracking-tight">
                    {upcomingDose.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{upcomingDose.dosage} • Take 1 pill</p>
                </div>
              </div>

              {/* Audio Speaker Button */}
              <button
                onClick={handleSpeakMedicine}
                className="w-11 h-11 rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/50 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                title="Hear CareBridge read medication reminder"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-base" />
              </button>
            </div>

            {/* Giant Action Button: I TOOK MY PILL or UPCOMING (SCHEDULED) */}
            {isUpcomingFuture ? (
              <button
                disabled
                className="w-full py-4 sm:py-5 rounded-2xl bg-slate-800 text-slate-400 font-bold text-base sm:text-lg tracking-wide flex items-center justify-center gap-3 cursor-not-allowed border border-slate-700 opacity-80"
                title="Upcoming (Scheduled)"
              >
                <FontAwesomeIcon icon={faClock} className="text-lg text-slate-400" />
                <span>UPCOMING (SCHEDULED)</span>
              </button>
            ) : (
              <button
                onClick={handleTakePill}
                className="w-full py-4 sm:py-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-black text-lg sm:text-xl tracking-wide flex items-center justify-center gap-3 shadow-[0_4px_25px_rgba(16,185,129,0.45)] active:scale-[0.98] transition-all"
              >
                <FontAwesomeIcon icon={faCheck} className="text-xl stroke-[3]" />
                <span>I TOOK MY PILL</span>
              </button>
            )}

            {/* Skip Dose Guardian Negotiation Button */}
            <button
              type="button"
              onClick={() => onTriggerGuardianRefusal?.(upcomingDose.name)}
              className="w-full mt-3 py-2.5 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 border border-rose-500/30 active:scale-[0.98] transition-all"
              title="Trigger AI Health Guardian refusal negotiation flow"
            >
              <FontAwesomeIcon icon={faBan} className="text-xs text-rose-400" />
              <span>I don&apos;t want to take this pill (Skip Dose)</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#0B1528] rounded-[24px] p-6 text-center border border-blue-900/40 shadow-sm">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="text-3xl text-emerald-400 mx-auto mb-2"
            />
            <h3 className="text-base font-bold text-white tracking-tight">All Medications Completed</h3>
            <p className="text-xs text-slate-400 mt-1 font-normal">
              All {schedule.length} scheduled doses for today are logged. Rest well!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}