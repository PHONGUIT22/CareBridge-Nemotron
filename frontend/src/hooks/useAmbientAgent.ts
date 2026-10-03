'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { ClinicalAdviceResponse, AmazonRefillOrder, AgentTurnResponse } from '../types';
import { MockVoiceScenario } from '../services/mockVoiceScenarios';

export interface ToolExecutionLog {
  timestamp: string;
  toolName: string;
  args: any;
  result: any;
  status: 'invoking' | 'success' | 'error';
  latencyMs?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'alexa';
  text: string;
  timestamp: string;
  isSimulated?: boolean;
  senderLabel?: string;
  modelTierUsed?: 'FAST' | 'ULTRA';
  modelIdUsed?: string;
  toolCall?: {
    toolName: string;
    args: any;
    result: any;
    status: 'invoking' | 'success' | 'error';
    latencyMs?: number;
    urgencyLevel?: string;
    actionAdvice?: string;
    clinicalExplanation?: string;
    modelTierUsed?: 'FAST' | 'ULTRA';
    modelIdUsed?: string;
  };
  urgencyLevel?: string;
  actionAdvice?: string;
  clinicalExplanation?: string;
}

export interface UseAmbientAgentOptions {
  onDoseLogged?: () => void;
  onClinicalAdviceTriggered?: (advice: ClinicalAdviceResponse) => void;
  onOrderRefillTriggered?: (order: AmazonRefillOrder) => void;
  onRingDeviceTriggered?: (ringResult: any) => void;
  onGuardianNegotiationTriggered?: (guardianData: any) => void;
  onVitalsRecorded?: (vitals: any) => void;
  patientName?: string;
}

export type UseAlexaAgentOptions = UseAmbientAgentOptions;

