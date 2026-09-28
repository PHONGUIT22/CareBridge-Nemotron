import { describe, it, expect, beforeAll } from 'vitest';
import { initDB } from '../src/database/db.js';
import { seedDemoData } from '../src/database/seedDemoData.js';
import {
  registeredResources,
  readResourceHandler,
  ADHERENCE_30D_URI,
  ACTIVE_PRESCRIPTIONS_URI,
} from '../src/resources/index.js';
import {
  registeredPrompts,
  getPromptHandler,
  MORNING_MEDICATION_CHECKIN_PROMPT,
  ACUTE_CHEST_PAIN_TRIAGE_PROMPT,
} from '../src/prompts/index.js';
import { getTodayScheduleTool } from '../src/tools/getTodaySchedule.js';

describe('Model Context Protocol (MCP) Tri-Pillar Architecture Suite', () => {
  beforeAll(async () => {
    initDB();
    await seedDemoData('usr_demo', false);
  });

  // ==========================================
  // PILLAR 1: MCP TOOLS
  // ==========================================
  describe('Pillar 1: MCP Tools Verification', () => {
    it('provides standardized tool definitions with JSON schemas', () => {
      const def = getTodayScheduleTool.definition;
      expect(def).toBeDefined();
      expect(def.name).toBe('getTodaySchedule');
      expect(def.description).toBeDefined();
      expect(def.inputSchema).toBeDefined();
      expect(def.inputSchema.type).toBe('object');
    });

    it('executes tool handler returning clinical payload', async () => {
      const result = await getTodayScheduleTool.handler({});
      expect(result).toBeDefined();
      expect(result.schedule).toBeDefined();
      expect(Array.isArray(result.schedule)).toBe(true);
      expect(typeof result.adherenceRate).toBe('number');
    });
  });

  // ==========================================
  // PILLAR 2: MCP RESOURCES (Read-only Context)
  // ==========================================
  describe('Pillar 2: MCP Resources (ListResources & ReadResource)', () => {
    it('registers both static URIs adhering to the MCP Resources standard', () => {
      expect(registeredResources).toHaveLength(2);

      const adherenceResource = registeredResources.find((r) => r.uri === ADHERENCE_30D_URI);
      expect(adherenceResource).toBeDefined();
      expect(adherenceResource?.mimeType).toBe('application/json');
      expect(adherenceResource?.name).toContain('Adherence');

      const prescriptionsResource = registeredResources.find((r) => r.uri === ACTIVE_PRESCRIPTIONS_URI);
      expect(prescriptionsResource).toBeDefined();
      expect(prescriptionsResource?.mimeType).toBe('application/json');
      expect(prescriptionsResource?.name).toContain('Prescriptions');
    });

    it('reads carebridge://patient/eleanor-vance/adherence-30d as standard JSON payload', async () => {
      const response = await readResourceHandler(ADHERENCE_30D_URI);

      expect(response).toBeDefined();
      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe(ADHERENCE_30D_URI);
      expect(content.mimeType).toBe('application/json');
      expect(typeof content.text).toBe('string');

      const data = JSON.parse(content.text);
      expect(data.patient).toBeDefined();
      expect(data.patient.name).toBe('Eleanor Vance');
      expect(data.patient.age).toBe(78);
      expect(data.patient.primaryCaregiver.name).toBe('Sarah Connor');
      expect(data.patient.chronicConditions).toContain('Essential Hypertension (ICD-10 I10)');

      // Validate 30-day compliance metrics
      expect(data.adherenceMetrics).toBeDefined();
      expect(data.adherenceMetrics.totalDosesScheduled).toBeGreaterThan(0);
      expect(data.adherenceMetrics.dosesTaken).toBeGreaterThan(0);
      expect(data.adherenceMetrics.overallAdherencePercentage).toBeGreaterThanOrEqual(0);
      expect(data.adherenceMetrics.overallAdherencePercentage).toBeLessThanOrEqual(100);

      // Validate biometrics & logs arrays
      expect(data.biometricVitalsSummary).toBeDefined();
      expect(data.thirtyDayLogs).toBeDefined();
      expect(Array.isArray(data.thirtyDayLogs)).toBe(true);
      expect(data.thirtyDayVitals).toBeDefined();
      expect(Array.isArray(data.thirtyDayVitals)).toBe(true);
    });

    it('reads carebridge://clinical/prescriptions/active with remaining pill counts and expiration dates', async () => {
      const response = await readResourceHandler(ACTIVE_PRESCRIPTIONS_URI);

      expect(response).toBeDefined();
      expect(response.contents).toHaveLength(1);

      const content = response.contents[0];
      expect(content.uri).toBe(ACTIVE_PRESCRIPTIONS_URI);
      expect(content.mimeType).toBe('application/json');

      const data = JSON.parse(content.text);
      expect(data.catalog).toContain('Active Prescriptions');
      expect(data.patient.name).toBe('Eleanor Vance');
      expect(data.dispensingPharmacy).toContain('Amazon Pharmacy');
      expect(Array.isArray(data.prescriptions)).toBe(true);
      expect(data.prescriptions.length).toBeGreaterThan(0);

      // Inspect prescription attributes: pill counts, expiration date, instructions
      const amlodipine = data.prescriptions.find((p: any) => p.name.includes('Amlodipine'));
      expect(amlodipine).toBeDefined();
      expect(amlodipine.dosage).toBe('5mg - 1 Tablet');
      expect(typeof amlodipine.stockRemaining).toBe('number');
      expect(amlodipine.expirationDate).toBe('2027-03-31');
      expect(amlodipine.specialInstructions).toContain('Take in the morning');
      expect(amlodipine.pharmacyRefillEligible).toBe(true);

      // Verify status accurately reflects remaining inventory threshold
      const atorvastatin = data.prescriptions.find((p: any) => p.name.includes('Atorvastatin'));
      expect(atorvastatin).toBeDefined();
      expect(['active', 'refill_recommended', 'critical_refill_needed']).toContain(atorvastatin.status);
      if (atorvastatin.stockRemaining <= 5) {
        expect(atorvastatin.status).toBe('critical_refill_needed');
      } else if (atorvastatin.stockRemaining <= 10) {
        expect(atorvastatin.status).toBe('refill_recommended');
      } else {
        expect(atorvastatin.status).toBe('active');
      }
    });

    it('throws error when requesting an unrecognized resource URI', async () => {
      await expect(readResourceHandler('carebridge://unknown/resource')).rejects.toThrow(
        /not found/i
      );
    });
  });

  // ==========================================
  // PILLAR 3: MCP PROMPTS (Pre-engineered Workflows)
  // ==========================================
  describe('Pillar 3: MCP Prompts (ListPrompts & GetPrompt)', () => {
    it('registers both morning check-in and acute chest pain triage prompts', () => {
      expect(registeredPrompts).toHaveLength(2);

      const morningPrompt = registeredPrompts.find(
        (p) => p.name === MORNING_MEDICATION_CHECKIN_PROMPT
      );
      expect(morningPrompt).toBeDefined();
      expect(morningPrompt?.arguments?.some((a) => a.name === 'patientName')).toBe(true);

      const triagePrompt = registeredPrompts.find(
        (p) => p.name === ACUTE_CHEST_PAIN_TRIAGE_PROMPT
      );
      expect(triagePrompt).toBeDefined();
      expect(triagePrompt?.arguments?.some((a) => a.name === 'reportedSymptom')).toBe(true);
    });

    it('retrieves morning_medication_checkin prompt with warm, gentle clinical directives', async () => {
      const promptResult = await getPromptHandler(MORNING_MEDICATION_CHECKIN_PROMPT, {
        patientName: 'Eleanor',
        scheduledMedications: 'Amlodipine 5mg and Metformin 500mg',
        caregiverName: 'Sarah',
      });

      expect(promptResult).toBeDefined();
      expect(promptResult.description).toBeDefined();
      expect(promptResult.messages).toHaveLength(1);

      const message = promptResult.messages[0];
      expect(message.role).toBe('user');
      expect(message.content.type).toBe('text');
      expect(message.content.text).toContain('Eleanor');
      expect(message.content.text).toContain('Amlodipine 5mg and Metformin 500mg');
      expect(message.content.text).toContain('Sarah');
      expect(message.content.text).toContain('Tone & Demeanor');
      expect(message.content.text).toContain('Good morning');
    });

    it('retrieves acute_chest_pain_triage prompt with strict emergency directives and automation triggers', async () => {
      const promptResult = await getPromptHandler(ACUTE_CHEST_PAIN_TRIAGE_PROMPT, {
        patientName: 'Eleanor',
        reportedSymptom: 'severe crushing chest pain radiating to left arm',
        durationMinutes: '10 minutes',
        caregiverName: 'Sarah',
      });

      expect(promptResult).toBeDefined();
      expect(promptResult.description).toBeDefined();
      expect(promptResult.messages).toHaveLength(1);

      const message = promptResult.messages[0];
      expect(message.role).toBe('user');
      expect(message.content.type).toBe('text');
      expect(message.content.text).toContain('CRITICAL EMERGENCY CLINICAL TRIAGE PROTOCOL');
      expect(message.content.text).toContain('severe crushing chest pain radiating to left arm');
      expect(message.content.text).toContain('DISPATCH EMERGENCY SERVICES (911)');
      expect(message.content.text).toContain('Sarah');
      expect(message.content.text).toContain('RING SMART ECOSYSTEM AUTOMATION');
      expect(message.content.text).toContain('Aspirin Safety Check');
    });

    it('throws descriptive error when requesting an unknown prompt name', async () => {
      await expect(getPromptHandler('non_existent_prompt')).rejects.toThrow(/not found/i);
    });
  });
});
