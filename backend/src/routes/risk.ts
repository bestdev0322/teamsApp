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
            .populate('impact', 'impactName score')
            .populate('likelihood', 'likelihoodName score')
            .populate('riskResponse', 'responseName')
            .sort({ _id: 1 });
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
        if (!mongoose.Types.ObjectId.isValid(riskCategory) || !mongoose.Types.ObjectId.isValid(riskOwner) || 
            (req.body.impact && !mongoose.Types.ObjectId.isValid(req.body.impact)) || 
            (req.body.likelihood && !mongoose.Types.ObjectId.isValid(req.body.likelihood)) || 
            (req.body.riskResponse && !mongoose.Types.ObjectId.isValid(req.body.riskResponse)) ) {
            return res.status(400).json({ message: 'Invalid risk category, risk owner, impact, likelihood, or risk response ID' });
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
            tenantId: req.user?.tenantId,
            impact: req.body.impact,
            likelihood: null,
            riskResponse: null,
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
            status,
            residualScores
        } = req.body;

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(riskCategory) || !mongoose.Types.ObjectId.isValid(riskOwner) ||
            (req.body.impact && !mongoose.Types.ObjectId.isValid(req.body.impact)) ||
            (req.body.likelihood && !mongoose.Types.ObjectId.isValid(req.body.likelihood)) ||
            (req.body.riskResponse && !mongoose.Types.ObjectId.isValid(req.body.riskResponse)) ) {
            return res.status(400).json({ message: 'Invalid risk category, risk owner, impact, likelihood, or risk response ID' });
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
                status,
                impact: req.body.impact,
                likelihood: req.body.likelihood,
                riskResponse: req.body.riskResponse,
                residualScores: [...residualScores]
            },
            { new: true }
        ).populate('riskCategory', 'categoryName')
         .populate('riskOwner', 'name')
         .sort({ _id: 1 });

        if (!risk) {
            return res.status(404).json({ message: 'Risk not found' });
        }


        return res.json({ data: risk });
    } catch (error) {
        console.error('Error updating risk:', error);
        return res.status(400).json({ message: 'Error updating risk' });
    }
});

// Update a risk's assessment fields
router.put('/assessment/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { impact, likelihood, riskResponse } = req.body;

    // Validate ObjectIds
    if (impact && !mongoose.Types.ObjectId.isValid(impact)) {
      return res.status(400).json({ message: 'Invalid impact ID' });
    }
    if (likelihood && !mongoose.Types.ObjectId.isValid(likelihood)) {
      return res.status(400).json({ message: 'Invalid likelihood ID' });
    }
    if (riskResponse && !mongoose.Types.ObjectId.isValid(riskResponse)) {
      return res.status(400).json({ message: 'Invalid risk response ID' });
    }

    const risk = await Risk.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user?.tenantId },
      { impact, likelihood, riskResponse },
      { new: true }
    ).populate('riskCategory', 'categoryName')
     .populate('riskOwner', 'name')
     .populate('impact', 'impactName')
     .populate('likelihood', 'likelihoodName')
     .populate('riskResponse', 'responseName');

    if (!risk) {
      return res.status(404).json({ message: 'Risk not found' });
    }

    return res.json({ data: risk });
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    return res.status(400).json({ message: 'Error updating risk assessment' });
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




        return res.json({ message: 'Risk deleted successfully' });
    } catch (error) {
        console.error('Error deleting risk:', error);
        return res.status(400).json({ message: 'Error deleting risk' });
    }
});

// Add new residual score to a risk
router.post('/:id/residual-score', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { score, year, quarter } = req.body;

        if (!score || !year || !quarter) {
            return res.status(400).json({ message: 'Score, year, and quarter are required' });
        }

        const newScore = { score, year, quarter };

        const risk = await Risk.findOne({ _id: req.params.id, tenantId: req.user?.tenantId });
        if (!risk) {
            return res.status(404).json({ message: 'Risk not found' });
        }
        console.log(year, quarter,risk.residualScores)
        // Check if a score already exists for this year and quarter
        const existingScoreIndex = risk.residualScores.findIndex(
            rs => rs.year === year.toString() && rs.quarter === quarter
        );

        if (existingScoreIndex !== -1) {
            // Update existing score
            risk.residualScores[existingScoreIndex] = newScore;
        } else {
            // Add new score
            risk.residualScores.push(newScore);
        }

        // Save the document, bypassing full validation. This is a workaround
        // if existing risk documents in the DB are missing required fields.
        await risk.save({ validateBeforeSave: false });

        return res.json({
            message: 'Residual score added successfully',
            data: risk // Return the updated risk document
        });
    } catch (error) {
        console.error('Error adding residual score:', error);
        return res.status(400).json({ message: 'Error adding residual score' });
    }
});

export default router; 