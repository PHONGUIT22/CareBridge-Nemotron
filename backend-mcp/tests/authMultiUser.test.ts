import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDB, getDatabase } from '../src/database/db.js';
import { seedDemoData } from '../src/database/seedDemoData.js';
import { MedicineRepo } from '../src/database/medicineRepo.js';
import { LogRepo } from '../src/database/logRepo.js';
import { VitalsRepo } from '../src/database/vitalsRepo.js';
import { getLocalDateString } from '../src/utils/dateUtils.js';

describe('Task 1: Multi-User Isolation & Demo Seeding Specification', () => {
  beforeAll(async () => {
    initDB();
  });

  it('Schema Migration: users table exists with required columns and constraints', () => {
    const db = getDatabase();
    const columns = db.pragma('table_info(users)') as Array<{ name: string; type: string; notnull: number }>;
    const colNames = columns.map((c) => c.name);

    expect(colNames).toContain('id');
    expect(colNames).toContain('email');
    expect(colNames).toContain('pin');
    expect(colNames).toContain('role');
    expect(colNames).toContain('is_pro');
    expect(colNames).toContain('is_demo');
    expect(colNames).toContain('created_at');
  });

  it('Schema Migration: medicines, intake_logs, and daily_vitals have user_id columns', () => {
    const db = getDatabase();
    const medCols = (db.pragma('table_info(medicines)') as Array<{ name: string }>).map((c) => c.name);
    const logCols = (db.pragma('table_info(intake_logs)') as Array<{ name: string }>).map((c) => c.name);
    const vitalsCols = (db.pragma('table_info(daily_vitals)') as Array<{ name: string }>).map((c) => c.name);

    expect(medCols).toContain('user_id');
    expect(logCols).toContain('user_id');
    expect(vitalsCols).toContain('user_id');
  });

  it('Demo Account: seedDemoData only seeds for demo user and creates 4 medications', async () => {
    const demoUserId = 'usr_demo';
    await seedDemoData(demoUserId, true);

    const demoMeds = await MedicineRepo.getAllMedicines(demoUserId);
    expect(demoMeds.length).toBe(4);

    const todayStr = getLocalDateString();
    const demoLogs = await LogRepo.getLogsByDate(todayStr, demoUserId);
    expect(demoLogs.length).toBeGreaterThan(0);
    demoLogs.forEach((l) => {
      expect(l.userId).toBe(demoUserId);
    });
  });

  it('Normal Account: newly created account has completely empty database (0 medicines, 0 logs)', async () => {
    const normalUserId = `usr_test_normal_${Date.now()}`;
    const db = getDatabase();

    // Create a new normal user with is_demo = 0, is_pro = 0
    db.prepare(`
      INSERT INTO users (id, email, pin, role, is_pro, is_demo, created_at)
      VALUES (?, ?, ?, 'caregiver', 0, 0, ?)
    `).run(normalUserId, `normal_${Date.now()}@gmail.com`, '9999', new Date().toISOString());

    // Verify user row
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(normalUserId) as any;
    expect(user.is_demo).toBe(0);
    expect(user.is_pro).toBe(0);

    // Verify database is completely clean for this normal user
    const meds = await MedicineRepo.getAllMedicines(normalUserId);
    expect(meds.length).toBe(0);

    const todayStr = getLocalDateString();
    const logs = await LogRepo.getLogsByDate(todayStr, normalUserId);
    expect(logs.length).toBe(0);

    const vitals = await VitalsRepo.getVitalsByDate(todayStr, normalUserId);
    expect(vitals).toBeNull();
  });

  it('Data Isolation: User A cannot see User B medications or vitals', async () => {
    const db = getDatabase();
    const userA = `usr_a_${Date.now()}`;
    const userB = `usr_b_${Date.now()}`;

    // Register userA and userB in users table
    db.prepare(`
      INSERT INTO users (id, email, pin, role, is_pro, is_demo, created_at)
      VALUES (?, ?, ?, 'caregiver', 0, 0, ?)
    `).run(userA, `user_a_${Date.now()}@test.com`, '1111', new Date().toISOString());

    db.prepare(`
      INSERT INTO users (id, email, pin, role, is_pro, is_demo, created_at)
      VALUES (?, ?, ?, 'caregiver', 0, 0, ?)
    `).run(userB, `user_b_${Date.now()}@test.com`, '2222', new Date().toISOString());

    // User A adds medication
    const medAId = await MedicineRepo.addMedicine({
      userId: userA,
      name: 'User A Aspirin',
      dosage: '100mg',
      reminderTimes: ['09:00'],
      daysOfWeek: ['ALL'],
      stockCount: 50,
      type: 'medication',
    });

    // User B adds medication
    const medBId = await MedicineRepo.addMedicine({
      userId: userB,
      name: 'User B Insulin',
      dosage: '10 units',
      reminderTimes: ['19:00'],
      daysOfWeek: ['ALL'],
      stockCount: 10,
      type: 'medication',
    });

    // Verify User A only sees User A medication
    const medsA = await MedicineRepo.getAllMedicines(userA);
    expect(medsA.length).toBe(1);
    expect(medsA[0].id).toBe(medAId);
    expect(medsA[0].name).toBe('User A Aspirin');

    // Verify User B only sees User B medication
    const medsB = await MedicineRepo.getAllMedicines(userB);
    expect(medsB.length).toBe(1);
    expect(medsB[0].id).toBe(medBId);
    expect(medsB[0].name).toBe('User B Insulin');

    // User A saves vitals
    const todayStr = '2026-09-23';
    await VitalsRepo.saveVitals({
      userId: userA,
      date: todayStr,
      systolic: 120,
      diastolic: 80,
      heartRate: 70,
      updatedAt: new Date().toISOString(),
    });

    // User B saves vitals on same date with different values
    await VitalsRepo.saveVitals({
      userId: userB,
      date: todayStr,
      systolic: 145,
      diastolic: 95,
      heartRate: 88,
      updatedAt: new Date().toISOString(),
    });

    // User A vitals are preserved and distinct from User B
    const vitalsA = await VitalsRepo.getVitalsByDate(todayStr, userA);
    const vitalsB = await VitalsRepo.getVitalsByDate(todayStr, userB);

    expect(vitalsA).not.toBeNull();
    expect(vitalsB).not.toBeNull();
    expect(vitalsA?.systolic).toBe(120);
    expect(vitalsB?.systolic).toBe(145);
    expect(vitalsA?.heartRate).toBe(70);
    expect(vitalsB?.heartRate).toBe(88);
  });

  afterAll(() => {
    const db = getDatabase();
    db.prepare("DELETE FROM users WHERE id LIKE 'usr_test_normal_%' OR id LIKE 'usr_a_%' OR id LIKE 'usr_b_%'").run();
  });
});
