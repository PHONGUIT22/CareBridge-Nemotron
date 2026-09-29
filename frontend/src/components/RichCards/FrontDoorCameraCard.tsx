'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVideo,
  faXmark,
  faBoxOpen,
  faLockOpen,
  faLock,
  faMicrophone,
  faVolumeHigh,
  faShieldHalved,
  faTruckFast,
  faTriangleExclamation,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';

export interface FrontDoorCameraCardProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'delivery' | 'emergency' | 'live';
  packageDetails?: {
    carrier?: string;
    description?: string;
    deliveryTime?: string;
    orderId?: string;
  };
  doorLockStatus?: string;
  emergencyReason?: string;
  onAcknowledge?: () => void;
  onUnlockDoor?: () => void;
}

export type SmartDoorbellCardProps = FrontDoorCameraCardProps;
export type RingDoorbellCardProps = FrontDoorCameraCardProps;

/**
 * Front Door Smart Camera Rich Card
 * 
 * Features:
 * 1. Night-Vision Simulation: Switchable 850nm IR Phosphor / Starlight Color Night Vision.
 * 2. Radar Scan Sweep: Sweeping laser plane with trailing radar phosphor scanning the porch.
 * 3. Computer Vision Parcel Tracking: Emerald green bounding box with HUD brackets
 *    and exact [CareBridge Medical Parcel - Verified] certification tag.
 * 4. Real-time Telemetry: Live timecode with frame counter, bitrate, and Smart Access Lock status.
 */
