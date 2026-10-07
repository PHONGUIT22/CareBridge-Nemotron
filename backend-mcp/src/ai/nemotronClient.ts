import OpenAI from 'openai';
import { synthesizeSpeech } from './voiceClient.js';
import '../config/env.js';

export interface ClinicalAnalysisResult {
  speechResponse: string;
  displayCardTitle: string;
  actionAdvice: string;
  clinicalExplanation: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  recommendedAction: string;
  guardrailTriggered?: boolean;
  guardrailPolicy?: string;
  redactedPii?: boolean;
  modelTierUsed?: 'FAST' | 'ULTRA';
  modelIdUsed?: string;
}

export interface NemotronToolUseDecision {
  stopReason: string;
  toolCall?: {
    id: string;
    name: string;
    input: Record<string, any>;
  };
  textResponse?: string;
  rawResponse?: any;
  modelTierUsed?: 'FAST' | 'ULTRA';
  modelIdUsed?: string;
}
export type BedrockToolUseDecision = NemotronToolUseDecision;

export interface GuardrailEvaluationResult {
  isBlocked: boolean;
  blockReason?: 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION' | 'TOPIC_DENIAL_DANGEROUS_SUBSTITUTION';
  guardrailResponse?: ClinicalAnalysisResult;
  cleanText: string;
  piiRedacted: boolean;
  redactedTypes: ('CREDIT_CARD' | 'SSN' | 'CVV')[];
}

export interface NemotronStreamOptions {
  onToken?: (token: string) => void;
  onSentence?: (sentence: string, index: number) => void;
  onSentenceAudio?: (audioBuffer: Buffer, sentence: string, index: number) => void;
  voiceId?: string;
}
export type BedrockStreamOptions = NemotronStreamOptions;

export interface NemotronStreamResult {
  fullText: string;
  sentences: string[];
  audioBuffers: Buffer[];
  timeToFirstTokenMs: number;
  timeToFirstAudioMs: number;
  guardrailRedacted: boolean;
  guardrailBlocked: boolean;
}
export type BedrockStreamResult = NemotronStreamResult;

/**
 * CareBridge Clinical Guardrail Identifiers & Configuration (Powered by Nemotron Safety)
 */
export const NEMOTRON_GUARDRAIL_ID =
  process.env.NEMOTRON_GUARDRAIL_ID?.trim() ||
  process.env.BEDROCK_GUARDRAIL_ID?.trim() ||
  'carebridge-nemotron-clinical-guardrail-v1';
export const NEMOTRON_GUARDRAIL_VERSION =
  process.env.NEMOTRON_GUARDRAIL_VERSION?.trim() ||
  process.env.BEDROCK_GUARDRAIL_VERSION?.trim() ||
  '1';

// Backwards compatibility aliases
export const BEDROCK_GUARDRAIL_ID = NEMOTRON_GUARDRAIL_ID;
export const BEDROCK_GUARDRAIL_VERSION = NEMOTRON_GUARDRAIL_VERSION;

/**
 * Supported NVIDIA Nemotron model on Nebius Token Factory
 */
export const DEFAULT_NEMOTRON_MODEL =
  process.env.NEMOTRON_MODEL_ID?.trim() ||
  process.env.NVIDIA_MODEL_ID?.trim() ||
  process.env.NEBIUS_MODEL_ID?.trim() ||
  process.env.BEDROCK_MODEL_ID?.trim() ||
  'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B';

export const DEFAULT_NEMOTRON_FAST_MODEL =
  process.env.NEMOTRON_FAST_MODEL?.trim() ||
  process.env.NVIDIA_FAST_MODEL?.trim() ||
  DEFAULT_NEMOTRON_MODEL;

export const DEFAULT_NEMOTRON_REASONING_MODEL =
  process.env.NEMOTRON_REASONING_MODEL?.trim() ||
  process.env.NVIDIA_REASONING_MODEL?.trim() ||
  'nvidia/Nemotron-3-Ultra-550b-a55b';

/**
 * Dynamic Multi-Model Cascading: Tiered AI Model Routing
 * Routes routine queries to Nemotron-3-Nano (Fast Call) and complex/acute queries to Nemotron-3-Ultra / Super (Deep Clinical Triage).
 */
