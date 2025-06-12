import express from 'express';
import ResidualRiskAssessmentCycle from '../models/ResidualRiskAssessmentCycle';
import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';

const router = express.Router();

// Get all cycles
router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cycles = await ResidualRiskAssessmentCycle.find().sort({ year: -1 });
    return res.json({ data: cycles });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get single cycle by id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycle = await ResidualRiskAssessmentCycle.findById(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: cycle });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create new cycle
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, quarters } = req.body;
    if (!year || !quarters) return res.status(400).json({ error: 'Year and quarters required' });
    const exists = await ResidualRiskAssessmentCycle.findOne({ year });
    if (exists) return res.status(400).json({ error: 'Cycle for this year already exists' });
    const cycle = new ResidualRiskAssessmentCycle({ year, quarters });
    await cycle.save();
    return res.json({ data: cycle });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update cycle
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, quarters } = req.body;
    const cycle = await ResidualRiskAssessmentCycle.findByIdAndUpdate(
      req.params.id,
      { year, quarters },
      { new: true }
    );
    if (!cycle) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: cycle });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete cycle
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cycle = await ResidualRiskAssessmentCycle.findByIdAndDelete(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router; 