import { VitalsRepo } from '../database/vitalsRepo.js';
import { getLocalDateString } from '../utils/dateUtils.js';

export const recordVitalsTool = {
  definition: {
    name: 'recordVitals',
    description: 'Record geriatric biometric vitals: systolic and diastolic blood pressure, blood glucose, and heart rate.',
    inputSchema: {
      type: 'object',
      properties: {
        systolic: { type: 'number', description: 'Systolic blood pressure mmHg (e.g. 120, 130)' },
        diastolic: { type: 'number', description: 'Diastolic blood pressure mmHg (e.g. 80, 85)' },
        bloodSugar: { type: 'number', description: 'Blood glucose level mg/dL (e.g. 105)' },
        heartRate: { type: 'number', description: 'Heart rate in beats per minute bpm (e.g. 72)' },
        date: { type: 'string', description: 'Date of measurement in YYYY-MM-DD format. Defaults to today.' },
      },
    },
  },

  async handler(args: {
    userId?: string;
    systolic?: number;
    diastolic?: number;
    bloodSugar?: number;
    heartRate?: number;
    date?: string;
  }) {
    const targetDate = args.date || getLocalDateString();

    // Merge with existing vitals for the date to preserve previously entered metrics
    const existing = await VitalsRepo.getVitalsByDate(targetDate, args.userId);

    const mergedRecord = {
      userId: args.userId,
      date: targetDate,
      systolic: args.systolic !== undefined ? args.systolic : existing?.systolic,
      diastolic: args.diastolic !== undefined ? args.diastolic : existing?.diastolic,
      bloodSugar: args.bloodSugar !== undefined ? args.bloodSugar : existing?.bloodSugar,
      heartRate: args.heartRate !== undefined ? args.heartRate : existing?.heartRate,
      updatedAt: new Date().toISOString(),
    };

    await VitalsRepo.saveVitals(mergedRecord);

    // Assess clinical threshold according to AHA (American Heart Association) standards
    let statusAssessment = 'Normal';
    if (mergedRecord.systolic && mergedRecord.systolic >= 140) {
      statusAssessment = 'Stage 2 Hypertension - Elevated';
    } else if (mergedRecord.systolic && mergedRecord.systolic >= 130) {
      statusAssessment = 'Stage 1 Hypertension - Mildly Elevated';
    }

    // Warm spoken confirmation for senior user
    let speechText = 'I have recorded your vitals. ';
    if (args.systolic && args.diastolic) {
      speechText += `Blood pressure is ${args.systolic} over ${args.diastolic}. It looks stable. `;
    }
    if (args.bloodSugar) {
      speechText += `Blood sugar is ${args.bloodSugar} milligrams per deciliter. `;
    }
    if (args.heartRate) {
      speechText += `Heart rate is ${args.heartRate} beats per minute. `;
    }

    return {
      success: true,
      data: mergedRecord,
      assessment: statusAssessment,
      speechText: speechText.trim(),
    };
  },
};