'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlertData {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
}

interface AlertContextType {
  showAlert: (alert: AlertData) => void;
  hideAlert: () => void;
  currentAlert: AlertData | null;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);

  const showAlert = (alert: AlertData) => setCurrentAlert(alert);
  const hideAlert = () => setCurrentAlert(null);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, currentAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
