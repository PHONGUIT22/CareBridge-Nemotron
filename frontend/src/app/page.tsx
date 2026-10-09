'use client';

import React, { useState, useEffect } from 'react';
import { TodayScheduleView } from '../screens/TodayScheduleView';
import { HistoryMatrixView } from '../screens/HistoryMatrixView';
import { AnalyticsView } from '../screens/AnalyticsView';
import { DeskModeView } from '../screens/DeskModeView';
import { AgentConsole } from '../components/AgentConsole';
import { PillVisualCard } from '../components/RichCards/PillVisualCard';
import { ClinicalAdviceCard } from '../components/RichCards/ClinicalAdviceCard';
import { PrescriptionOrderCard } from '../components/RichCards/PrescriptionOrderCard';
import { FrontDoorCameraCard } from '../components/RichCards/FrontDoorCameraCard';
import { GuardianNegotiationCard } from '../components/RichCards/GuardianNegotiationCard';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { AuthGate, AuthSession } from '../components/AuthGate';
import { PaywallModal } from '../components/PaywallModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { AmbientGlow } from '../components/AmbientGlow';
import { DemoVoiceModal } from '../components/DemoVoiceModal';
import { MockVoiceScenario } from '../services/mockVoiceScenarios';
import { AmazonRefillOrder } from '../types';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { soundFxService } from '../services/soundFxService';
import { useAmbientAgent } from '../hooks/useAmbientAgent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faShieldHalved,
  faTableCells,
  faChartLine,
  faVideo,
  faClock,
  faMicrophone,
  faCircleNotch,
  faDesktop,
  faMobileScreen,
  faXmark,
  faCrown,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';

