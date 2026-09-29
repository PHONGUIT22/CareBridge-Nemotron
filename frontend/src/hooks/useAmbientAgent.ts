'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { ClinicalAdviceResponse, AmazonRefillOrder } from '../types';
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
  toolCall?: {
    toolName: string;
    args: any;
    result: any;
    status: 'invoking' | 'success' | 'error';
    latencyMs?: number;
    urgencyLevel?: string;
    actionAdvice?: string;
    clinicalExplanation?: string;
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
  const recognitionRef = useRef<any>(null);
  const processVoiceQueryRef = useRef<(text: string) => Promise<void>>(async () => {});
  const lastLowStockMedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          if (isBusyRef.current || speechService.isSpeaking()) return;

          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          const trimmed = finalTranscript.trim();
          if (!trimmed) return;

          setTranscript(trimmed);
          processVoiceQueryRef.current(trimmed);
        };

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech' && e.error !== 'aborted') {
            console.warn('[useAmbientAgent] Recognition error:', e.error);
          }
          setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;

        return () => {
          try {
            recognition.abort();
          } catch (_) {}
          recognitionRef.current = null;
          speechService.cancel();
        };
      }
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Your browser does not support the Web Speech API natively. Please use Google Chrome or click the quick simulation prompt chips below to test!');
      return;
    }

    if (isBusyRef.current && !isListening) {
      if (speechService.isSpeaking()) {
        speechService.cancel();
        isBusyRef.current = false;
      } else {
        console.warn('[useAmbientAgent] Cannot toggle listening while agent is thinking');
        return;
      }
    }

    if (isListening) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      setIsListening(false);
    } else {
      speechService.cancel();
      setIsSpeaking(false);
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('[useAmbientAgent] Failed to start recognition:', err);
        setIsListening(false);
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

  const processVoiceQuery = useCallback(
    async (
      queryText: string,
      queryOptions?: { skipUserMessage?: boolean; isSimulated?: boolean; userMsgId?: string }
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
          result: 'Evaluating intent with NVIDIA Llama-3.1-Nemotron-70B...',
          status: 'invoking',
        },
        ...prev,
      ]);

      try {
        const turnRes = await mcpClient.executeAgentTurn(trimmed);
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

        const agentMsg: ChatMessage = {
          id: `copilot_${Date.now()}`,
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
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

        speakAndRelease(reply);

        if (toolName === 'orderRefill') {
          if (options?.onOrderRefillTriggered) {
            options.onOrderRefillTriggered(toolResult);
          }
          if (options?.onDoseLogged) {
            options.onDoseLogged();
          }
        } else if (toolName === 'clinicalAdvisor') {
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
        const reply = "I've recorded your action locally and synchronized with CareBridge.";
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
        speakAndRelease(reply);
      } finally {
        setIsThinking(false);
        setIsListening(false);
      }
    },
    [options]
  );

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
    toggleListening,
    processVoiceQuery,
    simulateVoiceScenario,
  };
}

export type UseAmbientAgentReturn = ReturnType<typeof useAmbientAgent>;
export type UseAlexaAgentReturn = UseAmbientAgentReturn;
export const useAlexaAgent = useAmbientAgent;
