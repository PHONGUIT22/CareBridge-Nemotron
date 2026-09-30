import { invokeNemotronWithTools, invokeBedrockWithTools } from '../ai/nemotronClient.js';
import { getTodayScheduleTool } from './getTodaySchedule.js';
import { logDoseStatusTool } from './logDoseStatus.js';
import { recordVitalsTool } from './recordVitals.js';
import { clinicalAdvisorTool } from './clinicalAdvisor.js';
import { orderRefillTool } from './orderRefill.js';
import { ringDeviceHubTool } from './ringDeviceHub.js';
import { negotiateAdherenceTool } from './negotiateAdherence.js';

export interface AgentTurnRequest {
  query: string;
  context?: {
    currentMeds?: string[];
    recentVitals?: string;
  };
}

export interface AgentTurnResponse {
  success: boolean;
  toolName: string | null;
  toolArgs: Record<string, any> | null;
  toolResult: any | null;
  speechResponse: string;
  offlineFallbackUsed?: boolean;
}

/**
 * Offline Heuristic Fallback Engine:
 * Autonomously parses user intent and parameters from natural voice queries
 * when device is offline or Nebius Token Factory is unreachable.
 */
function resolveOfflineHeuristic(query: string): {
  toolName: string;
  toolArgs: Record<string, any>;
} | null {
  const lower = query.toLowerCase();

  // 0. Medication Refusal / Resistance Intent (negotiateAdherence) - Health Guardians & Sarah Circuit-Breaker
  const isRefusalIntent =
    lower.includes("don't want to take") ||
    lower.includes("dont want to take") ||
    lower.includes("don't want my") ||
    lower.includes("dont want my") ||
    lower.includes("not taking") ||
    lower.includes("won't take") ||
    lower.includes("wont take") ||
    lower.includes("refuse") ||
    lower.includes("hate") ||
    lower.includes("stop giving me") ||
    lower.includes("leave me alone") ||
    lower.includes("no pills") ||
    (lower.includes("skip") && !lower.includes("what") && !lower.includes("status")) ||
    ((lower.includes("later") || lower.includes("delay")) &&
      (lower.includes("pill") || lower.includes("medication") || lower.includes("dose") || lower.includes("medicine") || lower.includes("amlodipine")));

  if (isRefusalIntent) {
    let medicineName = 'Amlodipine (Norvasc) 5mg';
    if (lower.includes('atorvastatin') || lower.includes('lipitor')) {
      medicineName = 'Atorvastatin 20mg';
    } else if (lower.includes('metformin')) {
      medicineName = 'Metformin 500mg';
    } else if (lower.includes('aspirin')) {
      medicineName = 'Baby Aspirin Cardio 81mg';
    } else if (lower.includes('amlodipine') || lower.includes('norvasc')) {
      medicineName = 'Amlodipine (Norvasc) 5mg';
    }

    let refusalReason = 'Patient resistance expressed';
    if (lower.includes('bitter') || lower.includes('taste')) {
      refusalReason = 'Tastes bitter';
    } else if (lower.includes('fine') || lower.includes('feel fine') || lower.includes('healthy')) {
      refusalReason = 'Feeling fine today';
    } else if (lower.includes('later')) {
      refusalReason = "I'll do it later";
    } else if (lower.includes('hate') || lower.includes('refuse') || lower.includes('leave me alone')) {
      refusalReason = 'Explicit vocal refusal';
    }

    // Explicit or hard refusal triggers Sarah Circuit-Breaker (turnCount >= 2)
    const isExplicitHardRefusal =
      lower.includes('refuse') ||
      lower.includes('leave me alone') ||
      lower.includes('never') ||
      lower.includes('stop giving me');

    const turnCount = isExplicitHardRefusal ? 2 : 1;

    let personaId = 'grandson_leo';
    if (lower.includes('betty') || lower.includes('nurse')) {
      personaId = 'nurse_betty';
    } else if (lower.includes('reynolds') || lower.includes('doctor') || lower.includes('dr')) {
      personaId = 'dr_reynolds';
    } else if (lower.includes('miller') || lower.includes('sergeant') || lower.includes('sgt')) {
      personaId = 'sergeant_miller';
    } else if (lower.includes('leo') || lower.includes('grandson')) {
      personaId = 'grandson_leo';
    }

    return {
      toolName: 'negotiateAdherence',
      toolArgs: {
        medicineName,
        refusalReason,
        personaId,
        turnCount,
      },
    };
  }

  const isQuestion =
    lower.startsWith('can i') ||
    lower.startsWith('should i') ||
    lower.startsWith('could i') ||
    lower.startsWith('may i') ||
    lower.startsWith('is it safe') ||
    lower.startsWith('what happens if') ||
    lower.includes('safe to') ||
    lower.includes('interaction') ||
    lower.includes('contraindication') ||
    lower.includes('side effect') ||
    lower.includes('together') ||
    lower.includes('combine');

  // 1. Schedule inquiry intent (getTodaySchedule) - Priority if query mentions schedule/calendar
  const isScheduleIntent =
    lower.includes('schedule') ||
    lower.includes('what pill') ||
    lower.includes('what medicine') ||
    lower.includes('upcoming') ||
    lower.includes('next dose') ||
    lower.includes('calendar') ||
    (!isQuestion &&
      lower.includes('today') &&
      !lower.includes('took') &&
      !lower.includes('taken') &&
      !lower.includes('skip'));

  if (isScheduleIntent) {
    return {
      toolName: 'getTodaySchedule',
      toolArgs: {},
    };
  }

  // 2. Dose intake / skipped intent (logDoseStatus)
  const isDoseIntent =
    !isQuestion &&
    (lower.includes('took') ||
      lower.includes('taken') ||
      lower.includes('had my') ||
      lower.includes('drank') ||
      lower.includes('swallowed') ||
      lower.includes('skip') ||
      lower.includes('skipped') ||
      lower.includes('morning pills') ||
      lower.includes('morning pill') ||
      lower.includes('evening pills') ||
      ((lower.includes('take') || lower.includes('log') || lower.includes('mark')) &&
        (lower.includes('pill') || lower.includes('dose') || lower.includes('medication') || lower.includes('medicine') || lower.includes('amlodipine') || lower.includes('atorvastatin') || lower.includes('metformin') || lower.includes('aspirin'))));

  if (isDoseIntent) {
    const status: 'taken' | 'skipped' =
      lower.includes('skip') ? 'skipped' : 'taken';

    let medicineName: string | undefined = undefined;
    if (lower.includes('amlodipine') || lower.includes('norvasc')) {
      medicineName = 'Amlodipine';
    } else if (lower.includes('atorvastatin') || lower.includes('lipitor')) {
      medicineName = 'Atorvastatin';
    } else if (lower.includes('metformin')) {
      medicineName = 'Metformin';
    } else if (lower.includes('aspirin')) {
      medicineName = 'Aspirin';
    } else if (lower.includes('morning')) {
      medicineName = 'Amlodipine';
    }

    return {
      toolName: 'logDoseStatus',
      toolArgs: {
        medicineName: medicineName || 'Amlodipine',
        status,
      },
    };
  }

  // 3. Amazon Pharmacy refill intent (orderRefill)
  const isRefillIntent =
    lower.includes('refill') ||
    lower.includes('reorder') ||
    lower.includes('re-order') ||
    lower.includes('order') ||
    lower.includes('buy') ||
    lower.includes('out of') ||
    lower.includes('running low');

  if (isRefillIntent) {
    let medicineName = 'Atorvastatin';
    if (lower.includes('amlodipine')) medicineName = 'Amlodipine';
    else if (lower.includes('metformin')) medicineName = 'Metformin';
    else if (lower.includes('aspirin')) medicineName = 'Aspirin';
    else if (lower.includes('atorvastatin') || lower.includes('lipitor')) medicineName = 'Atorvastatin';

    return {
      toolName: 'orderRefill',
      toolArgs: {
        medicineName,
        quantity: 30,
      },
    };
  }

  // 4. Biometric vitals recording intent (recordVitals)
  const isVitalsIntent =
    lower.includes('blood pressure') ||
    lower.includes('bp') ||
    lower.includes('systolic') ||
    lower.includes('diastolic') ||
    lower.includes('heart rate') ||
    lower.includes('pulse') ||
    lower.includes('blood sugar') ||
    lower.includes('glucose');

  if (isVitalsIntent) {
    const args: Record<string, any> = {};

    // Extract blood pressure (e.g. "120/80" or "120 over 80")
    const bpMatch = query.match(/(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/i);
    if (bpMatch) {
      args.systolic = parseInt(bpMatch[1], 10);
      args.diastolic = parseInt(bpMatch[2], 10);
    }

    // Extract blood glucose (e.g. "blood sugar 105" or "sugar is 110")
    const sugarMatch = query.match(/(?:sugar|glucose)(?:\s*(?:is|:))?\s*(\d{2,3})/i);
    if (sugarMatch) {
      args.bloodSugar = parseInt(sugarMatch[1], 10);
    }

    // Extract heart rate (e.g. "heart rate 72" or "pulse 75")
    const hrMatch = query.match(/(?:pulse|heart rate)(?:\s*(?:is|:))?\s*(\d{2,3})/i);
    if (hrMatch) {
      args.heartRate = parseInt(hrMatch[1], 10);
    }

    // If no specific numbers detected, provide safe clinical baseline defaults
    if (Object.keys(args).length === 0) {
      args.systolic = 120;
      args.diastolic = 80;
    }

    return {
      toolName: 'recordVitals',
      toolArgs: args,
    };
  }

  // 5. Clinical symptoms, drug interactions, or health concerns intent (clinicalAdvisor)
  const isClinicalIntent =
    lower.includes('dizzy') ||
    lower.includes('dizziness') ||
    lower.includes('pain') ||
    lower.includes('hurt') ||
    lower.includes('ache') ||
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('fall') ||
    lower.includes('headache') ||
    lower.includes('nausea') ||
    lower.includes('feel') ||
    lower.includes('warfarin') ||
    lower.includes('aspirin') ||
    lower.includes('interaction') ||
    lower.includes('contraindication') ||
    lower.includes('safe to take') ||
    lower.includes('side effect') ||
    (isQuestion && (lower.includes('take') || lower.includes('medicine') || lower.includes('pill') || lower.includes('drug') || lower.includes('with')));

  if (isClinicalIntent) {
    return {
      toolName: 'clinicalAdvisor',
      toolArgs: { query },
    };
  }

  // 6. Ring smart ecosystem intent (Ring Doorbell Pro / Smart Lock)
  const isRingIntent =
    lower.includes('ring') ||
    lower.includes('doorbell') ||
    lower.includes('porch') ||
    lower.includes('front door') ||
    lower.includes('door') ||
    lower.includes('parcel') ||
    lower.includes('package');

  if (isRingIntent) {
    const isUnlock =
      lower.includes('unlock') ||
      lower.includes('open door') ||
      lower.includes('paramedic') ||
      lower.includes('emergency');

    return {
      toolName: 'ringDeviceHub',
      toolArgs: {
        action: isUnlock ? 'triggerEmergencyDoorUnlock' : 'checkFrontPorch',
        reason: isUnlock ? 'Emergency Paramedic Access Request' : 'Front Porch Security & Package Inspection',
      },
    };
  }

  return null;
}

/**
 * Executes the selected MCP Tool against the SQLite Database
 */
async function executeTool(toolName: string, toolArgs: Record<string, any>): Promise<{
  toolResult: any;
  speechResponse: string;
}> {
  let toolResult: any = null;
  let speechResponse = '';

  switch (toolName) {
    case 'getTodaySchedule': {
      toolResult = await getTodayScheduleTool.handler(toolArgs as any);
      speechResponse = toolResult.speechSummary || 'Here is your daily medication schedule.';
      break;
    }
    case 'logDoseStatus': {
      toolResult = await logDoseStatusTool.handler(toolArgs as any);
      speechResponse =
        toolResult.speechText ||
        `I have recorded your ${toolArgs.medicineName || 'medication'} as ${toolArgs.status || 'taken'}.`;
      break;
    }
    case 'recordVitals': {
      toolResult = await recordVitalsTool.handler(toolArgs as any);
      speechResponse = toolResult.speechText || 'I have recorded your vital signs.';
      break;
    }
    case 'clinicalAdvisor': {
      toolResult = await clinicalAdvisorTool.handler(toolArgs as any);
      speechResponse = toolResult.speechResponse || 'I have noted your symptoms. Please rest and stay hydrated.';
      break;
    }
    case 'orderRefill': {
      toolResult = await orderRefillTool.handler(toolArgs as any);
      speechResponse = toolResult.speechText || 'Your Amazon Pharmacy refill order has been placed.';
      break;
    }
    case 'ringDeviceHub': {
      toolResult = await ringDeviceHubTool.handler(toolArgs as any);
      speechResponse = toolResult.speechText || 'Ring Doorbell front porch camera checked.';
      break;
    }
    case 'negotiateAdherence': {
      toolResult = await negotiateAdherenceTool.handler(toolArgs as any);
      speechResponse = toolResult.speechResponse || 'I am here with you Eleanor.';
      break;
    }
    default:
      throw new Error(`MCP Tool '${toolName}' is not supported in the system.`);
  }

  return { toolResult, speechResponse };
}

/**
 * Primary entry point for voice turn orchestration (Voice Turn Orchestrator)
 */
export async function handleAgentTurn(req: AgentTurnRequest): Promise<AgentTurnResponse> {
  const { query, context } = req;
  const trimmedQuery = query.trim();

  // 1. Attempt NVIDIA Nemotron-3-Nano Native Tool-Use via Nebius Token Factory
  let decision = await invokeNemotronWithTools(trimmedQuery, context);

  // 2. If Nemotron returns stop_reason with toolCall
  if (decision && decision.toolCall) {
    const { name: toolName, input: toolArgs } = decision.toolCall;

    try {
      if (toolName === 'negotiateAdherence') {
        const lowerQuery = trimmedQuery.toLowerCase();
        if (
          lowerQuery.includes('refuse') ||
          lowerQuery.includes('leave me alone') ||
          lowerQuery.includes('never') ||
          lowerQuery.includes('stop giving me')
        ) {
          toolArgs.turnCount = Math.max(Number(toolArgs.turnCount) || 1, 2);
          toolArgs.refusalReason = toolArgs.refusalReason || 'Explicit vocal refusal';
        }
      }

      const { toolResult, speechResponse } = await executeTool(toolName, toolArgs);

      return {
        success: true,
        toolName,
        toolArgs,
        toolResult,
        speechResponse:
          toolName === 'negotiateAdherence'
            ? speechResponse
            : (decision.textResponse || speechResponse),
        offlineFallbackUsed: false,
      };
    } catch (toolExecErr: any) {
      console.warn(`[agentTurnHandler] Error executing tool '${toolName}':`, toolExecErr.message);
    }
  }

  // 3. If Nemotron responded with pure conversational text ('text') and no tool call
  if (decision && decision.textResponse && !decision.toolCall) {
    return {
      success: true,
      toolName: null,
      toolArgs: null,
      toolResult: null,
      speechResponse: decision.textResponse,
      offlineFallbackUsed: false,
    };
  }

  // 4. If Nebius credentials unavailable, network timeout, or Nemotron returned null -> Activate Heuristic Fallback
  console.info('[agentTurnHandler] Activating Offline Heuristic Fallback for query:', trimmedQuery);
  const heuristic = resolveOfflineHeuristic(trimmedQuery);

  if (heuristic) {
    const { toolResult, speechResponse } = await executeTool(
      heuristic.toolName,
      heuristic.toolArgs
    );

    return {
      success: true,
      toolName: heuristic.toolName,
      toolArgs: heuristic.toolArgs,
      toolResult,
      speechResponse,
      offlineFallbackUsed: true,
    };
  }

  // 5. Ambient conversational fallback when offline
  return {
    success: true,
    toolName: null,
    toolArgs: null,
    toolResult: null,
    speechResponse: 'I am here with you Eleanor. You can tell me when you take your pills, or check your schedule.',
    offlineFallbackUsed: true,
  };
}
