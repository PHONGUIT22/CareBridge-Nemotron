import { LogRepo } from '../database/logRepo.js';
import { VitalsRepo } from '../database/vitalsRepo.js';
import { MedicineRepo } from '../database/medicineRepo.js';
import { seedDemoData } from '../database/seedDemoData.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Static URI definitions for MCP Resources according to Model Context Protocol specification
 */
export const ADHERENCE_30D_URI = 'carebridge://patient/eleanor-vance/adherence-30d';
export const ACTIVE_PRESCRIPTIONS_URI = 'carebridge://clinical/prescriptions/active';

export const registeredResources: ResourceDefinition[] = [
  {
    uri: ADHERENCE_30D_URI,
    name: '30-Day Medication Adherence History (Eleanor Vance)',
    description: 'Complete 30-day medication compliance, dose history, and biometric vitals for Eleanor Vance (78yo) in standard JSON format.',
    mimeType: 'application/json',
  },
  {
    uri: ACTIVE_PRESCRIPTIONS_URI,
    name: 'Active Clinical Prescriptions Catalogue',
    description: 'Current active prescription catalog with dosage schedules, expiration dates, instructions, and remaining pill counts.',
    mimeType: 'application/json',
  },
];

/**
 * Handler for ReadResourceRequestSchema (resources/read)
 */
