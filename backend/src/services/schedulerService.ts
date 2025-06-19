import cron from 'node-cron';
import { startOfToday, startOfDay, parseISO, isWithinInterval, subDays, isAfter, isBefore } from 'date-fns';
import { sendComplianceReminders } from './complianceReminderService';
import axios from 'axios';
import { config } from '../config';

interface Quarter {
  quarter: string;
  start: string;
  end: string;
}

interface ComplianceSetting {
  _id: string;
  year: number;
  firstMonth: string;
  quarters: Quarter[];
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

class SchedulerService {
  private static instance: SchedulerService;
  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  private async getCurrentCompliancePeriod() {
    try {
      const apiUrl = config.api_url;
      const res = await axios.get(`${apiUrl}/compliance-settings`);
      const response = res.data as ApiResponse<ComplianceSetting[]>;
      const settings = response.data || [];

      const today = startOfToday();
      settings.sort((a, b) => b.year - a.year);

      let foundQuarter = null;
      let foundYear = null;

      // Find the current quarter based on today's date
      for (const setting of settings) {
        for (const quarter of setting.quarters) {
          const quarterStart = startOfDay(parseISO(quarter.start));
          const quarterEnd = startOfDay(parseISO(quarter.end));
          if (isWithinInterval(today, { start: quarterStart, end: quarterEnd })) {
            foundQuarter = quarter;
            foundYear = setting.year;
            break;
          }
        }
        if (foundQuarter) break;
      }

      return { quarter: foundQuarter, year: foundYear };
    } catch (error) {
      console.error('Error getting current compliance period:', error);
      return { quarter: null, year: null };
    }
  }

  public startComplianceReminderScheduler() {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Running compliance reminder check at:', new Date().toISOString());
        
        const { quarter, year } = await this.getCurrentCompliancePeriod();
        
        if (quarter && year) {
          // Only send reminders if today is within the last 2 days before the end date
          const endDate = quarter.end;
          const reminderDate = subDays(startOfDay(parseISO(endDate)), 2);
          const endDateTime = startOfDay(parseISO(endDate));
          const today = startOfToday();
          if (!isBefore(today, reminderDate) && !isAfter(today, endDateTime)) {
            await sendComplianceReminders(
              year.toString(),
              quarter.quarter,
              quarter.end
            );
          } else {
            console.log('Not within reminder period yet');
          }
        } else {
          console.log('No active compliance period found');
        }
      } catch (error) {
        console.error('Error in compliance reminder scheduler:', error);
      }
    });

    console.log('Compliance reminder scheduler started');
  }
}

export const schedulerService = SchedulerService.getInstance(); 