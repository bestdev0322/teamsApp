import express, { Response } from 'express';
import ImpactSetting from '../models/ImpactSetting';
import { AuthenticatedRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all risk impact settings for the tenant
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const impactSettings = await ImpactSetting.find({ tenantId: req.user?.tenantId });
    return res.json({ data: impactSettings });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching risk impact settings' });
  }
});

// Create a new risk impact setting
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { impactName, description, score } = req.body;
    const impactSetting = new ImpactSetting({ 
      impactName, 
      description,
      score,
      tenantId: req.user?.tenantId 
    });
    await impactSetting.save();
    return res.status(201).json({ data: impactSetting });
  } catch (error) {
    return res.status(400).json({ message: 'Error creating risk impact setting' });
  }
});

// Update a risk impact setting
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { impactName, description, score } = req.body;
    const impactSetting = await ImpactSetting.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user?.tenantId },
      { impactName, description, score },
      { new: true }
    );
    if (!impactSetting) {
      return res.status(404).json({ message: 'Risk impact setting not found' });
    }
    return res.json({ data: impactSetting });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating risk impact setting' });
  }
});

// Delete a risk impact setting
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const impactSetting = await ImpactSetting.findOneAndDelete({ 
      _id: req.params.id, 
      tenantId: req.user?.tenantId 
    });
    if (!impactSetting) {
      return res.status(404).json({ message: 'Risk impact setting not found' });
    }
    return res.json({ message: 'Risk impact setting deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting risk impact setting' });
  }
});

export default router;