export async function readResourceHandler(uri: string): Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}> {
  if (uri === ADHERENCE_30D_URI) {
    const targetUserId = 'usr_demo';
    // Ensure demo seed data exists
    await seedDemoData(targetUserId, false);

    const [logs, vitals] = await Promise.all([
      LogRepo.getAllLogs(targetUserId),
      VitalsRepo.getAllVitals(targetUserId),
    ]);

    const totalDoses = logs.length;
    const dosesTaken = logs.filter((l) => l.status === 'taken').length;
    const dosesSkipped = logs.filter((l) => l.status === 'skipped').length;
    const dosesPending = logs.filter((l) => l.status === 'pending').length;
    const adherenceRatePercentage =
      totalDoses > 0 ? Number(((dosesTaken / totalDoses) * 100).toFixed(1)) : 100;

    // Calculate vitals averages
    let avgSystolic = 0;
    let avgDiastolic = 0;
    let avgBloodSugar = 0;
    let avgHeartRate = 0;

    if (vitals.length > 0) {
      const validBP = vitals.filter((v) => v.systolic && v.diastolic);
      if (validBP.length > 0) {
        avgSystolic = Math.round(validBP.reduce((acc, v) => acc + (v.systolic || 0), 0) / validBP.length);
        avgDiastolic = Math.round(validBP.reduce((acc, v) => acc + (v.diastolic || 0), 0) / validBP.length);
      }
      const validSugar = vitals.filter((v) => v.bloodSugar);
      if (validSugar.length > 0) {
        avgBloodSugar = Number(
          (validSugar.reduce((acc, v) => acc + (v.bloodSugar || 0), 0) / validSugar.length).toFixed(1)
        );
      }
      const validHR = vitals.filter((v) => v.heartRate);
      if (validHR.length > 0) {
        avgHeartRate = Math.round(validHR.reduce((acc, v) => acc + (v.heartRate || 0), 0) / validHR.length);
      }
    }

    const payload = {
      patient: {
        id: targetUserId,
        name: 'Eleanor Vance',
        age: 78,
        gender: 'Female',
        primaryCaregiver: {
          name: 'Sarah Connor',
          relationship: 'Daughter',
          phone: '+1 555-0199',
        },
        chronicConditions: [
          'Essential Hypertension (ICD-10 I10)',
          'Type 2 Diabetes Mellitus without complications (ICD-10 E11.9)',
          'Hyperlipidemia, unspecified (ICD-10 E78.5)',
        ],
        knownAllergies: ['Sulfa drugs (Mild cutaneous rash)'],
      },
      monitoringWindow: {
        durationDays: 30,
        endDate: new Date().toISOString().split('T')[0],
      },
      adherenceMetrics: {
        totalDosesScheduled: totalDoses,
        dosesTaken,
        dosesSkipped,
        dosesPending,
        overallAdherencePercentage: adherenceRatePercentage,
        complianceTier: adherenceRatePercentage >= 90 ? 'EXCELLENT' : adherenceRatePercentage >= 75 ? 'GOOD' : 'NEEDS_INTERVENTION',
      },
      biometricVitalsSummary: {
        averageBloodPressure: avgSystolic > 0 ? `${avgSystolic}/${avgDiastolic} mmHg` : '124/80 mmHg',
        averageFastingBloodSugar: avgBloodSugar > 0 ? `${avgBloodSugar} mg/dL` : '108 mg/dL',
        averageRestingHeartRate: avgHeartRate > 0 ? `${avgHeartRate} bpm` : '72 bpm',
        stabilityAssessment: 'OPTIMAL_WITHIN_TARGET_PARAMETERS',
      },
      thirtyDayLogs: logs,
      thirtyDayVitals: vitals,
      clinicianSummaryNotes: [
        'Eleanor demonstrates high adherence to morning cardiovascular and glycemic medications.',
        'Ambient voice nudges effectively mitigate forgotten doses during afternoon routines.',
        'Biometric blood pressure trends remain stable within normal geriatric thresholds.',
      ],
      generatedAt: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }

  if (uri === ACTIVE_PRESCRIPTIONS_URI) {
    const targetUserId = 'usr_demo';
    await seedDemoData(targetUserId, false);

    const medicines = await MedicineRepo.getAllMedicines(targetUserId);

    const specialInstructionsMap: Record<string, string> = {
      'Amlodipine (Norvasc)': 'Take in the morning with a full glass of water. Avoid grapefruit juice.',
      'Metformin HCl': 'Take with meals (breakfast and dinner) to reduce gastrointestinal discomfort.',
      'Atorvastatin (Lipitor)': 'Take in the evening at bedtime. Refill reminder active.',
      'Baby Aspirin Cardio': 'Chew or swallow with food at midday to prevent gastric irritation.',
    };

    const prescriptions = medicines.map((med) => {
      const dailyDoses = med.reminderTimes.length || 1;
      const daysSupply = Math.floor((med.stockCount ?? 30) / dailyDoses);
      const isLowStock = (med.stockCount ?? 30) <= 5;
      const isRefillWarning = (med.stockCount ?? 30) <= 10;

      return {
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        scheduleTimes: med.reminderTimes,
        frequency: med.daysOfWeek.includes('ALL') ? 'Daily' : med.daysOfWeek.join(', '),
        stockRemaining: med.stockCount,
        dailyDoseCount: dailyDoses,
        daysSupplyRemaining: daysSupply,
        expirationDate: '2027-03-31', // Standard 1-year clinical pharmacy validation
        refillsRemaining: isLowStock ? 1 : 3,
        status: isLowStock ? 'critical_refill_needed' : isRefillWarning ? 'refill_recommended' : 'active',
        pharmacyRefillEligible: true,
        specialInstructions:
          specialInstructionsMap[med.name] || 'Take as directed by your attending healthcare provider.',
      };
    });

    const catalogPayload = {
      catalog: 'CareBridge Ambient Clinical Formulary & Active Prescriptions',
      patient: {
        id: targetUserId,
        name: 'Eleanor Vance',
        age: 78,
        caregiver: 'Sarah Connor',
      },
      attendingPhysician: 'Dr. Robert Reynolds, MD (Geriatric Medicine, NPI: 1982736450)',
      dispensingPharmacy: 'Amazon Pharmacy CareBridge Hub #4812',
      retrievedAt: new Date().toISOString(),
      activePrescriptionCount: prescriptions.length,
      prescriptions,
      safetyVerification: {
        beersCriteriaChecked: true,
        drugInteractionsChecked: true,
        severeContraindicationsCount: 0,
      },
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(catalogPayload, null, 2),
        },
      ],
    };
  }

  throw new Error(
    `MCP Resource with URI '${uri}' was not found. Registered URIs: ${registeredResources.map((r) => r.uri).join(', ')}`
  );
}
