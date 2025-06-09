import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/auth';
import { socketService } from '../server';
import { SocketEvent } from '../types/socket';
import User from '../models/User';
import PersonalPerformance from '../models/PersonalPerformance';
import { graphService } from '../services/graphService';
// import multer from 'multer';
// import fs from 'fs';

const router = express.Router();

router.post('/agreement/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientId, annualTargetId, quarter, personalPerformanceId } = req.body;
    const recipientUser = await User.findById(recipientId);

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }
    const user = await User.findOne({ MicrosoftId: req.user?.id });

    const existingNotification = await Notification.findOne({
      senderId: user?._id,
      recipientId,
      annualTargetId,
      quarter,
      type: 'agreement',
      personalPerformanceId
    });

    if (existingNotification) {
      await Notification.updateOne(
        { _id: existingNotification._id },
        { $set: { isRead: false } }
      );
    } else {
      await Notification.create({
        type: 'agreement',
        senderId: user?._id,
        recipientId,
        annualTargetId,
        quarter,
        isRead: false,
        personalPerformanceId
      });
    }
    socketService.emitToUser(recipientUser.MicrosoftId, SocketEvent.NOTIFICATION, {});

    try {
      // Send email notification
      const tenantId = req.user?.tenantId;
      const fromUserId = req.user?.id;
      const supervisorEmail = recipientUser.email;
      const supervisorFirstName = recipientUser.name.split(' ')[0];
      const userFullName = req.user?.displayName;
      const subject = `Performance Agreement ${quarter}`;
      const body = `
        Dear ${supervisorFirstName},<br><br>
        ${userFullName} has sent you a performance agreement for ${quarter} for approval.<br><br>
        Thank You.<br>
        Performance Management Team
      `;

      await graphService.sendMail(
        tenantId as string,
        fromUserId as string,
        supervisorEmail,
        subject,
        body
      );
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue with the response even if email fails
    }

    return res.status(200).json({ message: 'Notification created successfully' });
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.post('/agreement/recall', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientId, annualTargetId, quarter, personalPerformanceId } = req.body;

    const recipientUser = await User.findById(recipientId);

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }
    const user = await User.findOne({ MicrosoftId: req.user?.id });

    const existingNotification = await Notification.findOne({
      senderId: user?._id,
      recipientId,
      annualTargetId,
      quarter,
      type: 'agreement',
      personalPerformanceId
    });

    if (existingNotification) {
      await Notification.deleteOne({ _id: existingNotification._id });
    }

    socketService.emitToUser(recipientUser.MicrosoftId, SocketEvent.NOTIFICATION, {});

    try {
      // Send recall email to supervisor
      const tenantId = req.user?.tenantId;
      const fromUserId = req.user?.id;
      const supervisorEmail = recipientUser.email;
      const supervisorFirstName = recipientUser.name.split(' ')[0];
      const userFullName = req.user?.displayName;
      const subject = `Performance Agreement ${quarter} - RECALL`;
      const body = `
        Dear ${supervisorFirstName},<br><br>
        ${userFullName} has recalled his performance agreement for ${quarter}.<br><br>
        Thank You.<br>
        Performance Management Team
      `;
      await graphService.sendMail(
        tenantId as string,
        fromUserId as string,
        supervisorEmail,
        subject,
        body
      );
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue with the response even if email fails
    }

    return res.status(200).json({ message: 'Notification recalled successfully' });
  } catch (error) {
    console.error('Error recalling notification:', error);
    return res.status(500).json({ error: 'Failed to recall notification' });
  }
});

router.post('/assessment/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientId, annualTargetId, quarter, personalPerformanceId } = req.body;

    const recipientUser = await User.findById(recipientId);

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }
    const user = await User.findOne({ MicrosoftId: req.user?.id });

    const existingNotification = await Notification.findOne({
      senderId: user?._id,
      recipientId,
      annualTargetId,
      quarter,
      type: 'assessment',
      personalPerformanceId
    });

    if (existingNotification) {
      await Notification.updateOne(
        { _id: existingNotification._id },
        { $set: { isRead: false } }
      );
    } else {
      await Notification.create({
        type: 'assessment',
        senderId: user?._id,
        recipientId,
        annualTargetId,
        quarter,
        isRead: false,
        personalPerformanceId
      });
    }

    socketService.emitToUser(recipientUser.MicrosoftId, SocketEvent.NOTIFICATION, {});

    try {
      // Send assessment submit email to supervisor
      const tenantId = req.user?.tenantId;
      const fromUserId = req.user?.id;
      const supervisorEmail = recipientUser.email;
      const supervisorFirstName = recipientUser.name.split(' ')[0];
      const userFullName = req.user?.displayName;
      const subject = `Performance Assessment ${quarter}`;
      const body = `
        Dear ${supervisorFirstName},<br><br>
        ${userFullName} has sent you a performance assessment for ${quarter} for approval.<br><br>
        Thank You.<br>
        Performance Management Team
      `;
      await graphService.sendMail(
        tenantId as string,
        fromUserId as string,
        supervisorEmail,
        subject,
        body
      );
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue with the response even if email fails
    }

    return res.status(200).json({ message: 'Notification created successfully' });
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.post('/assessment/recall', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientId, annualTargetId, quarter, personalPerformanceId } = req.body;

    const recipientUser = await User.findById(recipientId);

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }
    const user = await User.findOne({ MicrosoftId: req.user?.id });

    const existingNotification = await Notification.findOne({
      senderId: user?._id,
      recipientId,
      annualTargetId,
      quarter,
      type: 'assessment',
      personalPerformanceId
    });

    if (existingNotification) {
      await Notification.deleteOne({ _id: existingNotification._id });
    }
    socketService.emitToUser(recipientUser.MicrosoftId, SocketEvent.NOTIFICATION, {});

    // Send recall email to supervisor
    const tenantId = req.user?.tenantId;
    const fromUserId = req.user?.id;
    const supervisorEmail = recipientUser.email;
    const supervisorFirstName = recipientUser.name.split(' ')[0];
    const userFullName = req.user?.displayName;
    const subject = `Performance Assessment ${quarter} - RECALL`;
    const body = `
      Dear ${supervisorFirstName},<br><br>
      ${userFullName} has recalled his performance assessment for ${quarter}.<br><br>
      Thank You.<br>
      Performance Management Team
    `;
    await graphService.sendMail(
      tenantId as string,
      fromUserId as string,
      supervisorEmail,
      subject,
      body
    );

    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

