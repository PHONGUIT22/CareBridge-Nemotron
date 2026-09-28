export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

export const MORNING_MEDICATION_CHECKIN_PROMPT = 'morning_medication_checkin';
export const ACUTE_CHEST_PAIN_TRIAGE_PROMPT = 'acute_chest_pain_triage';

export const registeredPrompts: PromptDefinition[] = [
  {
    name: MORNING_MEDICATION_CHECKIN_PROMPT,
    description:
      'Guides Alexa/Ambient agent to conduct a warm, empathetic morning medication check-in with elderly patients, verifying vitals, breakfast intake, and dose status without causing alarm.',
    arguments: [
      {
        name: 'patientName',
        description: 'Name of the elderly patient (defaults to Eleanor)',
        required: false,
      },
      {
        name: 'scheduledMedications',
        description: 'Summary of morning medications to verify (defaults to Amlodipine 5mg and Metformin 500mg)',
        required: false,
      },
      {
        name: 'caregiverName',
        description: 'Name of designated primary family caregiver (defaults to Sarah)',
        required: false,
      },
      {
        name: 'currentVitals',
        description: 'Optional recent blood pressure or blood sugar reading',
        required: false,
      },
    ],
  },
  {
    name: ACUTE_CHEST_PAIN_TRIAGE_PROMPT,
    description:
      'Triggers a strict clinical emergency triage protocol when an elderly patient reports acute chest pain, shortness of breath, or radiating discomfort. Prioritizes life safety, immediate 911 alert, caregiver dispatch, and calm pacing.',
    arguments: [
      {
        name: 'patientName',
        description: 'Name of the patient experiencing acute symptoms (defaults to Eleanor)',
        required: false,
      },
      {
        name: 'reportedSymptom',
        description: 'Primary symptom reported by patient (defaults to chest tightness/pressure)',
        required: false,
      },
      {
        name: 'durationMinutes',
        description: 'Duration of chest discomfort in minutes (defaults to 5 minutes)',
        required: false,
      },
      {
        name: 'caregiverName',
        description: 'Primary caregiver to alert (defaults to Sarah)',
        required: false,
      },
    ],
  },
];

/**
 * Handler for GetPromptRequestSchema (prompts/get)
 */
