import express, { Response } from 'express';
import RiskCategory from '../models/RiskCategory';
import { AuthenticatedRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all risk categories for the tenant
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await RiskCategory.find({ tenantId: req.user?.tenantId });
    return res.json({ data: categories });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching risk categories' });
  }
});

// Create a new risk category
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryName, description } = req.body;
    const category = new RiskCategory({ 
      categoryName, 
      description,
      tenantId: req.user?.tenantId 
    });
    await category.save();
    return res.status(201).json({ data: category });
  } catch (error) {
    return res.status(400).json({ message: 'Error creating risk category' });
  }
});

// Update a risk category
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryName, description } = req.body;
    const category = await RiskCategory.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user?.tenantId },
      { categoryName, description },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Risk category not found' });
    }
    return res.json({ data: category });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating risk category' });
  }
});

// Delete a risk category
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = await RiskCategory.findOneAndDelete({ 
      _id: req.params.id, 
      tenantId: req.user?.tenantId 
    });
    if (!category) {
      return res.status(404).json({ message: 'Risk category not found' });
    }
    return res.json({ message: 'Risk category deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting risk category' });
  }
});

export default router;
