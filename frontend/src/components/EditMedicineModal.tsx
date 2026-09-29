'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPills,
  faXmark,
  faFloppyDisk,
  faClock,
  faBoxesStacked,
  faTriangleExclamation,
  faShieldHalved,
  faCircleNotch,
  faUserDoctor,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { mcpClient } from '../services/mcpClient';
import { DrugInteractionCheckResult, DrugInteractionWarning } from '../types';

export interface EditMedicineData {
  medicineId: string;
  name: string;
  dosage: string;
  reminderTimes?: string[];
  daysOfWeek?: string[];
  stockCount?: number;
  scheduledTime?: string;
}

interface EditMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: EditMedicineData | null;
  onSave: (updated: {
    name: string;
    dosage: string;
    reminderTimes: string[];
    daysOfWeek: string[];
    stockCount: number;
  }) => Promise<void>;
}

export function EditMedicineModal({ isOpen, onClose, medicine, onSave }: EditMedicineModalProps) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [stock, setStock] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automated Drug Interaction Check states
  const [isCheckingInteraction, setIsCheckingInteraction] = useState(false);
  const [interactionResult, setInteractionResult] = useState<DrugInteractionCheckResult | null>(null);
  const [hasAcknowledgedDoctor, setHasAcknowledgedDoctor] = useState(false);

  // Populate data when medicine changes or modal opens
  useEffect(() => {
    if (isOpen && medicine) {
      setName(medicine.name || '');
      setDosage(medicine.dosage || '');
      const initialTime = medicine.reminderTimes?.[0] || medicine.scheduledTime || '08:00';
      setTime(initialTime);
      setStock(medicine.stockCount !== undefined ? String(medicine.stockCount) : '30');
      setInteractionResult(null);
      setHasAcknowledgedDoctor(false);
      setIsCheckingInteraction(false);
    }
  }, [isOpen, medicine]);

  // Debounced Drug-Drug Interaction Safety Verification (300ms) only if name changed
  useEffect(() => {
    const trimmed = name.trim();
    if (!medicine || trimmed === medicine.name.trim() || trimmed.length < 3) {
      setInteractionResult(null);
      setHasAcknowledgedDoctor(false);
      setIsCheckingInteraction(false);
      return;
    }

    setIsCheckingInteraction(true);
    const timer = setTimeout(async () => {
      try {
        const result = await mcpClient.checkDrugInteraction(trimmed);
        setInteractionResult(result);
        if (!result.hasInteraction) {
          setHasAcknowledgedDoctor(false);
        }
      } catch (err) {
        console.warn('[EditMedicineModal] Drug interaction check error:', err);
      } finally {
        setIsCheckingInteraction(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [name, medicine]);

  if (!isOpen || !medicine) return null;

  const hasInteraction = Boolean(
    interactionResult?.hasInteraction && interactionResult?.warnings?.length > 0
  );
  const warnings = interactionResult?.warnings || [];
  const primaryWarning: DrugInteractionWarning | undefined = warnings[0];
  const isCritical = primaryWarning?.severity === 'CRITICAL';
  const isSafetyBlocked = hasInteraction && !hasAcknowledgedDoctor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || isSafetyBlocked) return;

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        dosage: dosage.trim(),
        reminderTimes: [time],
        daysOfWeek: medicine.daysOfWeek || ['ALL'],
        stockCount: parseInt(stock, 10) || 30,
      });
      onClose();
    } catch (err) {
      console.error('[EditMedicineModal] Failed to save medicine edit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[28px] p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200/60 flex items-center justify-center">
              <FontAwesomeIcon icon={faPills} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Prescription</h3>
              <p className="text-xs text-slate-500 font-normal">Update regimen details, schedule, or stock inventory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          {/* MEDICATION NAME INPUT WITH REAL-TIME CHECK INDICATOR */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Medication name
              </label>
              {isCheckingInteraction && (
                <span className="flex items-center gap-1.5 text-[11px] text-blue-600 animate-pulse font-medium">
                  <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-[10px]" />
                  Checking drug interactions...
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Warfarin, Simvastatin, Ibuprofen..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-colors ${
                  hasInteraction
                    ? isCritical
                      ? 'border-rose-400 focus:border-rose-600 bg-rose-50/30'
                      : 'border-amber-400 focus:border-amber-600 bg-amber-50/30'
                    : 'border-slate-200 focus:border-[#1E3A8A] focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* CLINICAL DRUG-DRUG INTERACTION WARNING BANNER */}
          {hasInteraction && primaryWarning && (
            <div
              className={`rounded-2xl p-4 border transition-all animate-fadeIn ${
                isCritical
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              {/* Badge & Severity */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={isCritical ? faShieldHalved : faTriangleExclamation}
                    className={`text-base ${isCritical ? 'text-rose-600' : 'text-amber-600'}`}
                  />
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                      isCritical
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {isCritical ? 'Critical Contraindication' : 'Significant Drug Interaction'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                  Beers Criteria
                </span>
              </div>

              {/* Title & Conflict Summary */}
              <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
                {primaryWarning.title}
              </h4>
              <p className="text-xs text-slate-700 mb-2">
                <span className="font-semibold text-slate-900">Conflict with active drug:</span>{' '}
                <span className="px-1.5 py-0.5 rounded bg-white font-mono text-[11px] text-slate-900 border border-slate-200">
                  {primaryWarning.conflictingMedName}
                </span>
              </p>

              {/* Clinical Risk & Mechanism */}
              <div className="text-[11px] space-y-1.5 p-2.5 rounded-xl bg-white/80 border border-slate-200 text-slate-700 mb-3">
                <p>
                  <strong className="text-slate-900">Clinical Risk:</strong> {primaryWarning.clinicalRisk}
                </p>
                <p>
                  <strong className="text-slate-900">Pharmacology:</strong> {primaryWarning.mechanism}
                </p>
                <p className="text-amber-800 italic pt-1 border-t border-slate-200">
                  <strong>Recommendation:</strong> {primaryWarning.recommendation}
                </p>
              </div>

              {/* DR. REYNOLDS CONSULTATION OVERRIDE CHECKBOX */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer transition-colors group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={hasAcknowledgedDoctor}
                    onChange={(e) => setHasAcknowledgedDoctor(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-lg border border-slate-300 peer-checked:bg-[#1E3A8A] peer-checked:border-[#1E3A8A] flex items-center justify-center transition-all">
                    {hasAcknowledgedDoctor && (
                      <FontAwesomeIcon icon={faCheck} className="text-xs text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    <FontAwesomeIcon icon={faUserDoctor} className="text-[#1E3A8A] text-xs" />
                    <span>I have consulted Dr. Reynolds - Proceed anyway</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Overriding this safety block requires clinical approval. The override will be audited in the caregiver log.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* DOSAGE INPUT */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dosage & form
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20mg - 1 tablet at bedtime"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
            />
          </div>

          {/* SCHEDULED TIME & STOCK */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <FontAwesomeIcon icon={faClock} className="text-[#1E3A8A] text-xs" />
                <span>Scheduled time</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <FontAwesomeIcon icon={faBoxesStacked} className="text-slate-400 text-xs" />
                <span>Stock count</span>
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON WITH SAFETY GATING */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSafetyBlocked}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isSafetyBlocked
                  ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  : hasInteraction
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md active:scale-[0.98]'
                  : 'bg-[#1E3A8A] hover:bg-[#1E40AF] text-white shadow-md active:scale-[0.98]'
              }`}
            >
              {isSafetyBlocked ? (
                <>
                  <FontAwesomeIcon icon={faShieldHalved} className="text-rose-500 text-xs" />
                  <span>Consult Dr. Reynolds</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFloppyDisk} className="text-xs" />
                  <span>{isSubmitting ? 'Saving changes...' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
