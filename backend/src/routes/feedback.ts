import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import Feedback, { FeedbackDocument } from '../models/Feedback';
// import { omit } from 'lodash';
import PersonalPerformance from '../models/PersonalPerformance';
import { sendFeedbackEmail } from '../services/feedbackService';
const router = express.Router();

function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

// Get all companies
router.get('/', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = _req.user?.tenantId;
    const feedback = await Feedback.find({ tenantId }) as FeedbackDocument[];
    return res.json({
      data: feedback,
      status: 200,
      message: 'Feedback retrieved successfully'
    });
  } catch (error) {
    return res.status(500).json({
      data: [],
      status: 500,
      message: 'Failed to fetch feedback'
    });
  }
});

router.post('/create-feedback', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = _req.user?.tenantId;
    const newFeedback = { ..._req.body, tenantId };
    const feedback = await Feedback.create(omit(newFeedback, '_id')) as FeedbackDocument;
    return res.json({ data: feedback, status: 200, message: 'Feedback created successfully' });
  } catch (error) {
    console.log('error', error);
    return res.status(500).json({
      data: null,
      status: 500,
      message: 'Failed to create feedback'
    });
  }
});

router.put('/update-feedback', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const newFeedback = { ..._req.body, tenantId: _req.user?.tenantId };
    const feedback = await Feedback.findByIdAndUpdate(newFeedback._id, newFeedback, { new: true });
    console.log('feedback', feedback);
    return res.json({ data: feedback, status: 200, message: 'Feedback updated successfully' });
  } catch (error) {
    return res.status(500).json({
      data: null,
      status: 500,
      message: 'Failed to update feedback'
    });
  }
});

router.delete('/delete-feedback/:id', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(_req.params, 'params');
    const { id } = _req.params;
    await Feedback.findByIdAndDelete(id);
    return res.json({ status: 200, message: 'Feedback deleted successfully' });
  } catch (error) {
    return res.status(500).json({
      data: null,
      status: 500,
      message: 'Failed to delete feedback'
    });
  }
});

router.post('/share-feedback', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const user = _req.user;
    const { feedbackId, provider } = _req.body;

    const feedbackData = await PersonalPerformance.findOne(
      { 'quarterlyTargets.feedbacks._id': feedbackId }
    );

    if (!feedbackData) {
      return res.status(404).json({
        data: null,
        status: 404,
        message: 'Feedback not found'
      });
    }

    // Find the correct quarterly target and feedback index
    let targetIndex = -1;
    let feedbackIndex = -1;

    feedbackData.quarterlyTargets.forEach((target, tIndex) => {
      target.feedbacks.forEach((feedback, fIndex) => {
        if (feedback._id.toString() === feedbackId) {
          targetIndex = tIndex;
          feedbackIndex = fIndex;
        }
      });
    });

    if (targetIndex === -1 || feedbackIndex === -1) {
      return res.status(404).json({
        data: null,
        status: 404,
        message: 'Feedback not found in quarterly targets'
      });
    }

    // Update the feedback responses and provider status
    await PersonalPerformance.findOneAndUpdate(
      { 'quarterlyTargets.feedbacks._id': feedbackId },
      { 
        $set: { 
          [`quarterlyTargets.${targetIndex}.feedbacks.${feedbackIndex}.provider.status`]: 'Pending',
          [`quarterlyTargets.${targetIndex}.feedbacks.${feedbackIndex}.provider.pendingTime`]: new Date(),
        } 
      },
      { new: true }
    );
    
    const feedback = await sendFeedbackEmail(feedbackId, provider, { tenantId: user?.tenantId || '', MicrosoftId: user?.id || '', name: user?.displayName || '' });

    if (feedback.success) {
      return res.status(200).json({ data: null, message: 'Feedback shared successfully' });
    } else {
      return res.status(500).json({ data: null, message: 'Failed to share feedback' });
    }
  } catch (error) {
    return res.status(500).json({ data: null, message: 'Failed to share feedback' });
  }
});


export default router; 