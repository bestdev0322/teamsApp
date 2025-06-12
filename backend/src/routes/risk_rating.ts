import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkLicenseStatus } from '../middleware/licenseCheck';
import { AuthenticatedRequest } from '../types/user';
import RiskRating from '../models/RiskRating';

const router = express.Router();

// GET all risk ratings for a tenant
router.get('/', authenticateToken, checkLicenseStatus, async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const riskRatings = await RiskRating.find({ tenantId: _req.user?.tenantId });
        res.json({ success: true, data: riskRatings });
    } catch (error) {
        console.error('Error fetching risk ratings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch risk ratings' });
    }
});

// POST a new risk rating
router.post('/', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { rating, minScore, maxScore, color } = req.body;
        const tenantId = req.user?.tenantId;

        if (!rating || minScore === undefined || maxScore === undefined || !color || !tenantId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Basic validation: max score must be greater than min score
        if (maxScore <= minScore) {
             return res.status(400).json({ success: false, error: 'Max Score must be greater than Min Score' });
        }

        const newRiskRating = new RiskRating({
            rating,
            minScore,
            maxScore,
            color,
            tenantId
        });

        const savedRiskRating = await newRiskRating.save();
        return res.status(201).json({ success: true, data: savedRiskRating });
    } catch (error) {
        console.error('Error creating risk rating:', error);
        return res.status(500).json({ success: false, error: 'Failed to create risk rating' });
    }
});

// PUT update a risk rating
router.put('/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { rating, minScore, maxScore, color } = req.body;
        const tenantId = req.user?.tenantId;

        if (!rating || minScore === undefined || maxScore === undefined || !color || !tenantId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
         // Basic validation: max score must be greater than min score
        if (maxScore <= minScore) {
             return res.status(400).json({ success: false, error: 'Max Score must be greater than Min Score' });
        }

        const updatedRiskRating = await RiskRating.findOneAndUpdate(
            { _id: id, tenantId },
            { rating, minScore, maxScore, color },
            { new: true }
        );

        if (!updatedRiskRating) {
            return res.status(404).json({ success: false, error: 'Risk rating not found' });
        }

        return res.json({ success: true, data: updatedRiskRating });
    } catch (error) {
        console.error('Error updating risk rating:', error);
        return res.status(500).json({ success: false, error: 'Failed to update risk rating' });
    }
});

// DELETE a risk rating
router.delete('/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;

        const deletedRiskRating = await RiskRating.findOneAndDelete({ _id: id, tenantId });

        if (!deletedRiskRating) {
            return res.status(404).json({ success: false, error: 'Risk rating not found' });
        }

        return res.json({ success: true, message: 'Risk rating deleted successfully' });
    } catch (error) {
        console.error('Error deleting risk rating:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete risk rating' });
    }
});

export default router;