router.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findOne({ MicrosoftId: req.user?.id });

    const notifications = await Notification.find({
      recipientId: user?._id
    }).populate('senderId').populate('personalPerformanceId') as any;

    const result = notifications.map((notification: any) => {
      return {
        _id: notification._id,
        type: notification.type,
        sender: {
          _id: notification.senderId._id,
          fullName: notification.senderId.name,
          teamId: notification.personalPerformanceId.teamId
        },
        annualTargetId: notification.annualTargetId,
        quarter: notification.quarter,
        isRead: notification.isRead,
        updatedAt: notification.updatedAt
      };
    });

    return res.json(result);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({ error: 'Failed to get notifications' });
  }
});

router.get('/personal-performance/:notificationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const personalPerformance = await PersonalPerformance.findOne({
      annualTargetId: notification.annualTargetId,
      userId: notification.senderId
    }).populate({
      path: 'quarterlyTargets.personalDevelopment',
      select: 'name description status'
    });

    return res.json(personalPerformance);
  } catch (error) {
    console.error('Error getting personal performance:', error);
    return res.status(500).json({ error: 'Failed to get personal performance' });
  }
});

router.put('/personal-performance/:notificationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const { quarter, objectives } = req.body;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Update the specific quarter's objectives
    await PersonalPerformance.updateOne(
      {
        annualTargetId: notification.annualTargetId,
        userId: notification.senderId,
        'quarterlyTargets.quarter': quarter
      },
      {
        $set: {
          'quarterlyTargets.$.objectives': objectives
        }
      }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Personal performance updated successfully'
    });
  } catch (error) {
    console.error('Error updating personal performance:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Failed to update personal performance'
    });
  }
});

router.post('/read/:notificationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    if (notification.type === 'resolve_agreement' || notification.type === 'resolve_assessment') {
      await Notification.deleteOne({ _id: notificationId });
    } else {
      await Notification.updateOne({ _id: notificationId }, { $set: { isRead: true } });

      socketService.emitToUser(req.user?.id as string, SocketEvent.NOTIFICATION, {
        type: notification.type,
        senderId: notification.senderId,
        recipientId: notification.recipientId,
        annualTargetId: notification.annualTargetId,
        quarter: notification.quarter,
        isRead: true
      });
    }

    return res.status(200).json({ message: 'Notification read successfully' });
  } catch (error) {
    console.error('Error reading notification:', error);
    return res.status(500).json({ error: 'Failed to read notification' });
  }
});

router.post('/approve/:notificationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const personalPerformance = await PersonalPerformance.findOne({ _id: notification.personalPerformanceId });
    if (personalPerformance) {
      const quarterlyTargets = personalPerformance.quarterlyTargets;
      const newQuarterlyTargets = quarterlyTargets.map((quarterlyTarget: any) => {
        if (quarterlyTarget.quarter === notification.quarter) {
          if (notification.type === 'agreement') {
            return {
              ...quarterlyTarget._doc,
              agreementStatus: 'Approved',
              agreementStatusUpdatedAt: new Date()
            };
          } else if (notification.type === 'assessment') {
            return {
              ...quarterlyTarget._doc,
              assessmentStatus: 'Approved',
              assessmentStatusUpdatedAt: new Date()
            };
          }
        }
        return quarterlyTarget;
      });
      await PersonalPerformance.updateOne({ _id: notification.personalPerformanceId }, { $set: { quarterlyTargets: newQuarterlyTargets } });
    }

    await Notification.deleteOne({ _id: notificationId });
    
    try {
      // Send approval email to user
      const senderUser = await User.findById(notification.senderId);
      if (senderUser) {
        const tenantId = senderUser.tenantId;
        const fromUserId = req.user?.id;
        const userEmail = senderUser.email;
        const userFirstName = senderUser.name.split(' ')[0];
        let subject = '';
        let body = '';
        if (notification.type === 'agreement') {
          subject = `Performance Agreement ${notification.quarter} - Approved`;
          body = `
            Dear ${userFirstName},<br><br>
            Your performance agreement for ${notification.quarter} has been approved.<br><br>
            Thank You.<br>
            Performance Management Team
          `;
        } else if (notification.type === 'assessment') {
          subject = `Performance Assessment ${notification.quarter} - Approved`;
          body = `
            Dear ${userFirstName},<br><br>
            Your performance assessment for ${notification.quarter} has been approved.<br><br>
            Thank You.<br>
            Performance Management Team
          `;
        }
        await graphService.sendMail(
          tenantId as string,
          fromUserId as string,
          userEmail,
          subject,
          body
        );
      }
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Continue with the response even if email fails
    }

    return res.status(200).json({ message: 'Notification approved successfully' });
  } catch (error) {
    console.error('Error approving notification:', error);
    return res.status(500).json({ error: 'Failed to approve notification' });
  }
});

