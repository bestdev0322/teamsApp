import cron from 'node-cron';
import moment from 'moment';
import { sendComplianceReminders } from './complianceReminderService';
import axios from 'axios';

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
      const baseUrl = process.env.API_URL || 'http://localhost:3001';
      const res = await axios.get(`${baseUrl}/api/compliance-settings`);
      const response = res.data as ApiResponse<ComplianceSetting[]>;
      const settings = response.data || [];

      const today = moment().startOf('day');
      settings.sort((a, b) => b.year - a.year);

      let foundQuarter = null;
      let foundYear = null;

      // Find the current quarter based on today's date
      for (const setting of settings) {
        for (const quarter of setting.quarters) {
          const quarterStart = moment(quarter.start).startOf('day');
          const quarterEnd = moment(quarter.end).startOf('day');
          
          if (today.isBetween(quarterStart, quarterEnd, null, '[]')) {
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
          await sendComplianceReminders(
            year.toString(),
            quarter.quarter,
            quarter.end
          );
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