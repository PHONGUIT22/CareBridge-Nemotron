import { LogRepo, DailyLogItem } from '../database/logRepo.js';
import { getLocalDateString } from '../utils/dateUtils.js';

export const getTodayScheduleTool = {
  definition: {
    name: 'getTodaySchedule',
    description: "Retrieve the patient's daily medication schedule, percentage adherence rate, and next upcoming dose.",
    inputSchema: {
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

  async handler(args: { date?: string; userId?: string }) {
    const targetDate = args.date || getLocalDateString();
    const logs: DailyLogItem[] = await LogRepo.getLogsByDate(targetDate, args.userId);

    const total = logs.length;
    const taken = logs.filter((l) => l.status === 'taken').length;
    const pending = logs.filter((l) => l.status === 'pending').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    // Identify next pending dose to take
    const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"
    const nextPendingDose = logs.find((l) => l.status === 'pending' && l.scheduledTime >= nowTime) 
      || logs.find((l) => l.status === 'pending') 
      || null;

    // Voice response summary for Alexa speech synthesis
    let speechSummary = '';
    if (total === 0) {
      speechSummary = "You have no scheduled medications for today.";
    } else if (pending === 0) {
      speechSummary = `Great job! You have taken all ${total} medications scheduled for today. Your adherence is 100%.`;
    } else if (nextPendingDose) {
      speechSummary = `You have taken ${taken} of ${total} doses today. Your next dose is ${nextPendingDose.name} at ${nextPendingDose.scheduledTime}.`;
    } else {
      speechSummary = `You have ${pending} pending dose remaining today.`;
    }

    return {
      date: targetDate,
      adherenceRate,
      totalDoses: total,
      takenCount: taken,
      pendingCount: pending,
      nextDose: nextPendingDose ? {
        medicineId: nextPendingDose.medicineId,
        name: nextPendingDose.name,
        dosage: nextPendingDose.dosage,
        time: nextPendingDose.scheduledTime,
      } : null,
      schedule: logs,
      speechSummary,
    };
  },
};