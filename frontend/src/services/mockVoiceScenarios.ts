export interface MockVoiceScenario {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  description: string;
  targetTool: 'getTodaySchedule' | 'logDoseStatus' | 'orderRefill' | 'ringDeviceHub' | 'clinicalAdvisor';
  actionIcon: string;
  accentColor: string;
}

/**
 * Pre-built, clinically realistic demonstration scenarios
 * for zero-speech, dual-turn multimodal video recording.
 */
export const MOCK_VOICE_SCENARIOS: MockVoiceScenario[] = [
  {
    id: 'schedule',
    title: 'Daily Schedule',
    badge: 'getTodaySchedule',
    prompt: "What's my medicine schedule today?",
    description: "Queries upcoming daily doses, adherence percentage, and active prescriptions.",
    targetTool: 'getTodaySchedule',
    actionIcon: '📅',
    accentColor: '#1E3A8A', // Royal Navy
  },
  {
    id: 'dose_confirm',
    title: 'Dose Confirmation',
    badge: 'logDoseStatus',
    prompt: 'I just took my morning Amlodipine pill with breakfast.',
    description: 'Confirms morning intake, decrements stock, and triggers compliance reward.',
    targetTool: 'logDoseStatus',
    actionIcon: '💊',
    accentColor: '#10B981', // Emerald
  },
  {
    id: 'pharmacy_refill',
    title: 'Prescription Refill Order',
    badge: 'orderRefill',
    prompt: 'I only have 3 Lipitor pills left. Please order a refill.',
    description: 'Autonomous 1-click refill via Smart Pharmacy Hub with Order ID and Express 2-Day delivery.',
    targetTool: 'orderRefill',
    actionIcon: '📦',
    accentColor: '#10B981', // Emerald
  },
  {
    id: 'ring_porch',
    title: 'Front Porch Smart Camera',
    badge: 'ringDeviceHub',
    prompt: 'Check front porch camera for package delivery.',
    description: 'Opens live night-vision camera feed with green CV package tracking bounding box.',
    targetTool: 'ringDeviceHub',
    actionIcon: '📹',
    accentColor: '#0D9488', // Teal
  },
  {
    id: 'emergency_alert',
    title: 'Emergency Triage & Paramedic',
    badge: 'clinicalAdvisor',
    prompt: 'I have severe crushing chest pain and shortness of breath!',
    description: 'Triggers acute triage, dispatches emergency SMS alert to Sarah, and unlocks door for paramedics.',
    targetTool: 'clinicalAdvisor',
    actionIcon: '🚨',
    accentColor: '#DC2626', // Crimson Red
  },
];
