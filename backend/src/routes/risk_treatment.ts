import express, { Request, Response } from 'express';
import RiskTreatment from '../models/RiskTreatment';
import { authenticateToken } from '../middleware/auth';
import { checkLicenseStatus } from '../middleware/licenseCheck';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: { tenantId?: string };
}

// Create a new risk treatment
router.post('/', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { risk, treatment, treatmentOwner, targetDate, status, progressNotes } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    const newRiskTreatment = new RiskTreatment({
      risk,
      treatment,
      treatmentOwner,
      targetDate,
      status,
      progressNotes,
      tenantId,
    });

    await newRiskTreatment.save();
    return res.status(201).json({ data: newRiskTreatment });
  } catch (error) {
    console.error('Error creating risk treatment:', error);
    return res.status(500).json({ message: 'Error creating risk treatment' });
  }
});

// Get all risk treatments for a tenant
router.get('/', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    const riskTreatments = await RiskTreatment.find({ tenantId })
      .populate({
        path: 'risk',
        select: 'riskNameElement riskCategory',
        populate: {
          path: 'riskCategory',
          select: 'categoryName',
        },
      })
      .populate('treatmentOwner', 'name');

    return res.json({ data: riskTreatments });
  } catch (error) {
    console.error('Error fetching risk treatments:', error);
    return res.status(500).json({ message: 'Error fetching risk treatments' });
  }
});

// Get a single risk treatment by ID
router.get('/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    const riskTreatment = await RiskTreatment.findOne({ _id: id, tenantId })
      .populate({
        path: 'risk',
        select: 'riskNameElement riskCategory',
        populate: {
          path: 'riskCategory',
          select: 'categoryName',
        },
      })
      .populate('treatmentOwner', 'name');

    if (!riskTreatment) {
      return res.status(404).json({ message: 'Risk treatment not found' });
    }

    return res.json({ data: riskTreatment });
  } catch (error) {
    console.error('Error fetching risk treatment by ID:', error);
    return res.status(500).json({ message: 'Error fetching risk treatment' });
  }
});

// Update a risk treatment by ID
router.put('/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { risk, treatment, treatmentOwner, targetDate, status, progressNotes } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    const updatedRiskTreatment = await RiskTreatment.findOneAndUpdate(
      { _id: id, tenantId },
      { risk, treatment, treatmentOwner, targetDate, status, progressNotes },
      { new: true }
    )
      .populate({
        path: 'risk',
        select: 'riskNameElement riskCategory',
        populate: {
          path: 'riskCategory',
          select: 'categoryName',
        },
      })
      .populate('treatmentOwner', 'name');

    if (!updatedRiskTreatment) {
      return res.status(404).json({ message: 'Risk treatment not found' });
    }

    return res.json({ data: updatedRiskTreatment });
  } catch (error) {
    console.error('Error updating risk treatment:', error);
    return res.status(500).json({ message: 'Error updating risk treatment' });
  }
});

// Delete a risk treatment by ID
router.delete('/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    const deletedRiskTreatment = await RiskTreatment.findOneAndDelete({ _id: id, tenantId });

    if (!deletedRiskTreatment) {
      return res.status(404).json({ message: 'Risk treatment not found' });
    }

    return res.status(200).json({ message: 'Risk treatment deleted successfully' });
  } catch (error) {
    console.error('Error deleting risk treatment:', error);
    return res.status(500).json({ message: 'Error deleting risk treatment' });
  }
});

export default router; 