type ScreenTab = 'caregiver' | 'history' | 'analytics' | 'deskClock';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ScreenTab>('caregiver');
  const [isDualMode, setIsDualMode] = useState<boolean>(true); // Dual-screen bedside layout state
  const [visualCardOpen, setVisualCardOpen] = useState(false);
  const [selectedMedForCard, setSelectedMedForCard] = useState('Amlodipine (Blood Pressure)');
  const [clinicalAdviceOpen, setClinicalAdviceOpen] = useState(false);
  const [clinicalAdviceData, setClinicalAdviceData] = useState<any>(null);
  const [amazonOrderCardOpen, setAmazonOrderCardOpen] = useState(false);
  const [amazonOrderData, setAmazonOrderData] = useState<AmazonRefillOrder | null>(null);
  const [ringCardOpen, setRingCardOpen] = useState(false);
  const [ringCardMode, setRingCardMode] = useState<'delivery' | 'emergency' | 'live'>('delivery');
  const [ringPackageData, setRingPackageData] = useState<any>(null);
  const [ringDoorLockStatus, setRingDoorLockStatus] = useState<string>('LOCKED');
  const [ringEmergencyReason, setRingEmergencyReason] = useState<string>('');
  const [guardianCardOpen, setGuardianCardOpen] = useState<boolean>(false);
  const [guardianCardData, setGuardianCardData] = useState<any>(null);
  const [isDemoVoiceModalOpen, setIsDemoVoiceModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Authentication & Pro Paywall State
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Read authentication session from localStorage
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('carebridge_auth_session');
      if (savedAuth) {
        setAuthSession(JSON.parse(savedAuth));
      } else {
        setAuthSession({
          isAuthenticated: false,
          user: 'Eleanor Vance (Age 78)',
          role: 'senior',
          isPro: false,
        });
      }
    } catch (e) {
      console.warn('Could not read auth session from localStorage:', e);
    } finally {
      setIsAuthLoaded(true);
    }
  }, []);

  const handleLogin = (session: AuthSession) => {
    setAuthSession(session);
    addToast({
      type: 'success',
      title: `Welcome, ${session.user}!`,
      message: session.isPro
        ? 'CareBridge Ambient Pro Activated (Unlimited Sync & Emergency Alerts).'
        : 'CareBridge Ambient Ready (Evaluator Mode).',
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem('carebridge_auth_session');
    setAuthSession({
      isAuthenticated: false,
      user: 'Eleanor Vance (Age 78)',
      role: 'senior',
      isPro: false,
    });
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Switched back to Authentication Gate & Evaluator Sandbox.',
    });
  };

  const handleActivatePro = () => {
    if (!authSession) return;
    const updated = { ...authSession, isPro: true };
    setAuthSession(updated);
    localStorage.setItem('carebridge_auth_session', JSON.stringify(updated));
    setIsPaywallOpen(false);
    addToast({
      type: 'success',
      title: 'CareBridge Pro Unlocked',
      message: 'Unlimited PDF export, multi-dose scheduling, and priority NVIDIA Nemotron access active.',
    });
  };

  const handleResetFreePlan = () => {
    if (!authSession) return;
    const updated = { ...authSession, isPro: false };
    setAuthSession(updated);
    localStorage.setItem('carebridge_auth_session', JSON.stringify(updated));
    setIsPaywallOpen(false);
    addToast({
      type: 'info',
      title: 'Plan Reset to Free Tier',
      message: 'Pro paywall modal will prompt when accessing premium features.',
    });
  };

  const handleOnboardingComplete = (profile: {
    caregiverName: string;
    patientName: string;
    patientAge: number;
  }) => {
    if (!authSession) return;
    const updated: AuthSession = {
      ...authSession,
      isOnboarded: true,
      caregiverName: profile.caregiverName,
      patientName: profile.patientName,
      patientAge: profile.patientAge,
      user: `${profile.patientName} (Age ${profile.patientAge})`,
    };
    setAuthSession(updated);
    localStorage.setItem('carebridge_auth_session', JSON.stringify(updated));
    triggerGlobalRefresh();
    addToast({
      type: 'success',
      title: 'Profile Setup Completed',
      message: `Caring for ${profile.patientName} (${profile.patientAge} y/o). Dashboard initialized.`,
    });
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerGlobalRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Trigger Visual Pill Card
  const handleTriggerVisualCard = (medName: string) => {
    setSelectedMedForCard(medName);
    setVisualCardOpen(true);
  };

  // Trigger Clinical Advice Card
  const handleTriggerClinicalAdvice = (data: any) => {
    setClinicalAdviceData(data);
    setClinicalAdviceOpen(true);
    const sms = data?.richCard?.smsDispatch || data?.smsDispatch;
    if (sms?.delivered) {
      addToast({
        type: 'warning',
        title: 'Emergency Alert Dispatched',
        message: `Alert dispatched to ${sms.recipient} (${sms.phone}) via Emergency Alert Dispatcher.`,
      });
    }

    // If EMERGENCY alert: Front Door Smart Camera displays Smart Access Lock: UNLOCKED FOR PARAMEDICS
    const isEmergency =
      data?.urgencyLevel === 'EMERGENCY' || data?.richCard?.urgencyLevel === 'EMERGENCY';
    if (isEmergency) {
      setRingCardMode('emergency');
      setRingDoorLockStatus('UNLOCKED FOR PARAMEDICS');
      setRingEmergencyReason(
        data?.displayCardTitle || data?.richCard?.title || 'Acute Medical Emergency Alert'
      );
      setTimeout(() => {
        setRingCardOpen(true);
        addToast({
          type: 'warning',
          title: 'Smart Access Lock Overridden',
          message: 'Front door unlocked automatically for incoming paramedics.',
        });
      }, 1800);
    }
  };

  // Trigger Prescription Refill Order Card upon successful refill
  const handleTriggerAmazonOrder = (order: AmazonRefillOrder) => {
    setAmazonOrderData(order);
    setAmazonOrderCardOpen(true);
    addToast({
      type: 'success',
      title: 'Prescription Refill Placed',
      message: `${order.quantityAdded || 30} tabs of ${order.medicineName} arriving ${order.estimatedDelivery}`,
    });

    // After 5s, simulate delivery courier placing prescription at porch
    setTimeout(() => {
      setRingCardMode('delivery');
      setRingPackageData({
        carrier: 'Express Medical Delivery',
        description: `Prescription Refill (${order.medicineName})`,
        orderId: order.orderId,
        deliveryTime: 'Just now',
      });
      setRingDoorLockStatus('LOCKED');
      setRingCardOpen(true);
      speechService.speak(
        'Smart Doorbell: Medication package delivered at your front porch.'
      );
      addToast({
        type: 'info',
        title: 'Smart Camera Motion Detected',
        message: 'Express medical delivery arrived. Prescription parcel placed on front porch.',
      });
    }, 5000);
  };

  // Single Source of Truth: Voice Agent & Nemotron-3-Nano Multi-Turn Orchestration
  const ambientAgent = useAmbientAgent({
    patientName: authSession?.patientName,
    onDoseLogged: () => {
      triggerGlobalRefresh();
    },
    onClinicalAdviceTriggered: (advice) => {
      handleTriggerClinicalAdvice(advice);
    },
    onOrderRefillTriggered: (order) => {
      handleTriggerAmazonOrder(order);
    },
    onRingDeviceTriggered: (ringResult) => {
      if (ringResult.action === 'triggerEmergencyDoorUnlock') {
        setRingCardMode('emergency');
        setRingDoorLockStatus('UNLOCKED FOR PARAMEDICS');
        setRingEmergencyReason(ringResult.emergencyReason || 'Emergency Paramedic Access');
      } else {
        setRingCardMode('delivery');
        setRingPackageData(ringResult.packageDetails);
        setRingDoorLockStatus(ringResult.doorLockStatus || 'LOCKED');
      }
      setRingCardOpen(true);
    },
    onGuardianNegotiationTriggered: (guardianData) => {
      const payload = guardianData?.richCard || guardianData;
      setGuardianCardData(payload);
      setGuardianCardOpen(true);
      if (
        guardianData?.escalationLevel === 'SARAH_CIRCUIT_BREAKER' ||
        payload?.escalationLevel === 'SARAH_CIRCUIT_BREAKER' ||
        guardianData?.sarahNotified
      ) {
        const cName = authSession?.caregiverName || 'Sarah Connor';
        addToast({
          type: 'warning',
          title: `${cName} Circuit-Breaker Triggered`,
          message:
            `Persistent refusal detected. Urgent emergency alert dispatched to ${cName} (+1 555-0199).`,
        });
      }
    },
  });

  const handleGuardianTakeDose = async (medName?: string) => {
    try {
      await mcpClient.logDoseStatus({
        medicineName: medName || 'Amlodipine (Norvasc) 5mg',
        status: 'taken',
        notes: 'Dose taken after AI Health Guardian negotiation.',
      });
      triggerGlobalRefresh();
      addToast({
        type: 'success',
        title: 'Medication Taken!',
        message: `${medName || 'Dose'} logged as taken. Great job staying healthy!`,
      });
    } catch (_) {
      triggerGlobalRefresh();
    }
  };

  const handleGuardianCallSarah = () => {
    const cName = authSession?.caregiverName || 'Sarah Connor';
    addToast({
      type: 'info',
      title: `Connecting ${cName} (+1 555-0199)`,
      message: `Calling ${cName} at work for clinical skip authorization.`,
    });
  };

  const handleTriggerGuardianRefusal = async (medicineName: string = 'Amlodipine (Norvasc) 5mg') => {
    try {
      const savedPersona =
        (localStorage.getItem('carebridge_active_guardian') as any) || 'grandson_leo';
      const result = await mcpClient.negotiateAdherence({
        medicineName,
        refusalReason: "I don't want to take my pills right now",
        personaId: savedPersona,
        turnCount: 1,
      });
      setGuardianCardData(result.richCard || result);
      setGuardianCardOpen(true);
      speechService.speak(result.speechResponse);
    } catch (err) {
      console.warn('Failed to negotiate adherence:', err);
    }
  };

  // Trigger voice directly from elevated center Mic button in Bottom Bar
  const handleCenterMicClick = () => {
    ambientAgent.toggleListening();
  };

  // Render dark loading skeleton until localStorage is read to prevent hydration mismatch
  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-md">
            <FontAwesomeIcon icon={faHeartPulse} className="text-xl" />
          </div>
          <p className="text-xs text-slate-500 font-mono font-medium">Loading CareBridge Ambient OS...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, display Authentication Gate & Evaluator Sandbox
  if (!authSession?.isAuthenticated) {
    return (
      <>
        <AuthGate onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const isDeskClock = activeTab === 'deskClock';

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-300 ${
        isDeskClock ? 'bg-[#050811] text-white' : 'bg-[#F1F5F9] text-slate-900'
      }`}
    >
      {/* 1. TOP SIMULATOR & DEVICE CONTROL HEADER */}
      <header
        className={`h-14 shrink-0 px-4 flex items-center justify-between z-40 gap-3 backdrop-blur-md transition-colors duration-300 ${
          isDeskClock
            ? 'bg-[#0B1120]/95 border-b border-white/[0.08] text-white'
            : 'bg-white/95 border-b border-slate-200/80 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          {/* CareBridge Royal Blue Logo Squircle */}
          <div className="w-8 h-8 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-sm">
            <FontAwesomeIcon icon={faHeartPulse} className="text-white text-sm" />
          </div>
          <div>
            <span
              className={`font-extrabold text-sm tracking-tight flex items-center gap-1.5 ${
                isDeskClock ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span>CareBridge</span>
              <span className="text-[#2563EB] font-mono font-bold text-xs">Ambient OS</span>
            </span>
          </div>
        </div>

        {/* Persona Indicator & Pro Badge & Sign Out Button */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Active Profile Pill */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              isDeskClock
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200/80 text-slate-700'
            }`}
          >
            <div className="leading-tight flex items-center gap-2">
              <span className="whitespace-nowrap">
                {authSession.role === 'senior'
                  ? `${authSession.patientName || 'Patient'} (Senior Mode)`
                  : `${authSession.caregiverName || 'Caregiver'} (Caregiver)`}
              </span>
              {authSession.isPro && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Pro
                </span>
              )}
            </div>
          </div>

          {/* Pro Badge / Upgrade Button */}
          <button
            onClick={() => setIsPaywallOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              authSession.isPro
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
            title="CareBridge Ambient Subscription Status"
          >
            <FontAwesomeIcon icon={faCrown} className="text-xs" />
            <span className="hidden xs:inline">{authSession.isPro ? 'Pro active' : 'Upgrade Pro'}</span>
          </button>

          {/* Switch Profile / Sign Out */}
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
              isDeskClock
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-white hover:bg-slate-100 border-slate-200/80 text-slate-700 hover:text-slate-900 shadow-2xs'
            }`}
            title="Switch profile or sign out"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
            <span className="hidden md:inline">Switch profile</span>
          </button>

          {/* Dual View / Bedside Mode Toggle */}
          <button
            onClick={() => setIsDualMode(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isDualMode
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : isDeskClock
                ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
            }`}
            title="Dual View / Bedside Mode"
          >
            <FontAwesomeIcon icon={faDesktop} className="text-xs" />
            <span className="hidden lg:inline">Dual frame</span>
          </button>

          {/* Front Door Smart Camera Quick Trigger */}
          <button
            onClick={() => {
              setRingCardMode('delivery');
              setRingPackageData({
                carrier: 'Express Medical Delivery',
                description: 'Prescription Medication Parcel (Atorvastatin 20mg)',
                orderId: 'CB-7294821-4928103',
                deliveryTime: 'Just now',
              });
              setRingDoorLockStatus('LOCKED');
              setRingCardOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-medium transition-all active:scale-95 shadow-2xs"
            title="Preview Front Door Smart Camera"
          >
            <FontAwesomeIcon icon={faVideo} className="text-xs" />
            <span className="hidden sm:inline">Smart Cam</span>
          </button>

          <button
            onClick={() => setIsDualMode(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              !isDualMode
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : isDeskClock
                ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
            }`}
            title="Single Device Mobile View"
          >
            <FontAwesomeIcon icon={faMobileScreen} className="text-xs" />
            <span className="hidden lg:inline">Single device</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE - ENCAPSULATED DEVICE MOCKUP FRAME */}
      <main className="flex-1 min-h-0 flex items-center justify-center gap-5 p-4 overflow-hidden">
        {/* DEVICE MOCKUP FRAME 1: TABLET (TITANIUM SILVER / CLINIC WHITE BEDSIDE DISPLAY) */}
        <div
          className="h-full max-h-[calc(100vh-5.5rem)] w-full max-w-[700px] flex flex-col shrink-0 relative rounded-[36px] border-4 border-slate-200/90 bg-slate-100/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-2.5 overflow-hidden transition-all duration-300"
        >
          {/* Subtle titanium camera notch */}
          <div className="w-2 h-2 rounded-full bg-slate-300 border border-slate-400/50 mx-auto mb-1.5 opacity-60 shrink-0" />

          {/* INNER SCREEN CONTAINER */}
          <div
            className={`relative rounded-[28px] overflow-hidden border border-slate-200/60 shadow-inner flex-1 min-h-0 flex flex-col transition-colors duration-300 ${
              isDeskClock
                ? 'bg-[#050811] text-white'
                : 'bg-[#F8FAFC] text-slate-900'
            }`}
          >
            {/* SCROLLABLE VIEW CONTENT */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain overflow-x-hidden">
              {/* TAB 1: CAREGIVER HUB (PRIMARY DASHBOARD) */}
              {activeTab === 'caregiver' && (
                <TodayScheduleView
                  authSession={authSession}
                  refreshTrigger={refreshTrigger}
                  onDoseToggled={triggerGlobalRefresh}
                  onSwitchToDeskMode={() => setActiveTab('deskClock')}
                  onSwitchToHistory={() => setActiveTab('history')}
                  onOpenPaywall={() => setIsPaywallOpen(true)}
                  onTriggerGuardianRefusal={handleTriggerGuardianRefusal}
                  isPro={Boolean(authSession?.isPro)}
                  caregiverName={authSession?.caregiverName}
                  patientName={authSession?.patientName}
                  patientAge={authSession?.patientAge}
                />
              )}

              {/* TAB 2: HISTORY MATRIX PUNCH-CARD */}
              {activeTab === 'history' && (
                <HistoryMatrixView
                  authSession={authSession}
                  refreshTrigger={refreshTrigger}
                  isPro={Boolean(authSession?.isPro)}
                  onOpenPaywall={() => setIsPaywallOpen(true)}
                  patientName={authSession?.patientName}
                  caregiverName={authSession?.caregiverName}
                  patientAge={authSession?.patientAge}
                />
              )}

              {/* TAB 3: VITALS ANALYTICS */}
              {activeTab === 'analytics' && <AnalyticsView refreshTrigger={refreshTrigger} />}

              {/* TAB 4: NIGHTTIME BEDSIDE CLOCK (DESK MODE) */}
              {activeTab === 'deskClock' && (
                <DeskModeView
                  authSession={authSession}
                  refreshTrigger={refreshTrigger}
                  onSwitchToCaregiver={() => setActiveTab('caregiver')}
                  onTakeDose={triggerGlobalRefresh}
                  onTriggerGuardianRefusal={handleTriggerGuardianRefusal}
                  patientName={authSession?.patientName}
                />
              )}
            </div>

            {/* 3. FLOATING GLASS DOCK (ITEM 3) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
              <nav
                className={`rounded-full mx-4 mb-2 py-2 px-4 flex items-center justify-between border shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all ${
                  isDeskClock
                    ? 'bg-slate-900/85 border-slate-800 text-slate-300'
                    : 'bg-white/85 border-white/60 text-slate-700'
                }`}
              >
                {/* Left Navigation Tabs */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('caregiver')}
                    className={`flex flex-col items-center py-0.5 px-2 rounded-lg transition-all cursor-pointer active:scale-95 ${
                      activeTab === 'caregiver'
                        ? 'text-[#1E3A8A] font-bold'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
                    <span className="text-[10px] font-semibold mt-0.5">Caregiver</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`flex flex-col items-center py-0.5 px-2 rounded-lg transition-all cursor-pointer active:scale-95 ${
                      activeTab === 'history'
                        ? 'text-[#1E3A8A] font-bold'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={faTableCells} className="text-xs" />
                    <span className="text-[10px] font-semibold mt-0.5">History Matrix</span>
                  </button>
                </div>

                {/* Center: Elevated Hardware Mic Button & Demo Voice */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCenterMicClick}
                    className={`w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-[#1E3A8A] to-[#2563EB] text-white shadow-[0_8px_20px_rgba(37,99,235,0.4)] flex items-center justify-center border-2 border-white transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                      ambientAgent.isListening
                        ? 'ring-4 ring-[#76B900]/70 shadow-[0_0_24px_rgba(118,185,0,0.75)]'
                        : ambientAgent.isThinking
                        ? 'ring-4 ring-[#76B900]/60 shadow-[0_0_20px_rgba(118,185,0,0.6)] animate-pulse'
                        : ambientAgent.isSpeaking
                        ? 'ring-4 ring-[#10B981]/50 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                        : ''
                    }`}
                    title={ambientAgent.isListening ? 'Click to stop listening' : 'Voice Assistant'}
                  >
                    <FontAwesomeIcon
                      icon={ambientAgent.isThinking ? faCircleNotch : faMicrophone}
                      className={`text-base ${ambientAgent.isSpeaking ? 'text-slate-900' : 'text-white'} ${ambientAgent.isThinking ? 'animate-spin' : ''}`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDemoVoiceModalOpen(true)}
                    disabled={ambientAgent.isThinking || ambientAgent.isSpeaking || ambientAgent.isPatientSpeaking}
                    className={`h-8 px-2.5 rounded-full border flex items-center gap-1.5 text-[11px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
                      ambientAgent.isPatientSpeaking
                        ? 'bg-purple-600 text-white border-purple-400 ring-2 ring-purple-300 animate-pulse'
                        : 'bg-white/90 hover:bg-purple-50 text-purple-900 border-purple-200/80 shadow-sm'
                    }`}
                    title="1-Click Dual-Turn Mock Voice Dialogue Simulator"
                  >
                    <span>🗣️</span>
                    <span className="font-semibold whitespace-nowrap">Demo Voice</span>
                  </button>
                </div>

                {/* Right Navigation Tabs */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className={`flex flex-col items-center py-0.5 px-2 rounded-lg transition-all cursor-pointer active:scale-95 ${
                      activeTab === 'analytics'
                        ? 'text-[#1E3A8A] font-bold'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={faChartLine} className="text-xs" />
                    <span className="text-[10px] font-semibold mt-0.5">Analytics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('deskClock')}
                    className={`flex flex-col items-center py-0.5 px-2 rounded-lg transition-all cursor-pointer active:scale-95 ${
                      activeTab === 'deskClock'
                        ? isDeskClock
                          ? 'text-teal-400 font-bold'
                          : 'text-[#1E3A8A] font-bold'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FontAwesomeIcon icon={faClock} className="text-xs" />
                    <span className="text-[10px] font-semibold mt-0.5">Desk Clock</span>
                  </button>
                </div>
              </nav>
            </div>

            {/* 4. CAREBRIDGE NVIDIA GREEN & EMERALD AMBIENT GLOW LIGHT BAR */}
            <AmbientGlow
              isListening={ambientAgent.isListening}
              isThinking={ambientAgent.isThinking}
              isSpeaking={ambientAgent.isSpeaking}
              isPatientSpeaking={ambientAgent.isPatientSpeaking}
              patientTranscript={ambientAgent.patientTranscript}
              transcript={ambientAgent.transcript}
              onTriggerDemoVoice={() => setIsDemoVoiceModalOpen(true)}
            />
          </div>
        </div>

        {/* DEVICE MOCKUP FRAME 2: AGENT CONSOLE (DUAL VIEW) */}
        {isDualMode && (
          <div
            className="h-full max-h-[calc(100vh-5.5rem)] w-full max-w-[440px] flex flex-col shrink-0 rounded-[32px] border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.06)] bg-white overflow-hidden transition-all duration-300"
          >
            <AgentConsole
              voiceAgent={ambientAgent}
              onTriggerVisualCard={handleTriggerVisualCard}
              onTriggerClinicalAdvice={handleTriggerClinicalAdvice}
              onRefreshData={() => {
                triggerGlobalRefresh();
                setActiveTab('caregiver');
              }}
              patientName={authSession?.patientName}
              patientAge={authSession?.patientAge}
            />
          </div>
        )}
      </main>

      {/* QUICK VOICE FEEDBACK POPUP DURING LISTENING / THINKING */}
      {ambientAgent.isListening && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-[#10B981] px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn text-slate-900">
          <span className="w-2.5 h-2.5 rounded-full bg-[#76B900] animate-ping" />
          <p className="text-xs font-bold text-slate-900 tracking-wide">
            {ambientAgent.transcript ? `"${ambientAgent.transcript}"` : 'CareBridge Ambient listening... Speak in English'}
          </p>
          <button
            onClick={ambientAgent.toggleListening}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
            title="Stop listening"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
      )}

      {ambientAgent.isThinking && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-[#10B981] px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn text-slate-900">
          <span className="w-2.5 h-2.5 rounded-full bg-[#76B900] animate-spin" />
          <p className="text-xs font-bold text-slate-900 tracking-wide">
            Synthesizing clinical triage with NVIDIA Nemotron-3-Nano...
          </p>
        </div>
      )}

      {/* ZOOMED-IN PILL IDENTIFICATION RICH CARD */}
      <PillVisualCard
        isOpen={visualCardOpen}
        onClose={() => setVisualCardOpen(false)}
        medicineName={selectedMedForCard}
      />

      {/* NEMOTRON CLINICAL ADVISOR RICH CARD */}
      <ClinicalAdviceCard
        isOpen={clinicalAdviceOpen}
        onClose={() => setClinicalAdviceOpen(false)}
        title={
          clinicalAdviceData?.richCard?.title ||
          clinicalAdviceData?.displayCardTitle ||
          'Clinical Triage Assessment'
        }
        actionAdvice={
          clinicalAdviceData?.richCard?.actionAdvice ||
          clinicalAdviceData?.actionAdvice ||
          clinicalAdviceData?.richCard?.advice ||
          clinicalAdviceData?.speechResponse ||
          'Please sit down immediately and drink a glass of warm water.'
        }
        urgencyLevel={
          clinicalAdviceData?.richCard?.urgencyLevel ||
          clinicalAdviceData?.urgencyLevel ||
          'MEDIUM'
        }
        clinicalExplanation={
          clinicalAdviceData?.richCard?.clinicalExplanation ||
          clinicalAdviceData?.clinicalExplanation ||
          clinicalAdviceData?.assessment ||
          'Transient orthostatic hypotension may occur shortly after taking anti-hypertensive medication.'
        }
        smsDispatch={
          clinicalAdviceData?.richCard?.smsDispatch ||
          clinicalAdviceData?.smsDispatch ||
          null
        }
        tavilyEvidence={
          clinicalAdviceData?.tavilyEvidence ||
          clinicalAdviceData?.richCard?.tavilyEvidence ||
          null
        }
      />

      {/* PRESCRIPTION REFILL ORDER RICH CARD */}
      <PrescriptionOrderCard
        isOpen={amazonOrderCardOpen}
        onClose={() => setAmazonOrderCardOpen(false)}
        order={amazonOrderData}
        onTrackOrder={(orderId) => {
          addToast({
            type: 'info',
            title: 'Express Logistics',
            message: `Tracking shipment for Order #${orderId}. Carrier: Express Medical Delivery.`,
          });
        }}
      />

      {/* FRONT DOOR SMART CAMERA & ACCESS RICH CARD (CROSS-DEVICE ECOSYSTEM) */}
      <FrontDoorCameraCard
        isOpen={ringCardOpen}
        onClose={() => setRingCardOpen(false)}
        mode={ringCardMode}
        packageDetails={ringPackageData}
        doorLockStatus={ringDoorLockStatus}
        emergencyReason={ringEmergencyReason}
        onAcknowledge={() => {
          addToast({
            type: 'success',
            title: 'Medication Package Received',
            message: 'Prescription parcel brought inside safely from front porch.',
          });
        }}
        onUnlockDoor={() => {
          setRingDoorLockStatus('LOCKED');
          addToast({
            type: 'info',
            title: 'Smart Access Lock',
            message: 'Front door deadbolt restored to locked secure state.',
          });
        }}
      />

      {/* HEALTH GUARDIAN NEGOTIATION CARD & SARAH CIRCUIT-BREAKER */}
      <GuardianNegotiationCard
        isOpen={guardianCardOpen}
        onClose={() => setGuardianCardOpen(false)}
        data={guardianCardData}
        onTakeDose={handleGuardianTakeDose}
        onCallSarah={handleGuardianCallSarah}
        patientName={authSession?.patientName}
        caregiverName={authSession?.caregiverName}
      />

      {/* PRO PAYWALL MODAL */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onActivatePro={handleActivatePro}
        onResetFreePlan={handleResetFreePlan}
        isPro={Boolean(authSession?.isPro)}
      />

      {/* MANDATORY USER ONBOARDING MODAL */}
      <OnboardingModal
        isOpen={Boolean(
          authSession?.isAuthenticated &&
          !authSession?.isOnboarded &&
          !authSession?.isDemo
        )}
        initialEmail={authSession?.email}
        onComplete={handleOnboardingComplete}
      />

      {/* 1-CLICK DUAL-TURN MOCK VOICE DIALOGUE SIMULATOR MODAL */}
      <DemoVoiceModal
        isOpen={isDemoVoiceModalOpen}
        onClose={() => setIsDemoVoiceModalOpen(false)}
        onSelectScenario={async (scenario: MockVoiceScenario) => {
          await ambientAgent.simulateVoiceScenario(scenario);
        }}
        activeScenarioId={ambientAgent.activeScenarioId}
        isBusy={ambientAgent.isThinking || ambientAgent.isSpeaking || ambientAgent.isPatientSpeaking}
      />

      {/* TOAST NOTIFICATION CONTAINER (NON-BLOCKING RESILIENT WARNINGS) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* GLOBAL VIEWPORT AMBIENT LIGHT BAR */}
      <div
        className={`fixed bottom-0 left-0 right-0 h-[3.5px] z-50 pointer-events-none transition-all duration-500 ease-out ${
          ambientAgent.isListening || ambientAgent.isThinking || ambientAgent.isSpeaking
            ? 'opacity-100 ambient-lightbar'
            : 'opacity-0'
        }`}
      />
    </div>
  );
}