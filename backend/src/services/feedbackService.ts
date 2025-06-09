import PersonalPerformance from "../models/PersonalPerformance";
import AnnualTarget from "../models/AnnualTarget";
import { GraphService } from "./graphService";
import { config } from "../config";

export const sendFeedbackEmail = async (feedbackId: string, provider: { name: string, email: string }, user: { tenantId: string, MicrosoftId: string, name: string }) => {
    try {
        const feedbackData = await PersonalPerformance.findOne(
            { 'quarterlyTargets.feedbacks._id': feedbackId }
        )
            .select({
                'quarterlyTargets': {
                    $elemMatch: {
                        'feedbacks._id': feedbackId
                    }
                },
                'annualTargetId': 1
            })
            .populate('quarterlyTargets.feedbacks.feedbackId') as any;

        const feedbackName = feedbackData?.quarterlyTargets[0].feedbacks[0].feedbackId.name;
        const quarter = feedbackData?.quarterlyTargets[0].quarter;
        const annualTargetId = feedbackData?.annualTargetId;

        const annualTarget = await AnnualTarget.findById(annualTargetId);
        const endDate = annualTarget?.content.assessmentPeriod[quarter as keyof typeof annualTarget.content.assessmentPeriod].endDate;

        const feedbackLink = `${config.frontend}/feedback/submit?id=${feedbackId}`;
        const graphService = new GraphService();

        const emailContent = `
        <html>
          <body>
            <h2>Dear ${provider.name},</h2>
            <p>Please click <a href="${feedbackLink}">here</a> to provide 360 Degree Feedback to ${user?.name}. Due date for completion is ${endDate}.</p>
            <p>Thank you.</p>
            <p>360 Degree Feedback Team</p>
          </body>
        </html>
      `;

      console.log(feedbackLink, 'feedbackLink');

        // Use the current user's ID (req.user.MicrosoftId) to send the email
        await graphService.sendMail(
            user?.tenantId || '',
            user?.MicrosoftId || '',
            provider.email,
            feedbackName,
            emailContent
        );
        return { success: true, message: 'Feedback email sent successfully' };
    } catch (error) {
        return { success: false, message: 'Failed to send feedback email' };
    }
}

export const checkFeedbackMail = async () => {
    const currentDate = new Date();
    const limitDate = new Date(currentDate.setDate(currentDate.getDate() - 2));

    const personalPerformances = await PersonalPerformance.find({
        'quarterlyTargets.feedbacks.provider.status': 'Pending',
        'quarterlyTargets.feedbacks.provider.pendingTime': { $gte: limitDate }
    }).populate('userId') as any;

    const feedbacksToMail: any[] = [];

    personalPerformances.forEach((personalPerformance: any) => {
        personalPerformance.quarterlyTargets.forEach((quarterlyTarget: any) => {
            quarterlyTarget.feedbacks.forEach((feedback: any) => {
                if(feedback.provider.status === 'Pending' && feedback.provider.pendingTime && feedback.provider.pendingTime < limitDate) {
                    const feedbackId = feedback._id;
                    const provider = {
                        name: feedback.provider.name,
                        email: feedback.provider.email
                    }
                    const user = {
                        tenantId: personalPerformance.userId?.tenantId,
                        MicrosoftId: personalPerformance.userId?.MicrosoftId,
                        name: personalPerformance.userId?.name
                    }
                    feedbacksToMail.push({ feedbackId, provider, user });
                }
            });
        });
    });

    feedbacksToMail.forEach(async (feedback: any) => {
        await sendFeedbackEmail(feedback.feedbackId, feedback.provider, feedback.user);
    });
}



