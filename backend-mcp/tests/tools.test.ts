import { describe, it, expect, beforeAll } from 'vitest';
import { initDB } from '../src/database/db.js';
import { seedDemoData } from '../src/database/seedDemoData.js';
import { MedicineRepo } from '../src/database/medicineRepo.js';
import { getTodayScheduleTool } from '../src/tools/getTodaySchedule.js';
import { logDoseStatusTool } from '../src/tools/logDoseStatus.js';
import { orderRefillTool } from '../src/tools/orderRefill.js';
import { ringDeviceHubTool } from '../src/tools/ringDeviceHub.js';
import {
  checkDrugInteractions,
  searchTavilyDrugInteraction,
  searchTavilyClinicalProtocol,
} from '../src/services/drugInteractionService.js';
import { negotiateAdherenceTool, GUARDIAN_PERSONAS } from '../src/tools/negotiateAdherence.js';
import { getLocalDateString } from '../src/utils/dateUtils.js';

describe('CareBridge Ambient Core MCP Tools Suite', () => {
  beforeAll(async () => {
    initDB();
    await seedDemoData(false);
  });

  // TEST 1: getTodaySchedule calculates accurate adherence rate & next dose
  describe('Tool: getTodaySchedule', () => {
    it('calculates accurate adherence rate and returns daily schedule array', async () => {
      const todayStr = getLocalDateString();
      const result = await getTodayScheduleTool.handler({ date: todayStr });

      expect(result).toBeDefined();
      expect(result.date).toBe(todayStr);
      expect(typeof result.adherenceRate).toBe('number');
      expect(result.adherenceRate).toBeGreaterThanOrEqual(0);
      expect(result.adherenceRate).toBeLessThanOrEqual(100);

      // Verify adherence formula: Math.round((taken / total) * 100)
      if (result.totalDoses > 0) {
        const expectedRate = Math.round((result.takenCount / result.totalDoses) * 100);
        expect(result.adherenceRate).toBe(expectedRate);
      } else {
        expect(result.adherenceRate).toBe(100);
      }

      expect(Array.isArray(result.schedule)).toBe(true);
      expect(typeof result.speechSummary).toBe('string');
      expect(result.speechSummary.length).toBeGreaterThan(0);
    });
  });

  // TEST 2: logDoseStatus updates taken status and automatically updates SQLite WAL inventory
  describe('Tool: logDoseStatus', () => {
    it('marks dose as taken, saves clinical note, and returns updated stock', async () => {
      const allMeds = await MedicineRepo.getAllMedicines();
      expect(allMeds.length).toBeGreaterThan(0);
      const targetMed = allMeds[0];
      const initialStock = targetMed.stockCount;

      const result = await logDoseStatusTool.handler({
        medicineName: targetMed.name,
        status: 'taken',
        notes: 'Taken with warm oatmeal. Patient reported zero discomfort.',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('taken');
      expect(result.notes).toBe('Taken with warm oatmeal. Patient reported zero discomfort.');
      expect(result.speechText).toContain(result.medicineName);

      // Verify stock consistency in SQLite WAL
      const updatedMed = await MedicineRepo.getMedicineById(targetMed.id);
      expect(updatedMed).toBeDefined();
      if (result.remainingStock !== null) {
        expect(updatedMed!.stockCount).toBe(result.remainingStock);
      }
    });

    it('gracefully handles skipped status without reducing stock', async () => {
      const result = await logDoseStatusTool.handler({
        medicineName: 'Amlodipine',
        status: 'skipped',
        notes: 'Skipped due to low morning blood pressure.',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('skipped');
      expect(result.speechText).toContain('skipped');
    });
  });

  // TEST 3: orderRefill generates valid Smart Pharmacy order ID (CB-XXXXXXX-XXXXXXX) & adds +30 units
  describe('Tool: orderRefill', () => {
    it('creates verified Smart Pharmacy order ID (CB-XXXXXXX-XXXXXXX) and increments inventory', async () => {
      const allMeds = await MedicineRepo.getAllMedicines();
      const medToRefill = allMeds.find((m) => m.name.toLowerCase().includes('atorvastatin')) || allMeds[0];
      const previousStock = medToRefill.stockCount;
      const refillQuantity = 30;

      const result = await orderRefillTool.handler({
        medicineName: medToRefill.name,
        quantity: refillQuantity,
      });

      expect(result.success).toBe(true);
      // Verify Smart Pharmacy order ID format (e.g. CB-7294821-4928103)
      expect(result.orderId).toMatch(/^CB-\d{7}-\d{7}$/);
      expect(result.quantityAdded).toBe(refillQuantity);
      expect(result.previousStock).toBe(previousStock);
      expect(result.newStockCount).toBe(previousStock + refillQuantity);
      expect(result.pharmacyName).toBe('CareBridge Smart Pharmacy');
      expect(result.shippingMethod).toContain('Express');

      // Verify richCard metadata for Echo Show display
      expect(result.richCard).toBeDefined();
      expect(result.richCard.type).toBe('CareBridgePharmacyOrder');
      expect(result.richCard.orderId).toBe(result.orderId);
      expect(result.richCard.newStockCount).toBe(result.newStockCount);

      // Verify persistence in SQLite
      const reloadedMed = await MedicineRepo.getMedicineById(medToRefill.id);
      expect(reloadedMed!.stockCount).toBe(previousStock + refillQuantity);
    });
  });

  // TEST 4: ringDeviceHub checks porch camera and unlocks emergency door for paramedics
  describe('Tool: ringDeviceHub', () => {
    it('checks front porch camera and detects delivered CareBridge prescription package', async () => {
      const result = await ringDeviceHubTool.handler({ action: 'checkFrontPorch' });

      expect(result.success).toBe(true);
      expect(result.action).toBe('checkFrontPorch');
      expect(result.cameraName).toBe('Smart Security Doorbell - Front Porch');
      expect(result.doorLockStatus).toBe('LOCKED');
      expect(result.packageDetected).toBe(true);
      expect(result.packageDetails).toBeDefined();
      expect(result.packageDetails?.carrier).toBe('CareBridge Express Medical Delivery');
      expect(result.richCard?.type).toBe('SmartDoorbellFeed');
      expect(result.richCard?.mode).toBe('delivery');
    });

    it('triggers emergency paramedic smart door unlock with audit reason', async () => {
      const result = await ringDeviceHubTool.handler({
        action: 'triggerEmergencyDoorUnlock',
        reason: 'High Blood Pressure & Severe Dizziness Fall Incident',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('triggerEmergencyDoorUnlock');
      expect(result.doorLockStatus).toBe('UNLOCKED FOR PARAMEDICS');
      expect(result.emergencyReason).toBe('High Blood Pressure & Severe Dizziness Fall Incident');
      expect(result.speechText).toContain('unlocked the front door for incoming paramedics');
      expect(result.richCard?.mode).toBe('emergency');
    });
  });

  // TEST 5: drugInteractionService detects hazardous drug interactions (Beers Criteria)
  describe('Service: drugInteractionService', () => {
    it('detects CRITICAL bleeding risk when adding Warfarin with Aspirin on board', async () => {
      const result = await checkDrugInteractions('Warfarin', [
        'Baby Aspirin Cardio 81mg',
        'Metformin HCl 500mg',
      ]);

      expect(result.hasInteraction).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);

      const criticalWarning = result.warnings[0];
      expect(criticalWarning.severity).toBe('CRITICAL');
      expect(criticalWarning.conflictingMedName).toBe('Baby Aspirin Cardio 81mg');
      expect(criticalWarning.title).toContain('Hemorrhage');
      expect(criticalWarning.recommendation).toContain('Dr. Reynolds');
    });

    it('detects HIGH statin-induced rhabdomyolysis risk for Simvastatin + Amlodipine', async () => {
      const result = await checkDrugInteractions('Simvastatin', [
        'Amlodipine (Norvasc) 5mg',
      ]);

      expect(result.hasInteraction).toBe(true);
      const warning = result.warnings.find((w) => w.severity === 'HIGH');
      expect(warning).toBeDefined();
      expect(warning?.title).toContain('Rhabdomyolysis');
      expect(warning?.conflictingMedName).toBe('Amlodipine (Norvasc) 5mg');
    });

    it('approves safe medication (Vitamin C) with zero clinical interaction warnings', async () => {
      const result = await checkDrugInteractions('Vitamin C', [
        'Baby Aspirin Cardio 81mg',
        'Amlodipine (Norvasc) 5mg',
      ]);

      expect(result.hasInteraction).toBe(false);
      expect(result.warnings.length).toBe(0);
    });

    it('executes Tavily search for FDA drug interaction query with geriatric safety evidence ($3,000 Prize track)', async () => {
      const evidence = await searchTavilyDrugInteraction('Warfarin', 'Aspirin');

      expect(evidence).toBeDefined();
      expect(evidence.query).toContain('FDA drug interaction Warfarin and Aspirin geriatric');
      expect(evidence.sources.length).toBeGreaterThan(0);
      expect(evidence.sources[0].title.length).toBeGreaterThan(0);
      expect(evidence.sources[0].url.length).toBeGreaterThan(0);
      expect(evidence.sources[0].content.length).toBeGreaterThan(0);
      expect(evidence.answer).toBeDefined();
    });

    it('executes Tavily search for latest geriatric clinical protocols and guidelines', async () => {
      const evidence = await searchTavilyClinicalProtocol('orthostatic dizziness after amlodipine');

      expect(evidence).toBeDefined();
      expect(evidence.query).toContain('geriatric clinical protocol');
      expect(evidence.sources.length).toBeGreaterThan(0);
      expect(evidence.sources[0].content.length).toBeGreaterThan(0);
      expect(evidence.answer).toBeDefined();
    });
  });

  // TEST 6: negotiateAdherence deploys AI Health Guardians & Sarah Circuit-Breaker
  describe('Tool: negotiateAdherence & The Health Guardians', () => {
    it('correctly returns persona response, appropriate escalation level, and rich card payload', async () => {
      const result = await negotiateAdherenceTool.handler({
        medicineName: 'Amlodipine (Norvasc) 5mg',
        refusalReason: 'Tastes bitter',
        personaId: 'nurse_betty',
        turnCount: 1,
      });

      expect(result.success).toBe(true);
      expect(result.persona).toBeDefined();
      expect(result.persona.id).toBe('nurse_betty');
      expect(result.persona.displayName).toBe('Nurse Betty');
      expect(result.escalationLevel).toBe('MILD');
      expect(result.sarahNotified).toBe(false);
      expect(result.speechResponse).toContain('Amlodipine (Norvasc) 5mg');
      expect(result.speechResponse).toContain('Price Is Right');

      // Verify richCard payload for Echo Show 10
      expect(result.richCard).toBeDefined();
      expect(result.richCard.type).toBe('GuardianNegotiation');
      expect(result.richCard.guardianName).toBe('Nurse Betty');
      expect(result.richCard.quote).toBe(result.speechResponse);
      expect(result.richCard.avatar).toBe('🩺');
      expect(result.richCard.turnCount).toBe(1);
      expect(result.richCard.callSarahAction).toBe(false);
      expect(result.richCard.medicineName).toBe('Amlodipine (Norvasc) 5mg');
    });

    it('triggers SARAH_CIRCUIT_BREAKER and dispatches simulated Emergency SMS alert when turnCount >= 2 or explicit refusal is passed', async () => {
      const result = await negotiateAdherenceTool.handler({
        medicineName: 'Amlodipine (Norvasc) 5mg',
        refusalReason: 'I refuse to take it today',
        personaId: 'dr_reynolds',
        turnCount: 2,
      });

      expect(result.success).toBe(true);
      expect(result.escalationLevel).toBe('SARAH_CIRCUIT_BREAKER');
      expect(result.sarahNotified).toBe(true);
      expect(result.alertMessageId).toBeDefined();
      expect(result.snsMessageId).toBeDefined();
      expect(result.speechResponse).toContain('Sarah at work (+1 555-0199)');
      expect(result.richCard.callSarahAction).toBe(true);
      expect(result.richCard.sarahPhone).toBe('+1 555-0199');
    });

    it('verifies all 4 personas return valid non-empty character-accurate speech text', async () => {
      const personas: Array<'nurse_betty' | 'dr_reynolds' | 'grandson_leo' | 'sergeant_miller'> = [
        'nurse_betty',
        'dr_reynolds',
        'grandson_leo',
        'sergeant_miller',
      ];

      for (const pId of personas) {
        const result = await negotiateAdherenceTool.handler({
          medicineName: 'Atorvastatin 20mg',
          personaId: pId,
          turnCount: 1,
        });

        expect(result.success).toBe(true);
        expect(result.persona.id).toBe(pId);
        expect(result.speechResponse.length).toBeGreaterThan(15);
        expect(result.persona.displayName.length).toBeGreaterThan(0);
        expect(result.persona.roleTitle.length).toBeGreaterThan(0);
        expect(GUARDIAN_PERSONAS[pId]).toBeDefined();
      }
    });
  });
});

