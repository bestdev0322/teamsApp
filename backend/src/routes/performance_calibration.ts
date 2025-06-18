import express, { NextFunction, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import User from '../models/User';
import { ApiError } from '../utils/apiError';
import PersonalPerformance, { AgreementStatus, AssessmentStatus } from '../models/PersonalPerformance';
import { AgreementReviewStatus, AssessmentReviewStatus } from '../models/PersonalPerformance';
import { graphService } from '../services/graphService';
import Notification from '../models/Notification';
import { socketService } from '../server';
import { SocketEvent } from '../types/socket';
const router = express.Router();

router.get('/get-all-members/:tenantId', authenticateToken, async (req, res, next) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            throw new ApiError('Tenant ID is required', 400);
        }

        const calibrationMembers = await User.find({
            tenantId,
            isPerformanceCalibrationMember: true
        }).select('MicrosoftId name email jobTitle');

        return res.json({
            status: 'success',
            data: calibrationMembers
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/add-member', authenticateToken, async (req, res, next) => {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw new ApiError('User IDs array is required', 400);
        }

        await User.updateMany(
            { MicrosoftId: { $in: userIds } },
            { $set: { isPerformanceCalibrationMember: true } }
        );

        return res.json({
            status: 'success',
            message: 'Members added to performance calibration team successfully'
        });
    } catch (error) {
        return next(error);
    }
});

