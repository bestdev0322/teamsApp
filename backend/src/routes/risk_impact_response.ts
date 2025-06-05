import express, { Response } from 'express';
import ImpactResponse from '../models/ImpactResponse';
import { AuthenticatedRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all impact responses for the tenant
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const responses = await ImpactResponse.find({ tenantId: req.user?.tenantId });
    return res.json({ data: responses });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching impact responses' });
  }
});

// Create a new impact response
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { responseName, description } = req.body;
    const response = new ImpactResponse({ 
      responseName, 
      description,
      tenantId: req.user?.tenantId 
    });
    await response.save();
    return res.status(201).json({ data: response });
  } catch (error) {
    return res.status(400).json({ message: 'Error creating impact response' });
  }
});

// Update an impact response
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { responseName, description } = req.body;
    const response = await ImpactResponse.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user?.tenantId },
      { responseName, description },
      { new: true }
    );
    if (!response) {
      return res.status(404).json({ message: 'Impact response not found' });
    }
    return res.json({ data: response });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating impact response' });
  }
});

// Delete an impact response
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const response = await ImpactResponse.findOneAndDelete({ 
      _id: req.params.id, 
      tenantId: req.user?.tenantId 
    });
    if (!response) {
      return res.status(404).json({ message: 'Impact response not found' });
    }
    return res.json({ message: 'Impact response deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting impact response' });
  }
});

export default router;
