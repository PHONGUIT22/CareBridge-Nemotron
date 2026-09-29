'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faUser,
  faHospitalUser,
  faCalendarDays,
  faArrowRight,
  faCircleNotch,
  faHeartPulse,
} from '@fortawesome/free-solid-svg-icons';
import { mcpClient } from '../services/mcpClient';

interface OnboardingModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onComplete: (profile: {
    caregiverName: string;
    patientName: string;
    patientAge: number;
  }) => Promise<void> | void;
}

/**
 * Format email prefix into human-readable name suggestion
 * e.g. "john.doe@gmail.com" -> "John Doe"
 * e.g. "sarah_connor@gmail.com" -> "Sarah Connor"
 */
function suggestNameFromEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'Caregiver';
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/[\._\-+0-9]+/g, ' ').trim();
  if (!cleaned) return 'Caregiver';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function OnboardingModal({ isOpen, initialEmail, onComplete }: OnboardingModalProps) {
  const [caregiverName, setCaregiverName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('78');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialEmail) {
        setCaregiverName((prev) => (prev ? prev : suggestNameFromEmail(initialEmail)));
      }
      setErrorMessage(null);
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCaregiver = caregiverName.trim();
    const trimmedPatient = patientName.trim();
    const ageNum = parseInt(patientAge, 10);

    if (!trimmedCaregiver) {
      setErrorMessage('Please enter the Primary Caregiver name.');
      return;
    }
    if (!trimmedPatient) {
      setErrorMessage('Please enter the Patient full name or preferred name.');
      return;
    }
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 125) {
      setErrorMessage('Please provide a valid Patient age (1 - 125).');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await mcpClient.saveUserProfile({
        caregiverName: trimmedCaregiver,
        patientName: trimmedPatient,
        patientAge: ageNum,
      });

      await onComplete({
        caregiverName: trimmedCaregiver,
        patientName: trimmedPatient,
        patientAge: ageNum,
      });
    } catch (err: any) {
      console.error('[OnboardingModal] Save error:', err);
      // Fallback: still complete locally so user is not blocked
      await onComplete({
        caregiverName: trimmedCaregiver,
        patientName: trimmedPatient,
        patientAge: ageNum,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-900 transform transition-all animate-scaleUp">
        {/* HEADER BADGE */}
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#1E3A8A] text-[11px] font-bold tracking-wider uppercase font-mono">
            Setup Required • Step 1 of 1
          </span>
        </div>

        {/* TITLE & DESCRIPTION */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Welcome to CareBridge Ambient
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-blue-700 mt-0.5">
          Setup Care Profile
        </p>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          Configure your monitoring identities below. Alexa Ambient Hub and clinical adherence reports
          will be personalized specifically for your patient.
        </p>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* ONBOARDING FORM */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* CAREGIVER FULL NAME FIELD */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <FontAwesomeIcon icon={faShieldHalved} className="text-[#1E3A8A] text-xs" />
              <span>Caregiver Full Name</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={caregiverName}
              onChange={(e) => setCaregiverName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-[#1E3A8A] focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used in the Caregiver Monitoring Hub and SMS emergency alert notifications.
            </p>
          </div>

          {/* PATIENT NAME FIELD */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <FontAwesomeIcon icon={faHospitalUser} className="text-emerald-600 text-xs" />
              <span>Patient Name</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grandma Mary, Robert Vance"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The person being cared for. Alexa will greet and assist them by this name.
            </p>
          </div>

          {/* PATIENT AGE FIELD */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <FontAwesomeIcon icon={faCalendarDays} className="text-sky-600 text-xs" />
              <span>Patient Age</span>
            </label>
            <input
              type="number"
              min="1"
              max="125"
              required
              placeholder="e.g. 75"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Required for Beers Criteria geriatric drug-drug interaction safety calculations.
            </p>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-bold text-sm tracking-wide shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-sm" />
                  <span>Configuring Personalized Hub...</span>
                </>
              ) : (
                <>
                  <span>Complete Setup & Start CareBridge</span>
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