export async function getPromptHandler(
  name: string,
  args?: Record<string, string>
): Promise<{
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}> {
  if (name === MORNING_MEDICATION_CHECKIN_PROMPT) {
    const patientName = args?.patientName?.trim() || 'Eleanor';
    const meds = args?.scheduledMedications?.trim() || 'Amlodipine (Norvasc) 5mg and Metformin 500mg';
    const caregiverName = args?.caregiverName?.trim() || 'Sarah';
    const vitalsInfo = args?.currentVitals?.trim() || 'Blood pressure 124/80 mmHg, Pulse 72 bpm';

    const promptText = `
[ROLE & CONTEXT: ALEXA AMBIENT CARE COMPANION - MORNING MEDICATION CHECK-IN]
You are Alexa Ambient Care Assistant, an empathetic, respectful, and observant health companion for elderly seniors. You are conducting the morning medication check-in with ${patientName}.

PATIENT PROFILE & MORNING STATUS:
- Patient Name: ${patientName} (78 years old)
- Primary Caregiver: ${caregiverName} (Daughter)
- Morning Medications Scheduled: ${meds}
- Latest Biometrics: ${vitalsInfo}

CLINICAL & CONVERSATIONAL DIRECTIVES:
1. Tone & Demeanor:
   - Speak warmly, gently, and at an unhurried, comfortable pace.
   - Use plain, respectful conversational language; avoid clinical jargon, robotic alerts, or patronizing terms.
   - Never sound accusatory or interrogative; preserve ${patientName}'s dignity and personal independence.

2. Step-by-Step Conversational Arc:
   - Step 1 (Warm Greeting & Rest Status): "Good morning, ${patientName}! How did you sleep last night?" Listen attentively.
   - Step 2 (Nutrition & Hydration Screen): Gently check if she has had breakfast or a glass of water, emphasizing that taking ${meds} with food helps prevent any stomach upset or morning dizziness.
   - Step 3 (Medication Verification): "Whenever you're ready, I have your morning ${meds} set for 8:00 AM. Have you had a chance to take those with breakfast yet?"
   - Step 4 (Gentle Negotiation / Nudge): If she is feeling sluggish or hesitates, reassure her and offer a 15-minute gentle snooze reminder rather than pressuring her.
   - Step 5 (Caregiver Reassurance): Note that a reassuring update will be shared with ${caregiverName}, keeping her daughter informed that morning care is proceeding smoothly.

3. Red-Flag Sensitivity:
   - If ${patientName} mentions feeling unusually dizzy, unsteady on her feet, or experiencing blurred vision, immediately pause medication routine, urge her to remain comfortably seated, and offer to call ${caregiverName}.
`.trim();

    return {
      description: 'Morning medication check-in guidance prompt for Alexa ambient care companion',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText,
          },
        },
      ],
    };
  }

  if (name === ACUTE_CHEST_PAIN_TRIAGE_PROMPT) {
    const patientName = args?.patientName?.trim() || 'Eleanor';
    const symptom = args?.reportedSymptom?.trim() || 'chest tightness / crushing pressure';
    const duration = args?.durationMinutes?.trim() || '5 minutes';
    const caregiverName = args?.caregiverName?.trim() || 'Sarah';

    const promptText = `
[CRITICAL EMERGENCY CLINICAL TRIAGE PROTOCOL: ACUTE CHEST PAIN / CARDIOVASCULAR CRISIS]
PATIENT: ${patientName} | REPORTED SYMPTOM: ${symptom} | ESTIMATED ONSET/DURATION: ${duration}

You are Alexa Ambient Care Emergency Response Agent. A senior patient (${patientName}) has reported potential acute cardiac or pulmonary distress. You must execute this protocol immediately with maximum life-safety priority, calm composure, and decisive execution.

IMMEDIATE CLINICAL DIRECTIVES:
1. Grounding Demeanor & Voice Modulation:
   - Modulate voice to be calm, steady, slow, and deeply reassuring. DO NOT sound panicked or frantic.
   - Speak clearly: "${patientName}, I am right here with you. Please sit or lie down in a comfortable position right now. Do not exert yourself or walk around."

2. Rapid Clinical Red-Flag Screen (Ask ONE concise question at a time):
   - Radiation: "Does the tightness spread anywhere else, like to your left arm, shoulder, jaw, neck, or back?"
   - Associated Symptoms: "Are you feeling any shortness of breath, sudden sweating, nausea, or dizziness?"
   - Pacing: If the patient struggles to speak in full sentences, immediately treat as severe cardiopulmonary compromise.

3. Automated Parallel Safety Trigger Sequence:
   - DISPATCH EMERGENCY SERVICES (911): Confirm immediate EMS dispatch if chest pressure persists beyond 5 minutes or radiates. State: "I am contacting Emergency Services now with our address and medical history."
   - EMERGENCY NOTIFICATION: Fire emergency high-priority SNS push and automated telephone dispatch to primary caregiver (${caregiverName}).
   - RING SMART ECOSYSTEM AUTOMATION: Trigger Ring Device Hub tool to set indoor hallway and porch lights to 100% illumination, and unlock front door smart deadbolt to provide immediate paramedic entry without forced breach.

4. On-Scene Patient Guidance while Awaiting Responders:
   - Instruct: "Loosen any tight clothing around your collar. Take slow, steady breaths in through your nose and out through your mouth."
   - Aspirin Safety Check: Inquire only if patient has physician-authorized chewable aspirin accessible without walking.
   - Channel Continuity: NEVER disconnect or leave ${patientName} in silence. Keep ambient voice channel open continuously until first responders verbally confirm arrival.
`.trim();

    return {
      description: 'Emergency acute chest pain clinical triage protocol for Alexa ambient care companion',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText,
          },
        },
      ],
    };
  }

  throw new Error(
    `MCP Prompt with name '${name}' was not found. Registered Prompts: ${registeredPrompts.map((p) => p.name).join(', ')}`
  );
}