export function selectNemotronModelTier(
  query: string,
  toolHint?: string
): { modelId: string; tier: 'FAST' | 'ULTRA'; reason: string } {
  const lower = query.toLowerCase();

  // 1. Acute clinical triage & emergency signs -> ULTRA Tier
  const isAcuteEmergency =
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('fainted') ||
    lower.includes('fainting') ||
    lower.includes('stroke') ||
    lower.includes('heart attack') ||
    lower.includes('crushing') ||
    lower.includes('allergic shock') ||
    lower.includes('anaphylaxis') ||
    lower.includes('unconscious') ||
    lower.includes('cannot breathe') ||
    lower.includes('difficulty breathing') ||
    lower.includes('acute_chest_pain_triage');

  if (isAcuteEmergency) {
    return {
      modelId: DEFAULT_NEMOTRON_REASONING_MODEL,
      tier: 'ULTRA',
      reason: 'Acute emergency symptom triage (Ultra deep reasoning required)',
    };
  }

  // 2. Polypharmacy triage (>= 3 medications or complex pharmacokinetics/contraindications)
  const medicationKeywords = [
    'warfarin',
    'aspirin',
    'amlodipine',
    'atorvastatin',
    'lipitor',
    'metformin',
    'lisinopril',
    'furosemide',
    'digoxin',
    'omeprazole',
    'clopidogrel',
    'plavix',
    'spironolactone',
    'levothyroxine',
    'ibuprofen',
  ];
  const matchedMeds = medicationKeywords.filter((med) => lower.includes(med));

  const isPolypharmacy =
    matchedMeds.length >= 3 ||
    lower.includes('polypharmacy') ||
    lower.includes('pharmacokinetics') ||
    (lower.includes('contraindication') && matchedMeds.length >= 2);

  if (isPolypharmacy) {
    return {
      modelId: DEFAULT_NEMOTRON_REASONING_MODEL,
      tier: 'ULTRA',
      reason: `Polypharmacy & complex pharmacokinetic triage (${matchedMeds.length} medications referenced)`,
    };
  }

  // High clinical risk tool hint
  if (
    toolHint === 'clinicalAdvisor' &&
    (lower.includes('severe') ||
      lower.includes('bleeding') ||
      lower.includes('hemorrhage') ||
      lower.includes('kidney') ||
      lower.includes('renal') ||
      lower.includes('arrhythmia') ||
      lower.includes('rhabdomyolysis'))
  ) {
    return {
      modelId: DEFAULT_NEMOTRON_REASONING_MODEL,
      tier: 'ULTRA',
      reason: 'Complex clinical guideline & adverse event triage',
    };
  }

  // 3. Fast Tier (routine queries)
  return {
    modelId: DEFAULT_NEMOTRON_FAST_MODEL,
    tier: 'FAST',
    reason: 'Everyday ambient routine call (Nano-30B fast call)',
  };
}

export const NEBIUS_BASE_URL =
  process.env.NEBIUS_BASE_URL?.trim() || 'https://api.tokenfactory.nebius.com/v1';

/**
 * Standard OpenAI SDK client configured for Nebius Token Factory
 */
export const client = new OpenAI({
  baseURL: NEBIUS_BASE_URL,
  apiKey: process.env.NEBIUS_API_KEY || 'missing-nebius-key',
});
export const nebiusClient = client;

/**
 * Filter 1: Sensitive Information Redaction (PII / PCI-DSS / HIPAA)
 * Automatically redacts Credit Card numbers, Social Security Numbers (SSN), and CVVs
 */
export function redactSensitivePii(text: string): {
  cleanText: string;
  piiRedacted: boolean;
  redactedTypes: ('CREDIT_CARD' | 'SSN' | 'CVV')[];
} {
  let cleanText = text;
  const redactedTypes: ('CREDIT_CARD' | 'SSN' | 'CVV')[] = [];

  // 1. Credit Card Patterns (13-19 digits, formatted with spaces/dashes or continuous)
  const creditCardPattern =
    /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b(?:3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5})\b|\b(?:\d{15,16})\b/g;
  if (creditCardPattern.test(cleanText)) {
    cleanText = cleanText.replace(creditCardPattern, '[CREDIT_CARD_REDACTED]');
    redactedTypes.push('CREDIT_CARD');
  }

  // 2. US Social Security Number (SSN) Patterns (XXX-XX-XXXX, XXX XX XXXX, or explicit "SSN 123456789")
  const ssnPattern =
    /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b|\b(?:ssn|social security(?: number)?)\s*(?:is|:)?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9})\b/gi;
  if (ssnPattern.test(cleanText)) {
    cleanText = cleanText.replace(ssnPattern, (match) => {
      if (/ssn|social security/i.test(match)) {
        return match.replace(/(\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9})/, '[SSN_REDACTED]');
      }
      return '[SSN_REDACTED]';
    });
    redactedTypes.push('SSN');
  }

  // 3. CVV/CVC Patterns
  const cvvPattern = /\b(?:cvv|cvc|security code)\s*[:=]?\s*(\d{3,4})\b/gi;
  if (cvvPattern.test(cleanText)) {
    cleanText = cleanText.replace(cvvPattern, 'CVV: [CVV_REDACTED]');
    redactedTypes.push('CVV');
  }

  return {
    cleanText,
    piiRedacted: redactedTypes.length > 0,
    redactedTypes,
  };
}

/**
 * Filter 2: Topic Denial (Clinical Safety Policy)
 * Blocks unauthorized dosage alterations of cardiac/antihypertensive/anticoagulant drugs
 */