router.delete('/remove-member/:userId', authenticateToken, async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            throw new ApiError('User ID is required', 400);
        }

        await User.findOneAndUpdate(
            { MicrosoftId: userId },
            { $set: { isPerformanceCalibrationMember: false } }
        );

        return res.json({
            status: 'success',
            message: 'Member removed from performance calibration team successfully'
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/pm-committee-action-agreement', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { performanceId, quarter, action, userId, emailSubject, emailBody } = req.body;

        if (!performanceId || !quarter || !action) {
            throw new ApiError('Performance ID, quarter, and action are required', 400);
        }
        const tenantId = req.user?.tenantId;
        const fromUserId = req.user?.id;
        const toUser = await User.findOne({ _id: userId });

        let newStatus;
        if (action === 'accept') {
            newStatus = AgreementReviewStatus.Reviewed;
            const subject = `Performance Agreement ${quarter}`;
            const emailBody = `
                Dear ${toUser?.name},<br>
                Your performance agreement has been reviewed by the PM Committee and there is nothing required from you.<br>
                Thank you,<br><br>
                PM Committee.
            `;
            if (!tenantId || !fromUserId || !toUser?.id) {
                throw new ApiError('Missing required email information', 400);
            }
            await PersonalPerformance.updateOne(
                { _id: performanceId, "quarterlyTargets.quarter": quarter },
                { $set: { "quarterlyTargets.$.agreementReviewStatus": newStatus, "quarterlyTargets.$.isAgreementCommitteeSendBack": false, "quarterlyTargets.$.agreementCommitteeSendBackMessage": '' } }
            );
            await graphService.sendMail(tenantId, fromUserId, toUser.email, subject, emailBody);
        } else if (action === 'unaccept') {
            newStatus = AgreementReviewStatus.NotReviewed;
            await PersonalPerformance.updateOne(
                { _id: performanceId, "quarterlyTargets.quarter": quarter },
                { $set: { "quarterlyTargets.$.agreementReviewStatus": newStatus } }
            );
        } else if (action === 'sendBack') {
            newStatus = AgreementReviewStatus.NotReviewed;
            if (!tenantId || !fromUserId || !toUser?.MicrosoftId) {
                throw new ApiError('Missing required email information', 400);
            }
            await PersonalPerformance.updateOne(
                { _id: performanceId, "quarterlyTargets.quarter": quarter },
                { $set: { "quarterlyTargets.$.agreementReviewStatus": newStatus, "quarterlyTargets.$.agreementStatus": AgreementStatus.CommitteeSendBack, "quarterlyTargets.$.isAgreementCommitteeSendBack": true, "quarterlyTargets.$.agreementCommitteeSendBackMessage": emailBody } }
            );
            await graphService.sendMail(tenantId, fromUserId, toUser.email, emailSubject, emailBody);

            const user = await User.findOne({ MicrosoftId: req.user?.id });
            const existingNotification = await Notification.findOne({
                senderId: user?._id,
                recipientId: userId,
                annualTargetId: performanceId,
                quarter: quarter,
                type: "resolve_agreement",
                personalPerformanceId: performanceId
            });

            if (existingNotification) {
                await Notification.updateOne(
                    { _id: existingNotification._id },
                    { $set: { isRead: false } }
                );
            } else {
                await Notification.create({
                    type: "resolve_agreement",
                    senderId: user?._id,
                    recipientId: userId,
                    annualTargetId: performanceId,
                    quarter: quarter,
                    isRead: false,
                    personalPerformanceId: performanceId
                });
            }
            socketService.emitToUser(
                userId,
                SocketEvent.NOTIFICATION,
                {}
            );
        } else {
            throw new ApiError('Invalid action', 400);
        }

        return res.json({
            status: 'success',
            message: `Agreement ${action}ed successfully`
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/pm-committee-action-assessment', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { performanceId, quarter, action, userId, emailSubject, emailBody } = req.body;

        if (!performanceId || !quarter || !action) {
            throw new ApiError('Performance ID, quarter, and action are required', 400);
        }
        const tenantId = req.user?.tenantId;
        const fromUserId = req.user?.id;
        const toUser = await User.findOne({ _id: userId });

        let newStatus;
        if (action === 'accept') {
            newStatus = AssessmentReviewStatus.Reviewed;
            const subject = `Performance Assessment ${quarter}`;
            const emailBody = `
                Dear ${toUser?.name},<br>
                Your performance assessment has been reviewed by the PM Committee and there is nothing required from you.<br>
                Thank you,<br><br>
                PM Committee.
            `;
            if (!tenantId || !fromUserId || !toUser?.MicrosoftId) {
                throw new ApiError('Missing required email information', 400);
            }
            await PersonalPerformance.updateOne(
                { _id: performanceId, "quarterlyTargets.quarter": quarter },
                { $set: { "quarterlyTargets.$.assessmentReviewStatus": newStatus, "quarterlyTargets.$.isAssessmentCommitteeSendBack": false, "quarterlyTargets.$.assessmentCommitteeSendBackMessage": '' } }
            );
            await graphService.sendMail(tenantId, fromUserId, toUser.email, subject, emailBody);
        } else if (action === 'unaccept') {
            newStatus = AssessmentReviewStatus.NotReviewed;
            await PersonalPerformance.updateOne(
                { _id: performanceId, "quarterlyTargets.quarter": quarter },
                { $set: { "quarterlyTargets.$.assessmentReviewStatus": newStatus } }
            );
        } else if (action === 'sendBack') {
            newStatus = AssessmentReviewStatus.NotReviewed;
            if (!tenantId || !fromUserId || !toUser?.MicrosoftId) {
                throw new ApiError('Missing required email information', 400);
            }
            await PersonalPerformance.updateOne(
                { _id: performanceId, "quarterlyTargets.quarter": quarter },
                { $set: { "quarterlyTargets.$.assessmentReviewStatus": newStatus, "quarterlyTargets.$.assessmentStatus": AssessmentStatus.CommitteeSendBack, "quarterlyTargets.$.isAssessmentCommitteeSendBack": true, "quarterlyTargets.$.assessmentCommitteeSendBackMessage": emailBody } }
            );
            await graphService.sendMail(tenantId, fromUserId, toUser.email, emailSubject, emailBody);

            const user = await User.findOne({ MicrosoftId: req.user?.id });
            const existingNotification = await Notification.findOne({
                senderId: user?._id,
                recipientId: userId,
                annualTargetId: performanceId,
                quarter: quarter,
                type: "resolve_assessment",
                personalPerformanceId: performanceId
            });

            if (existingNotification) {
                await Notification.updateOne(
                    { _id: existingNotification._id },
                    { $set: { isRead: false } }
                );
            } else {
                await Notification.create({
                    type: "resolve_assessment",
                    senderId: user?._id,
                    recipientId: userId,
                    annualTargetId: performanceId,
                    quarter: quarter,
                    isRead: false,
                    personalPerformanceId: performanceId
                });
            }
            socketService.emitToUser(
                userId,
                SocketEvent.NOTIFICATION,
                {}
            );

        } else {
            throw new ApiError('Invalid action', 400);
        }

        return res.json({
            status: 'success',
            message: `Assessment ${action}ed successfully`
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
