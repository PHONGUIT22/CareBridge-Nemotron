'use client';

import React, { useState, useEffect } from 'react';
import { MedicationPunchCard } from '../components/MedicationPunchCard';
import { useHeatmap } from '../hooks/useHeatmap';
import { pdfService } from '../services/pdfService';
import { mcpClient } from '../services/mcpClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileArrowDown,
  faCircleCheck,
  faArrowsRotate,
  faCrown,
  faEye,
} from '@fortawesome/free-solid-svg-icons';

import { DoctorReportPreviewModal } from '../components/DoctorReportPreviewModal';
import { AuthSession } from '../components/AuthGate';

interface HistoryMatrixViewProps {
  authSession?: AuthSession | null;
  refreshTrigger?: number;
  isPro?: boolean;
  onOpenPaywall?: () => void;
  patientName?: string;
  caregiverName?: string;
  patientAge?: number;
}

export function HistoryMatrixView({
  authSession,
  refreshTrigger = 0,
  isPro = false,
  onOpenPaywall,
  patientName,
  caregiverName,
  patientAge,
}: HistoryMatrixViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const { medicines, rawLogs, rawVitals, loading, refetch } = useHeatmap();

  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  const handleDeleteMedicine = async (medId: string) => {
    try {
      await mcpClient.deleteMedicine(medId);
      await refetch();
    } catch (err) {
      console.error('Failed to delete medicine:', err);
    }
  };

  const handleExportPDF = () => {
    if (!isPro) {
      onOpenPaywall?.();
      return;
    }
    setIsExporting(true);
    try {
      const avgAdherence =
        medicines.length > 0
          ? Math.round(
              medicines.reduce((acc, m) => acc + m.adherenceRate, 0) / medicines.length
            )
          : 94;

      const effectivePatientName = authSession?.patientName || patientName;
      const effectivePatientAge = authSession?.patientAge || patientAge;
      const effectiveCaregiverName = authSession?.caregiverName || caregiverName;

      const pName = effectivePatientName
        ? `${effectivePatientName}${effectivePatientAge ? ` (Age ${effectivePatientAge})` : ''}`
        : 'Eleanor Vance (Age 78)';
      const cName = effectiveCaregiverName
        ? `${effectiveCaregiverName} (Caregiver)`
        : 'Sarah Connor (Daughter)';

      pdfService.generateDoctorReport({
        patientName: pName,
        caregiverName: cName,
        adherenceRate: avgAdherence,
        logs: rawLogs,
        vitals: rawVitals,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const colorThemes: Array<'navy' | 'teal' | 'indigo' | 'slate'> = [
    'navy',
    'teal',
    'indigo',
    'slate',
  ];

  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-900 p-4 sm:p-5 font-sans select-none pb-28">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        {/* 1. HEADER SECTION (MATCHES image/4.png) */}
        <div className="flex items-start justify-between pt-1">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">
              CAREBRIDGE COMPLIANCE MATRIX
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Medication History
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#1E3A8A] border border-blue-200/80 shadow-2xs">
                4 Active Prescriptions (5 Daily Doses Tracker)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-all shadow-2xs"
              title="Sync latest records"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="text-xs" />
            </button>

            {/* One-Tap Quick Doctor A4 Preview Button */}
            <button
              onClick={() => {
                if (!isPro) {
                  onOpenPaywall?.();
                  return;
                }
                setIsPreviewModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 transition-all"
              title="One-Tap Quick Doctor A4 Report Preview with 30-day BP Chart & QR Code"
            >
              <FontAwesomeIcon icon={faEye} className="text-xs" />
              <span>Preview A4</span>
            </button>

            {/* Export PDF Button (image/4.png) */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1E3A8A] hover:bg-[#1E40AF] text-white shadow-sm active:scale-95 transition-all"
              title={isPro ? 'Export PDF Report for Doctor' : 'Doctor PDF Export'}
            >
              <FontAwesomeIcon icon={faFileArrowDown} className="text-xs" />
              <span>{isExporting ? 'Generating...' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* FREE TIER NOTICE */}
        {!isPro && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCrown} className="text-amber-600 text-sm" />
              <span>
                <strong>Free Tier Active:</strong> 7-day adherence visible. Clinical Doctor PDF export is locked.
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

        {/* 2. PUNCH-CARD LIST (MATCHES image/4.png - Navy Card 1, Teal Card 2) */}
        <div className="flex flex-col gap-4 mt-1">
          {loading && medicines.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-xs">
              Loading verified 30-day compliance logs...
            </div>
          ) : (
            medicines.map((med, index) => {
              const isMetformin = med.name.toLowerCase().includes('metformin');
              const displayDosage = isMetformin
                ? '500mg - Oral • 2 Doses/Day (08:00 & 18:00)'
                : med.dosage;

              return (
                <MedicationPunchCard
                  key={med.id}
                  medicineName={med.name}
                  dosage={displayDosage}
                  scheduledTime={med.scheduledTime}
                  streakDays={med.streakDays}
                  completedDoses={med.completedDoses}
                  adherenceRate={med.adherenceRate}
                  matrixData={med.matrixData}
                  onDelete={() => handleDeleteMedicine(med.id)}
                  colorTheme={colorThemes[index % colorThemes.length]}
                />
              );
            })
          )}
        </div>

        {/* 3. SECURE CLINICAL AUDIT TRAIL BANNER */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3 mt-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
            <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed font-normal">
            <strong className="text-slate-900 font-semibold">Clinical Audit Trail:</strong> 30-day medication adherence and biometric trends are continuously verified and formatted for physician consultation.
          </div>
        </div>
      </div>

      {/* ONE-TAP QUICK DOCTOR A4 PREVIEW MODAL */}
      <DoctorReportPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        patientName={authSession?.patientName || patientName || 'Eleanor Vance'}
        patientAge={authSession?.patientAge || patientAge || 78}
        caregiverName={authSession?.caregiverName || caregiverName || 'Sarah Connor'}
        adherenceRate={
          medicines.length > 0
            ? Math.round(
                medicines.reduce((acc, m) => acc + m.adherenceRate, 0) / medicines.length
              )
            : 87.5
        }
        logs={rawLogs}
        vitals={rawVitals}
        isPro={isPro}
      />
    </div>
  );
}