'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faDroplet,
  faShieldHalved,
  faBolt,
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import { mcpClient } from '../services/mcpClient';
import { DoctorReportPreviewModal } from '../components/DoctorReportPreviewModal';

type MetricTab = 'bloodPressure' | 'bloodSugar' | 'heartRate';

interface VitalPoint {
  date: string;       // "08-13"
  systolic?: number;  // mmHg
  diastolic?: number; // mmHg
  bloodSugar?: number;// mg/dL
  heartRate?: number; // bpm
}

export function AnalyticsView({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [activeTab, setActiveTab] = useState<MetricTab>('bloodPressure');
  const [vitalsData, setVitalsData] = useState<VitalPoint[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch 30-day vitals history from backend via mcpClient
  useEffect(() => {
    mcpClient
      .getHistory()
      .then((data) => {
        if (data.success && data.vitals?.length > 0) {
          const formatted = data.vitals.map((v) => ({
            date: v.date.substring(5), // "YYYY-MM-DD" -> "MM-DD"
            systolic: v.systolic || 120,
            diastolic: v.diastolic || 80,
            bloodSugar: v.bloodSugar || 105,
            heartRate: v.heartRate || 72,
          }));
          setVitalsData(formatted);
        }
      })
      .catch((err) => {
        console.warn('Unable to load vitals history from server:', err);
      });
  }, [refreshTrigger]);

  // Compute dynamic clinical averages and observations
  const bpAnalysis = useMemo(() => {
    const valid = vitalsData.filter((v) => v.systolic && v.diastolic);
    if (valid.length === 0) {
      return { avgSys: 122, avgDia: 82, isElevated: false };
    }

    const avgSys = Math.round(
      valid.reduce((acc, v) => acc + (v.systolic || 0), 0) / valid.length
    );
    const avgDia = Math.round(
      valid.reduce((acc, v) => acc + (v.diastolic || 0), 0) / valid.length
    );

    return {
      avgSys,
      avgDia,
      isElevated: avgSys > 130 || avgDia > 85,
    };
  }, [vitalsData]);

  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-900 p-4 sm:p-5 font-sans select-none pb-28">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        {/* 1. HEADER SECTION (MATCHES image/7.png) */}
        <div className="pt-1 flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 font-mono">
              BIOMETRIC TRENDS
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Vitals Analytics
            </h1>
          </div>

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 transition-all mt-1"
            title="One-Tap Quick Doctor A4 Preview with 30-Day BP Chart & Scannable QR Code"
          >
            <FontAwesomeIcon icon={faEye} className="text-xs" />
            <span>Doctor A4 Sheet</span>
          </button>
        </div>

        {/* 2. 3 METRIC TABS (MATCHES image/7.png) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('bloodPressure')}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'bloodPressure'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 shadow-2xs'
            }`}
          >
            <FontAwesomeIcon
              icon={faHeartPulse}
              className={`text-xs ${activeTab === 'bloodPressure' ? 'text-white' : 'text-[#1E3A8A]'}`}
            />
            <span className="truncate">Blood Pressure</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bloodSugar')}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'bloodSugar'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 shadow-2xs'
            }`}
          >
            <FontAwesomeIcon
              icon={faDroplet}
              className={`text-xs ${activeTab === 'bloodSugar' ? 'text-white' : 'text-sky-600'}`}
            />
            <span className="truncate">Blood Sugar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('heartRate')}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'heartRate'
                ? 'bg-[#1E3A8A] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 shadow-2xs'
            }`}
          >
            <FontAwesomeIcon
              icon={faBolt}
              className={`text-xs ${activeTab === 'heartRate' ? 'text-white' : 'text-emerald-600'}`}
            />
            <span className="truncate">Heart Rate</span>
          </button>
        </div>

        {/* 3. CLEAN WHITE CHART CARD (MATCHES image/7.png) */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 sm:p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-slate-900 text-base">
              {activeTab === 'bloodPressure' && 'Blood Pressure Trend (mmHg)'}
              {activeTab === 'bloodSugar' && 'Blood Sugar Trend (mg/dL)'}
              {activeTab === 'heartRate' && 'Heart Rate Trend (BPM)'}
            </h3>

            {/* Subtle Legend */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              {activeTab === 'bloodPressure' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span>Systolic</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span>Diastolic</span>
                  </div>
                </>
              )}
              {activeTab === 'bloodSugar' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  <span>mg/dL</span>
                </div>
              )}
              {activeTab === 'heartRate' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span>BPM</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-1">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vitalsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="systolicGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="diastolicGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="sugarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  />

                  <YAxis
                    domain={activeTab === 'bloodPressure' ? [70, 135] : ['auto', 'auto']}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      color: '#0F172A',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    }}
                  />

                  {activeTab === 'bloodPressure' && (
                    <Area
                      key="systolic"
                      type="monotone"
                      dataKey="systolic"
                      stroke="#EF4444"
                      strokeWidth={2.5}
                      fill="url(#systolicGradient)"
                      dot={{ r: 2, fill: '#EF4444' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}
                  {activeTab === 'bloodPressure' && (
                    <Area
                      key="diastolic"
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#diastolicGradient)"
                      dot={{ r: 2, fill: '#2563EB' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}

                  {activeTab === 'bloodSugar' && (
                    <Area
                      key="bloodSugar"
                      type="monotone"
                      dataKey="bloodSugar"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fill="url(#sugarGradient)"
                      dot={{ r: 2, fill: '#2563EB' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}

                  {activeTab === 'heartRate' && (
                    <Area
                      key="heartRate"
                      type="monotone"
                      dataKey="heartRate"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fill="url(#heartGradient)"
                      dot={{ r: 2, fill: '#10B981' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs font-mono">
                Loading biometric telemetry...
              </div>
            )}
          </div>
        </div>

        {/* 4. CLINICAL OBSERVATION CARD (MATCHES image/7.png) */}
        <div className="bg-blue-50/60 border border-blue-200/60 rounded-[20px] p-4 sm:p-5 flex gap-3.5 items-start shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/60">
            <FontAwesomeIcon icon={faShieldHalved} className="text-sm" />
          </div>
          <div>
            <h4 className="font-bold text-[#1E3A8A] text-sm sm:text-base">
              Clinical Observation
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Readings remain within stable ranges. Consistent medication intake keeps baseline blood pressure normalized.
            </p>
          </div>
        </div>
      </div>

      {/* ONE-TAP QUICK DOCTOR A4 PREVIEW MODAL */}
      <DoctorReportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        patientName="Eleanor Vance"
        patientAge={78}
        caregiverName="Sarah Connor"
        adherenceRate={87.5}
        vitals={vitalsData.map((v) => ({
          date: `2026-${v.date}`,
          systolic: v.systolic,
          diastolic: v.diastolic,
          bloodSugar: v.bloodSugar,
          heartRate: v.heartRate,
        }))}
      />
    </div>
  );
}