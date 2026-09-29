'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faDroplet,
  faXmark,
  faCheck,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import { VitalRecord } from '../types';

interface LogVitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vitals: Partial<VitalRecord>) => Promise<void>;
  currentVitals?: VitalRecord | null;
}

export function LogVitalsModal({
  isOpen,
  onClose,
  onSave,
  currentVitals,
}: LogVitalsModalProps) {
  const [systolic, setSystolic] = useState(
    currentVitals?.systolic ? String(currentVitals.systolic) : '124'
  );
  const [diastolic, setDiastolic] = useState(
    currentVitals?.diastolic ? String(currentVitals.diastolic) : '83'
  );
  const [bloodSugar, setBloodSugar] = useState(
    currentVitals?.bloodSugar ? String(currentVitals.bloodSugar) : '104.2'
  );
  const [heartRate, setHeartRate] = useState(
    currentVitals?.heartRate ? String(currentVitals.heartRate) : '73'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSave({
        systolic: systolic ? parseInt(systolic, 10) : undefined,
        diastolic: diastolic ? parseInt(diastolic, 10) : undefined,
        bloodSugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
        heartRate: heartRate ? parseInt(heartRate, 10) : undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-[28px] p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200/60 flex items-center justify-center">
              <FontAwesomeIcon icon={faHeartPulse} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Record vitals reading</h3>
              <p className="text-xs text-slate-500 font-normal">Automatic AHA classification and telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-rose-500" />
                <span>Systolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="60"
                max="250"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-blue-500" />
                <span>Diastolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="40"
                max="160"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <FontAwesomeIcon icon={faDroplet} className="text-xs text-sky-500" />
                <span>Blood sugar (mg/dL)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="40"
                max="500"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <FontAwesomeIcon icon={faBolt} className="text-xs text-emerald-500" />
                <span>Heart rate (BPM)</span>
              </label>
              <input
                type="number"
                min="30"
                max="200"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
          >
            <FontAwesomeIcon icon={faCheck} className="text-sm" />
            <span>{isSubmitting ? 'Recording vitals...' : 'Save vitals to SQLite WAL'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
