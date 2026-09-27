import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Retrieve current directory path following ES Module standards
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Place SQLite database file in backend-mcp/data directory
const DB_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'carebridge.db');

let dbInstance: DatabaseType | null = null;

/**
 * Initialize Database and Migrate Schema
 */
export function initDB(): DatabaseType {
  if (dbInstance) return dbInstance;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Initialize better-sqlite3 connection
  dbInstance = new Database(DB_PATH, {
    // verbose: console.log, // Enable for detailed SQL query logging
  });

  // Enable WAL mode and foreign key constraints
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL'); // Optimize disk write safety for WAL

  // Create core database tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT UNIQUE NOT NULL,
      pin TEXT,
      role TEXT DEFAULT 'caregiver',
      is_pro INTEGER DEFAULT 0,
      is_demo INTEGER DEFAULT 0,
      caregiver_name TEXT,
      patient_name TEXT,
      patient_age INTEGER,
      is_onboarded INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      reminder_times TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      image_uri TEXT,
      stock_count INTEGER DEFAULT 30,
      type TEXT DEFAULT 'medication',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS intake_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      medicine_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'taken', 'skipped')),
      taken_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_vitals (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      systolic INTEGER,
      diastolic INTEGER,
      blood_sugar REAL,
      heart_rate INTEGER,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS caregiver_profile (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Defensive migration: ensure newer columns exist safely
  migrateTableSafely('users', 'caregiver_name', 'TEXT');
  migrateTableSafely('users', 'patient_name', 'TEXT');
  migrateTableSafely('users', 'patient_age', 'INTEGER');
  migrateTableSafely('users', 'is_onboarded', 'INTEGER DEFAULT 0');

  // Ensure default demo user exists in users table for existing records
  dbInstance.prepare(`
    INSERT OR IGNORE INTO users (id, email, pin, role, is_pro, is_demo, caregiver_name, patient_name, patient_age, is_onboarded, created_at)
    VALUES ('usr_demo', 'demo@gmail.com', '1234', 'caregiver', 1, 1, 'Sarah Connor', 'Eleanor Vance', 78, 1, ?)
  `).run(new Date().toISOString());

  // Ensure demo user has predefined profile populated
  try {
    dbInstance.exec(`
      UPDATE users 
      SET caregiver_name = 'Sarah Connor', 
          patient_name = 'Eleanor Vance', 
          patient_age = 78, 
          is_onboarded = 1 
      WHERE id = 'usr_demo' OR email = 'demo@gmail.com';
    `);
  } catch (err) {
    // Ignore update error if table is still migrating
  }

  migrateTableSafely('medicines', 'user_id', 'TEXT REFERENCES users(id) ON DELETE CASCADE');
  migrateTableSafely('medicines', 'image_uri', 'TEXT');
  migrateTableSafely('medicines', 'stock_count', 'INTEGER DEFAULT 30');
  migrateTableSafely('medicines', 'type', "TEXT DEFAULT 'medication'");
  migrateTableSafely('intake_logs', 'user_id', 'TEXT REFERENCES users(id) ON DELETE CASCADE');
  migrateTableSafely('intake_logs', 'notes', 'TEXT');

  // Migrate daily_vitals safely if it previously had date as sole primary key
  const vitalsInfo = dbInstance.pragma('table_info(daily_vitals)') as Array<{ name: string; pk: number }>;
  const hasVitalsUserId = vitalsInfo.some((col) => col.name === 'user_id');
  const isOnlyDatePk = vitalsInfo.length > 0 && vitalsInfo.some((col) => col.name === 'date' && col.pk === 1) && !vitalsInfo.some((col) => col.name === 'user_id' && col.pk > 0);
  if (isOnlyDatePk) {
    const userIdColExpr = hasVitalsUserId ? "COALESCE(user_id, 'usr_demo')" : "'usr_demo'";
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS daily_vitals_new (
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        systolic INTEGER,
        diastolic INTEGER,
        blood_sugar REAL,
        heart_rate INTEGER,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      INSERT OR IGNORE INTO daily_vitals_new (user_id, date, systolic, diastolic, blood_sugar, heart_rate, updated_at)
      SELECT ${userIdColExpr}, date, systolic, diastolic, blood_sugar, heart_rate, updated_at FROM daily_vitals;
      DROP TABLE daily_vitals;
      ALTER TABLE daily_vitals_new RENAME TO daily_vitals;
    `);
  } else if (!hasVitalsUserId) {
    migrateTableSafely('daily_vitals', 'user_id', 'TEXT REFERENCES users(id) ON DELETE CASCADE');
  }

  // Backfill existing records without user_id to demo user
  try {
    dbInstance.exec(`
      UPDATE medicines SET user_id = 'usr_demo' WHERE user_id IS NULL;
      UPDATE intake_logs SET user_id = 'usr_demo' WHERE user_id IS NULL;
      UPDATE daily_vitals SET user_id = 'usr_demo' WHERE user_id IS NULL;
    `);
  } catch (err) {
    // Ignore if column doesn't exist yet
  }

  // Optimize indexes for multi-user schedule queries and adherence heatmaps
  dbInstance.exec(`
    CREATE INDEX IF NOT EXISTS idx_log_date ON intake_logs(date);
    CREATE INDEX IF NOT EXISTS idx_log_user_date ON intake_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_medicines_user ON medicines(user_id);
    CREATE INDEX IF NOT EXISTS idx_vitals_user_date ON daily_vitals(user_id, date);
  `);

  console.log(`[SQLite] Database successfully connected at: ${DB_PATH}`);
  return dbInstance;
}

/**
 * Defensive schema migration helper to add missing columns to existing tables
 */
function migrateTableSafely(table: string, column: string, columnDef: string) {
  if (!dbInstance) return;
  const tableInfo = dbInstance.pragma(`table_info(${table})`) as Array<{ name: string }>;
  const hasColumn = tableInfo.some((col) => col.name === column);

  if (!hasColumn) {
    try {
      dbInstance.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnDef};`);
    } catch (err) {
      // Column exists or duplicate error ignored
    }
  }
}

/**
 * Singleton Getter for repositories to share database connection
 */
export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Gracefully close database connection on process shutdown
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[SQLite] Database connection closed safely.');
  }
}

// Listen to process exit signals for clean shutdown to prevent database corruption
process.on('exit', () => closeDB());
process.on('SIGINT', () => {
  closeDB();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDB();
  process.exit(0);
});