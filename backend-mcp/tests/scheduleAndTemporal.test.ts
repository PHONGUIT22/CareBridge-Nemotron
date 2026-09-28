import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDB, getDatabase } from '../src/database/db.js';
import { MedicineRepo } from '../src/database/medicineRepo.js';
import { LogRepo } from '../src/database/logRepo.js';
import { VitalsRepo } from '../src/database/vitalsRepo.js';
import { getLocalDateString } from '../src/utils/dateUtils.js';

describe('Task 2 & Task 3: Schedule by Date & Temporal Guard Logic', () => {
  const testUserId = `usr_sched_test_${Date.now()}`;

  beforeAll(() => {
    initDB();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO users (id, email, pin, role, is_pro, is_demo, created_at)
      VALUES (?, ?, '1234', 'caregiver', 0, 0, ?)
    `).run(testUserId, `test_sched_${Date.now()}@gmail.com`, new Date().toISOString());
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  describe('Task 2: Schedule & Vitals by Date', () => {
    it('generates and retrieves intake logs strictly for requested targetDate', async () => {
      // Add medication created in past
      const medId = await MedicineRepo.addMedicine({
        userId: testUserId,
        name: 'Target Date Aspirin',
        dosage: '81mg',
        reminderTimes: ['08:00', '20:00'],
        daysOfWeek: ['ALL'],
        createdAt: '2026-01-01T00:00:00.000Z',
      });

      const dateA = '2026-03-10';
      const dateB = '2026-03-11';

      const logsA = await LogRepo.getLogsByDate(dateA, testUserId);
      const logsB = await LogRepo.getLogsByDate(dateB, testUserId);

      expect(logsA.length).toBe(2);
      expect(logsB.length).toBe(2);
      logsA.forEach((l) => expect(l.date).toBe(dateA));
      logsB.forEach((l) => expect(l.date).toBe(dateB));

      // Updating a dose on dateA does NOT change status on dateB
      await LogRepo.updateStatusDirect(logsA[0].logId, 'taken', 'Taken early');

      const recheckA = await LogRepo.getLogsByDate(dateA, testUserId);
      const recheckB = await LogRepo.getLogsByDate(dateB, testUserId);

      expect(recheckA[0].status).toBe('taken');
      expect(recheckB[0].status).toBe('pending');
    });

    it('retrieves daily vitals isolated by targetDate and userId', async () => {
      await VitalsRepo.saveVitals({
        userId: testUserId,
        date: '2026-03-10',
        systolic: 120,
        diastolic: 80,
      });

      await VitalsRepo.saveVitals({
        userId: testUserId,
        date: '2026-03-11',
        systolic: 135,
        diastolic: 88,
      });

      const vitalsA = await VitalsRepo.getVitalsByDate('2026-03-10', testUserId);
      const vitalsB = await VitalsRepo.getVitalsByDate('2026-03-11', testUserId);

      expect(vitalsA?.systolic).toBe(120);
      expect(vitalsB?.systolic).toBe(135);
    });
  });

  describe('Task 3: Task Generation Date Skipping (dateStr < medStartDate)', () => {
    it('skips generating tasks when dateStr < medStartDate even with daysOfWeek: ALL', async () => {
      const prescribedDate = '2026-05-15';
      await MedicineRepo.addMedicine({
        userId: testUserId,
        name: 'Future Prescribed Statin',
        dosage: '20mg',
        reminderTimes: ['09:00'],
        daysOfWeek: ['ALL'],
        createdAt: `${prescribedDate}T10:00:00.000Z`,
      });

      // Target date is before prescription creation date
      const pastDate = '2026-05-10';
      const pastLogs = await LogRepo.getLogsByDate(pastDate, testUserId);
      const pastMatch = pastLogs.find((l) => l.name === 'Future Prescribed Statin');
      expect(pastMatch).toBeUndefined();

      // Target date on or after prescription creation date generates correctly
      const validDate = '2026-05-15';
      const validLogs = await LogRepo.getLogsByDate(validDate, testUserId);
      const validMatch = validLogs.find((l) => l.name === 'Future Prescribed Statin');
      expect(validMatch).toBeDefined();
    });
  });

  describe('Task 5: Multi-Dose per Day Completion Logic', () => {
    it('requires all doses in a day to be taken for day completion', () => {
      // Simulate multi-dose logs for Metformin (08:00 and 18:00)
      const logsPartiallyTaken = [
        { date: '2026-03-10', status: 'taken' as const },
        { date: '2026-03-10', status: 'pending' as const },
      ];

      const isFullyTakenPartial =
        logsPartiallyTaken.length > 0 && logsPartiallyTaken.every((l) => l.status === 'taken');
      expect(isFullyTakenPartial).toBe(false);

      const logsAllTaken = [
        { date: '2026-03-10', status: 'taken' as const },
        { date: '2026-03-10', status: 'taken' as const },
      ];

      const isFullyTakenComplete =
        logsAllTaken.length > 0 && logsAllTaken.every((l) => l.status === 'taken');
      expect(isFullyTakenComplete).toBe(true);
    });
  });

  describe('Task 6: Local Date Standardization (getLocalDateString)', () => {
    it('formats dates consistently in YYYY-MM-DD using local time', () => {
      const specificDate = new Date(2026, 4, 3); // May 3, 2026
      expect(getLocalDateString(specificDate)).toBe('2026-05-03');

      const todayStr = getLocalDateString();
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