router.post('/send-back/:notificationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const { emailBody, emailSubject, senderId } = req.body;
    const sender = await User.findById(senderId);

    if (!sender?.email) {
      return res.status(404).json({ error: 'Sender email not found' });
    }

    const notification = await Notification.findById(notificationId);

    const isAgreement = notification?.type === 'agreement' || notification?.type === 'resolve_agreement';
    const isAssessment = notification?.type === 'assessment' || notification?.type === 'resolve_assessment';

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const personalPerformance = await PersonalPerformance.findOne({ _id: notification.personalPerformanceId });
    if (personalPerformance) {
      const quarterlyTargets = personalPerformance.quarterlyTargets;
      const newQuarterlyTargets = quarterlyTargets.map((quarterlyTarget: any) => {
        if (quarterlyTarget.quarter === notification.quarter) {
          if (notification.type === 'agreement') {
            return {
              ...quarterlyTarget._doc,
              agreementStatus: quarterlyTarget.isAgreementCommitteeSendBack ? 'Committee Send Back' : 'Send Back',
              agreementStatusUpdatedAt: new Date()
            };
          } else if (notification.type === 'assessment') {
            return {
              ...quarterlyTarget._doc,
              assessmentStatus: quarterlyTarget.isAssessmentCommitteeSendBack ? 'Committee Send Back' : 'Send Back',
              assessmentStatusUpdatedAt: new Date()
            };
          }
        }
        return quarterlyTarget;
      });
      await PersonalPerformance.updateOne(
        { _id: notification.personalPerformanceId },
        { $set: { quarterlyTargets: newQuarterlyTargets } }
      );

      await Notification.deleteOne({ _id: notificationId });

      if (!sender) {
        return res.status(404).json({ error: 'Sender user not found' });
      }
      const user = await User.findOne({ MicrosoftId: req.user?.id });
  
      const existingNotification = await Notification.findOne({
        senderId: user?._id,
        recipientId: sender._id,
        annualTargetId: notification.annualTargetId,
        quarter: notification.quarter,
        type: isAgreement ? "resolve_agreement" : isAssessment ? "resolve_assessment" : "",
        personalPerformanceId: notification.personalPerformanceId
      });
  
      if (existingNotification) {
        await Notification.updateOne(
          { _id: existingNotification._id },
          { $set: { isRead: false } }
        );
      } else {
        await Notification.create({
          type: isAgreement ? "resolve_agreement" : isAssessment ? "resolve_assessment" : "",
          senderId: user?._id,
          recipientId: sender._id,
          annualTargetId: notification.annualTargetId,
          quarter: notification.quarter,
          isRead: false,
          personalPerformanceId: notification.personalPerformanceId
        });
      }
      socketService.emitToUser(sender.MicrosoftId, SocketEvent.NOTIFICATION, {});

      try {
        // Send email notifications
        const emailContent = `
          <html>
            <body>
              <h2>Performance ${notification.type === 'agreement' ? 'Agreement' : 'Assessment'} Update</h2>
              <p>Your ${notification.type === 'agreement' ? 'performance agreement' : 'performance assessment'} for ${notification.quarter} has been sent back for revision.</p>
              <p>Here goes the reason for sending back the ${notification.type === 'agreement' ? 'performance agreement' : 'performance assessment'}:</p>
              <p>${emailBody}</p>
              <p>Please log in to the system to review and make the necessary changes.</p>
            </body>
          </html>
        `;

        // Send to sender
        await graphService.sendMail(
          req.user?.tenantId || '',
          req.user?.id || '',
          sender.email,
          emailSubject,
          emailContent
        );

        // Send to current user
        await graphService.sendMail(
          req.user?.tenantId || '',
          req.user?.id || '',
          req.user?.email || '',
          emailSubject,
          emailContent
        );
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
        // Continue with the response even if email fails
      }
    }

    return res.status(200).json({ message: 'Notification sent back successfully' });
  } catch (error) {
    console.error('Error sending back notification:', error);
    return res.status(500).json({ error: 'Failed to send back notification' });
  }
});


export default router; 