export type LogStatus = 'pending' | 'taken' | 'skipped';

export interface AuthSession {
  userId?: string;
  isAuthenticated: boolean;
  user: string;
  email?: string;
  role: 'senior' | 'caregiver';
  isPro: boolean;
  isDemo?: boolean;
  isOnboarded?: boolean;
  caregiverName?: string;
  patientName?: string;
  patientAge?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'senior' | 'caregiver';
  isPro: boolean;
  isDemo: boolean;
  name?: string;
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

export interface VitalRecord {
  userId?: string;
  date: string;
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  updatedAt?: string;
}

export type VitalsRecord = VitalRecord;

export interface CaregiverProfile {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  notificationPreferences?: {
    smsOnMissedDose?: boolean;
    smsOnDizziness?: boolean;
    dailyDigest?: boolean;
  };
}

export interface TodayDataResponse {
  success: boolean;
  date: string;
  adherenceRate: number;
  schedule: DailyLogItem[];
  vitals: VitalRecord | null;
  caregiver: CaregiverProfile | null;
  caregiverName?: string;
  patientName?: string;
  patientAge?: number;
  error?: string;
}

export interface HistoryDataResponse {
  success: boolean;
  logs: DailyLogItem[];
  vitals: VitalRecord[];
  error?: string;
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

export interface MedicinesResponse {
  success: boolean;
  medicines: MedicineRecord[];
  error?: string;
}

export interface DoseActionResponse {
  success: boolean;
  logId?: string;
  medicineName?: string;
  newStatus?: LogStatus;
  notes?: string | null;
  speechText?: string;
  message?: string;
  remainingStock?: number | null;
  lowStockAlert?: {
    medicineName: string;
    remainingStock: number;
    price: string;
    refillSuggested: boolean;
    suggestedAction: string;
  } | null;
  error?: string;
}

export interface SMSDispatchInfo {
  delivered: boolean;
  recipient: string;
  phone: string;
  timestamp: string;
  messageId: string;
  simulated?: boolean;
}

export interface ClinicalAdviceResponse {
  success: boolean;
  query?: string;
  assessment?: string;
  speechResponse: string;
  actionAdvice?: string;
  clinicalExplanation?: string;
  displayCardTitle?: string;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  recommendedAction?: string;
  smsDispatch?: SMSDispatchInfo | null;
  richCard?: {
    type?: string;
    title: string;
    actionAdvice: string;
    advice?: string;
    clinicalExplanation?: string;
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    recommendedAction?: string;
    smsDispatch?: SMSDispatchInfo;
  };
  bedrockModelUsed?: string;
  error?: string;
}

export interface AmazonRefillOrder {
  success: boolean;
  orderId: string;
  medicineName: string;
  dosage: string;
  quantityAdded: number;
  previousStock: number;
  newStockCount: number;
  estimatedDelivery: string;
  totalPrice: string;
  pharmacyName: string;
  shippingMethod: string;
  speechText: string;
  richCard?: {
    type: string;
    orderId: string;
    medicineName: string;
    dosage: string;
    quantity: number;
    totalPrice: string;
    estimatedDelivery: string;
    shippingMethod: string;
    pharmacyName: string;
    newStockCount: number;
  };
  error?: string;
}

export interface AgentTurnResponse {
  success: boolean;
  toolName: string | null;
  toolArgs: Record<string, any> | null;
  toolResult: any | null;
  speechResponse: string;
  offlineFallbackUsed?: boolean;
  error?: string;
}

export interface RingDeviceHubResult {
  success: boolean;
  action: 'checkFrontPorch' | 'triggerEmergencyDoorUnlock' | 'getDeviceStatus';
  cameraName: string;
  timestamp: string;
  doorLockStatus: 'LOCKED' | 'UNLOCKED FOR PARAMEDICS';
  motionDetected?: boolean;
  packageDetected?: boolean;
  packageDetails?: {
    carrier: string;
    description: string;
    deliveryTime: string;
    orderId?: string;
  };
  emergencyReason?: string;
  speechText: string;
  richCard?: {
    type: 'RingDoorbellFeed';
    cameraName: string;
    mode: 'delivery' | 'emergency' | 'live';
    doorLockStatus: string;
    packageDetected: boolean;
    packageDetails?: {
      carrier: string;
      description: string;
      deliveryTime: string;
      orderId?: string;
    };
    emergencyReason?: string;
    timestamp: string;
  };
}

export type InteractionSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE';

export interface DrugInteractionWarning {
  severity: InteractionSeverity;
  drugA: string;
  drugB: string;
  conflictingMedName: string;
  title: string;
  mechanism: string;
  clinicalRisk: string;
  recommendation: string;
}

export interface DrugInteractionCheckResult {
  success: boolean;
  hasInteraction: boolean;
  newDrug: string;
  activeMedsChecked: string[];
  warnings: DrugInteractionWarning[];
  error?: string;
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

export interface GuardianNegotiationCardData {
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
  snsMessageId?: string;
}

export interface GuardianNegotiationResult {
  success: boolean;
  persona: GuardianPersona;
  speechResponse: string;
  escalationLevel: EscalationLevel;
  sarahNotified: boolean;
  snsMessageId?: string;
  richCard: GuardianNegotiationCardData;
  error?: string;
}