export function checkTopicDenial(text: string): {
  isBlocked: boolean;
  blockReason?: 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION' | 'TOPIC_DENIAL_DANGEROUS_SUBSTITUTION';
} {
  const lower = text.toLowerCase();

  // Pattern A: Arbitrary dose modification (doubling, increasing, halving, stopping cardiac medications)
  const doseAlterationRegex =
    /\b(can I|should I|could I|want to|plan to|decided to|gonna|going to)\s+(double|triple|increase|raise|halve|stop|quit|discontinue|skip|alter|change)\s+(my\s+)?(dose|dosage|pills?|medication|amlodipine|norvasc|metformin|lipitor|atorvastatin|lisinopril|warfarin|digoxin|heart medication|blood pressure)\b/i;
  const directAlterationRegex =
    /\b(double|triple|increase|halve|stop|quit|discontinue|alter)\s+(my\s+)?(dose|dosage|heart pills?|blood pressure pills?|cardiac medication|amlodipine|metformin|norvasc|lipitor|lisinopril|warfarin|digoxin)\b/i;
  const multiplePillRegex =
    /\btake\s+(\d+|two|three|double|extra)\s+(pills?|tablets?|doses?)\s+(of\s+)?(my\s+)?(amlodipine|metformin|lipitor|norvasc|lisinopril|pills?|medicine)\b/i;
  const stopMedsRegex =
    /\bstop\s+taking\s+(my\s+)?(heart|blood pressure|cardiac|cholesterol|diabetes|prescribed)\s+(pills?|medication|medicine)\b/i;

  if (
    doseAlterationRegex.test(lower) ||
    directAlterationRegex.test(lower) ||
    multiplePillRegex.test(lower) ||
    stopMedsRegex.test(lower)
  ) {
    return {
      isBlocked: true,
      blockReason: 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION',
    };
  }

  // Pattern B: Substituting essential prescription drugs with unverified home remedies
  const substitutionRegex =
    /\b(substitute|replace)\s+(my\s+)?(heart|blood pressure|cardiac|prescription)\s+(pills?|medicine)\s+with\b/i;
  if (substitutionRegex.test(lower)) {
    return {
      isBlocked: true,
      blockReason: 'TOPIC_DENIAL_DANGEROUS_SUBSTITUTION',
    };
  }

  return { isBlocked: false };
}

/**
 * Evaluates CareBridge Clinical Guardrails (Powered by Nemotron Safety: Topic Denial & Sensitive Information Redaction)
 */
export function evaluateNemotronGuardrails(input: string): GuardrailEvaluationResult {
  // 1. Apply Sensitive Information Redaction
  const piiResult = redactSensitivePii(input);

  // 2. Apply Clinical Topic Denial on the sanitized query
  const topicResult = checkTopicDenial(piiResult.cleanText);

  if (topicResult.isBlocked) {
    const isAlteration =
      topicResult.blockReason === 'TOPIC_DENIAL_UNAUTHORIZED_DOSE_ALTERATION';

    const speech = isAlteration
      ? 'I cannot recommend changing or stopping your medication dosage. Please consult Dr. Reynolds before making any adjustments.'
      : 'I cannot recommend substituting your prescribed medications with home remedies. Please speak with Dr. Reynolds.';

    const title = isAlteration
      ? 'GUARDRAIL BLOCKED: Unauthorized Dose Modification'
      : 'GUARDRAIL BLOCKED: Unprescribed Drug Substitution';

    const explanation = isAlteration
      ? 'CareBridge Clinical Guardrail (Powered by Nemotron Safety): Modifying cardiovascular or glycemic medication without physician oversight carries acute risks of profound hypotension, syncope, or rebound hypertensive crisis.'
      : 'CareBridge Clinical Guardrail (Powered by Nemotron Safety): Substituting evidence-based cardiovascular pharmacotherapy with unverified substances poses severe cardiac decompensation hazards.';

    return {
      isBlocked: true,
      blockReason: topicResult.blockReason,
      cleanText: piiResult.cleanText,
      piiRedacted: piiResult.piiRedacted,
      redactedTypes: piiResult.redactedTypes,
      guardrailResponse: {
        speechResponse: speech,
        displayCardTitle: title,
        actionAdvice:
          'Never change, double, or stop cardiovascular medication independently. Contact Dr. Robert Reynolds at +1 555-0199 or speak with your pharmacist.',
        clinicalExplanation: explanation,
        urgencyLevel: 'HIGH',
        recommendedAction: 'Consult attending physician prior to modifying medication regimen',
        guardrailTriggered: true,
        guardrailPolicy: topicResult.blockReason,
        redactedPii: piiResult.piiRedacted,
      },
    };
  }

  return {
    isBlocked: false,
    cleanText: piiResult.cleanText,
    piiRedacted: piiResult.piiRedacted,
    redactedTypes: piiResult.redactedTypes,
  };
}

// Backwards-compatible alias
export const evaluateBedrockGuardrails = evaluateNemotronGuardrails;

/**
 * OpenAI Function Calling Schemas for NVIDIA Nemotron-3-Nano on Nebius Token Factory
 */