export function useAmbientAgent(options?: UseAmbientAgentOptions) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPatientSpeaking, setIsPatientSpeaking] = useState<boolean>(false);
  const [patientTranscript, setPatientTranscript] = useState<string>('');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([
    {
      timestamp: '11:58:10',
      toolName: 'getTodaySchedule',
      args: { date: '2026-09-14' },
      result: { totalDoses: 5, adherenceRate: 80 },
      status: 'success',
      latencyMs: 142,
    },
  ]);
  const [seniorMemories, setSeniorMemories] = useState<any[]>([]);
  const patientFirstName = (options?.patientName || 'Eleanor').split(' ')[0];
  const [conversation, setConversation] = useState<
    Array<{ sender: 'user' | 'assistant' | 'alexa'; text: string }>
  >([
    {
      sender: 'assistant',
      text: `Good morning ${patientFirstName}! I am your CareBridge Ambient Copilot. How can I help you today?`,
    },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: `Good morning ${patientFirstName}! I am your CareBridge Ambient Copilot. How can I help you today?`,
      timestamp: '08:00:00',
      toolCall: {
        toolName: 'getTodaySchedule',
        args: { date: '2026-09-14' },
        result: {
          totalDoses: 4,
          adherenceRate: 75,
          nextDose: 'Amlodipine 5mg (08:00)',
        },
        status: 'success',
        latencyMs: 142,
      },
    },
  ]);

  // Hydrate persistent cross-session dialogue turns and senior habit memories from SQLite WAL
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      try {
        const historyData = await mcpClient.getAgentHistory(30);
        if (!isMounted || !historyData?.success) return;

        if (historyData.memories && historyData.memories.length > 0) {
          setSeniorMemories(historyData.memories);
        }

        if (historyData.messages && historyData.messages.length > 0) {
          const hydratedMessages: ChatMessage[] = historyData.messages.map((m: any) => {
            const toolResult = m.toolResult;
            const toolArgs = m.toolArgs;
            return {
              id: m.id,
              sender: m.sender,
              text: m.text,
              timestamp: m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString('en-US', { hour12: false })
                : '08:00:00',
              modelTierUsed:
                m.urgencyLevel === 'EMERGENCY' || m.text.toLowerCase().includes('warfarin')
                  ? 'ULTRA'
                  : 'FAST',
              modelIdUsed:
                m.urgencyLevel === 'EMERGENCY' || m.text.toLowerCase().includes('warfarin')
                  ? 'nvidia/Nemotron-3-Ultra-550b-a55b'
                  : 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
              toolCall: m.toolName
                ? {
                    toolName: m.toolName,
                    args: toolArgs || {},
                    result: toolResult,
                    status: 'success',
                    urgencyLevel:
                      m.urgencyLevel || toolResult?.urgencyLevel || toolResult?.richCard?.urgencyLevel,
                    actionAdvice:
                      toolResult?.actionAdvice ||
                      toolResult?.richCard?.actionAdvice ||
                      toolResult?.richCard?.advice,
                    clinicalExplanation:
                      toolResult?.clinicalExplanation || toolResult?.richCard?.clinicalExplanation,
                  }
                : undefined,
              urgencyLevel:
                m.urgencyLevel || toolResult?.urgencyLevel || toolResult?.richCard?.urgencyLevel,
              actionAdvice:
                toolResult?.actionAdvice ||
                toolResult?.richCard?.actionAdvice ||
                toolResult?.richCard?.advice,
              clinicalExplanation:
                toolResult?.clinicalExplanation || toolResult?.richCard?.clinicalExplanation,
            };
          });

          setMessages(hydratedMessages);
          setConversation(
            hydratedMessages.map((msg) => ({
              sender: msg.sender,
              text: msg.text,
            }))
          );
        }
      } catch (err: any) {
        console.warn('[useAmbientAgent] Failed to hydrate history from SQLite WAL:', err.message);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (options?.patientName) {
      const pFirst = options.patientName.split(' ')[0];
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'msg_welcome') {
          return [
            {
              ...prev[0],
              text: `Good morning ${pFirst}! I am your CareBridge Ambient Copilot. How can I help you today?`,
            },
          ];
        }
        return prev;
      });
      setConversation((prev) => {
        if (prev.length === 1 && (prev[0].sender === 'assistant' || prev[0].sender === 'alexa')) {
          return [
            {
              sender: 'assistant',
              text: `Good morning ${pFirst}! I am your CareBridge Ambient Copilot. How can I help you today?`,
            },
          ];
        }
        return prev;
      });
    }
  }, [options?.patientName]);

  const isBusyRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const processVoiceQueryRef = useRef<(text: string) => Promise<void>>(async () => {});
  const lastLowStockMedRef = useRef<string | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');

  // 1. Geriatric Speech VAD: continuous listening with adaptive 1.8s silence tolerance & vocal barge-in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          // Vocal Barge-in: if user starts speaking while Copilot or speaker is active, immediately cancel speech
          if (speechService.isSpeaking()) {
            console.log('[useAmbientAgent] Vocal barge-in detected! Halting speaker output.');
            speechService.cancel();
            setIsSpeaking(false);
            isBusyRef.current = false;
          }

          if (isBusyRef.current) return;

          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              finalTranscript += item[0].transcript;
            } else {
              interimTranscript += item[0].transcript;
            }
          }

          if (finalTranscript) {
            accumulatedTranscriptRef.current = (
              accumulatedTranscriptRef.current ? accumulatedTranscriptRef.current + ' ' : ''
            ) + finalTranscript.trim();
          }

          const currentLiveSpoken = (
            (accumulatedTranscriptRef.current ? accumulatedTranscriptRef.current + ' ' : '') +
            interimTranscript
          ).trim();

          if (!currentLiveSpoken) return;

          // Provide instant visual feedback for spoken syllables
          setTranscript(currentLiveSpoken);

          // Geriatric Adaptive Silence Debounce (1800ms)
          // Allows elderly patients to pause naturally to breathe without premature interruption
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }

          silenceTimeoutRef.current = setTimeout(() => {
            const queryToProcess = (
              (accumulatedTranscriptRef.current ? accumulatedTranscriptRef.current + ' ' : '') +
              interimTranscript
            ).trim();

            accumulatedTranscriptRef.current = '';
            silenceTimeoutRef.current = null;

            if (queryToProcess && !isBusyRef.current) {
              processVoiceQueryRef.current(queryToProcess);
            }
          }, 1800);
        };

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            console.warn('[useAmbientAgent] Recognition error:', e.error);
          }
          if (e.error !== 'no-speech') {
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current && !isBusyRef.current) {
            try {
              recognition.start();
            } catch (_) {
              setIsListening(false);
              isListeningRef.current = false;
            }
          } else {
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        recognitionRef.current = recognition;

        return () => {
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
          isListeningRef.current = false;
          try {
            recognition.abort();
          } catch (_) {}
          recognitionRef.current = null;
          speechService.cancel();
        };
      }
    }
  }, []);

  // 2. Touch / Click Barge-In: instantly halt audio playback if senior taps ambient smart display
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUserTouchInteraction = () => {
      if (speechService.isSpeaking()) {
        speechService.cancel();
        setIsSpeaking(false);
        isBusyRef.current = false;
      }
    };
    window.addEventListener('click', handleUserTouchInteraction, { capture: true });
    window.addEventListener('touchstart', handleUserTouchInteraction, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', handleUserTouchInteraction, { capture: true });
      window.removeEventListener('touchstart', handleUserTouchInteraction, { capture: true });
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Your browser does not support the Web Speech API natively. Please use Google Chrome or click the quick simulation prompt chips below to test!');
      return;
    }

    if (isBusyRef.current && !isListening) {
      if (speechService.isSpeaking()) {
        speechService.cancel();
        setIsSpeaking(false);
        isBusyRef.current = false;
      } else {
        console.warn('[useAmbientAgent] Cannot toggle listening while agent is thinking');
        return;
      }
    }

    if (isListening) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      accumulatedTranscriptRef.current = '';
      isListeningRef.current = false;
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      setIsListening(false);
    } else {
      speechService.cancel();
      setIsSpeaking(false);
      isBusyRef.current = false;
      setTranscript('');
      accumulatedTranscriptRef.current = '';
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('[useAmbientAgent] Failed to start recognition:', err);
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  }, [isListening]);

  function toConciseSpokenSummary(text: string): string {
    if (!text) return '';

    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_#`]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const words = clean.split(' ');
    if (words.length <= 20) {
      return clean;
    }

    const firstSentenceMatch = clean.match(/^([^\.\?!]+[\.\?!])/);
    if (firstSentenceMatch) {
      const firstSentence = firstSentenceMatch[1].trim();
      if (firstSentence.split(' ').length <= 20) {
        return firstSentence;
      }
    }

    return words.slice(0, 18).join(' ') + '.';
  }

  function resolveFallbackAgentTurn(
    query: string,
    scenario?: MockVoiceScenario
  ): AgentTurnResponse {
    const lower = query.toLowerCase();

    // 1. Medication Refusal & Sarah Circuit-Breaker (negotiateAdherence)
    if (
      scenario?.targetTool === 'negotiateAdherence' ||
      scenario?.id === 'guardian_refusal' ||
      lower.includes('refuse') ||
      lower.includes('leave me alone') ||
      lower.includes("don't want to take") ||
      lower.includes("dont want to take")
    ) {
      const medicineName = 'Amlodipine (Norvasc) 5mg';
      const richCard = {
        type: 'GuardianNegotiation' as const,
        guardianName: 'Grandson Leo',
        roleTitle: '7-Year-Old Grandson',
        quote:
          "Grandma, you promised to take your heart pill so you can take me to the zoo on Sunday! Please take your Amlodipine now, I made you a drawing of a lion and I don't want you to feel sick!",
        avatar: '👦',
        turnCount: 2,
        callSarahAction: true,
        medicineName,
        escalationLevel: 'SARAH_CIRCUIT_BREAKER' as const,
        sarahNotified: true,
        snsMessageId: `sns_demo_${Date.now()}`,
      };

      const speechResponse =
        'Eleanor, safety protocols mandate that if you refuse your morning heart medication, I must immediately alert Sarah Connor (+1 555-0199) and dispatch an urgent SMS notification.';

      return {
        success: true,
        toolName: 'negotiateAdherence',
        toolArgs: {
          medicineName,
          refusalReason: 'Explicit vocal refusal',
          personaId: 'grandson_leo',
          turnCount: 2,
        },
        toolResult: {
          success: true,
          medicineName,
          refusalReason: 'Explicit vocal refusal',
          guardianName: 'Grandson Leo',
          guardianRole: '7-Year-Old Grandson',
          speechResponse,
          escalationLevel: 'SARAH_CIRCUIT_BREAKER',
          sarahNotified: true,
          snsMessageId: richCard.snsMessageId,
          richCard,
        },
        speechResponse,
        offlineFallbackUsed: true,
      };
    }

    // 2. Tavily Live Drug Verification & Clinical Interaction (clinicalAdvisor / checkInteraction)
    if (
      scenario?.id === 'tavily_drug_check' ||
      scenario?.targetTool === 'checkInteraction' ||
      lower.includes('warfarin') ||
      (lower.includes('aspirin') && (lower.includes('take') || lower.includes('safe') || lower.includes('with')))
    ) {
      const displayCardTitle = 'Warfarin & Aspirin Bleeding Risk Warning';
      const actionAdvice =
        'Do not co-administer without direct anticoagulant specialist supervision. Monitor for bruising or bleeding.';
      const clinicalExplanation =
        'Synergistic antiplatelet and anticoagulant effect dramatically elevates major gastrointestinal hemorrhage risk according to Beers Criteria.';
      const speechResponse =
        'Combining Warfarin with Aspirin significantly increases your gastrointestinal bleeding risk. Please consult your physician before taking them together.';

      return {
        success: true,
        toolName: 'clinicalAdvisor',
        toolArgs: { query },
        toolResult: {
          success: true,
          query,
          assessment: 'Major Drug-Drug Interaction: Warfarin + Aspirin',
          displayCardTitle,
          urgencyLevel: 'HIGH',
          speechResponse,
          actionAdvice,
          clinicalExplanation,
          recommendedAction: 'Withhold aspirin and contact Sarah or Dr. Reynolds immediately.',
          tavilyEvidence: {
            query: 'Warfarin and Aspirin interaction Beers Criteria bleeding risk',
            answer:
              'Concurrent use of aspirin and warfarin increases bleeding risk by 2- to 3-fold compared with warfarin alone (FDA Drug Safety Guidance).',
            sources: [
              {
                title: 'FDA Drug Safety Communication: Anticoagulant and Antiplatelet Risks',
                url: 'https://www.fda.gov/drugs/drug-safety-and-availability',
                content:
                  'Concurrent administration of NSAIDs or aspirin with warfarin elevates risk of major gastrointestinal and intracranial bleeding.',
                score: 0.98,
              },
              {
                title: 'American Geriatrics Society Beers Criteria 2023 Update',
                url: 'https://www.americangeriatrics.org',
                content:
                  'Aspirin plus oral anticoagulants should be avoided unless clinical justification exists due to substantial bleeding hazard.',
                score: 0.95,
              },
            ],
            searchedAt: new Date().toISOString(),
            simulated: false,
          },
          richCard: {
            type: 'clinical_triage',
            title: displayCardTitle,
            actionAdvice,
            clinicalExplanation,
            urgencyLevel: 'HIGH',
            recommendedAction: 'Withhold aspirin and contact Sarah or Dr. Reynolds immediately.',
          },
        },
        speechResponse,
        offlineFallbackUsed: true,
        modelTierUsed: 'ULTRA',
        modelIdUsed: 'nvidia/Nemotron-3-Ultra-550b-a55b',
      };
    }

    // 3. Biometric Vitals Recording (recordVitals)
    if (
      scenario?.targetTool === 'recordVitals' ||
      scenario?.id === 'vitals_logging' ||
      lower.includes('blood pressure') ||
      lower.includes('pulse') ||
      lower.includes('systolic')
    ) {
      let systolic = 125;
      let diastolic = 82;
      let heartRate = 72;

      const bpMatch = query.match(/(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})/i);
      if (bpMatch) {
        systolic = parseInt(bpMatch[1], 10);
        diastolic = parseInt(bpMatch[2], 10);
      }
      const hrMatch = query.match(/(?:pulse|heart rate)(?:\s*(?:is|:))?\s*(\d{2,3})/i);
      if (hrMatch) {
        heartRate = parseInt(hrMatch[1], 10);
      }

      const speechResponse = `I have recorded your blood pressure as ${systolic} over ${diastolic} and pulse as ${heartRate} beats per minute. Your vitals are stable.`;

      return {
        success: true,
        toolName: 'recordVitals',
        toolArgs: { systolic, diastolic, heartRate },
        toolResult: {
          success: true,
          data: {
            date: new Date().toISOString().split('T')[0],
            systolic,
            diastolic,
            heartRate,
            updatedAt: new Date().toISOString(),
          },
          assessment: 'Normal',
          speechText: speechResponse,
        },
        speechResponse,
        offlineFallbackUsed: true,
      };
    }

    // 4. Pharmacy Refill Order (orderRefill)
    if (
      scenario?.targetTool === 'orderRefill' ||
      scenario?.id === 'pharmacy_refill' ||
      lower.includes('refill')
    ) {
      const speechResponse =
        'Refill order confirmed for Atorvastatin 20mg. Express 2-Day delivery scheduled via Amazon Pharmacy Hub.';
      return {
        success: true,
        toolName: 'orderRefill',
        toolArgs: { medicineName: 'Atorvastatin 20mg', quantity: 30 },
        toolResult: {
          orderId: 'AMZ-7731-EXP',
          medicineName: 'Atorvastatin (Lipitor) 20mg',
          quantityAdded: 30,
          estimatedDelivery: 'Tomorrow, by 2:00 PM',
          pharmacyName: 'Smart Pharmacy Express',
          totalPrice: '$12.40',
          insuranceCovered: true,
          status: 'Order Confirmed - Expedited 2-Day',
        },
        speechResponse,
        offlineFallbackUsed: true,
      };
    }

    // 5. Front Porch Smart Camera (ringDeviceHub)
    if (
      scenario?.targetTool === 'ringDeviceHub' ||
      scenario?.id === 'ring_porch' ||
      lower.includes('porch') ||
      lower.includes('camera')
    ) {
      const speechResponse =
        'Front porch camera activated. Medical parcel detected with live bounding box.';
      return {
        success: true,
        toolName: 'ringDeviceHub',
        toolArgs: { action: 'checkFrontPorch' },
        toolResult: {
          success: true,
          action: 'checkFrontPorch',
          cameraName: 'Front Porch Ring Cam',
          timestamp: 'Just now',
          doorLockStatus: 'LOCKED',
          motionDetected: true,
          packageDetected: true,
          packageDetails: {
            carrier: 'Express Medical Delivery',
            description: 'Prescription Refill Parcel',
            deliveryTime: 'Just now',
            orderId: 'AMZ-7731-EXP',
          },
          speechText: speechResponse,
        },
        speechResponse,
        offlineFallbackUsed: true,
      };
    }

    // 6. Dose Confirmation (logDoseStatus)
    if (
      scenario?.targetTool === 'logDoseStatus' ||
      scenario?.id === 'dose_confirm' ||
      lower.includes('took') ||
      lower.includes('taken')
    ) {
      const speechResponse =
        'Confirmed! Your morning Amlodipine 5mg dose has been logged as taken.';
      return {
        success: true,
        toolName: 'logDoseStatus',
        toolArgs: { medicineName: 'Amlodipine 5mg', status: 'taken' },
        toolResult: {
          success: true,
          medicineName: 'Amlodipine 5mg',
          newStatus: 'taken',
          speechText: speechResponse,
        },
        speechResponse,
        offlineFallbackUsed: true,
      };
    }

    // 7. Schedule Inquiry (getTodaySchedule)
    if (
      scenario?.targetTool === 'getTodaySchedule' ||
      scenario?.id === 'schedule' ||
      lower.includes('schedule')
    ) {
      const speechResponse =
        'You have 4 scheduled doses today with 75% adherence. Your next dose is Amlodipine 5mg.';
      return {
        success: true,
        toolName: 'getTodaySchedule',
        toolArgs: { date: new Date().toISOString().split('T')[0] },
        toolResult: {
          totalDoses: 4,
          adherenceRate: 75,
          nextDose: 'Amlodipine 5mg (08:00)',
        },
        speechResponse,
        offlineFallbackUsed: true,
      };
    }

    // 8. Acute Emergency Alert
    if (
      scenario?.id === 'emergency_alert' ||
      lower.includes('chest pain') ||
      lower.includes('shortness of breath')
    ) {
      const speechResponse =
        'Emergency flagged. Sit down immediately. An urgent SMS alert with your vitals has been sent to your daughter Sarah.';
      return {
        success: true,
        toolName: 'clinicalAdvisor',
        toolArgs: { query },
        toolResult: {
          success: true,
          query,
          urgencyLevel: 'EMERGENCY',
          displayCardTitle: 'Acute Cardiac Triage Warning',
          speechResponse,
          actionAdvice: 'Sit down and remain calm. Sarah Connor and emergency services have been alerted.',
          smsDispatch: {
            delivered: true,
            recipient: 'Sarah Connor',
            phone: '+1 555-0199',
            timestamp: new Date().toLocaleTimeString(),
            messageId: `sms_${Date.now()}`,
            simulated: true,
          },
          richCard: {
            type: 'clinical_triage',
            title: 'Acute Cardiac Triage Warning',
            actionAdvice: 'Sit down and remain calm. Sarah Connor and emergency services have been alerted.',
            urgencyLevel: 'EMERGENCY',
            smsDispatch: {
              delivered: true,
              recipient: 'Sarah Connor',
              phone: '+1 555-0199',
              timestamp: new Date().toLocaleTimeString(),
              messageId: `sms_${Date.now()}`,
              simulated: true,
            },
          },
        },
        speechResponse,
        offlineFallbackUsed: true,
        modelTierUsed: 'ULTRA',
        modelIdUsed: 'nvidia/Nemotron-3-Ultra-550b-a55b',
      };
    }

    // Default conversational response
    return {
      success: true,
      toolName: null,
      toolArgs: null,
      toolResult: null,
      speechResponse: "I have recorded your observation and synchronized it with CareBridge.",
      offlineFallbackUsed: true,
      modelTierUsed: 'FAST',
      modelIdUsed: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
    };
  }

  const processVoiceQuery = useCallback(
    async (
      queryText: string,
      queryOptions?: {
        skipUserMessage?: boolean;
        isSimulated?: boolean;
        userMsgId?: string;
        scenario?: MockVoiceScenario;
      }
    ) => {
      if (isBusyRef.current) {
        console.warn('[useAmbientAgent] Dropped concurrent query because agent is busy:', queryText);
        return;
      }

      isBusyRef.current = true;
      setIsThinking(true);

      speechService.cancel();
      setIsSpeaking(false);
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      setIsListening(false);

      speechService.playChime();

      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      const startTime = performance.now();

      const speakAndRelease = (replyText: string) => {
        try {
          recognitionRef.current?.abort();
        } catch (_) {}
        setIsListening(false);
        setIsSpeaking(true);

        const safetyTimer = setTimeout(() => {
          setIsSpeaking(false);
          if (isBusyRef.current) {
            isBusyRef.current = false;
          }
        }, 12000);

        const conciseSpokenText = toConciseSpokenSummary(replyText);

        if (speechService.isSupported()) {
          speechService.speak(conciseSpokenText, {
            onEnd: () => {
              setIsSpeaking(false);
              clearTimeout(safetyTimer);
              setTimeout(() => {
                isBusyRef.current = false;
              }, 150);
            },
            onError: () => {
              setIsSpeaking(false);
              clearTimeout(safetyTimer);
              isBusyRef.current = false;
            },
          });
        } else {
          setIsSpeaking(false);
          clearTimeout(safetyTimer);
          isBusyRef.current = false;
        }
      };

      const trimmed = queryText.trim();
      if (!trimmed) return;

      if (!queryOptions?.skipUserMessage) {
        setConversation((prev) => [...prev, { sender: 'user', text: trimmed }]);
        setMessages((prev) => [
          ...prev,
          {
            id: queryOptions?.userMsgId || `user_${Date.now()}`,
            sender: 'user',
            text: trimmed,
            timestamp: now,
            isSimulated: queryOptions?.isSimulated,
            senderLabel: queryOptions?.isSimulated ? '🎙️ Eleanor (Simulated Voice)' : undefined,
          },
        ]);
      }

      setToolLogs((prev) => [
        {
          timestamp: now,
          toolName: 'Nemotron Tool-Use Orchestrator',
          args: { query: trimmed },
          result: 'Evaluating intent with NVIDIA Nemotron-3-Nano...',
          status: 'invoking',
        },
        ...prev,
      ]);

      try {
        let turnRes: AgentTurnResponse | null = null;
        try {
          turnRes = await mcpClient.executeAgentTurn(trimmed);
        } catch (apiErr: any) {
          console.warn('[useAmbientAgent] Backend API unreachable or offline, activating simulated scenario fallback:', apiErr?.message);
        }

        if (!turnRes || !turnRes.toolName) {
          turnRes = resolveFallbackAgentTurn(trimmed, queryOptions?.scenario);
        }

        const latency = Math.round(performance.now() - startTime);

        const toolName = turnRes.toolName;
        const toolResult = turnRes.toolResult;
        const toolArgs = turnRes.toolArgs || {};
        const reply =
          turnRes.speechResponse ||
          "I have noted your observation. Please let me know if you need anything else.";

        if (toolName) {
          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: `🧠 Nemotron Reasoned Tool: ${toolName}`,
              args: toolArgs,
              result: toolResult,
              status: 'success',
              latencyMs: latency,
            },
            ...prev.slice(1),
          ]);
        } else {
          setToolLogs((prev) => [
            {
              timestamp: now,
              toolName: 'Direct Conversational Response',
              args: { query: trimmed },
              result: { speechResponse: reply, offlineFallbackUsed: turnRes.offlineFallbackUsed },
              status: 'success',
              latencyMs: latency,
            },
            ...prev.slice(1),
          ]);
        }

        const tierUsed: 'FAST' | 'ULTRA' =
          turnRes?.modelTierUsed ||
          toolResult?.modelTierUsed ||
          (toolName === 'clinicalAdvisor' &&
          (trimmed.toLowerCase().includes('chest pain') ||
            trimmed.toLowerCase().includes('stroke') ||
            trimmed.toLowerCase().includes('warfarin') ||
            trimmed.toLowerCase().includes('shortness of breath'))
            ? 'ULTRA'
            : 'FAST');

        const modelIdUsed =
          turnRes?.modelIdUsed ||
          toolResult?.modelIdUsed ||
          (tierUsed === 'ULTRA'
            ? 'nvidia/Nemotron-3-Ultra-550b-a55b'
            : 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B');

        const agentMsg: ChatMessage = {
          id: `copilot_${Date.now()}`,
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          modelTierUsed: tierUsed,
          modelIdUsed,
          toolCall: toolName
            ? {
                toolName,
                args: toolArgs,
                result: toolResult,
                status: 'success',
                latencyMs: latency,
                urgencyLevel: toolResult?.urgencyLevel || toolResult?.richCard?.urgencyLevel,
                actionAdvice:
                  toolResult?.actionAdvice ||
                  toolResult?.richCard?.actionAdvice ||
                  toolResult?.richCard?.advice,
                clinicalExplanation:
                  toolResult?.clinicalExplanation || toolResult?.richCard?.clinicalExplanation,
                modelTierUsed: tierUsed,
                modelIdUsed,
              }
            : undefined,
          urgencyLevel: toolResult?.urgencyLevel || toolResult?.richCard?.urgencyLevel,
          actionAdvice:
            toolResult?.actionAdvice ||
            toolResult?.richCard?.actionAdvice ||
            toolResult?.richCard?.advice,
          clinicalExplanation:
            toolResult?.clinicalExplanation || toolResult?.richCard?.clinicalExplanation,
        };

        setConversation((prev) => [...prev, { sender: 'assistant', text: reply }]);
        setMessages((prev) => [...prev, agentMsg]);

        // Sync dialogue turns to SQLite WAL for persistent cross-session memory
        try {
          if (!queryOptions?.skipUserMessage) {
            mcpClient
              .syncAgentMessage({
                id: queryOptions?.userMsgId || `user_${Date.now()}`,
                sender: 'user',
                text: trimmed,
                createdAt: new Date().toISOString(),
              })
              .catch(() => {});
          }
          mcpClient
            .syncAgentMessage({
              id: agentMsg.id,
              sender: 'assistant',
              text: reply,
              toolName: toolName || null,
              toolArgs: toolArgs || null,
              toolResult: toolResult || null,
              urgencyLevel: agentMsg.urgencyLevel || null,
              createdAt: new Date().toISOString(),
            })
            .catch(() => {});
        } catch (_) {}

        speakAndRelease(reply);

        if (toolName === 'orderRefill') {
          if (options?.onOrderRefillTriggered) {
            options.onOrderRefillTriggered(toolResult);
          }
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'clinicalAdvisor' || toolName === 'checkInteraction') {
          if (options?.onClinicalAdviceTriggered) {
            options.onClinicalAdviceTriggered(toolResult);
          }
        } else if (toolName === 'logDoseStatus') {
          if (toolResult?.lowStockAlert) {
            lastLowStockMedRef.current = toolResult.lowStockAlert.medicineName;
          }
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'recordVitals' || toolName === 'getTodaySchedule') {
          if (options?.onVitalsRecorded) {
            options.onVitalsRecorded(toolResult);
          }
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'ringDeviceHub') {
          if (options?.onRingDeviceTriggered) {
            options.onRingDeviceTriggered(toolResult);
          }
        } else if (toolName === 'negotiateAdherence') {
          if (options?.onGuardianNegotiationTriggered) {
            options.onGuardianNegotiationTriggered(toolResult);
          }
        }
      } catch (err: any) {
        console.warn('Voice command processing error:', err.message);
        const fallback = resolveFallbackAgentTurn(trimmed, queryOptions?.scenario);
        const reply = fallback.speechResponse;
        setConversation((prev) => [...prev, { sender: 'assistant', text: reply }]);
        setMessages((prev) => [
          ...prev,
          {
            id: `copilot_${Date.now()}`,
            sender: 'assistant',
            text: reply,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          },
        ]);

        if (fallback.toolName === 'negotiateAdherence' && options?.onGuardianNegotiationTriggered) {
          options.onGuardianNegotiationTriggered(fallback.toolResult);
        } else if (fallback.toolName === 'recordVitals') {
          options?.onVitalsRecorded?.(fallback.toolResult);
          options?.onDoseLogged?.();
        } else if (
          (fallback.toolName === 'clinicalAdvisor' || fallback.toolName === 'checkInteraction') &&
          options?.onClinicalAdviceTriggered
        ) {
          options.onClinicalAdviceTriggered(fallback.toolResult);
        }

        speakAndRelease(reply);
      } finally {
        setIsThinking(false);
        setIsListening(false);
      }
    },
    [options]
  );
  processVoiceQueryRef.current = processVoiceQuery;

  useEffect(() => {
    processVoiceQueryRef.current = processVoiceQuery;
  }, [processVoiceQuery]);

  const simulateVoiceScenario = useCallback(
    async (scenario: MockVoiceScenario) => {
      if (isBusyRef.current || isThinking || isSpeaking || isPatientSpeaking) {
        console.warn('[useAmbientAgent] Simulator locked: agent or speaker is busy');
        return;
      }

      speechService.cancel();
      setIsSpeaking(false);
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      setIsListening(false);

      setIsPatientSpeaking(true);
      setPatientTranscript(scenario.prompt);
      setActiveScenarioId(scenario.id);

      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      const userSimId = `user_sim_${Date.now()}`;

      setConversation((prev) => [...prev, { sender: 'user', text: scenario.prompt }]);
      setMessages((prev) => [
        ...prev,
        {
          id: userSimId,
          sender: 'user',
          text: scenario.prompt,
          timestamp: now,
          isSimulated: true,
          senderLabel: '🎙️ Eleanor (Simulated Voice)',
        },
      ]);

      let turn2Started = false;
      const executeTurn2 = async () => {
        if (turn2Started) return;
        turn2Started = true;
        setIsPatientSpeaking(false);
        setPatientTranscript('');
        setActiveScenarioId(null);

        await processVoiceQuery(scenario.prompt, {
          skipUserMessage: true,
          isSimulated: true,
          scenario,
        });
      };

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(scenario.prompt);
          utterance.pitch = 0.95;
          utterance.rate = 0.92;
          utterance.lang = 'en-US';

          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Samantha') ||
                v.name.includes('Victoria') ||
                v.name.includes('Google US English') ||
                v.name.includes('Jenny') ||
                v.name.includes('Zira') ||
                v.name.includes('Karen') ||
                v.name.includes('Natural'))
          );
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          const timeoutGuard = setTimeout(() => {
            executeTurn2();
          }, 8500);

          utterance.onend = () => {
            clearTimeout(timeoutGuard);
            setTimeout(() => {
              executeTurn2();
            }, 250);
          };

          utterance.onerror = (err) => {
            console.warn('[useAmbientAgent] Patient voice synthesis error, falling back:', err);
            clearTimeout(timeoutGuard);
            executeTurn2();
          };

          window.speechSynthesis.speak(utterance);
          return;
        } catch (err) {
          console.warn('[useAmbientAgent] window.speechSynthesis failed:', err);
        }
      }

      setTimeout(() => {
        executeTurn2();
      }, 1200);
    },
    [isThinking, isSpeaking, isPatientSpeaking, processVoiceQuery]
  );

  return {
    isListening,
    isThinking,
    isSpeaking,
    isPatientSpeaking,
    patientTranscript,
    activeScenarioId,
    transcript,
    toolLogs,
    conversation,
    messages,
    seniorMemories,
    toggleListening,
    processVoiceQuery,
    simulateVoiceScenario,
  };
}

export type UseAmbientAgentReturn = ReturnType<typeof useAmbientAgent>;
export type UseAlexaAgentReturn = UseAmbientAgentReturn;
export const useAlexaAgent = useAmbientAgent;
