'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faArrowRight,
  faStar,
  faShieldHalved,
  faClock,
  faFileLines,
  faRotateRight,
  faMoon,
} from '@fortawesome/free-solid-svg-icons';
import { mcpClient } from '../services/mcpClient';

export interface AuthSession {
  userId?: string;
  isAuthenticated: boolean;
  user: string;
  email?: string;
  role: 'senior' | 'caregiver';
  isPro: boolean;
  isDemo?: boolean;
  isOnboarded?: boolean;
  caregiverName?: string;
  patientName?: string;
  patientAge?: number;
}

interface AuthGateProps {
  onLogin: (session: AuthSession) => void;
}

export function AuthGate({ onLogin }: AuthGateProps) {
  const [email, setEmail] = useState('demo@gmail.com');
  const [passcode, setPasscode] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const saveAndCompleteSession = (session: AuthSession) => {
    try {
      localStorage.setItem('carebridge_auth_session', JSON.stringify(session));
    } catch (e) {
      console.warn('LocalStorage unavailable:', e);
    }
    onLogin(session);
  };

  const handleSignIn = async (
    role: 'caregiver' | 'senior' = 'caregiver',
    overrideEmail?: string,
    overridePin?: string
  ) => {
    setIsLoading(true);
    setStatusMessage('Authenticating...');

    const targetEmail = (overrideEmail !== undefined ? overrideEmail : email).trim();
    const targetPin = (overridePin !== undefined ? overridePin : passcode).trim();

    try {
      const res = await mcpClient.login({
        email: targetEmail,
        pin: targetPin,
        role,
      });

      if (res.success && res.user) {
        const isDemo = Boolean(res.user.isDemo);
        const session: AuthSession = {
          userId: res.user.id,
          isAuthenticated: true,
          user: res.user.name || (res.user.role === 'senior' ? `${res.user.email} (Senior)` : `${res.user.email} (Caregiver)`),
          email: res.user.email,
          role,
          isPro: res.user.isPro,
          isDemo: isDemo,
          isOnboarded: isDemo ? true : Boolean(res.user.isOnboarded),
          caregiverName: res.user.caregiverName || (isDemo ? 'Sarah Connor' : undefined),
          patientName: res.user.patientName || (isDemo ? 'Eleanor Vance' : undefined),
          patientAge: res.user.patientAge || (isDemo ? 78 : undefined),
        };
        saveAndCompleteSession(session);
      } else {
        setStatusMessage('Authentication failed.');
      }
    } catch (err: any) {
      console.warn('Backend login fallback:', err.message);
      // Fallback in case backend server is temporarily unreachable
      const isDemo = targetEmail.toLowerCase() === 'demo@gmail.com' && targetPin === '1234';
      const fallbackUserId = isDemo ? 'usr_demo' : `usr_${Date.now()}`;
      const session: AuthSession = {
        userId: fallbackUserId,
        isAuthenticated: true,
        user: isDemo
          ? (role === 'senior' ? 'Eleanor Vance (Senior)' : 'Sarah Connor (Caregiver)')
          : `${targetEmail} (${role === 'senior' ? 'Senior' : 'Caregiver'})`,
        email: targetEmail,
        role,
        isPro: isDemo,
        isDemo,
        isOnboarded: isDemo,
        caregiverName: isDemo ? 'Sarah Connor' : undefined,
        patientName: isDemo ? 'Eleanor Vance' : undefined,
        patientAge: isDemo ? 78 : undefined,
      };
      saveAndCompleteSession(session);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('demo@gmail.com');
    setPasscode('1234');
    handleSignIn('caregiver', 'demo@gmail.com', '1234');
  };

  const handleGuestSignIn = () => {
    const guestEmail = `guest_${Math.random().toString(36).substring(2, 7)}@carebridge.local`;
    handleSignIn('caregiver', guestEmail, '');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
      {/* 1. BRAND HEADER (MATCHES image/1.png & image/2.png) */}
      <div className="flex flex-col items-center text-center mb-2">
        {/* CareBridge Royal Blue Squircle Logo with Heart Pulse */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] sm:rounded-[26px] bg-[#1E3A8A] flex items-center justify-center text-white shadow-[0_8px_25px_rgba(30,58,138,0.25)] transition-transform hover:scale-105">
          <svg
            className="w-9 h-9 sm:w-11 sm:h-11 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            <path
              d="M3 11h4l2-4 3 8 2.5-5 1.5 2h5"
              fill="none"
              stroke="#1E3A8A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1E3A8A] tracking-tight mt-3">
          CareBridge
        </h1>
        <p className="text-slate-600 font-medium text-xs sm:text-sm mt-1">
          Senior Medication & Care Companion
        </p>

        {/* 3 Pill Badges */}
        <div className="flex items-center justify-center gap-2 mt-3.5 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 text-blue-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
            <FontAwesomeIcon icon={faClock} className="text-[10px]" />
            <span>Smart Schedule</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 text-blue-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
            <FontAwesomeIcon icon={faShieldHalved} className="text-[10px]" />
            <span>Vitals Audit</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 text-blue-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
            <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
            <span>Doctor PDF</span>
          </span>
        </div>
      </div>

      {/* 2. CAREGIVER PORTAL CARD (MATCHES image/2.png) */}
      <div className="w-full max-w-[430px] bg-white rounded-[28px] border border-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.05)] p-6 sm:p-7">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Caregiver Portal
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
          Sign in to manage prescriptions, biometric vitals, and adherence reports.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn('caregiver');
          }}
          className="flex flex-col gap-3.5"
        >
          {/* Caregiver Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Caregiver Email
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@gmail.com"
                className="w-full pl-9 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Passcode / PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Passcode / PIN (Optional)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                <FontAwesomeIcon icon={faLock} className="text-xs" />
              </span>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••"
                className="w-full pl-9 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Primary Action Button: Sign In with Email -> */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1 py-3.5 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faRotateRight} className="text-xs animate-spin" />
                <span>{statusMessage || 'Signing in...'}</span>
              </>
            ) : (
              <>
                <span>Sign In with Email</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </>
            )}
          </button>
        </form>

        {/* Hackathon Judge Quick Access Card (image/2.png) */}
        <div className="mt-4 p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faStar} className="text-[10px]" />
            </div>
            <div className="text-[11px] sm:text-xs text-amber-950 font-normal leading-snug">
              <span>Hackathon Judge Quick Access: </span>
              <strong className="font-semibold text-amber-900 font-mono">demo@gmail.com / 1234</strong>
              <span className="text-amber-800 block text-[10px]">(Preloads 30-Day Clinical Data)</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] hover:bg-[#FDE68A] active:scale-95 text-amber-900 font-bold text-xs shrink-0 transition-colors shadow-2xs flex items-center gap-1"
          >
            <span>Fill</span>
            <span>✏️</span>
          </button>
        </div>

        {/* Divider: OR CONTINUE WITHOUT ACCOUNT */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            OR CONTINUE WITHOUT ACCOUNT
          </span>
        </div>

        {/* Guest Caregiver Button (image/2.png) */}
        <button
          type="button"
          onClick={handleGuestSignIn}
          disabled={isLoading}
          className="w-full p-3 sm:p-3.5 rounded-xl bg-blue-50/40 hover:bg-blue-50/80 border border-blue-200/60 flex items-center justify-between text-left transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center shrink-0 group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors">
              <FontAwesomeIcon icon={faShieldHalved} className="text-base" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Continue as Guest Caregiver
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Instant local access • No cloud account required
              </p>
            </div>
          </div>
          <FontAwesomeIcon
            icon={faArrowRight}
            className="text-xs text-blue-700 group-hover:translate-x-1 transition-transform mr-1"
          />
        </button>

        {/* Switch to Senior Mode Link */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => handleSignIn('senior', email, passcode)}
            className="text-xs font-semibold text-slate-500 hover:text-[#1E3A8A] transition-colors inline-flex items-center gap-1.5"
          >
            <FontAwesomeIcon icon={faMoon} className="text-xs text-sky-600" />
            <span>Switch to Senior Bedside Nightstand Mode (Eleanor Vance, 78)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
