'use client';

import React, { useState, useEffect } from 'react';

interface SeniorClockProps {
  className?: string;
}

export function SeniorClock({ className = '' }: SeniorClockProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!currentTime) {
    return (
      <div className={`flex flex-col items-center justify-center animate-pulse ${className}`}>
        <div className="h-28 w-72 bg-slate-800/40 rounded-3xl" />
        <div className="h-6 w-48 bg-slate-800/40 rounded-full mt-4" />
      </div>
    );
  }

  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(currentTime);

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Giant Hardware OLED Clock Digits (MATCHES image/8.png) */}
      <div className="flex items-baseline justify-center font-mono font-bold tabular-nums">
        <span
          className="text-7xl sm:text-8xl md:text-9xl text-white tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          style={{ letterSpacing: '-0.03em' }}
        >
          {hours}:{minutes}
        </span>

        {/* Seconds indicator */}
        <span className="text-3xl sm:text-4xl text-slate-400 font-mono font-bold ml-2 sm:ml-3 opacity-70 tabular-nums">
          :{seconds}
        </span>
      </div>

      {/* Date in Sky Blue (MATCHES image/8.png) */}
      <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-bold text-sky-400 uppercase tracking-widest font-mono">
        {formattedDate}
      </p>
    </div>
  );
}