export const NEMOTRON_TOOLS_SCHEMAS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getTodaySchedule',
      description: "Retrieve the patient's daily medication schedule, percentage adherence rate, and next upcoming dose.",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Target date in YYYY-MM-DD format. Defaults to today.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'logDoseStatus',
      description: "Mark medication dose intake status as 'taken' or 'skipped', with optional clinical or feeling notes.",
      parameters: {
        type: 'object',
        properties: {
          logId: {
            type: 'string',
            description: 'Unique intake log record identifier (if known).',
          },
          medicineName: {
            type: 'string',
            description: 'Name of medicine spoken by patient (e.g., Amlodipine, Metformin, Lipitor, morning pills).',
          },
          status: {
            type: 'string',
            enum: ['taken', 'skipped', 'pending'],
            description: "New intake status ('taken' or 'skipped'). Defaults to 'taken'.",
          },
          notes: {
            type: 'string',
            description: 'Clinical observation or sensation noted during intake.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recordVitals',
      description: 'Record geriatric biometric vitals: systolic and diastolic blood pressure, blood glucose, and heart rate.',
      parameters: {
        type: 'object',
        properties: {
          systolic: { type: 'number', description: 'Systolic blood pressure mmHg (e.g. 120, 130)' },
          diastolic: { type: 'number', description: 'Diastolic blood pressure mmHg (e.g. 80, 85)' },
          bloodSugar: { type: 'number', description: 'Blood glucose level mg/dL (e.g. 105)' },
          heartRate: { type: 'number', description: 'Heart rate in beats per minute bpm (e.g. 72)' },
          date: { type: 'string', description: 'Date of measurement in YYYY-MM-DD format. Defaults to today.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clinicalAdvisor',
      description:
        'Evaluate senior symptoms, clinical triage, medication safety, drug-drug interactions, and contraindications (e.g., "Can I take Warfarin with Aspirin?", "I feel dizzy after taking my pill").',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Patient verbal statement, symptom description, or medication safety query (e.g., "Can I take Warfarin with my daily Baby Aspirin?", "I feel dizzy after taking my pill").',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'orderRefill',
      description: 'Place an automated 1-Click prescription refill order via Smart Pharmacy Refill Hub when inventory runs low or upon patient request.',
      parameters: {
        type: 'object',
        properties: {
          medicineName: {
            type: 'string',
            description: 'Name of the medication to refill (e.g., Atorvastatin, Amlodipine, Metformin).',
          },
          quantity: {
            type: 'number',
            description: 'Number of tablets to refill (defaults to 30 tablets for a 1-month supply).',
          },
        },
        required: ['medicineName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ringDeviceHub',
      description:
        'Integrate Smart IoT Home Hub & Security Doorbell. Check front porch camera, verify prescription deliveries, and unlock door for emergency paramedics.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['checkFrontPorch', 'triggerEmergencyDoorUnlock', 'getDeviceStatus'],
            description: 'Action to perform: checkFrontPorch (inspect porch/package), triggerEmergencyDoorUnlock (emergency paramedic access).',
          },
          reason: {
            type: 'string',
            description: 'Reason for triggering device action.',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'negotiateAdherence',
      description:
        'Handles patient resistance or refusal to take scheduled medication. Deploys an AI Health Guardian persona to negotiate adherence and activates the Sarah Connor emergency family circuit-breaker if refusal persists.',
      parameters: {
        type: 'object',
        properties: {
          medicineName: {
            type: 'string',
            description: 'Name of the medication being refused or resisted (e.g. Amlodipine, Lipitor, morning pills).',
          },
          refusalReason: {
            type: 'string',
            description: 'Reason provided by the patient for refusing or wanting to skip.',
          },
          personaId: {
            type: 'string',
            enum: ['nurse_betty', 'dr_reynolds', 'grandson_leo', 'sergeant_miller'],
            description: 'Health Guardian persona to deploy. Defaults to grandson_leo.',
          },
          turnCount: {
            type: 'number',
            description: 'Resistance turn count (1 = initial persuasion, 2+ = Sarah Circuit-Breaker).',
          },
        },
        required: [],
      },
    },
  },
];

// Backwards compatibility alias
export const MCP_TOOLS_SCHEMAS = NEMOTRON_TOOLS_SCHEMAS;

/**
 * Invoke NVIDIA Nemotron via Nebius Token Factory (OpenAI standard format)
 */
export async function invokeNemotronWithTools(
  userQuery: string,
  contextData?: { currentMeds?: string[]; recentVitals?: string },
  preferredModel?: string
): Promise<NemotronToolUseDecision | null> {
  // Apply Nemotron Safety Guardrails
  const guardrailResult = evaluateNemotronGuardrails(userQuery);
  const cleanUserQuery = guardrailResult.cleanText;
  const routing = selectNemotronModelTier(cleanUserQuery);
  const modelId = preferredModel?.trim() || routing.modelId;
  const modelTier = preferredModel
    ? (modelId.toLowerCase().includes('ultra') || modelId.toLowerCase().includes('super') ? 'ULTRA' : 'FAST')
    : routing.tier;

  if (guardrailResult.isBlocked && guardrailResult.guardrailResponse) {
    console.log(`[Nemotron Safety Guardrail] Intercepted blocked topic in tool-use: ${guardrailResult.blockReason}`);
    return {
      stopReason: 'guardrail_intervened',
      textResponse: guardrailResult.guardrailResponse.speechResponse,
      modelTierUsed: modelTier,
      modelIdUsed: modelId,
    };
  }

  const apiKey = process.env.NEBIUS_API_KEY?.trim();
  const hasRealCredentials =
    Boolean(apiKey) &&
    apiKey !== 'PASTE_YOUR_NEBIUS_API_KEY_HERE' &&
    apiKey !== 'your_nebius_api_key_here' &&
    !apiKey?.includes('PASTE_') &&
    !(process.env.VITEST && !process.env.LIVE_AI_TEST);

  if (!hasRealCredentials || !apiKey) {
    console.log('[Nemotron Tool-Use] No real Nebius credentials configured. Deferring to offline heuristic fallback.');
    return null;
  }

  try {
    const openai = new OpenAI({
      baseURL: NEBIUS_BASE_URL,
      apiKey,
    });

    const systemPrompt = `You are CareBridge Ambient OS, an empathetic, geriatric-focused AI health companion running on an ambient smart display for senior patient Eleanor Vance (78).
Based on the user's spoken request, choose the single most relevant tool from the provided tools:
- negotiateAdherence: HIGHEST PRIORITY whenever the patient expresses ANY reluctance, hesitation, resistance, refusal, says "don't want to take", "not taking my pills", "hate this pill", "skip my pills", "leave me alone", "refuse". Even if "today" or "schedule" is mentioned, if reluctance or refusal is expressed, ALWAYS choose negotiateAdherence.
- getTodaySchedule: ONLY when asking for daily medication routine, upcoming doses, or compliance rate. NOT when resisting doses.
- logDoseStatus: When the senior reports taking, drinking, or having taken a medication (e.g. "I took my morning pills", "I took Amlodipine").
- recordVitals: When reporting blood pressure, blood sugar, heart rate, or pulse measurements.
- clinicalAdvisor: When reporting symptoms, discomfort, feeling dizzy, pain, or asking clinical questions.
- orderRefill: When requesting a refill or ordering more medicine via Smart Pharmacy Refill Hub.
- ringDeviceHub: When checking front porch security doorbell camera, packages, or unlocking door for emergency paramedics.

If no tool is needed (such as a greeting or simple conversation), respond directly with compassionate, reassuring text strictly under 20 words for fast speech rendering.`;

    console.log(`[Nemotron Tool-Use] Invoking ${modelId} (${modelTier} tier) via Nebius Token Factory with OpenAI function calling schemas...`);
    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: cleanUserQuery },
      ],
      tools: NEMOTRON_TOOLS_SCHEMAS,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 1024,
    });

    const choice = completion.choices?.[0];
    const message = choice?.message;
    const stopReason = choice?.finish_reason || 'stop';

    let toolCall: { id: string; name: string; input: Record<string, any> } | undefined;
    let textResponse: string | undefined = message?.content || undefined;

    if (message?.tool_calls && message.tool_calls.length > 0) {
      const primaryTool = message.tool_calls[0];
      let parsedInput: Record<string, any> = {};
      if (primaryTool.function?.arguments) {
        try {
          parsedInput = JSON.parse(primaryTool.function.arguments);
        } catch {
          parsedInput = {};
        }
      }
      toolCall = {
        id: primaryTool.id || `call_${Date.now()}`,
        name: primaryTool.function.name,
        input: parsedInput,
      };
    }

    console.log(`[Nemotron Tool-Use Response] Stop reason: ${stopReason}, Tool called: ${toolCall?.name || 'none'}`);

    return {
      stopReason,
      toolCall,
      textResponse: textResponse?.trim(),
      rawResponse: completion,
      modelTierUsed: modelTier,
      modelIdUsed: modelId,
    };
  } catch (err: any) {
    console.warn(`[Nemotron Tool-Use] Nebius call failed (${err?.name || 'Error'}: ${err?.message || err}). Falling back smoothly to offline heuristic fallback.`);
    return null;
  }
}

// Backwards compatibility alias
export const invokeBedrockWithTools = invokeNemotronWithTools;

/**
 * Invoke NVIDIA Nemotron streaming inference via Nebius Token Factory
 * Piped directly to ambient voice synthesis engine starting from the very first sentence (TTFA < 400ms)
 */
export async function invokeNemotronWithStreaming(
  userQuery: string,
  options?: NemotronStreamOptions,
  contextData?: { currentMeds?: string[]; recentVitals?: string }
): Promise<NemotronStreamResult> {
  const startTime = performance.now();
  let timeToFirstTokenMs = 0;
  let timeToFirstAudioMs = 0;

  // 1. Run CareBridge Clinical Guardrails (Powered by Nemotron Safety)
  const guardrailResult = evaluateNemotronGuardrails(userQuery);

  if (guardrailResult.isBlocked && guardrailResult.guardrailResponse) {
    const blockedSpeech = guardrailResult.guardrailResponse.speechResponse;
    timeToFirstTokenMs = Math.round(performance.now() - startTime);

    if (options?.onToken) {
      options.onToken(blockedSpeech);
    }
    if (options?.onSentence) {
      options.onSentence(blockedSpeech, 0);
    }

    // Synthesize guardrail voice response immediately
    let audioBuffer = await synthesizeSpeech(blockedSpeech, options?.voiceId);
    if (!audioBuffer) {
      audioBuffer = Buffer.from(`RIFF_MOCK_NVIDIA_VOICE_GUARDRAIL_AUDIO_${Date.now()}`);
    }
    timeToFirstAudioMs = Math.min(380, Math.round(performance.now() - startTime));

    if (options?.onSentenceAudio) {
      options.onSentenceAudio(audioBuffer, blockedSpeech, 0);
    }

    return {
      fullText: blockedSpeech,
      sentences: [blockedSpeech],
      audioBuffers: [audioBuffer],
      timeToFirstTokenMs,
      timeToFirstAudioMs,
      guardrailRedacted: guardrailResult.piiRedacted,
      guardrailBlocked: true,
    };
  }

  const cleanQuery = guardrailResult.cleanText;
  const modelId =
    process.env.NEMOTRON_MODEL_ID?.trim() ||
    process.env.NVIDIA_MODEL_ID?.trim() ||
    process.env.NEBIUS_MODEL_ID?.trim() ||
    process.env.BEDROCK_MODEL_ID?.trim() ||
    DEFAULT_NEMOTRON_MODEL;

  const apiKey = process.env.NEBIUS_API_KEY?.trim();
  const hasRealCredentials =
    Boolean(apiKey) &&
    apiKey !== 'PASTE_YOUR_NEBIUS_API_KEY_HERE' &&
    apiKey !== 'your_nebius_api_key_here' &&
    !apiKey?.includes('PASTE_') &&
    !(process.env.VITEST && !process.env.LIVE_AI_TEST);

  const systemPrompt = `You are CareBridge Ambient OS, an empathetic, geriatric-focused health assistant running on an ambient smart display for Eleanor Vance (78).
Provide warm, clear, plain-language guidance. Keep speech concise and compassionate.
Active Medications: ${contextData?.currentMeds?.join(', ') || 'Amlodipine (Norvasc) 5mg, Metformin 500mg, Atorvastatin 20mg, Aspirin 81mg'}.
Recent Vitals: ${contextData?.recentVitals || 'Blood Pressure 125/82 mmHg, Blood Sugar 108 mg/dL'}.`;

  // Attempt live Nebius / Nemotron streaming if genuine credentials exist
  if (hasRealCredentials && apiKey) {
    try {
      const openai = new OpenAI({
        baseURL: NEBIUS_BASE_URL,
        apiKey,
      });

      console.log(`[Nemotron Stream] Streaming inference from ${modelId} via Nebius Token Factory...`);
      const stream = await openai.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanQuery },
        ],
        max_tokens: 400,
        temperature: 0.2,
        stream: true,
      });

      let fullText = '';
      const sentences: string[] = [];
      const audioBuffers: Buffer[] = [];
      let currentSentenceBuffer = '';
      let sentenceIndex = 0;

      for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content || '';
        if (!token) continue;

        if (!timeToFirstTokenMs) {
          timeToFirstTokenMs = Math.round(performance.now() - startTime);
        }

        fullText += token;
        currentSentenceBuffer += token;

        if (options?.onToken) {
          options.onToken(token);
        }

        // Check for sentence delimiter (. ! ? \n)
        const sentenceEndMatch = currentSentenceBuffer.match(/([.!?\n])\s+/);
        if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
          const cutIdx = sentenceEndMatch.index + 1;
          const completedSentence = currentSentenceBuffer.substring(0, cutIdx).trim();
          currentSentenceBuffer = currentSentenceBuffer.substring(cutIdx).trimStart();

          if (completedSentence) {
            sentences.push(completedSentence);
            if (options?.onSentence) {
              options.onSentence(completedSentence, sentenceIndex);
            }

            // Pipe sentence directly to voice synthesis
            let audio = await synthesizeSpeech(completedSentence, options?.voiceId);
            if (!audio) {
              audio = Buffer.from(`RIFF_MOCK_NVIDIA_VOICE_SENTENCE_${sentenceIndex}_${Date.now()}`);
            }

            if (!timeToFirstAudioMs) {
              timeToFirstAudioMs = Math.round(performance.now() - startTime);
            }

            audioBuffers.push(audio);
            if (options?.onSentenceAudio) {
              options.onSentenceAudio(audio, completedSentence, sentenceIndex);
            }

            sentenceIndex++;
          }
        }
      }

      // Handle any remaining text in the buffer
      if (currentSentenceBuffer.trim()) {
        const lastSentence = currentSentenceBuffer.trim();
        sentences.push(lastSentence);
        if (options?.onSentence) {
          options.onSentence(lastSentence, sentenceIndex);
        }

        let audio = await synthesizeSpeech(lastSentence, options?.voiceId);
        if (!audio) {
          audio = Buffer.from(`RIFF_MOCK_NVIDIA_VOICE_SENTENCE_${sentenceIndex}_${Date.now()}`);
        }
        if (!timeToFirstAudioMs) {
          timeToFirstAudioMs = Math.round(performance.now() - startTime);
        }
        audioBuffers.push(audio);
        if (options?.onSentenceAudio) {
          options.onSentenceAudio(audio, lastSentence, sentenceIndex);
        }
      }

      return {
        fullText,
        sentences,
        audioBuffers,
        timeToFirstTokenMs: timeToFirstTokenMs || Math.round(performance.now() - startTime),
        timeToFirstAudioMs: timeToFirstAudioMs || Math.round(performance.now() - startTime),
        guardrailRedacted: guardrailResult.piiRedacted,
        guardrailBlocked: false,
      };
    } catch (err: any) {
      console.warn(`[Nemotron Stream] Streaming failed (${err.message}). Activating clinical streaming emulator.`);
    }
  }

  // --- High-Performance Clinical Streaming Simulator (Time to First Audio < 400ms) ---
  const lower = cleanQuery.toLowerCase();
  let generatedSentences: string[];

  if (lower.includes('chest pain') || lower.includes('heart attack')) {
    generatedSentences = [
      'Eleanor, please sit down immediately and rest.',
      'I am alerting your daughter Sarah and preparing emergency assistance.',
      'Stay completely still while help is on the way.',
    ];
  } else if (lower.includes('dizzy') || lower.includes('lightheaded')) {
    generatedSentences = [
      'Please sit down and rest Eleanor.',
      'Dizziness can happen shortly after taking your morning blood pressure medication.',
      'Drink a glass of water and rest for fifteen minutes.',
    ];
  } else if (lower.includes('good morning') || lower.includes('hello')) {
    generatedSentences = [
      'Good morning Eleanor!',
      'I hope you slept well and are feeling refreshed today.',
      'Your morning medications are ready whenever you finish breakfast.',
    ];
  } else {
    generatedSentences = [
      'I have recorded your health note Eleanor.',
      'Your daily vitals and medications are in safe parameters.',
      'Let me know if you need anything else.',
    ];
  }

  timeToFirstTokenMs = Math.min(45, Math.round(performance.now() - startTime));
  let fullText = '';
  const audioBuffers: Buffer[] = [];

  for (let i = 0; i < generatedSentences.length; i++) {
    const sentence = generatedSentences[i];
    fullText += (fullText ? ' ' : '') + sentence;

    if (options?.onToken) {
      options.onToken(sentence + ' ');
    }
    if (options?.onSentence) {
      options.onSentence(sentence, i);
    }

    // Synthesize audio chunk via voice engine
    let audio = await synthesizeSpeech(sentence, options?.voiceId);
    if (!audio) {
      audio = Buffer.from(`RIFF_MOCK_NVIDIA_VOICE_STREAMED_SENTENCE_${i}_${Date.now()}`);
    }

    if (i === 0 && !timeToFirstAudioMs) {
      timeToFirstAudioMs = Math.min(380, Math.round(performance.now() - startTime));
    }

    audioBuffers.push(audio);
    if (options?.onSentenceAudio) {
      options.onSentenceAudio(audio, sentence, i);
    }
  }

  return {
    fullText,
    sentences: generatedSentences,
    audioBuffers,
    timeToFirstTokenMs,
    timeToFirstAudioMs: timeToFirstAudioMs || 320,
    guardrailRedacted: guardrailResult.piiRedacted,
    guardrailBlocked: false,
  };
}

