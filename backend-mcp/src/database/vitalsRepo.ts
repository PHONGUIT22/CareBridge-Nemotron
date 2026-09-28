import { getDatabase } from './db.js';

export interface VitalsRecord {
  userId?: string;
  date: string; // YYYY-MM-DD
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  updatedAt: string;
}

export const VitalsRepo = {
  async getVitalsByDate(dateStr: string, userId?: string): Promise<VitalsRecord | null> {
    const db = getDatabase();
    const query = userId
      ? 'SELECT * FROM daily_vitals WHERE date = ? AND user_id = ?'
      : 'SELECT * FROM daily_vitals WHERE date = ?';
    const row = (userId ? db.prepare(query).get(dateStr, userId) : db.prepare(query).get(dateStr)) as any;

    if (!row) return null;
    return {
      userId: row.user_id,
      date: row.date,
      systolic: row.systolic,
      diastolic: row.diastolic,
      bloodSugar: row.blood_sugar,
      heartRate: row.heart_rate,
      updatedAt: row.updated_at,
    };
  },

  async saveVitals(vitals: VitalsRecord): Promise<void> {
    const db = getDatabase();
    const effectiveUserId = vitals.userId || 'usr_demo';
    const stmt = db.prepare(`
      INSERT INTO daily_vitals (user_id, date, systolic, diastolic, blood_sugar, heart_rate, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        systolic = excluded.systolic,
        diastolic = excluded.diastolic,
        blood_sugar = excluded.blood_sugar,
        heart_rate = excluded.heart_rate,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      effectiveUserId,
      vitals.date,
      vitals.systolic ?? null,
      vitals.diastolic ?? null,
      vitals.bloodSugar ?? null,
      vitals.heartRate ?? null,
      vitals.updatedAt || new Date().toISOString()
    );
  },

  async getAllVitals(userId?: string): Promise<VitalsRecord[]> {
    const db = getDatabase();
    const query = userId
      ? 'SELECT * FROM daily_vitals WHERE user_id = ? ORDER BY date ASC'
      : 'SELECT * FROM daily_vitals ORDER BY date ASC';
    const rows = (userId ? db.prepare(query).all(userId) : db.prepare(query).all()) as any[];

    return rows.map((row) => ({
      userId: row.user_id,
      date: row.date,
      systolic: row.systolic,
      diastolic: row.diastolic,
      bloodSugar: row.blood_sugar,
      heartRate: row.heart_rate,
      updatedAt: row.updated_at,
    }));
  },
};