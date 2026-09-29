'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AmbientVoiceContextType {
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  lastSpokenText: string | null;
  setLastSpokenText: (val: string | null) => void;
}

export type AlexaVoiceContextType = AmbientVoiceContextType;

const AmbientVoiceContext = createContext<AmbientVoiceContextType | undefined>(undefined);

export function AmbientVoiceProvider({ children }: { children: ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);

  return (
    <AmbientVoiceContext.Provider
      value={{
        isListening,
        setIsListening,
        lastSpokenText,
        setLastSpokenText,
      }}
    >
      {children}
    </AmbientVoiceContext.Provider>
  );
}

export function useAmbientVoice() {
  const context = useContext(AmbientVoiceContext);
  if (!context) {
    throw new Error('useAmbientVoice must be used within an AmbientVoiceProvider');
  }
  return context;
}

// Backward compatibility exports
export const AlexaVoiceContext = AmbientVoiceContext;
export const AlexaVoiceProvider = AmbientVoiceProvider;
export const useAlexaVoice = useAmbientVoice;
