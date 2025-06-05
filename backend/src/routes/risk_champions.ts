import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkLicenseStatus } from '../middleware/licenseCheck';
import { AuthenticatedRequest } from '../types/user';
import User from '../models/User';

const router = express.Router();

router.get('/tenant', authenticateToken, checkLicenseStatus, async (_req: AuthenticatedRequest, res: Response) => {
    const { teamId } = _req.query;
    try {
        const riskChampions = await User.find({ isRiskChampion: true, tenantId: _req.user?.tenantId, teamId: teamId });
        res.json(riskChampions);
    } catch (error) {
        console.error('Error fetching risk champions:', error);
        res.status(500).json({ error: 'Failed to fetch risk champions' });
    }
});

router.post('/tenant', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email, teamId } = req.body;
        const riskChampion = await User.findOneAndUpdate(
            { email, tenantId: req.user?.tenantId },
            { isRiskChampion: true, teamId }
        );
        res.json(riskChampion);
    } catch (error) {
        console.error('Error adding risk champion:', error);
        res.status(500).json({ error: 'Failed to add risk champion' });
    }
});

router.delete('/tenant/by-email/:email', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email } = req.params;
        const riskChampion = await User.findOneAndUpdate(
            { email, tenantId: req.user?.tenantId },
            { isRiskChampion: false, teamId: null }
        );
        res.json(riskChampion);
    } catch (error) {
        console.error('Error deleting risk champion:', error);
        res.status(500).json({ error: 'Failed to delete risk champion' });
    }
});

export default router;
