import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkLicenseStatus } from '../middleware/licenseCheck';
import { AuthenticatedRequest } from '../types/user';
import User from '../models/User';

const router = express.Router();

router.get('/tenant', authenticateToken, checkLicenseStatus, async (_req: AuthenticatedRequest, res: Response) => {
    const { teamId } = _req.query;
    try {
        const complianceChampions = await User.find({ isComplianceChampion: true, tenantId: _req.user?.tenantId, teamId: teamId });
        res.json(complianceChampions);
    } catch (error) {
        console.error('Error fetching compliance champions:', error);
        res.status(500).json({ error: 'Failed to fetch compliance champions' });
    }
});

router.post('/tenant', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email } = req.body;
        const complianceChampion = await User.findOneAndUpdate({ email, tenantId: req.user?.tenantId }, { isComplianceChampion: true });
        res.json(complianceChampion);
    } catch (error) {
        console.error('Error fetching compliance champions:', error);
        res.status(500).json({ error: 'Failed to fetch compliance champions' });
    }
});

router.delete('/tenant/by-email/:email', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email } = req.params;
        const complianceChampion = await User.findOneAndUpdate({ email, tenantId: req.user?.tenantId }, { isComplianceChampion: false });
        res.json(complianceChampion);
    } catch (error) {
        console.error('Error deleting compliance champion:', error);
        res.status(500).json({ error: 'Failed to delete compliance champion' });
    }
});

export default router;