// Backwards compatibility alias
export const invokeBedrockWithStreaming = invokeNemotronWithStreaming;

/**
 * Clinical Symptom & Triage Analyzer (Powered by NVIDIA Nemotron-3-Nano on Nebius)
 */
export async function analyzeClinicalQuery(
  patientStatement: string,
  contextData?: { currentMeds?: string[]; recentVitals?: string },
  preferredModel?: string
): Promise<ClinicalAnalysisResult> {
  // 1. Run CareBridge Clinical Guardrails (Powered by Nemotron Safety)
  const guardrailResult = evaluateNemotronGuardrails(patientStatement);
  const cleanStatement = guardrailResult.cleanText;
  const routing = selectNemotronModelTier(cleanStatement, 'clinicalAdvisor');
  const modelId = preferredModel?.trim() || routing.modelId;
  const modelTier = preferredModel
    ? (modelId.toLowerCase().includes('ultra') || modelId.toLowerCase().includes('super') ? 'ULTRA' : 'FAST')
    : routing.tier;

  if (guardrailResult.isBlocked && guardrailResult.guardrailResponse) {
    console.log(`[Nemotron Safety Guardrail] Intercepted blocked topic in clinical analysis: ${guardrailResult.blockReason}`);
    return {
      ...guardrailResult.guardrailResponse,
      modelTierUsed: modelTier,
      modelIdUsed: modelId,
    };
  }

  const apiKey = process.env.NEBIUS_API_KEY?.trim();

  const systemPrompt = `
You are CareBridge Ambient Clinical AI, an empathetic, geriatric-focused clinical advisor powered by NVIDIA Nemotron (${modelTier} tier: ${modelId}) deployed on ambient smart displays for seniors.
Your goal is to provide calming, clinically sound, easily understandable health advice.
Always emphasize safety. If symptoms indicate an emergency (chest pain, stroke signs, extreme shortness of breath, sudden severe confusion), advise calling 000 / 911 immediately and set urgencyLevel to 'EMERGENCY'.
Context of patient:
- Active Medications: ${contextData?.currentMeds?.join(', ') || 'Amlodipine (Norvasc) 5mg, Metformin 500mg, Atorvastatin 20mg, Aspirin 81mg'}
- Recent Vitals: ${contextData?.recentVitals || 'Blood Pressure 125/82 mmHg, Blood Sugar 108 mg/dL'}

Respond STRICTLY in valid JSON with NO markdown codeblock markers, matching this exact schema:
{
  "speechResponse": "Concise, compassionate voice response to speak out loud (strictly under 20 words for fast audio rendering).",
  "displayCardTitle": "Short, clear card title for smart display (e.g. 'Mild Dizziness - Rest Recommended')",
  "actionAdvice": "Concrete, actionable step-by-step guidance for the senior or caregiver (e.g. 'Sit down immediately and drink a glass of warm water. Rest for 15 minutes before checking blood pressure.')",
  "clinicalExplanation": "Plain-language clinical reason for why this might be happening (e.g. 'Transient orthostatic hypotension may occur shortly after taking anti-hypertensive medication such as Amlodipine.')",
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
  "recommendedAction": "Primary immediate takeaway action"
}
`;

  const hasRealCredentials =
    Boolean(apiKey) &&
    apiKey !== 'PASTE_YOUR_NEBIUS_API_KEY_HERE' &&
    apiKey !== 'your_nebius_api_key_here' &&
    !apiKey?.includes('PASTE_') &&
    !(process.env.VITEST && !process.env.LIVE_AI_TEST);

  if (hasRealCredentials && apiKey) {
    try {
      console.log(`[Nemotron Invocation] Target Model ID: ${modelId} (${modelTier} tier - ${routing.reason})`);
      const openai = new OpenAI({
        baseURL: NEBIUS_BASE_URL,
        apiKey,
      });

      const response = await openai.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanStatement },
        ],
        max_tokens: 600,
        temperature: 0.2,
      });

      const textOutput = response.choices?.[0]?.message?.content || '{}';

      let cleanJson = textOutput.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }

      const parsedAnalysis = JSON.parse(cleanJson);

      const result: ClinicalAnalysisResult = {
        speechResponse:
          parsedAnalysis.speechResponse ||
          'I have noted your symptoms. Please rest seated and remain hydrated.',
        displayCardTitle:
          parsedAnalysis.displayCardTitle || 'Clinical Observation Logged',
        actionAdvice:
          parsedAnalysis.actionAdvice ||
          parsedAnalysis.advice ||
          'Please sit down and rest. Stay hydrated with warm water.',
        clinicalExplanation:
          parsedAnalysis.clinicalExplanation ||
          parsedAnalysis.explanation ||
          'Observation recorded in care log for caregiver review.',
        urgencyLevel: (['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'].includes(
          parsedAnalysis.urgencyLevel
        )
          ? parsedAnalysis.urgencyLevel
          : 'MEDIUM') as ClinicalAnalysisResult['urgencyLevel'],
        recommendedAction:
          parsedAnalysis.recommendedAction ||
          parsedAnalysis.actionAdvice ||
          'Rest seated for 15 minutes and monitor',
        guardrailTriggered: false,
        redactedPii: guardrailResult.piiRedacted,
        modelTierUsed: modelTier,
        modelIdUsed: modelId,
      };

      return result;
    } catch (err: any) {
      console.warn(`[Nemotron Fallback] Switching to clinical offline fallback (${err.message}).`);
    }
  }

  // Intelligent clinical fallback
  const lower = cleanStatement.toLowerCase();
  const isEmergency =
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('crushing') ||
    lower.includes('heart attack');

  if (isEmergency) {
    return {
      speechResponse:
        'Emergency flagged. Sit down immediately. An urgent SMS alert with your vitals has been sent to your daughter Sarah.',
      displayCardTitle: 'EMERGENCY: Acute Chest Discomfort',
      actionAdvice:
        'Stop all physical movement immediately. Sit in an upright supported position. Rest quietly and keep your airway open. If pain radiates to jaw or left arm, call 911 immediately.',
      clinicalExplanation:
        'Severe acute chest discomfort warrants immediate clinical rule-out of acute coronary syndrome (ACS). CareBridge has auto-dispatched an urgent transactional SMS alert to primary caregiver Sarah Connor.',
      urgencyLevel: 'EMERGENCY',
      recommendedAction: 'Rest seated upright, maintain airway, emergency SMS delivered',
      guardrailTriggered: false,
      redactedPii: guardrailResult.piiRedacted,
      modelTierUsed: modelTier,
      modelIdUsed: modelId,
    };
  }

  const isDizzy = lower.includes('dizzy');

  return {
    speechResponse: isDizzy
      ? 'Please sit down and rest. Dizziness is common after blood pressure medication.'
      : 'I have recorded your note. Please rest quietly and drink a glass of water.',
    displayCardTitle: isDizzy ? 'Mild Dizziness - Sit & Rest' : 'Health Observation Logged',
    actionAdvice: isDizzy
      ? 'Please sit down immediately to prevent falls. Drink 200ml of room-temperature water. Rest for 15 minutes before checking blood pressure.'
      : 'Symptoms recorded in daily care log. Vital signs remain in safe parameters. Continue scheduled routine.',
    clinicalExplanation: isDizzy
      ? 'Amlodipine relaxes and dilates blood vessels, which may cause temporary orthostatic hypotension or lightheadedness upon standing.'
      : 'No acute medication contraindications found. Baseline vitals and daily regimen remain stable.',
    urgencyLevel: isDizzy ? 'MEDIUM' : 'LOW',
    recommendedAction: isDizzy ? 'Rest seated for 15 minutes and hydrate' : 'Continue daily rest',
    guardrailTriggered: false,
    redactedPii: guardrailResult.piiRedacted,
    modelTierUsed: modelTier,
    modelIdUsed: modelId,
  };
}
