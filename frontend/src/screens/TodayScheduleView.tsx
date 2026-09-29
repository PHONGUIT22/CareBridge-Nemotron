'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MedicineCard, MedicineCardItem } from '../components/MedicineCard';
import { DoseNoteModal } from '../components/DoseNoteModal';
import { AddMedicineModal } from '../components/AddMedicineModal';
import { EditMedicineModal } from '../components/EditMedicineModal';
import { LogVitalsModal } from '../components/LogVitalsModal';
import { useMedicines } from '../hooks/useMedicines';
import { mcpClient } from '../services/mcpClient';
import { VitalsRecord } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faUser,
  faMoon,
  faCrown,
  faPlus,
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faClock,
  faHeartPulse,
  faDroplet,
  faBolt,
  faPencil,
  faCircle,
  faXmark,
  faTableCells,
} from '@fortawesome/free-solid-svg-icons';
import { GuardianSelector } from '../components/GuardianSelector';
import { getLocalDateString } from '../utils/dateUtils';
import { AuthSession } from '../components/AuthGate';

interface TodayScheduleViewProps {
  authSession?: AuthSession | null;
  onSwitchToDeskMode?: () => void;
  onSwitchToHistory?: () => void;
  onOpenAddModal?: () => void;
  onOpenPaywall?: () => void;
  onDoseToggled?: () => void;
  onTriggerGuardianRefusal?: (medicineName: string) => void;
  refreshTrigger?: number;
  isPro?: boolean;
  caregiverName?: string;
  patientName?: string;
  patientAge?: number;
}

