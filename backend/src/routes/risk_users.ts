import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkLicenseStatus } from '../middleware/licenseCheck';
import { AuthenticatedRequest } from '../types/user';
import User from '../models/User';

const router = express.Router();

router.get('/tenant', authenticateToken, checkLicenseStatus, async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const riskUsers = await User.find({ isRiskSuperUser: true, tenantId: _req.user?.tenantId });
        res.json(riskUsers);
    } catch (error) {
        console.error('Error fetching risk users:', error);
        res.status(500).json({ error: 'Failed to fetch risk users' });
    }
});

router.post('/tenant', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email } = req.body;
        const riskUser = await User.findOneAndUpdate({ email, tenantId: req.user?.tenantId }, { isRiskSuperUser: true });
        res.json(riskUser);
    } catch (error) {
        console.error('Error fetching risk users:', error);
        res.status(500).json({ error: 'Failed to fetch risk users' });
    }
});

router.delete('/tenant/by-email/:email', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email } = req.params;
        const riskUser = await User.findOneAndUpdate({ email, tenantId: req.user?.tenantId }, { isRiskSuperUser: false });
        res.json(riskUser);
    } catch (error) {
        console.error('Error deleting risk user:', error);
        res.status(500).json({ error: 'Failed to delete risk user' });
    }
});

export default router;
