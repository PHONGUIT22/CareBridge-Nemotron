import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDB, getDatabase } from '../src/database/db.js';
import { MedicineRepo } from '../src/database/medicineRepo.js';
import { LogRepo } from '../src/database/logRepo.js';
import { getLocalDateString } from '../src/utils/dateUtils.js';

describe('Medicine Full CRUD Operations Specification', () => {
  const testUserId = `usr_crud_test_${Date.now()}`;

  beforeAll(() => {
    initDB();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO users (id, email, pin, role, is_pro, is_demo, created_at)
      VALUES (?, ?, '1234', 'caregiver', 0, 0, ?)
    `).run(testUserId, `test_crud_${Date.now()}@gmail.com`, new Date().toISOString());
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  it('Create: adds new medication with stock count and reminder times', async () => {
    const medId = await MedicineRepo.addMedicine({
      userId: testUserId,
      name: 'Initial Metformin',
      dosage: '500mg',
      reminderTimes: ['08:00', '18:00'],
      daysOfWeek: ['ALL'],
      stockCount: 60,
    });

    const med = await MedicineRepo.getMedicineById(medId, testUserId);
    expect(med).not.toBeNull();
    expect(med?.name).toBe('Initial Metformin');
    expect(med?.dosage).toBe('500mg');
    expect(med?.stockCount).toBe(60);
    expect(med?.reminderTimes).toEqual(['08:00', '18:00']);
  });

  it('Update: modifies name, dosage, reminderTimes, and stockCount with persistence', async () => {
    const medId = await MedicineRepo.addMedicine({
      userId: testUserId,
      name: 'Amlodipine Norvasc',
      dosage: '5mg',
      reminderTimes: ['08:00'],
      daysOfWeek: ['ALL'],
      stockCount: 30,
    });

    const todayStr = getLocalDateString();
    await LogRepo.generateLogsForDate(todayStr, testUserId);

    // Initial logs for today
    const initialLogs = await LogRepo.getLogsByDate(todayStr, testUserId);
    const medInitialLogs = initialLogs.filter((l) => l.medicineId === medId);
    expect(medInitialLogs.length).toBe(1);
    expect(medInitialLogs[0].scheduledTime).toBe('08:00');

    // Perform Update: change name, dosage, stock to 45, and reminderTimes to ['09:30', '21:00']
    await MedicineRepo.updateMedicine(
      medId,
      {
        name: 'Amlodipine Besylate Premium',
        dosage: '10mg',
        reminderTimes: ['09:30', '21:00'],
        stockCount: 45,
      },
      testUserId
    );

    // Verify medicine record updated in SQLite
    const updated = await MedicineRepo.getMedicineById(medId, testUserId);
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Amlodipine Besylate Premium');
    expect(updated?.dosage).toBe('10mg');
    expect(updated?.stockCount).toBe(45);
    expect(updated?.reminderTimes).toEqual(['09:30', '21:00']);

    // Synchronize pending logs for today (simulate PUT endpoint logic)
    const db = getDatabase();
    db.prepare(
      "DELETE FROM intake_logs WHERE medicine_id = ? AND date = ? AND status = 'pending' AND user_id = ?"
    ).run(medId, todayStr, testUserId);
    await LogRepo.generateLogsForDate(todayStr, testUserId);

    // Verify today's schedule now reflects the updated reminderTimes and medicine name
    const refreshedLogs = await LogRepo.getLogsByDate(todayStr, testUserId);
    const refreshedMedLogs = refreshedLogs.filter((l) => l.medicineId === medId);
    expect(refreshedMedLogs.length).toBe(2);
    expect(refreshedMedLogs.map((l) => l.scheduledTime).sort()).toEqual(['09:30', '21:00']);
    expect(refreshedMedLogs[0].name).toBe('Amlodipine Besylate Premium');
    expect(refreshedMedLogs[0].dosage).toBe('10mg');
    expect(refreshedMedLogs[0].stockCount).toBe(45);
  });

  it('Delete: removes medication and cascades deletion of intake logs', async () => {
    const medId = await MedicineRepo.addMedicine({
      userId: testUserId,
      name: 'Temporary Pill',
      dosage: '25mg',
      reminderTimes: ['12:00'],
      daysOfWeek: ['ALL'],
      stockCount: 15,
    });

    const todayStr = getLocalDateString();
    await LogRepo.generateLogsForDate(todayStr, testUserId);

    const logsBefore = await LogRepo.getLogsByDate(todayStr, testUserId);
    expect(logsBefore.some((l) => l.medicineId === medId)).toBe(true);

    // Delete medicine
    await MedicineRepo.deleteMedicine(medId, testUserId);

    // Verify medicine is deleted
    const deletedMed = await MedicineRepo.getMedicineById(medId, testUserId);
    expect(deletedMed).toBeNull();

    // Verify intake logs for this medicine are deleted
    const logsAfter = await LogRepo.getLogsByDate(todayStr, testUserId);
    expect(logsAfter.some((l) => l.medicineId === medId)).toBe(false);
  });
});
