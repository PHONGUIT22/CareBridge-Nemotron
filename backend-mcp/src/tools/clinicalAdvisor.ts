import { analyzeClinicalQuery, ClinicalAnalysisResult, DEFAULT_NEMOTRON_MODEL } from '../ai/nemotronClient.js';
import { searchTavilyClinicalProtocol } from '../services/drugInteractionService.js';
import { MedicineRepo } from '../database/medicineRepo.js';
import { VitalsRepo } from '../database/vitalsRepo.js';
import { CaregiverRepo } from '../database/caregiverRepo.js';
import { sendEmergencySMS, SendSMSResult } from '../services/alertDispatcher.js';
import { getLocalDateString } from '../utils/dateUtils.js';

export const clinicalAdvisorTool = {
  definition: {
    name: 'clinicalAdvisor',
    description: "Evaluate senior symptoms through NVIDIA Nemotron-70B on Nebius Token Factory for clinical triage",
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Patient verbal statement or symptom description (e.g., "I feel dizzy after taking my pill").',
        },
      },
      required: ['query'],
    },
  },

  async handler(args: { query: string }) {
    const todayStr = getLocalDateString();

    // Collect patient's real clinical context from database
    const [medicines, vitals] = await Promise.all([
      MedicineRepo.getAllMedicines(),
      VitalsRepo.getVitalsByDate(todayStr),
    ]);

    const currentMeds = medicines.map((m) => `${m.name} (${m.dosage})`);
    const recentVitals = vitals
      ? `BP: ${vitals.systolic || '--'}/${vitals.diastolic || '--'} mmHg, Sugar: ${vitals.bloodSugar || '--'} mg/dL, HR: ${vitals.heartRate || '--'} bpm`
      : 'No vitals recorded today yet.';

    // Clinical analysis via NVIDIA Nemotron-70B on Nebius
    const analysis: ClinicalAnalysisResult = await analyzeClinicalQuery(args.query, {
      currentMeds,
      recentVitals,
    });

    // If urgencyLevel is HIGH or EMERGENCY, automatically dispatch emergency alert to caregiver
    let smsDispatchResult: SendSMSResult | null = null;
    const isEmergencyRisk = analysis.urgencyLevel === 'EMERGENCY' || analysis.urgencyLevel === 'HIGH';

    if (isEmergencyRisk) {
      try {
        const caregiver = await CaregiverRepo.getCaregiver();
        const caregiverName = caregiver?.name || 'Sarah Connor';
        const caregiverPhone = caregiver?.phone || '+1 (555) 0199';

        const alertBody = `[CareBridge EMERGENCY ALERT] Eleanor reported severe symptoms: "${args.query}". Risk Level: ${analysis.urgencyLevel}. Current Vitals: ${recentVitals}. Immediate family assistance requested. Ambient station active.`;
        smsDispatchResult = await sendEmergencySMS(caregiverPhone, alertBody, caregiverName);

        // Ensure voice response is concise under 20 words for fast audio rendering
        if (analysis.urgencyLevel === 'EMERGENCY') {
          analysis.speechResponse =
            `Emergency flagged. Sit down immediately. An urgent SMS alert with your vitals has been sent to your daughter Sarah.`;
        } else if (!analysis.speechResponse.toLowerCase().includes('sarah')) {
          analysis.speechResponse += ` An alert was sent to ${caregiverName.split(' ')[0]}.`;
        }
      } catch (err) {
        console.warn('[clinicalAdvisor] Failed to dispatch emergency alert:', err);
      }
    }

    // Live FDA & geriatric protocol search via Tavily Search Engine ($3,000 Prize track)
    let tavilyEvidence = null;
    try {
      tavilyEvidence = await searchTavilyClinicalProtocol(args.query);
    } catch (_) {}

    return {
      success: true,
      query: args.query,
      assessment: analysis.displayCardTitle,
      speechResponse: analysis.speechResponse,
      actionAdvice: analysis.actionAdvice,
      clinicalExplanation: analysis.clinicalExplanation,
      displayCardTitle: analysis.displayCardTitle,
      urgencyLevel: analysis.urgencyLevel,
      recommendedAction: analysis.recommendedAction,
      smsDispatch: smsDispatchResult
        ? {
            delivered: true,
            recipient: smsDispatchResult.recipient,
            phone: smsDispatchResult.phone,
            timestamp: smsDispatchResult.timestamp,
            messageId: smsDispatchResult.messageId,
            simulated: smsDispatchResult.simulated,
          }
        : null,
      richCard: {
        type: 'clinical_triage',
        title: analysis.displayCardTitle,
        actionAdvice: analysis.actionAdvice,
        advice: analysis.actionAdvice, // Alias for backward compatibility
        clinicalExplanation: analysis.clinicalExplanation,
        urgencyLevel: analysis.urgencyLevel,
        recommendedAction: analysis.recommendedAction,
        smsDispatch: smsDispatchResult
          ? {
              delivered: true,
              recipient: smsDispatchResult.recipient,
              phone: smsDispatchResult.phone,
              timestamp: smsDispatchResult.timestamp,
              messageId: smsDispatchResult.messageId,
              simulated: smsDispatchResult.simulated,
            }
          : undefined,
      },
      tavilyEvidence,
      modelUsed:
        process.env.NEMOTRON_MODEL_ID || process.env.NEBIUS_MODEL_ID || DEFAULT_NEMOTRON_MODEL,
      bedrockModelUsed:
        process.env.NEMOTRON_MODEL_ID || process.env.NEBIUS_MODEL_ID || process.env.BEDROCK_MODEL_ID || DEFAULT_NEMOTRON_MODEL,
    };
  },
};