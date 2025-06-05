import express, { Response } from 'express';
import LikelihoodSetting from '../models/LikelihoodSetting';
import { AuthenticatedRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all risk likelihood settings for the tenant
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const likelihoodSettings = await LikelihoodSetting.find({ tenantId: req.user?.tenantId });
    return res.json({ data: likelihoodSettings });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching risk likelihood settings' });
  }
});

// Create a new risk likelihood setting
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { likelihoodName, description, score } = req.body;
    const likelihoodSetting = new LikelihoodSetting({ 
      likelihoodName, 
      description,
      score,
      tenantId: req.user?.tenantId 
    });
    await likelihoodSetting.save();
    return res.status(201).json({ data: likelihoodSetting });
  } catch (error) {
    return res.status(400).json({ message: 'Error creating risk likelihood setting' });
  }
});

// Update a risk likelihood setting
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { likelihoodName, description, score } = req.body;
    const likelihoodSetting = await LikelihoodSetting.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user?.tenantId },
      { likelihoodName, description, score },
      { new: true }
    );
    if (!likelihoodSetting) {
      return res.status(404).json({ message: 'Risk likelihood setting not found' });
    }
    return res.json({ data: likelihoodSetting });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating risk likelihood setting' });
  }
});

// Delete a risk likelihood setting
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const likelihoodSetting = await LikelihoodSetting.findOneAndDelete({ 
      _id: req.params.id, 
      tenantId: req.user?.tenantId 
    });
    if (!likelihoodSetting) {
      return res.status(404).json({ message: 'Risk likelihood setting not found' });
    }
    return res.json({ message: 'Risk likelihood setting deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting risk likelihood setting' });
  }
});

export default router;
