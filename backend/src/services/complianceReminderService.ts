import Obligation, { ObligationDocument } from '../models/Obligation';
import User from '../models/User';
import { GraphService } from './graphService';
import { Types } from 'mongoose';

interface TeamOwner {
  _id: Types.ObjectId;
  name: string;
}

interface PopulatedObligation extends Omit<ObligationDocument, 'owner'> {
  owner: TeamOwner;
}

const graphService = new GraphService();

export const sendComplianceReminders = async (year: string, quarter: string, endDate: string) => {
  try {
    // Find all obligations that don't have updates for the current quarter
    // or have updates but not in 'Submitted' or 'Approved' status
    const obligations = await Obligation.find({
      $or: [
        { update: { $exists: false } },
        { update: { $size: 0 } },
        { 'update': { $not: { $elemMatch: { year, quarter } } } },
        {
          'update': {
            $elemMatch: {
              year,
              quarter,
              assessmentStatus: { $nin: ['Submitted', 'Approved'] }
            }
          }
        }
      ]
    }).populate<{ owner: TeamOwner }>('owner');

    // If no pending obligations, return early
    if (obligations.length === 0) {
      return { success: true, message: 'No pending obligations to send reminders for' };
    }

    // Group obligations by team (owner)
    const teamObligations = (obligations as PopulatedObligation[]).reduce((acc: { [key: string]: PopulatedObligation[] }, curr) => {
      const teamId = curr.owner._id.toString();
      if (!acc[teamId]) acc[teamId] = [];
      acc[teamId].push(curr);
      return acc;
    }, {});

    // Get system admin user for sending emails
    const mainComplianceSuperUser = await User.findOne({ isComplianceSuperUser: true });
    if (!mainComplianceSuperUser || !mainComplianceSuperUser.email || !mainComplianceSuperUser.tenantId) {
      throw new Error('No system admin found to send reminders');
    }

    let remindersSent = 0;

    // For each team with pending obligations, find compliance champions and send reminders
    for (const [teamId, teamObs] of Object.entries(teamObligations)) {
      // Get compliance champions for this team
      const complianceChampions = await User.find({
        teamId,
        isComplianceChampion: true
      });

      if (complianceChampions.length > 0) {
        const teamName = teamObs[0].owner.name;
        const pendingObligations = teamObs.map(ob => ob.complianceObligation).join('\n- ');

        // Send email to each compliance champion
        for (const champion of complianceChampions) {
          if (champion.email && champion.tenantId) {
            const emailSubject = `${year}, ${quarter} Compliance Obligations Update`;
            const emailContent = `
              <html>
                <body>
                  <p>Dear Team,</p>
                  <p>This is a reminder to update your compliance obligations for ${quarter}, ${year}.</p>
                  <p>The following obligations for ${teamName} need to be updated:</p>
                  <ul>
                    <li>${pendingObligations.replace(/\n/g, '</li><li>')}</li>
                  </ul>
                  <p>Please ensure all relevant updates are submitted by ${endDate}.</p>
                  <p>Thank you for your cooperation.</p>
                  <p>Best regards,<br>${mainComplianceSuperUser.name}<br>Compliance Team</p>
                </body>
              </html>
            `;

            await graphService.sendMail(
              mainComplianceSuperUser.tenantId,
              mainComplianceSuperUser.MicrosoftId,
              champion.email,
              emailSubject,
              emailContent
            );
            remindersSent++;
          }
        }
      }
    }

    return {
      success: true,
      message: remindersSent > 0
        ? `Compliance reminders sent successfully to ${remindersSent} compliance champion(s). Updates due soon.`
        : 'No compliance champions found to send reminders to'
    };
  } catch (error) {
    console.error('Error sending compliance reminders:', error);
    return { success: false, message: 'Failed to send compliance reminders' };
  }
}; 