import express, { Response } from 'express';
import ControlEffectiveness from '../models/ControlEffectiveness';
import { AuthenticatedRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all control effectiveness settings for the tenant
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const controlEffectiveness = await ControlEffectiveness.find({ tenantId: req.user?.tenantId });
    return res.json({ data: controlEffectiveness });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching control effectiveness settings' });
  }
});

// Create a new control effectiveness setting
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { controlEffectiveness, description, factor } = req.body;
    const controlEffectivenessSetting = new ControlEffectiveness({ 
      controlEffectiveness, 
      description,
      factor,
      tenantId: req.user?.tenantId 
    });
    await controlEffectivenessSetting.save();
    return res.status(201).json({ data: controlEffectivenessSetting });
  } catch (error) {
    return res.status(400).json({ message: 'Error creating control effectiveness setting' });
  }
});

// Update a control effectiveness setting
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { controlEffectiveness, description, factor } = req.body;
    const controlEffectivenessSetting = await ControlEffectiveness.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user?.tenantId },
      { controlEffectiveness, description, factor },
      { new: true }
    );
    if (!controlEffectivenessSetting) {
      return res.status(404).json({ message: 'Control effectiveness setting not found' });
    }
    return res.json({ data: controlEffectivenessSetting });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating control effectiveness setting' });
  }
});

// Delete a control effectiveness setting
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const controlEffectivenessSetting = await ControlEffectiveness.findOneAndDelete({ 
      _id: req.params.id, 
      tenantId: req.user?.tenantId 
    });
    if (!controlEffectivenessSetting) {
      return res.status(404).json({ message: 'Control effectiveness setting not found' });
    }
    return res.json({ message: 'Control effectiveness setting deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting control effectiveness setting' });
  }
});

export default router;