export function FrontDoorCameraCard({
  isOpen,
  onClose,
  mode = 'delivery',
  packageDetails,
  doorLockStatus = 'LOCKED',
  emergencyReason,
  onAcknowledge,
  onUnlockDoor,
}: FrontDoorCameraCardProps) {
  const [currentTime, setCurrentTime] = useState('');
  const [frameTick, setFrameTick] = useState(0);
  const [isTalkActive, setIsTalkActive] = useState(false);
  const [isBroughtInside, setIsBroughtInside] = useState(false);
  const [nightVisionMode, setNightVisionMode] = useState<'ir' | 'color'>('ir');
  const [isSpotlightOn, setIsSpotlightOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'1x' | '1.5x'>('1x');

  // Real-time camera clock & frame counter (simulates 30 FPS surveillance timecode)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    const frameInterval = setInterval(() => {
      setFrameTick((prev) => (prev + 1) % 30);
    }, 100);

    return () => {
      clearInterval(interval);
      clearInterval(frameInterval);
    };
  }, []);

  if (!isOpen) return null;

  const isEmergency = mode === 'emergency' || doorLockStatus.includes('UNLOCKED');
  const carrier = packageDetails?.carrier || 'Express Medical Courier';
  const desc = packageDetails?.description || 'CareBridge Prescription Medication Parcel';

  const handleBringInside = () => {
    setIsBroughtInside(true);
    setTimeout(() => {
      if (onAcknowledge) onAcknowledge();
      onClose();
      setIsBroughtInside(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#050811]/90 backdrop-blur-md animate-fadeIn select-none">
      <div
        className={`bg-[#0d131f] border-2 ${
          isEmergency
            ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]'
            : 'border-[#10B981]/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]'
        } w-full max-w-2xl rounded-3xl overflow-hidden text-white relative flex flex-col`}
      >
        {/* TOP ACCENT GLOW */}
        <div
          className={`absolute -top-20 -right-20 w-56 h-56 ${
            isEmergency ? 'bg-rose-500/20' : 'bg-[#76B900]/20'
          } rounded-full blur-3xl pointer-events-none`}
        />

        {/* 1. FRONT DOOR CAMERA HEADER BAR */}
        <div className="px-5 py-3 bg-[#0a0e17] border-b border-white/[0.08] flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#10B981] flex items-center justify-center text-white text-xs shadow-md shadow-[#10B981]/40">
              <FontAwesomeIcon icon={faVideo} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono tracking-wider text-white">
                  FRONT DOOR SMART CAMERA
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.08] text-slate-300 font-mono font-medium">
                  FRONT PORCH • 1536p HD
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  LIVE FEED • {currentTime || 'LIVE'}:{(frameTick < 10 ? '0' : '') + frameTick}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  (30 FPS • 4.6 Mbps H.265)
                </span>
              </div>
            </div>
          </div>

          {/* Top Status & Controls */}
          <div className="flex items-center gap-2">
            {isEmergency ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold flex items-center gap-1.5 animate-pulse">
                <FontAwesomeIcon icon={faLockOpen} className="text-xs" />
                <span>UNLOCKED FOR FIRST RESPONDERS</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Package In Zone</span>
              </span>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors ml-1"
              title="Close Camera Feed"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>
          </div>
        </div>

        {/* 2. CAMERA TOOLBAR (NIGHT VISION & OPTICAL CONTROLS) */}
        <div className="px-4 py-2 bg-[#101624] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            {/* Night Vision Switcher */}
            <button
              onClick={() => setNightVisionMode(nightVisionMode === 'ir' ? 'color' : 'ir')}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                nightVisionMode === 'ir'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title="Toggle Infrared 850nm Night Vision"
            >
              <span className={`w-2 h-2 rounded-full ${nightVisionMode === 'ir' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span>{nightVisionMode === 'ir' ? 'IR Night-Vision ON (850nm)' : 'Color Night Vision'}</span>
            </button>

            {/* Spotlight Toggle */}
            <button
              onClick={() => setIsSpotlightOn(!isSpotlightOn)}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                isSpotlightOn
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title="Toggle Porch Spotlight"
            >
              <span>{isSpotlightOn ? '💡 Porch Spotlight ON' : '💡 Porch Spotlight OFF'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Toggle */}
            <button
              onClick={() => setZoomLevel(zoomLevel === '1x' ? '1.5x' : '1x')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 border border-emerald-500/30"
              title="Toggle Digital Zoom"
            >
              FOV: {zoomLevel === '1x' ? '155° Ultrawide' : 'Zoom 1.5x'}
            </button>
          </div>
        </div>

        {/* 3. SIMULATED LIVE CAMERA FEED CANVAS */}
        <div
          className={`relative w-full aspect-video bg-[#03060c] overflow-hidden flex items-center justify-center border-b border-white/[0.08] transition-transform duration-300 ${
            zoomLevel === '1.5x' ? 'scale-110' : 'scale-100'
          }`}
          style={{
            filter: nightVisionMode === 'ir'
              ? 'sepia(40%) hue-rotate(95deg) contrast(1.35) brightness(0.95)'
              : 'none',
          }}
        >
          {/* CRT Scanline & Grain Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-20 opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0, 255, 170, 0.08) 0px, transparent 1px, transparent 3px)',
            }}
          />

          {/* RADAR SCAN SWEEP ANIMATION */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            <div
              className="w-full h-24 bg-gradient-to-b from-transparent via-[#00FF88]/20 to-[#00FF88]/60 border-b-2 border-[#00FF88] shadow-[0_0_20px_#00FF88] animate-radarSweep"
              style={{
                animationDuration: '3.6s',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
              }}
            />
          </div>

          {/* Porch Spotlight Cone Effect */}
          {isSpotlightOn && (
            <div
              className="absolute inset-0 pointer-events-none z-10 opacity-40 bg-[radial-gradient(ellipse_60%_70%_at_50%_40%,rgba(255,245,220,0.85)_0%,transparent_75%)]"
            />
          )}

          {/* High-Resolution Porch & Front Door Architecture */}
          <svg
            viewBox="0 0 800 450"
            className="w-full h-full object-cover select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="doorNightSky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#020408" />
                <stop offset="60%" stopColor="#080e1a" />
                <stop offset="100%" stopColor="#050a14" />
              </linearGradient>

              <linearGradient id="doorPorchFloor" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0f1726" />
                <stop offset="100%" stopColor="#070c14" />
              </linearGradient>

              <linearGradient id="doorFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1a2333" />
                <stop offset="50%" stopColor="#2c3b54" />
                <stop offset="100%" stopColor="#1a2333" />
              </linearGradient>

              <linearGradient id="parcelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b4783c" />
                <stop offset="100%" stopColor="#875324" />
              </linearGradient>

              <filter id="greenTrackingGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Night Background & Siding Panels */}
            <rect width="800" height="450" fill="url(#doorNightSky)" />
            <line x1="0" y1="40" x2="800" y2="40" stroke="#121a28" strokeWidth="1" />
            <line x1="0" y1="80" x2="800" y2="80" stroke="#121a28" strokeWidth="1" />
            <line x1="0" y1="120" x2="800" y2="120" stroke="#121a28" strokeWidth="1" />
            <line x1="0" y1="160" x2="800" y2="160" stroke="#121a28" strokeWidth="1" />
            <line x1="0" y1="200" x2="800" y2="200" stroke="#121a28" strokeWidth="1" />

            {/* Front Door Assembly */}
            <rect x="250" y="30" width="300" height="340" fill="url(#doorFrameGrad)" rx="8" />
            <rect x="265" y="45" width="270" height="325" fill="#0b111f" rx="4" />

            {/* Door Panel Insets */}
            <rect x="285" y="65" width="105" height="120" fill="#172233" rx="4" stroke="#25354e" strokeWidth="1" />
            <rect x="410" y="65" width="105" height="120" fill="#172233" rx="4" stroke="#25354e" strokeWidth="1" />
            <rect x="285" y="205" width="105" height="140" fill="#172233" rx="4" stroke="#25354e" strokeWidth="1" />
            <rect x="410" y="205" width="105" height="140" fill="#172233" rx="4" stroke="#25354e" strokeWidth="1" />

            {/* Door Deadbolt & Smart Access Keypad */}
            <circle cx="280" cy="215" r="9" fill="#10b981" filter="url(#greenTrackingGlow)" opacity="0.8" />
            <rect x="274" y="190" width="12" height="35" rx="3" fill="#cbd5e1" />

            {/* Front Porch Floor Perspective */}
            <polygon points="0,450 800,450 680,320 120,320" fill="url(#doorPorchFloor)" />
            <line x1="200" y1="450" x2="260" y2="320" stroke="#1b2536" strokeWidth="2" />
            <line x1="400" y1="450" x2="400" y2="320" stroke="#1b2536" strokeWidth="2" />
            <line x1="600" y1="450" x2="540" y2="320" stroke="#1b2536" strokeWidth="2" />

            {/* Welcome Porch Doormat */}
            <polygon points="280,390 520,390 490,340 310,340" fill="#161e2b" stroke="#28364d" strokeWidth="2" rx="4" />
            <text x="400" y="370" fill="#475569" fontSize="13" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              WELCOME
            </text>

            {/* Outdoor Porch Light */}
            <circle cx="170" cy="110" r="14" fill="#fbbf24" opacity={isSpotlightOn ? '0.95' : '0.4'} filter="url(#greenTrackingGlow)" />
            <rect x="162" y="98" width="16" height="24" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />

            {/* ============================================================== */}
            {/* MEDICAL PARCEL + EMERALD GREEN COMPUTER VISION BOUNDING BOX */}
            {/* ============================================================== */}
            {!isEmergency && (
              <g transform="translate(325, 305)">
                {/* Parcel Drop Shadow */}
                <ellipse cx="75" cy="70" rx="70" ry="14" fill="#000000" opacity="0.7" />

                {/* 3D Parcel Geometry */}
                <polygon points="20,25 125,25 155,5 50,5" fill="#d97706" opacity="0.85" />
                <polygon points="125,25 155,5 155,45 125,68" fill="#92400e" />
                <polygon points="20,25 125,25 125,68 20,68" fill="url(#parcelGrad)" />

                {/* Express Security Packing Tape */}
                <polygon points="70,5 82,5 82,68 70,68" fill="#10b981" />

                {/* CareBridge Rx Emblem */}
                <path d="M 48 50 Q 75 58 102 50" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <polygon points="102,47 107,52 101,54" fill="#ffffff" />

                {/* Pharmacy Rx Capsule Label */}
                <rect x="35" y="30" width="28" height="15" rx="3" fill="#ffffff" opacity="0.9" />
                <line x1="40" y1="35" x2="56" y2="35" stroke="#10b981" strokeWidth="1.5" />
                <line x1="40" y1="40" x2="52" y2="40" stroke="#64748b" strokeWidth="1" />

                {/* EMERALD GREEN BOUNDING BOX CONTAINER (CV Tracking) */}
                <rect
                  x="8"
                  y="-4"
                  width="160"
                  height="82"
                  fill="rgba(16, 185, 129, 0.08)"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeDasharray="8,5"
                  filter="url(#greenTrackingGlow)"
                  className="animate-pulse"
                />

                {/* 4 HUD Targeting Brackets at Corners */}
                <path d="M 4 8 L 4 -8 L 20 -8" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                <path d="M 156 -8 L 172 -8 L 172 8" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                <path d="M 4 70 L 4 86 L 20 86" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                <path d="M 156 86 L 172 86 L 172 70" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />

                {/* Center Target Reticle */}
                <circle cx="88" cy="37" r="6" fill="none" stroke="#10B981" strokeWidth="1.5" />
                <line x1="88" y1="27" x2="88" y2="47" stroke="#10B981" strokeWidth="1" />
                <line x1="78" y1="37" x2="98" y2="37" stroke="#10B981" strokeWidth="1" />

                {/* VERIFIED BADGE HEADER CHIP */}
                <g transform="translate(6, -26)">
                  <rect
                    x="0"
                    y="0"
                    width="236"
                    height="22"
                    rx="5"
                    fill="#10B981"
                    filter="url(#greenTrackingGlow)"
                  />
                  <text
                    x="10"
                    y="15"
                    fill="#041a12"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                    letterSpacing="0.2"
                  >
                    [CareBridge Medical Parcel - Verified]
                  </text>
                </g>

                {/* Telemetry Footnote */}
                <g transform="translate(6, 88)">
                  <rect x="0" y="2" width="180" height="15" rx="3" fill="#061f18" stroke="#10B981" strokeWidth="1" />
                  <text x="6" y="13" fill="#6ee7b7" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                    Rx Lock • Conf: 99.4% • ID: CB-RX
                  </text>
                </g>
              </g>
            )}

            {/* EMERGENCY OVERRIDE FLOODLIGHT & UNLOCKED BADGE */}
            {isEmergency && (
              <g transform="translate(260, 110)">
                <ellipse cx="140" cy="180" rx="220" ry="100" fill="#f43f5e" opacity="0.22" filter="url(#greenTrackingGlow)" />
                <polygon points="140,-40 380,320 -100,320" fill="#fef08a" opacity="0.15" />

                {/* Floating Smart Lock Badge */}
                <rect
                  x="10"
                  y="40"
                  width="260"
                  height="60"
                  rx="12"
                  fill="#0f172a"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  filter="url(#greenTrackingGlow)"
                />
                <circle cx="45" cy="70" r="18" fill="#10b981" />
                <path
                  d="M 40 68 L 50 68 L 50 78 L 40 78 Z M 42 68 L 42 63 C 42 59 48 59 48 63"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <text x="75" y="65" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
                  SMART ACCESS LOCK
                </text>
                <text x="75" y="82" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  UNLOCKED FOR PARAMEDICS
                </text>
              </g>
            )}

            {/* On-Screen Camera Telemetry HUD */}
            <text x="25" y="35" fill="#00FF88" fontSize="11" fontFamily="monospace" fontWeight="bold">
              ● LIVE REC [1080P HD HDR]
            </text>
            <text x="775" y="35" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="end">
              BATTERY 94% • WI-FI RSSI -48dBm
            </text>
            <text x="25" y="430" fill="#64748b" fontSize="10" fontFamily="monospace">
              RADAR MOTION SWEEP ACTIVE • ZONE 1 (PORCH MAT) • CV-IOT-V4
            </text>
          </svg>
        </div>

        {/* 4. CONTROLS FOOTER */}
        <div className="p-4 sm:p-5 bg-[#0a0e17] flex flex-col gap-3.5">
          {isEmergency ? (
            /* Emergency Paramedic Access Mode */
            <div className="flex flex-col gap-3">
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-base" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-rose-300">
                    Emergency Door Access Granted
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    {emergencyReason || 'Acute symptom triage alert triggered Smart Access Lock. Deadbolt disengaged to ensure instant entry for paramedic first responders.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (onUnlockDoor) onUnlockDoor();
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95"
                >
                  <FontAwesomeIcon icon={faLockOpen} className="text-xs" />
                  <span>Door Unlocked • Paramedics En Route</span>
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-[#141b29] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/[0.08]"
                >
                  Dismiss View
                </button>
              </div>
            </div>
          ) : (
            /* Package Delivery Mode */
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#101624] border border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm border border-emerald-500/40">
                    <FontAwesomeIcon icon={faBoxOpen} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{desc}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                        VERIFIED 99.4%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Carrier: {carrier} • Front Porch Mat • Express Courier Tracking
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold">
                  Delivered Just Now
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* 1. Acknowledge / Bring Inside Button */}
                <button
                  onClick={handleBringInside}
                  disabled={isBroughtInside}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={isBroughtInside ? faCircleCheck : faBoxOpen} className="text-sm" />
                  <span>{isBroughtInside ? 'Parcel Brought Inside!' : 'Acknowledge / Bring Inside'}</span>
                </button>

                {/* 2. Two-Way Audio Toggle */}
                <button
                  onClick={() => setIsTalkActive(!isTalkActive)}
                  className={`py-3 px-4 rounded-xl font-medium text-xs border transition-all flex items-center gap-2 ${
                    isTalkActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'bg-[#101624] text-slate-300 hover:text-white border-white/[0.08]'
                  }`}
                  title="Two-Way Talk via Smart Doorbell"
                >
                  <FontAwesomeIcon icon={isTalkActive ? faVolumeHigh : faMicrophone} className="text-xs" />
                  <span>{isTalkActive ? 'Two-Way Audio ACTIVE' : 'Two-Way Talk'}</span>
                </button>

                {/* 3. Dismiss Button */}
                <button
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-[#101624] hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium border border-white/[0.08]"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const RingDoorbellCard = FrontDoorCameraCard;
export const SmartDoorbellCard = FrontDoorCameraCard;
