'use client';

import { useState, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { DailyLogItem, VitalsRecord, LogStatus } from '../types';
import { getLocalDateString } from '../utils/dateUtils';

export function useMedicines(dateStr?: string) {
  const [schedule, setSchedule] = useState<DailyLogItem[]>([]);
  const [vitals, setVitals] = useState<VitalsRecord | null>(null);
  const [caregiverName, setCaregiverName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem('carebridge_auth_session');
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed.caregiverName) return parsed.caregiverName;
          if (parsed.isDemo) return 'Sarah Connor';
        }
      } catch (_) {}
    }
    return 'Sarah Connor';
  });
  const [patientName, setPatientName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem('carebridge_auth_session');
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed.patientName) return parsed.patientName;
          if (parsed.isDemo) return 'Eleanor Vance';
        }
      } catch (_) {}
    }
    return 'Eleanor Vance';
  });
  const [patientAge, setPatientAge] = useState<number | undefined>(() => {
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem('carebridge_auth_session');
        if (s) {
          const parsed = JSON.parse(s);
          if (parsed.patientAge) return parsed.patientAge;
          if (parsed.isDemo) return 78;
        }
      } catch (_) {}
    }
    return 78;
  });
  const [adherenceRate, setAdherenceRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.getSchedule(dateStr);
      if (data.schedule) {
        setSchedule(data.schedule);
      }
      setVitals(data.vitals || null);
      if (data.caregiverName || data.caregiver?.name) {
        setCaregiverName(data.caregiverName || data.caregiver?.name || '');
      }
      if (data.patientName) {
        setPatientName(data.patientName);
      }
      if (data.patientAge !== undefined) {
        setPatientAge(data.patientAge);
      }
      if (data.adherenceRate !== undefined) {
        setAdherenceRate(data.adherenceRate);
      }
      setIsOnline(true);
      return data;
    } catch (error) {
      console.warn('Backend MCP unreachable, using offline fallback');
      setIsOnline(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  /**
   * Reactive toggle with immediate optimistic UI flip and graceful rollback
   */
  const toggleDoseStatus = useCallback(
    async (logId: string, currentStatus: string) => {
      const isNowTaken = currentStatus !== 'taken';
      const nowTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // Save snapshot for rollback if backend request fails
      let previousSchedule: DailyLogItem[] = [];
      let previousAdherence = 0;

      // 1. Instant optimistic update locally (0ms perceived latency)
      setSchedule((prev) => {
        previousSchedule = prev;
        const prevTaken = prev.filter((s) => s.status === 'taken').length;
        previousAdherence = prev.length > 0 ? Math.round((prevTaken / prev.length) * 100) : 0;

        const updated = prev.map((item) => {
          if (item.logId === logId) {
            return {
              ...item,
              status: (isNowTaken ? 'taken' : 'pending') as LogStatus,
              isTaken: isNowTaken,
              takenAt: isNowTaken ? nowTime : undefined,
              stockCount:
                item.stockCount !== undefined
                  ? isNowTaken
                    ? Math.max(0, item.stockCount - 1)
                    : item.stockCount + 1
                  : 30,
            };
          }
          return item;
        });

        // Recalculate adherence rate immediately
        const takenCount = updated.filter((s) => s.status === 'taken').length;
        const total = updated.length;
        if (total > 0) {
          setAdherenceRate(Math.round((takenCount / total) * 100));
        }

        return updated;
      });

      // 2. Sync with backend SQLite
      try {
        await mcpClient.toggleDose(logId, currentStatus);
        setIsOnline(true);
      } catch (err: any) {
        console.warn('Backend sync failed, rolling back optimistic state gracefully:', err.message);
        setSchedule(previousSchedule);
        setAdherenceRate(previousAdherence);
        setIsOnline(false);
        throw err;
      }
    },
    []
  );

  const saveNote = useCallback(async (logId: string, notes: string) => {
    setSchedule((prev) =>
      prev.map((item) => (item.logId === logId ? { ...item, notes } : item))
    );

    try {
      await mcpClient.saveDoseNote(logId, notes);
    } catch (err) {
      console.warn('Failed to persist note.');
    }
  }, []);

  const recordVitals = useCallback(async (newVitals: Partial<VitalsRecord>) => {
    const targetDate = dateStr || getLocalDateString();
    setVitals((prev) => ({
      date: targetDate,
      updatedAt: new Date().toISOString(),
      ...prev,
      ...newVitals,
    }));

    try {
      await mcpClient.recordVitals({ ...newVitals, date: newVitals.date || targetDate });
      const fresh = await mcpClient.getSchedule(dateStr);
      if (fresh?.vitals) setVitals(fresh.vitals);
    } catch (err) {
      console.warn('Failed to persist vitals.');
    }
  }, [dateStr]);

  const mutate = useCallback(
    (updater: (prev: DailyLogItem[]) => DailyLogItem[]) => {
      setSchedule((prev) => {
        const next = updater(prev);
        const taken = next.filter((s) => s.status === 'taken').length;
        if (next.length > 0) {
          setAdherenceRate(Math.round((taken / next.length) * 100));
        }
        return next;
      });
    },
    []
  );

  return {
    schedule,
    vitals,
    caregiverName,
    patientName,
    patientAge,
    adherenceRate,
    loading,
    isOnline,
    toggleDoseStatus,
    toggleDose: toggleDoseStatus, // Alias
    saveNote,
    recordVitals,
    refetch: fetchSchedule,
    mutate,
  };
}
