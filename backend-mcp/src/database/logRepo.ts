import { getDatabase } from './db.js';
import { MedicineRepo } from './medicineRepo.js';

export type LogStatus = 'pending' | 'taken' | 'skipped';

export interface DailyLogItem {
  logId: string;
  userId?: string;
  medicineId: string;
  name: string;
  dosage: string;
  scheduledTime: string; // "08:00"
  date: string;          // YYYY-MM-DD
  status: LogStatus;
  isTaken: boolean;
  takenAt?: string;
  notes?: string;
  imageUri?: string;
  stockCount?: number;
  type?: 'medication' | 'routine';
}

const DAY_MAP: Record<number, string> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

export const LogRepo = {
  /**
   * Scan medication schedule and automatically generate intake logs for dateStr if not already present
   */
  async generateLogsForDate(dateStr: string, userId?: string): Promise<void> {
    const db = getDatabase();
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayCode = DAY_MAP[targetDate.getDay()];

    const allMeds = await MedicineRepo.getAllMedicines(userId);
    if (allMeds.length === 0) return;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO intake_logs (id, user_id, medicine_id, date, time, status, taken_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)
    `);

    const insertBatch = db.transaction(() => {
      for (const med of allMeds) {
        const medStartDate = med.createdAt.split('T')[0];
        if (dateStr < medStartDate) {
          continue;
        }

        const isScheduledToday =
          med.daysOfWeek.includes('ALL') ||
          med.daysOfWeek.includes(dayCode);

        if (isScheduledToday) {
          for (const time of med.reminderTimes) {
            const effectiveUserId = userId || med.userId || 'usr_demo';
            const logId = `log_${effectiveUserId}_${dateStr}_${med.id}_${time.replace(':', '')}`;
            const now = new Date().toISOString();
            insertStmt.run(logId, effectiveUserId, med.id, dateStr, time, now);
          }
        }
      }
    });

    insertBatch();
  },

  /**
   * Retrieve detailed intake logs for a specific date joined with medication information
   */
  async getLogsByDate(dateStr: string, userId?: string): Promise<DailyLogItem[]> {
    const db = getDatabase();
    await this.generateLogsForDate(dateStr, userId);

    const query = `
      SELECT 
        l.id as logId,
        l.user_id as userId,
        m.id as medicineId,
        m.name as name,
        m.dosage as dosage,
        m.image_uri as imageUri,
        COALESCE(m.stock_count, 30) as stockCount,
        COALESCE(m.type, 'medication') as type,
        l.time as scheduledTime,
        l.date as date,
        l.status as status,
        l.taken_at as takenAt,
        l.notes as notes
      FROM intake_logs l
      INNER JOIN medicines m ON l.medicine_id = m.id
      WHERE l.date = ? ${userId ? 'AND l.user_id = ?' : ''}
      ORDER BY l.time ASC, m.name ASC
    `;

    const rows = userId
      ? (db.prepare(query).all(dateStr, userId) as any[])
      : (db.prepare(query).all(dateStr) as any[]);

    return rows.map((r) => ({
      logId: r.logId,
      userId: r.userId,
      medicineId: r.medicineId,
      name: r.name,
      dosage: r.dosage,
      imageUri: r.imageUri || undefined,
      stockCount: r.stockCount ?? 30,
      type: (r.type as 'medication' | 'routine') || 'medication',
      scheduledTime: r.scheduledTime,
      date: r.date,
      status: r.status,
      isTaken: r.status === 'taken',
      takenAt: r.takenAt || undefined,
      notes: r.notes || undefined,
    }));
  },

  /**
   * Toggle intake status when clicking "I Took My Pill" button
   */
  async toggleLogStatus(logId: string, currentStatus: LogStatus): Promise<void> {
    const db = getDatabase();

    // Find medicineId to increment or decrement inventory
    const log = db.prepare('SELECT medicine_id FROM intake_logs WHERE id = ?').get(logId) as any;

    if (currentStatus === 'taken') {
      db.prepare(`UPDATE intake_logs SET status = 'pending', taken_at = NULL WHERE id = ?`).run(logId);
      if (log) await MedicineRepo.updateStock(log.medicine_id, 1);
    } else {
      const now = new Date();
      const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      db.prepare(`UPDATE intake_logs SET status = 'taken', taken_at = ? WHERE id = ?`).run(timeFormatted, logId);
      if (log) await MedicineRepo.updateStock(log.medicine_id, -1);
    }
  },

  /**
   * Directly update dose status (used by Alexa MCP Tools)
   */
  async updateStatusDirect(logId: string, status: LogStatus, notes?: string): Promise<void> {
    const db = getDatabase();
    const now = new Date();
    const timeFormatted = status === 'taken' 
      ? `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}` 
      : null;

    db.prepare(`
      UPDATE intake_logs 
      SET status = ?, taken_at = ?, notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(status, timeFormatted, notes || null, logId);

    const log = db.prepare('SELECT medicine_id FROM intake_logs WHERE id = ?').get(logId) as any;
    if (log && status === 'taken') {
      await MedicineRepo.updateStock(log.medicine_id, -1);
    }
  },

  async getAllLogs(userId?: string): Promise<DailyLogItem[]> {
    const db = getDatabase();
    const query = `
      SELECT 
        l.id as logId,
        l.user_id as userId,
        m.id as medicineId,
        m.name as name,
        m.dosage as dosage,
        m.image_uri as imageUri,
        COALESCE(m.stock_count, 30) as stockCount,
        l.time as scheduledTime,
        l.date as date,
        l.status as status,
        l.taken_at as takenAt,
        l.notes as notes
      FROM intake_logs l
      INNER JOIN medicines m ON l.medicine_id = m.id
      ${userId ? 'WHERE l.user_id = ?' : ''}
      ORDER BY l.date DESC, l.time ASC
    `;

    const rows = userId
      ? (db.prepare(query).all(userId) as any[])
      : (db.prepare(query).all() as any[]);

    return rows.map((r) => ({
      logId: r.logId,
      userId: r.userId,
      medicineId: r.medicineId,
      name: r.name,
      dosage: r.dosage,
      imageUri: r.imageUri || undefined,
      stockCount: r.stockCount ?? 30,
      scheduledTime: r.scheduledTime,
      date: r.date,
      status: r.status,
      isTaken: r.status === 'taken',
      takenAt: r.takenAt || undefined,
      notes: r.notes || undefined,
    }));
  },

  async updateLogNotes(logId: string, notes: string): Promise<void> {
    const db = getDatabase();
    db.prepare(`UPDATE intake_logs SET notes = ? WHERE id = ?`).run(notes.trim(), logId);
  },
};