import express, { Response } from 'express';
import Risk from '../models/Risk';
import { AuthenticatedRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';
import { checkLicenseStatus } from '../middleware/licenseCheck';
import mongoose from 'mongoose';

const router = express.Router();

// Get all risks for the tenant
router.get('/', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const risks = await Risk.find({ tenantId: req.user?.tenantId })
            .populate('riskCategory', 'categoryName')
            .populate('riskOwner', 'name')
            .sort({ id: 1 });
        return res.json({ data: risks });
    } catch (error) {
        console.error('Error fetching risks:', error);
        return res.status(500).json({ message: 'Error fetching risks' });
    }
});

// Create a new risk
router.post('/', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            riskNameElement,
            strategicObjective,
            riskCategory,
            riskDescription,
            cause,
            effectImpact,
            riskOwner,
            status
        } = req.body;

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(riskCategory) || !mongoose.Types.ObjectId.isValid(riskOwner)) {
            return res.status(400).json({ message: 'Invalid risk category or risk owner ID' });
        }

        const risk = new Risk({
            riskNameElement,
            strategicObjective,
            riskCategory,
            riskDescription,
            cause,
            effectImpact,
            riskOwner,
            status,
            tenantId: req.user?.tenantId
        });

        await risk.save();

        // Populate the created risk with related data
        const populatedRisk = await Risk.findById(risk._id)
            .populate('riskCategory', 'categoryName')
            .populate('riskOwner', 'name');

        return res.status(201).json({ data: populatedRisk });
    } catch (error) {
        console.error('Error creating risk:', error);
        return res.status(400).json({ message: 'Error creating risk' });
    }
});

// Update a risk
router.put('/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            riskNameElement,
            strategicObjective,
            riskCategory,
            riskDescription,
            cause,
            effectImpact,
            riskOwner,
            status
        } = req.body;

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(riskCategory) || !mongoose.Types.ObjectId.isValid(riskOwner)) {
            return res.status(400).json({ message: 'Invalid risk category or risk owner ID' });
        }

        const risk = await Risk.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user?.tenantId },
            {
                riskNameElement,
                strategicObjective,
                riskCategory,
                riskDescription,
                cause,
                effectImpact,
                riskOwner,
                status
            },
            { new: true }
        ).populate('riskCategory', 'categoryName')
         .populate('riskOwner', 'name');

        if (!risk) {
            return res.status(404).json({ message: 'Risk not found' });
        }

        // Re-number risks based on status
        const allRisks = await Risk.find({ tenantId: req.user?.tenantId }).sort({ no: 1 });
        const activeRisks = allRisks.filter(r => r.status === 'Active');
        const inactiveRisks = allRisks.filter(r => r.status === 'Inactive');

        // Update numbers for active risks
        for (let i = 0; i < activeRisks.length; i++) {
            await Risk.findByIdAndUpdate(activeRisks[i]._id, { no: i + 1 });
        }

        // Update numbers for inactive risks
        for (let i = 0; i < inactiveRisks.length; i++) {
            await Risk.findByIdAndUpdate(inactiveRisks[i]._id, { no: activeRisks.length + i + 1 });
        }

        return res.json({ data: risk });
    } catch (error) {
        console.error('Error updating risk:', error);
        return res.status(400).json({ message: 'Error updating risk' });
    }
});

// Delete a risk
router.delete('/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const risk = await Risk.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId: req.user?.tenantId 
        });

        if (!risk) {
            return res.status(404).json({ message: 'Risk not found' });
        }

        // Re-number remaining risks
        const remainingRisks = await Risk.find({ tenantId: req.user?.tenantId }).sort({ no: 1 });
        const activeRisks = remainingRisks.filter(r => r.status === 'Active');
        const inactiveRisks = remainingRisks.filter(r => r.status === 'Inactive');

        // Update numbers for active risks
        for (let i = 0; i < activeRisks.length; i++) {
            await Risk.findByIdAndUpdate(activeRisks[i]._id, { no: i + 1 });
        }

        // Update numbers for inactive risks
        for (let i = 0; i < inactiveRisks.length; i++) {
            await Risk.findByIdAndUpdate(inactiveRisks[i]._id, { no: activeRisks.length + i + 1 });
        }

        return res.json({ message: 'Risk deleted successfully' });
    } catch (error) {
        console.error('Error deleting risk:', error);
        return res.status(400).json({ message: 'Error deleting risk' });
    }
});

export default router; 