export function TodayScheduleView({
  authSession,
  onSwitchToDeskMode,
  onSwitchToHistory,
  onOpenAddModal,
  onOpenPaywall,
  onDoseToggled,
  onTriggerGuardianRefusal,
  refreshTrigger = 0,
  isPro = false,
  caregiverName,
  patientName,
  patientAge,
}: TodayScheduleViewProps) {
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return getLocalDateString();
  });

  const {
    schedule,
    vitals,
    caregiverName: hookCaregiverName,
    patientName: hookPatientName,
    patientAge: hookPatientAge,
    toggleDoseStatus,
    saveNote,
    recordVitals,
    refetch,
  } = useMedicines(selectedDateStr);

  const isDemo = Boolean(authSession?.isDemo);
  const displayCaregiverName = caregiverName || hookCaregiverName || 'Caregiver';
  const displayPatientName = patientName || hookPatientName || 'Patient';
  const displayPatientAge = patientAge || hookPatientAge;

  const [activeNoteItem, setActiveNoteItem] = useState<MedicineCardItem | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<MedicineCardItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [stripOffset, setStripOffset] = useState(0);

  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  const handleSaveNote = async (noteText: string) => {
    if (!activeNoteItem) return;
    await saveNote(activeNoteItem.logId, noteText);
  };

  const handleAddMedicine = async (med: {
    name: string;
    dosage: string;
    reminderTimes: string[];
    daysOfWeek: string[];
    stockCount: number;
  }) => {
    try {
      await mcpClient.addMedicine(med);
      await refetch();
    } catch (e) {
      console.error('Failed to add medicine:', e);
    }
  };

  const handleUpdateMedicine = async (updated: {
    name: string;
    dosage: string;
    reminderTimes: string[];
    daysOfWeek: string[];
    stockCount: number;
  }) => {
    if (!editingMedicine) return;
    try {
      await mcpClient.updateMedicine(editingMedicine.medicineId, updated);
      await refetch();
    } catch (e) {
      console.error('Failed to update medicine:', e);
    }
  };

  const handleDeleteMedicine = async (medicineId: string) => {
    try {
      await mcpClient.deleteMedicine(medicineId);
      await refetch();
    } catch (e) {
      console.error('Failed to delete medicine:', e);
    }
  };

  const handleSaveVitals = async (newVitals: Partial<VitalsRecord>) => {
    await recordVitals(newVitals);
  };

  const takenCount = schedule.filter((s) => s.status === 'taken').length;
  const totalCount = schedule.length || 1;
  const calculatedAdherence = Math.round((takenCount / totalCount) * 100);

  // Dynamic 6-day calendar strip centered on current date (today - 2 to today + 3 when stripOffset = 0)
  const calendarDays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + stripOffset - 2 + i);
      const dayNumber = d.getDate();
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dateStr = getLocalDateString(d);
      const isToday = d.toDateString() === new Date().toDateString();
      return {
        date: d,
        dayNumber,
        weekday,
        dateStr,
        isToday,
      };
    });
  }, [stripOffset]);

  const bigDateTitle = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const heroDateSubtitle = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const stripMonthYear = useMemo(() => {
    const centerDate = calendarDays[2]?.date || new Date();
    return centerDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [calendarDays]);

  // SVG Gauge calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calculatedAdherence / 100) * circumference;

  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-900 p-4 sm:p-5 font-sans select-none pb-28">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        {/* 1. TOP HEADER BAR (MATCHES image/3.png & image/6.png) */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          {/* Left: CAREGIVER VIEW & Caregiver Name Pills */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold shadow-2xs">
              <FontAwesomeIcon icon={faShieldHalved} className="text-[10px]" />
              <span>CAREGIVER VIEW</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-800 text-xs font-bold shadow-2xs">
              <FontAwesomeIcon icon={faUser} className="text-[10px] text-blue-600" />
              <span>{authSession?.caregiverName || 'Sarah Connor'} (Caregiver)</span>
            </span>
          </div>

          {/* Right: Desk, Pro Status, and Add Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToDeskMode}
              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
              title="Switch to Senior Bedside Nightstand Mode"
            >
              <FontAwesomeIcon icon={faMoon} className="text-xs text-sky-600" />
              <span>Desk</span>
            </button>

            {isPro ? (
              <button
                onClick={onOpenPaywall}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="CareBridge Pro Active"
              >
                <FontAwesomeIcon icon={faCrown} className="text-xs text-emerald-600" />
                <span>PRO ACTIVE</span>
              </button>
            ) : (
              <button
                onClick={onOpenPaywall}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Upgrade to CareBridge Pro"
              >
                <FontAwesomeIcon icon={faCrown} className="text-xs text-amber-600" />
                <span>UPGRADE PRO</span>
              </button>
            )}

            <button
              onClick={() => {
                if (!isPro && schedule.length >= 2) {
                  onOpenPaywall?.();
                  return;
                }
                if (onOpenAddModal) onOpenAddModal();
                else setIsAddModalOpen(true);
              }}
              className="w-8 h-8 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 transition-all"
              title="Add new medication"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
            </button>
          </div>
        </div>

        {/* Dynamic Big Date Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          {bigDateTitle}
        </h1>

        {/* 2. HERO COMPLIANCE GRADIENT CARD (MATCHES image/3.png & image/6.png) */}
        <div className="bg-gradient-to-br from-[#1E40AF] via-[#1E3A8A] to-[#2563EB] text-white rounded-[28px] p-5 sm:p-6 shadow-[0_10px_25px_rgba(30,58,138,0.22)] relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200 font-mono">
                  DAILY COMPLIANCE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Good Morning, {authSession?.caregiverName ? authSession.caregiverName.split(' ')[0] : 'Sarah'}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-xs backdrop-blur-sm border border-white/20">
                  Patient: {authSession?.patientName || 'Eleanor Vance'} (Age {authSession?.patientAge || 78})
                </span>
                <span className="text-xs text-sky-100 font-semibold">
                  • {takenCount} of {totalCount} doses completed today
                </span>
              </div>
            </div>

            {/* Circular Progress Ring Gauge */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 72 72">
                {/* Background track circle */}
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Progress bar circle */}
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke="#38BDF8"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base sm:text-lg font-extrabold text-white leading-none">
                  {calculatedAdherence}%
                </span>
                <span className="text-[8px] font-bold text-sky-200 tracking-wider mt-0.5">
                  ADHERENCE
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Vitals Row inside Hero Card */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/20 flex-wrap">
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FontAwesomeIcon icon={faHeartPulse} className="text-rose-200 text-xs" />
              <span>{vitals?.systolic && vitals?.diastolic ? `${vitals.systolic}/${vitals.diastolic} BP` : (isDemo ? '124/83 BP' : '--/-- BP')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FontAwesomeIcon icon={faDroplet} className="text-sky-200 text-xs" />
              <span>{vitals?.bloodSugar ? `${vitals.bloodSugar} Sugar` : (isDemo ? '107.4 Sugar' : '-- Sugar')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FontAwesomeIcon icon={faBolt} className="text-emerald-200 text-xs" />
              <span>{vitals?.heartRate ? `${vitals.heartRate} BPM` : (isDemo ? '73 BPM' : '-- BPM')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/25 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors ml-auto cursor-pointer shadow-2xs"
            >
              <FontAwesomeIcon icon={faPencil} className="text-[10px]" />
              <span>+ Log</span>
            </button>
          </div>
        </div>

        {/* 3. DYNAMIC 6-DAY CALENDAR SELECTOR STRIP */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {stripMonthYear}
            </h3>
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-2xs"
              title="Open full monthly calendar & adherence schedule"
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
              <span>View Calendar</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setStripOffset((prev) => prev - 3)}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              title="Shift 3 days earlier"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>

            <div className="flex-1 flex items-center justify-around gap-1.5">
              {calendarDays.map((item) => {
                const isSelected = item.dateStr === selectedDateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(item.dateStr)}
                    className={`rounded-2xl p-2 sm:p-2.5 w-12 sm:w-14 flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#1E3A8A] text-white shadow-md scale-105'
                        : item.isToday
                        ? 'bg-blue-50 border-2 border-[#1E3A8A] text-[#1E3A8A] shadow-2xs font-bold'
                        : 'bg-white border border-slate-200/80 text-slate-700 hover:border-blue-300 shadow-2xs'
                    }`}
                  >
                    <span className="text-base sm:text-lg font-bold leading-tight">
                      {item.dayNumber}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tracking-wider mt-0.5 ${
                        isSelected ? 'text-sky-200' : 'text-slate-500'
                      }`}
                    >
                      {item.weekday}
                    </span>
                    <span
                      className={`text-[10px] font-black leading-none mt-1 ${
                        isSelected ? 'text-sky-300' : item.isToday ? 'text-[#1E3A8A]' : 'text-blue-900'
                      }`}
                    >
                      ••
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStripOffset((prev) => prev + 3)}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              title="Shift 3 days later"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
          </div>
        </div>

        {/* FREE TIER NOTICE BANNER */}
        {!isPro && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCrown} className="text-amber-600 text-sm" />
              <span>
                <strong>Free Tier Active:</strong> Limited to 2 prescriptions ({schedule.length}/2 slots used).
              </span>
            </div>
            <button
              onClick={onOpenPaywall}
              className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs shrink-0 transition-colors shadow-2xs"
            >
              Unlock Pro
            </button>
          </div>
        )}

        {/* ACTIVE HEALTH GUARDIAN BEHAVIORAL INTERVENTION SELECTOR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
          <GuardianSelector />
        </div>

        {/* 4. MEDICATION SCHEDULE LIST (MATCHES image/3.png & image/6.png) */}
        <div>
          {/* Schedule Section Title with Prescriptions vs Doses Badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Medication Schedule
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A8A] text-xs font-bold shadow-2xs">
                {new Set(schedule.map((s) => s.name)).size} Prescriptions • {schedule.length} Daily Doses
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {takenCount} of {totalCount} completed
            </span>
          </div>

          <div className="flex items-center justify-between mt-1 mb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <FontAwesomeIcon icon={faClock} className="text-[#1E3A8A] text-sm" />
              <span>08:00</span>
            </div>

            <button
              type="button"
              onClick={() => onTriggerGuardianRefusal?.('Amlodipine (Norvasc) 5mg')}
              className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Test Refusal: Engage active AI Guardian persuasion flow"
            >
              <span>🛡️ Test Refusal</span>
            </button>
          </div>

          {schedule.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-xs">
              No medications scheduled for today.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...schedule]
                .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                .map((item) => (
                  <MedicineCard
                    key={item.logId}
                    item={item}
                    onToggleStatus={async (logId, status) => {
                      await toggleDoseStatus(logId, status);
                      if (onDoseToggled) onDoseToggled();
                    }}
                    onOpenNoteModal={(selected) => setActiveNoteItem(selected)}
                    onEdit={(selected) => setEditingMedicine(selected)}
                    onDelete={handleDeleteMedicine}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <DoseNoteModal
        isOpen={!!activeNoteItem}
        onClose={() => setActiveNoteItem(null)}
        onSave={handleSaveNote}
        medicineName={activeNoteItem?.name || ''}
        scheduledTime={activeNoteItem?.scheduledTime || ''}
        initialNote={activeNoteItem?.notes || ''}
      />

      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMedicine}
      />

      <EditMedicineModal
        isOpen={!!editingMedicine}
        onClose={() => setEditingMedicine(null)}
        medicine={editingMedicine}
        onSave={handleUpdateMedicine}
      />

      <LogVitalsModal
        isOpen={isVitalsModalOpen}
        onClose={() => setIsVitalsModalOpen(false)}
        onSave={handleSaveVitals}
        currentVitals={vitals}
      />

      {/* 4. FULL MONTH CALENDAR MODAL */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200 flex items-center justify-center text-sm font-bold">
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Monthly Medication Timeline</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                <div key={day} className="text-[11px] font-bold text-slate-400 py-0.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid dynamically calculated for current month */}
            {(() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth();
              const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
              const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
              const todayDateNum = now.getDate();

              return (
                <div className="grid grid-cols-7 gap-1 text-center mb-4">
                  {/* Empty cells before day 1 */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-1" />
                  ))}

                  {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((dayNum) => {
                    const padMonth = String(month + 1).padStart(2, '0');
                    const padDay = String(dayNum).padStart(2, '0');
                    const cellDateStr = `${year}-${padMonth}-${padDay}`;
                    const isSelected = cellDateStr === selectedDateStr;
                    const isToday = dayNum === todayDateNum;
                    const isPast = dayNum < todayDateNum;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => {
                          setSelectedDateStr(cellDateStr);
                          const dayDiff = Math.round(
                            (new Date(year, month, dayNum).getTime() - new Date(year, month, todayDateNum).getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          setStripOffset(dayDiff);
                          setIsCalendarModalOpen(false);
                        }}
                        className={`h-9 rounded-xl flex flex-col items-center justify-center transition-all text-xs font-semibold relative ${
                          isSelected
                            ? 'bg-[#1E3A8A] text-white shadow-sm font-bold scale-105'
                            : isToday
                            ? 'bg-blue-50 text-blue-900 border border-blue-300 font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{dayNum}</span>
                        <span
                          className={`w-1 h-1 rounded-full -mt-0.5 ${
                            isSelected
                              ? 'bg-sky-300'
                              : isPast
                              ? 'bg-emerald-500'
                              : isToday
                              ? 'bg-blue-600'
                              : 'bg-slate-200'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Legend & Action */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Past (100% Taken)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Today (Active)
                </span>
              </div>

              {onSwitchToHistory && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCalendarModalOpen(false);
                    onSwitchToHistory();
                  }}
                  className="w-full bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <FontAwesomeIcon icon={faTableCells} className="text-xs" />
                  <span>Open Full 30-Day History Matrix</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}