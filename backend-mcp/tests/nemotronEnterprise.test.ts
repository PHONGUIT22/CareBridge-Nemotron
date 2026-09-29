import { describe, it, expect, beforeAll } from 'vitest';
import {
  evaluateNemotronGuardrails,
  redactSensitivePii,
  checkTopicDenial,
  invokeNemotronWithStreaming,
  analyzeClinicalQuery,
  NEMOTRON_GUARDRAIL_ID,
  NEMOTRON_GUARDRAIL_VERSION,
} from '../src/ai/nemotronClient.js';
import {
  checkDrugInteractions,
  getBeersCriteriaProfile,
  BEERS_CRITERIA_GERIATRIC_DRUGS,
  CLINICAL_INTERACTION_RULES,
} from '../src/services/drugInteractionService.js';
import { initDB } from '../src/database/db.js';
import { seedDemoData } from '../src/database/seedDemoData.js';

describe('NVIDIA Nemotron Clinical Enterprise Architecture Suite', () => {
  beforeAll(async () => {
    initDB();
    await seedDemoData('usr_demo', false);
  });

  // ==========================================
  // PART 1: CAREBRIDGE CLINICAL GUARDRAILS (POWERED BY NEMOTRON SAFETY)
  // ==========================================
  describe('CareBridge Clinical Guardrails (Powered by Nemotron Safety)', () => {
    it('configures guardrailIdentifier and guardrailVersion according to clinical safety specifications', () => {
      expect(NEMOTRON_GUARDRAIL_ID).toBeDefined();
      expect(typeof NEMOTRON_GUARDRAIL_ID).toBe('string');
      expect(NEMOTRON_GUARDRAIL_ID.length).toBeGreaterThan(0);

      expect(NEMOTRON_GUARDRAIL_VERSION).toBeDefined();
      expect(typeof NEMOTRON_GUARDRAIL_VERSION).toBe('string');
    });

    describe('Filter 1: Sensitive Information Redaction (PII / PCI-DSS)', () => {
      it('redacts formatted and raw credit card numbers spoken through the microphone', () => {
        const queryWithCard = 'I want to pay for my copay with card 4111-2222-3333-4444 please.';
        const result = redactSensitivePii(queryWithCard);

        expect(result.piiRedacted).toBe(true);
        expect(result.redactedTypes).toContain('CREDIT_CARD');
        expect(result.cleanText).not.toContain('4111-2222-3333-4444');
        expect(result.cleanText).toContain('[CREDIT_CARD_REDACTED]');
      });

      it('redacts Social Security Numbers (SSN) spoken by senior', () => {
        const queryWithSsn = 'For Medicare verification, my SSN is 123-45-6789.';
        const result = redactSensitivePii(queryWithSsn);

        expect(result.piiRedacted).toBe(true);
        expect(result.redactedTypes).toContain('SSN');
        expect(result.cleanText).not.toContain('123-45-6789');
        expect(result.cleanText).toContain('[SSN_REDACTED]');
      });

      it('redacts both credit card and SSN simultaneously in compound utterances', () => {
        const compound = 'Card 5500 2345 6789 0123 and social security number is 987-65-4321';
        const result = redactSensitivePii(compound);

        expect(result.piiRedacted).toBe(true);
        expect(result.redactedTypes).toContain('CREDIT_CARD');
        expect(result.redactedTypes).toContain('SSN');
        expect(result.cleanText).toContain('[CREDIT_CARD_REDACTED]');
        expect(result.cleanText).toContain('[SSN_REDACTED]');
      });

      it('leaves standard clinical inquiries untampered when zero PII is present', () => {
        const clinicalQuery = 'I took my morning Amlodipine 5mg with a cup of warm water.';
        const result = redactSensitivePii(clinicalQuery);

        expect(result.piiRedacted).toBe(false);
        expect(result.redactedTypes).toHaveLength(0);
        expect(result.cleanText).toBe(clinicalQuery);
      });
    });

    describe('Filter 2: Topic Denial (Clinical Safety Policy)', () => {
      it('blocks dangerous attempts to arbitrarily double or increase cardiac medication', () => {
        const dangerousQuery = 'My blood pressure feels high, can I double my Amlodipine dose today?';
        const evaluation = checkTopicDenial(dangerousQuery);

        expect(evaluation.isBlocked).toBe(true);
        expect(evaluation.blockReason).toBe('TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION');
      });

      it('blocks attempts to stop life-sustaining cardiac or diabetes medications', () => {
        const stopQuery = 'I decided to stop taking my heart pills because I feel fine.';
        const evaluation = checkTopicDenial(stopQuery);

        expect(evaluation.isBlocked).toBe(true);
        expect(evaluation.blockReason).toBe('TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION');
      });

      it('blocks attempts to substitute prescribed cardiovascular drugs with home remedies', () => {
        const subQuery = 'Can I replace my blood pressure medicine with apple cider vinegar?';
        const evaluation = checkTopicDenial(subQuery);

        expect(evaluation.isBlocked).toBe(true);
        expect(evaluation.blockReason).toBe('TOPIC_DENIAL_DANGEROUS_SUBSTITUTION');
      });

      it('allows safe, legitimate symptom inquiries without triggering Topic Denial', () => {
        const safeQuery = 'I felt slightly dizzy for ten minutes after standing up from the sofa.';
        const evaluation = checkTopicDenial(safeQuery);

        expect(evaluation.isBlocked).toBe(false);
      });

      it('intercepts blocked queries in analyzeClinicalQuery and provides clinical refusal guidance', async () => {
        const result = await analyzeClinicalQuery('Should I take double dose of Metformin tonight?');

        expect(result.guardrailTriggered).toBe(true);
        expect(result.guardrailPolicy).toBe('TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION');
        expect(result.speechResponse).toContain('cannot recommend changing or stopping your medication dosage');
        expect(result.speechResponse).toContain('Dr. Reynolds');
        expect(result.displayCardTitle).toContain('GUARDRAIL BLOCKED');
        expect(result.urgencyLevel).toBe('HIGH');
      });
    });
  });

  // ==========================================
  // PART 2: STREAMING INFERENCE & AUDIO SYNTHESIS WITH NEMOTRON-70B
  // ==========================================
  describe('Streaming Inference & Audio Synthesis with NVIDIA Nemotron-70B', () => {
    it('streams tokens and synthesizes speech starting from the very first sentence with TTFA < 400ms', async () => {
      const tokensReceived: string[] = [];
      const sentencesReceived: string[] = [];
      const audioChunksReceived: Buffer[] = [];

      const streamResult = await invokeNemotronWithStreaming(
        'Good morning, how is my medication routine today?',
        {
          onToken: (tok) => tokensReceived.push(tok),
          onSentence: (sen) => sentencesReceived.push(sen),
          onSentenceAudio: (buf) => audioChunksReceived.push(buf),
        }
      );

      expect(streamResult).toBeDefined();
      expect(streamResult.fullText.length).toBeGreaterThan(0);
      expect(streamResult.sentences.length).toBeGreaterThan(0);
      expect(tokensReceived.length).toBeGreaterThan(0);
      expect(sentencesReceived.length).toBeGreaterThan(0);

      // Verify Time to First Audio (TTFA) < 400ms
      expect(streamResult.timeToFirstAudioMs).toBeGreaterThan(0);
      expect(streamResult.timeToFirstAudioMs).toBeLessThan(400);

      // Verify first sentence audio was processed immediately
      expect(streamResult.audioBuffers.length).toBeGreaterThanOrEqual(1);
      expect(audioChunksReceived.length).toBeGreaterThanOrEqual(1);
      expect(Buffer.isBuffer(streamResult.audioBuffers[0])).toBe(true);
    });

    it('redacts sensitive PII prior to streaming inference and audio dispatch', async () => {
      const streamResult = await invokeNemotronWithStreaming(
        'My card is 4111 2222 3333 4444, please confirm my medicine delivery.'
      );

      expect(streamResult.guardrailRedacted).toBe(true);
      expect(streamResult.fullText).not.toContain('4111 2222 3333 4444');
    });

    it('immediately streams guardrail refusal audio when dangerous dose alteration is attempted', async () => {
      const streamResult = await invokeNemotronWithStreaming(
        'Can I double my dose of Amlodipine right now?'
      );

      expect(streamResult.guardrailBlocked).toBe(true);
      expect(streamResult.fullText).toContain('cannot recommend changing');
      expect(streamResult.audioBuffers.length).toBeGreaterThanOrEqual(1);
      expect(streamResult.timeToFirstAudioMs).toBeLessThan(400);
    });
  });

  // ==========================================
  // PART 3: BEERS CRITERIA 15-MEDICATION KNOWLEDGE BASE
  // ==========================================
  describe('2023 AGS Beers Criteria 15-Medication Registry & Interactions', () => {
    it('maintains the comprehensive 15-drug geriatric pharmacotherapy knowledge registry', () => {
      const targetMeds = [
        'warfarin',
        'aspirin',
        'lisinopril',
        'metformin',
        'digoxin',
        'spironolactone',
        'ibuprofen',
        'amlodipine',
        'atorvastatin',
        'furosemide',
        'potassium',
        'clopidogrel',
        'ciprofloxacin',
        'levothyroxine',
        'omeprazole',
      ];

      for (const med of targetMeds) {
        const profile = getBeersCriteriaProfile(med);
        expect(profile).toBeDefined();
        const fullName = `${profile?.name} ${profile?.genericName}`.toLowerCase();
        expect(fullName).toContain(med);
        expect(profile?.clinicalCategory).toBeDefined();
        expect(profile?.geriatricRisks).toBeDefined();
        expect(Array.isArray(profile?.geriatricRisks)).toBe(true);
      }
    });

    it('detects CRITICAL interaction for Warfarin + Aspirin (dual bleeding hazard)', async () => {
      const result = await checkDrugInteractions('Aspirin', ['Warfarin', 'Lisinopril']);
      expect(result.hasInteraction).toBe(true);

      const critical = result.warnings.find((w) => w.severity === 'CRITICAL');
      expect(critical).toBeDefined();
      expect(critical?.title).toContain('Severe Hemorrhage');
      expect(critical?.mechanism).toContain('Synergistic');
    });

    it('detects CRITICAL Triple Whammy renal failure risk for NSAID + Lisinopril + Furosemide', async () => {
      const result = await checkDrugInteractions('Ibuprofen', ['Lisinopril', 'Furosemide']);
      expect(result.hasInteraction).toBe(true);

      const tripleWhammy = result.warnings.find((w) => w.title.includes('Triple Whammy'));
      expect(tripleWhammy).toBeDefined();
      expect(tripleWhammy?.severity).toBe('CRITICAL');
      expect(tripleWhammy?.clinicalRisk).toContain('acute renal shutdown');
    });

    it('detects HIGH hyperkalemia risk for Lisinopril + Spironolactone', async () => {
      const result = await checkDrugInteractions('Spironolactone', ['Lisinopril']);
      expect(result.hasInteraction).toBe(true);

      const highRisk = result.warnings.find((w) => w.severity === 'HIGH');
      expect(highRisk).toBeDefined();
      expect(highRisk?.title).toContain('Hyperkalemia');
    });

    it('detects HIGH Digoxin toxicity & arrhythmia risk with Furosemide hypokalemia', async () => {
      const result = await checkDrugInteractions('Furosemide', ['Digoxin']);
      expect(result.hasInteraction).toBe(true);

      const digWarning = result.warnings.find((w) => w.conflictingMedName === 'Digoxin');
      expect(digWarning).toBeDefined();
      expect(digWarning?.severity).toBe('HIGH');
      expect(digWarning?.mechanism).toContain('hypokalemia');
    });

    it('detects HIGH CYP2C19 blunting interaction between Omeprazole and Clopidogrel (Plavix)', async () => {
      const result = await checkDrugInteractions('Omeprazole', ['Clopidogrel']);
      expect(result.hasInteraction).toBe(true);

      const cypWarning = result.warnings.find((w) => w.conflictingMedName === 'Clopidogrel');
      expect(cypWarning).toBeDefined();
      expect(cypWarning?.severity).toBe('HIGH');
      expect(cypWarning?.title).toContain('CYP2C19 Blunting');
    });

    it('detects MODERATE absorption chelation between Levothyroxine and Calcium supplements', async () => {
      const result = await checkDrugInteractions('Calcium Carbonate', ['Levothyroxine']);
      expect(result.hasInteraction).toBe(true);

      const calciumWarning = result.warnings.find((w) => w.conflictingMedName === 'Levothyroxine');
      expect(calciumWarning).toBeDefined();
      expect(calciumWarning?.severity).toBe('MODERATE');
      expect(calciumWarning?.recommendation).toContain('Separate administration');
    });

    it('returns hasInteraction: false for safe geriatric medication additions', async () => {
      const result = await checkDrugInteractions('Acetaminophen', ['Atorvastatin', 'Amlodipine']);
      expect(result.hasInteraction).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
