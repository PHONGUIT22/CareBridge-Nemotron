'use client';

import React from 'react';
import { Trash2, Check, Flame, TrendingUp } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCapsules } from '@fortawesome/free-solid-svg-icons';

export interface PunchMatrixCell {
  dayIndex: number;
  weekIndex: number;
  dateStr: string;
  status: 'taken' | 'missed' | 'empty' | 'today';
}

interface MedicationPunchCardProps {
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  streakDays?: number;
  completedDoses?: number;
  adherenceRate?: number;
  matrixData?: PunchMatrixCell[];
  onDelete?: () => void;
  colorTheme?: 'navy' | 'teal' | 'indigo' | 'slate';
}

export function MedicationPunchCard({
  medicineName,
  dosage,
  scheduledTime,
  streakDays = 0,
  completedDoses = 0,
  adherenceRate = 0,
  matrixData = [],
  onDelete,
  colorTheme = 'navy',
}: MedicationPunchCardProps) {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weeksCount = 8;

  const cells: PunchMatrixCell[] =
    matrixData && matrixData.length > 0
      ? matrixData
      : Array.from({ length: 7 * weeksCount }, (_, idx) => ({
          dayIndex: idx % 7,
          weekIndex: Math.floor(idx / 7),
          dateStr: '',
          status: 'empty' as const,
        }));

  // Theme palettes matching image/4.png
  const themes = {
    navy: {
      card: 'bg-[#1E3A8A]',
      innerMatrix: 'bg-[#152A64]',
      subtitle: 'text-blue-200',
      labelColor: 'text-blue-200/80',
      emptyCell: 'bg-white/10',
      takenCell: 'bg-white',
      todayCell: 'bg-amber-300/30 border-2 border-amber-300',
      stats: 'text-blue-100',
      shadow: 'shadow-[0_10px_25px_rgba(30,58,138,0.22)]',
    },
    teal: {
      card: 'bg-[#0D7A68]',
      innerMatrix: 'bg-[#0A5D50]',
      subtitle: 'text-teal-100',
      labelColor: 'text-teal-200/80',
      emptyCell: 'bg-white/10',
      takenCell: 'bg-white',
      todayCell: 'bg-amber-300/30 border-2 border-amber-300',
      stats: 'text-teal-100',
      shadow: 'shadow-[0_10px_25px_rgba(13,122,104,0.22)]',
    },
    indigo: {
      card: 'bg-[#4338CA]',
      innerMatrix: 'bg-[#312E81]',
      subtitle: 'text-indigo-200',
      labelColor: 'text-indigo-200/80',
      emptyCell: 'bg-white/10',
      takenCell: 'bg-white',
      todayCell: 'bg-amber-300/30 border-2 border-amber-300',
      stats: 'text-indigo-100',
      shadow: 'shadow-[0_10px_25px_rgba(67,56,202,0.22)]',
    },
    slate: {
      card: 'bg-[#1E293B]',
      innerMatrix: 'bg-[#0F172A]',
      subtitle: 'text-slate-300',
      labelColor: 'text-slate-400',
      emptyCell: 'bg-white/10',
      takenCell: 'bg-white',
      todayCell: 'bg-amber-300/30 border-2 border-amber-300',
      stats: 'text-slate-200',
      shadow: 'shadow-[0_10px_25px_rgba(30,41,59,0.22)]',
    },
  };

  const theme = themes[colorTheme] || themes.navy;

  return (
    <div
      className={`${theme.card} ${theme.shadow} rounded-[24px] p-5 sm:p-6 text-white relative transition-all duration-300 hover:scale-[1.01]`}
    >
      {/* 1. HEADER: ICON, MEDICATION NAME & ACTIONS (MATCHES image/4.png) */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
            <FontAwesomeIcon icon={faCapsules} className="text-lg" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-white truncate tracking-tight">
              {medicineName}
            </h3>
            <p className={`text-xs font-medium mt-0.5 ${theme.subtitle}`}>
              {dosage.includes('Doses/Day') || dosage.includes('08:00 & 18:00')
                ? dosage
                : `${dosage} • Scheduled at ${scheduledTime}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white/80 hover:text-white transition-colors"
              title="Delete prescription"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-full border-2 border-white/50 text-white flex items-center justify-center">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* 2. PUNCH-CARD MATRIX: 7 ROWS (M, T, W, T, F, S, S) (MATCHES image/4.png) */}
      <div className={`${theme.innerMatrix} rounded-2xl p-4 my-3`}>
        <div className="flex gap-2.5">
          {/* Day of week labels */}
          <div className={`grid grid-rows-7 gap-1.5 text-xs font-bold ${theme.labelColor} select-none pr-1`}>
            {dayLabels.map((d, i) => (
              <span key={i} className="h-4 sm:h-5 flex items-center justify-center">
                {d}
              </span>
            ))}
          </div>

          {/* Adherence grid cells */}
          <div className="grid grid-rows-7 grid-flow-col gap-1.5 flex-1">
            {cells.map((cell, idx) => {
              // Taken dose: Solid white rounded square (image/4.png signature)
              if (cell.status === 'taken') {
                return (
                  <div
                    key={idx}
                    className={`h-4 sm:h-5 rounded-[4px] ${theme.takenCell} shadow-xs transition-all`}
                    title={`Taken: ${cell.dateStr}`}
                  />
                );
              }

              // Today: Amber glow indicator
              if (cell.status === 'today') {
                return (
                  <div
                    key={idx}
                    className={`h-4 sm:h-5 rounded-[4px] ${theme.todayCell}`}
                    title="Scheduled for today"
                  />
                );
              }

              // Missed dose: subtle reddish tint
              if (cell.status === 'missed') {
                return (
                  <div
                    key={idx}
                    className="h-4 sm:h-5 rounded-[4px] bg-rose-500/30 border border-rose-400/40"
                    title={`Missed: ${cell.dateStr}`}
                  />
                );
              }

              // Empty / past week: Translucent darker tone
              return (
                <div
                  key={idx}
                  className={`h-4 sm:h-5 rounded-[4px] ${theme.emptyCell}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. FOOTER 3 METRICS: STREAK, COMPLETED, ADHERENCE (MATCHES image/4.png) */}
      <div
        className={`flex items-center justify-between pt-3 mt-2 border-t border-white/15 text-xs font-medium ${theme.stats}`}
      >
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 fill-amber-300 text-amber-300" />
          <span>{streakDays} Day Streak</span>
        </div>

        <span className="text-white/20">|</span>

        <div className="flex items-center gap-1.5">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{completedDoses} Completed</span>
        </div>

        <span className="text-white/20">|</span>

        <div className="flex items-center gap-1.5 font-semibold">
          <TrendingUp className="w-4 h-4" />
          <span>{adherenceRate}% Adherence</span>
        </div>
      </div>
    </div>
  );
}