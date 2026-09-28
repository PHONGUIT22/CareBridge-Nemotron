import { getDatabase } from './db.js';

export interface MedicineInput {
  id?: string;
  userId?: string;
  name: string;
  dosage: string;
  reminderTimes: string[]; // e.g. ["08:00", "12:00", "20:00"]
  daysOfWeek: string[];    // e.g. ["MON", "WED", "FRI"] or ["ALL"]
  imageUri?: string | null;
  stockCount?: number;
  type?: 'medication' | 'routine';
  createdAt?: string;
}

export interface MedicineRecord {
  id: string;
  userId?: string;
  name: string;
  dosage: string;
  reminderTimes: string[];
  daysOfWeek: string[];
  stockCount: number;
  imageUri?: string;
  type?: 'medication' | 'routine';
  createdAt: string;
}

export const MedicineRepo = {
  async addMedicine(input: MedicineInput): Promise<string> {
    const db = getDatabase();
    const id = input.id || `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = input.createdAt || new Date().toISOString();
    const userId = input.userId || 'usr_demo';

    const stmt = db.prepare(`
      INSERT INTO medicines (id, user_id, name, dosage, reminder_times, days_of_week, image_uri, stock_count, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      input.name.trim(),
      input.dosage.trim(),
      JSON.stringify(input.reminderTimes),
      JSON.stringify(input.daysOfWeek),
      input.imageUri || null,
      input.stockCount ?? 30,
      input.type || 'medication',
      createdAt
    );

    return id;
  },

  async updateMedicine(id: string, input: Partial<MedicineInput>, userId?: string): Promise<void> {
    const db = getDatabase();
    const reminderTimesJson = input.reminderTimes ? JSON.stringify(input.reminderTimes) : null;
    const daysOfWeekJson = input.daysOfWeek ? JSON.stringify(input.daysOfWeek) : null;
    const stockCountVal = input.stockCount !== undefined ? input.stockCount : null;

    if (userId) {
      const stmt = db.prepare(`
        UPDATE medicines 
        SET 
          name = COALESCE(?, name),
          dosage = COALESCE(?, dosage),
          reminder_times = COALESCE(?, reminder_times),
          days_of_week = COALESCE(?, days_of_week),
          image_uri = COALESCE(?, image_uri),
          stock_count = COALESCE(?, stock_count),
          type = COALESCE(?, type)
        WHERE id = ? AND user_id = ?
      `);
      stmt.run(
        input.name ? input.name.trim() : null,
        input.dosage ? input.dosage.trim() : null,
        reminderTimesJson,
        daysOfWeekJson,
        input.imageUri !== undefined ? input.imageUri : null,
        stockCountVal,
        input.type || null,
        id,
        userId
      );
    } else {
      const stmt = db.prepare(`
        UPDATE medicines 
        SET 
          name = COALESCE(?, name),
          dosage = COALESCE(?, dosage),
          reminder_times = COALESCE(?, reminder_times),
          days_of_week = COALESCE(?, days_of_week),
          image_uri = COALESCE(?, image_uri),
          stock_count = COALESCE(?, stock_count),
          type = COALESCE(?, type)
        WHERE id = ?
      `);
      stmt.run(
        input.name ? input.name.trim() : null,
        input.dosage ? input.dosage.trim() : null,
        reminderTimesJson,
        daysOfWeekJson,
        input.imageUri !== undefined ? input.imageUri : null,
        stockCountVal,
        input.type || null,
        id
      );
    }
  },

  /**
   * Update medication stock inventory (+1 on undo/pending, -1 on taken)
   */
  async updateStock(medicineId: string, delta: number): Promise<number> {
    const db = getDatabase();
    const updateStmt = db.prepare(`
      UPDATE medicines 
      SET stock_count = MAX(0, COALESCE(stock_count, 30) + ?) 
      WHERE id = ?
    `);
    updateStmt.run(delta, medicineId);

    const selectStmt = db.prepare('SELECT stock_count FROM medicines WHERE id = ?');
    const row = selectStmt.get(medicineId) as { stock_count: number } | undefined;
    return row?.stock_count ?? 0;
  },

  async refillMedicine(medicineId: string, refillAmount: number = 30): Promise<void> {
    const db = getDatabase();
    db.prepare(`
      UPDATE medicines 
      SET stock_count = COALESCE(stock_count, 0) + ? 
      WHERE id = ?
    `).run(refillAmount, medicineId);
  },

  async getAllMedicines(userId?: string): Promise<MedicineRecord[]> {
    const db = getDatabase();
    let rows: any[];
    if (userId) {
      const stmt = db.prepare('SELECT * FROM medicines WHERE user_id = ? ORDER BY created_at DESC');
      rows = stmt.all(userId) as any[];
    } else {
      const stmt = db.prepare('SELECT * FROM medicines ORDER BY created_at DESC');
      rows = stmt.all() as any[];
    }

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      dosage: row.dosage,
      reminderTimes: JSON.parse(row.reminder_times || '[]'),
      daysOfWeek: JSON.parse(row.days_of_week || '[]'),
      imageUri: row.image_uri || undefined,
      stockCount: row.stock_count ?? 30,
      type: (row.type as 'medication' | 'routine') || 'medication',
      createdAt: row.created_at,
    }));
  },

  async getMedicineById(id: string, userId?: string): Promise<MedicineRecord | null> {
    const db = getDatabase();
    const row = userId
      ? (db.prepare('SELECT * FROM medicines WHERE id = ? AND user_id = ?').get(id, userId) as any)
      : (db.prepare('SELECT * FROM medicines WHERE id = ?').get(id) as any);
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      dosage: row.dosage,
      reminderTimes: JSON.parse(row.reminder_times || '[]'),
      daysOfWeek: JSON.parse(row.days_of_week || '[]'),
      imageUri: row.image_uri || undefined,
      stockCount: row.stock_count ?? 30,
      type: row.type || 'medication',
      createdAt: row.created_at,
    };
  },

  async deleteMedicine(id: string, userId?: string): Promise<void> {
    const db = getDatabase();
    const deleteTx = db.transaction(() => {
      if (userId) {
        db.prepare('DELETE FROM intake_logs WHERE medicine_id = ? AND user_id = ?').run(id, userId);
        db.prepare('DELETE FROM medicines WHERE id = ? AND user_id = ?').run(id, userId);
      } else {
        db.prepare('DELETE FROM intake_logs WHERE medicine_id = ?').run(id);
        db.prepare('DELETE FROM medicines WHERE id = ?').run(id);
      }
    });
    deleteTx();
  },

  async findByName(query: string, userId?: string): Promise<MedicineRecord | null> {
    const all = await this.getAllMedicines(userId);
    const q = query.toLowerCase().trim();
    return (
      all.find(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          q.includes(m.name.toLowerCase().split(' ')[0])
      ) || null
    );
  },
};