export interface MockVoiceScenario {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  description: string;
  targetTool:
    | 'getTodaySchedule'
    | 'logDoseStatus'
    | 'orderRefill'
    | 'ringDeviceHub'
    | 'clinicalAdvisor'
    | 'negotiateAdherence'
    | 'recordVitals'
    | 'checkInteraction';
  actionIcon: string;
  accentColor: string;
}

/**
 * Pre-built, clinically realistic demonstration scenarios
 * for zero-speech, dual-turn multimodal video recording.
 * Covering 100% of CareBridge MCP Action Tools and Tavily Live Drug Verification.
 */
export const MOCK_VOICE_SCENARIOS: MockVoiceScenario[] = [
  {
    id: 'schedule',
    title: 'Daily Schedule',
    badge: 'getTodaySchedule',
    prompt: "What's my medicine schedule today?",
    description: 'Queries upcoming daily doses, adherence percentage, and active prescriptions.',
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
  {
    id: 'guardian_refusal',
    title: 'Medication Refusal (Sarah Circuit-Breaker)',
    badge: 'negotiateAdherence',
    prompt: 'I refuse to take my Amlodipine pills today, leave me alone!',
    description: 'Triggers psychological persuasion by AI Health Guardian (Grandson Leo persona) and escalates Sarah Connor emergency alert when patient intentionally refuses.',
    targetTool: 'negotiateAdherence',
    actionIcon: '🛡️',
    accentColor: '#F59E0B', // Amber
  },
  {
    id: 'tavily_drug_check',
    title: 'Tavily Live Drug Verification',
    badge: 'clinicalAdvisor',
    prompt: 'Can I take Warfarin with my daily Baby Aspirin?',
    description: 'Queries gastrointestinal bleeding interaction risk, cross-references Beers Criteria, and pulls real-time FDA evidence from Tavily Search API.',
    targetTool: 'clinicalAdvisor',
    actionIcon: '🔍',
    accentColor: '#4F46E5', // Indigo
  },
  {
    id: 'vitals_logging',
    title: 'Voice Vitals Intake',
    badge: 'recordVitals',
    prompt: 'My blood pressure this morning is 125 over 82 and pulse is 72.',
    description: 'Recognizes vital signs via voice and atomically commits measurements to daily_vitals SQLite WAL.',
    targetTool: 'recordVitals',
    actionIcon: '💓',
    accentColor: '#0EA5E9', // Sky Blue
  },
];
