import { getDatabase } from './db.js';

export interface CaregiverProfile {
  name: string;
  email: string;
  phone?: string;
}

export function parseCaregiverName(email?: string): string {
  if (!email || !email.trim()) return 'Family Caregiver';
  const prefix = email.split('@')[0].trim();
  if (!prefix) return 'Family Caregiver';

  const words = prefix.replace(/[._-]+/g, ' ').split(' ').filter(Boolean);
  if (words.length === 0) return 'Family Caregiver';

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

let cachedProfile: CaregiverProfile = {
  name: 'Sarah Connor (Daughter)',
  email: 'sarah.c@carebridge.health',
  phone: process.env.CAREGIVER_PHONE || '+1 (555) 0199',
};

export const CaregiverRepo = {
  getCaregiverSync(): CaregiverProfile {
    return cachedProfile;
  },

  async getCaregiver(): Promise<CaregiverProfile> {
    try {
      const db = getDatabase();
      const row = db.prepare('SELECT * FROM caregiver_profile WHERE id = ?').get('primary') as any;

      if (row && row.name) {
        cachedProfile = {
          name: row.name,
          email: row.email || 'sarah.c@carebridge.health',
          phone: row.phone || process.env.CAREGIVER_PHONE || '+1 (555) 0199',
        };
      }
    } catch (e) {
      // Safe fallback
    }
    return cachedProfile;
  },

  async saveCaregiver(email?: string, customName?: string): Promise<CaregiverProfile> {
    const formattedEmail = email && email.trim() ? email.trim() : 'sarah.c@carebridge.health';
    const computedName = customName && customName.trim()
      ? customName.trim()
      : parseCaregiverName(email);

    cachedProfile = {
      name: computedName,
      email: formattedEmail,
    };

    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO caregiver_profile (id, name, email, updated_at)
        VALUES ('primary', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          updated_at = excluded.updated_at
      `).run(computedName, formattedEmail, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to persist caregiver profile:', e);
    }

    return cachedProfile;
  },
};