// backend-mcp/src/types/index.ts

export type LogStatus = 'pending' | 'taken' | 'skipped';

export interface UserRecord {
  id: string;
  email: string;
  pin?: string | null;
  role: 'caregiver' | 'senior';
  is_pro: number;
  is_demo: number;
  created_at: string;
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

export interface DailyLogItem {
  logId: string;
  userId?: string;
  medicineId: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  date: string;
  status: LogStatus;
  isTaken: boolean;
  takenAt?: string;
  notes?: string;
  imageUri?: string;
  stockCount?: number;
  type?: 'medication' | 'routine';
}

export interface VitalsRecord {
  userId?: string;
  date: string;
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  updatedAt: string;
}

export interface CaregiverProfile {
  name: string;
  email: string;
  phone?: string;
}

export type GuardianPersonaId =
  | 'nurse_betty'
  | 'dr_reynolds'
  | 'grandson_leo'
  | 'sergeant_miller';

export interface GuardianPersona {
  id: GuardianPersonaId;
  displayName: string;
  roleTitle: string;
  avatarIcon: string;
  voiceTone: string;
  accentColor: string;
  themeColor: string;
  description: string;
}

export type EscalationLevel = 'MILD' | 'FIRM' | 'SARAH_CIRCUIT_BREAKER';

export interface GuardianNegotiationCard {
  type: 'GuardianNegotiation';
  guardianName: string;
  roleTitle?: string;
  quote: string;
  avatar: string;
  turnCount: number;
  callSarahAction: boolean;
  medicineName: string;
  escalationLevel: EscalationLevel;
  sarahPhone?: string;
  alertMessageId?: string;
  snsMessageId?: string;
}

export interface NegotiateAdherenceArgs {
  medicineName: string;
  refusalReason?: string;
  personaId?: GuardianPersonaId;
  turnCount?: number;
}

export interface NegotiateAdherenceResult {
  success: boolean;
  persona: GuardianPersona;
  speechResponse: string;
  escalationLevel: EscalationLevel;
  sarahNotified: boolean;
  alertMessageId?: string;
  snsMessageId?: string;
  richCard: GuardianNegotiationCard;
}