import express, { Response } from 'express';
import RiskTreatment from '../models/RiskTreatment';
import { authenticateToken } from '../middleware/auth';
import { checkLicenseStatus } from '../middleware/licenseCheck';
import User from '../models/User';
import Team from '../models/Team';
import { graphService } from '../services/graphService';
import { AuthenticatedRequest } from '../types/user';

const router = express.Router();

// Create a new risk treatment
router.post('/', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { risk, treatment, treatmentOwner, targetDate, status, controlType } = req.body;
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
      tenantId,
      controlType,
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

// Get only risk treatments assigned to the current user
router.get('/my-treatments', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const teamId = req.user?.teamId;
    const isSuperUser = req.user?.isRiskSuperUser;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }
    let riskTreatments;
    if (isSuperUser) {
      // Return all risk treatments for the tenant
      riskTreatments = await RiskTreatment.find({ tenantId })
        .populate({
          path: 'risk',
          select: 'riskNameElement riskCategory',
          populate: {
            path: 'riskCategory',
            select: 'categoryName',
          },
        })
        .populate('treatmentOwner', 'name');
    } else {
      if (!teamId) {
        return res.status(400).json({ message: 'Team ID not found in request' });
      }
      // Return only those for the user's team
      riskTreatments = await RiskTreatment.find({ tenantId, treatmentOwner: teamId })
        .populate({
          path: 'risk',
          select: 'riskNameElement riskCategory',
          populate: {
            path: 'riskCategory',
            select: 'categoryName',
          },
        })
        .populate('treatmentOwner', 'name');
    }
    return res.json({ data: riskTreatments });
  } catch (error) {
    console.error('Error fetching my risk treatments:', error);
    return res.status(500).json({ message: 'Error fetching my risk treatments' });
  }
});

// Register this route BEFORE any /:id route to avoid conflicts
router.delete('/:id/progress-history/:index', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }
    const { id, index } = req.params;
    const riskTreatment = await RiskTreatment.findOne({_id: id, tenantId});
    if (!riskTreatment) {
      return res.status(404).json({ message: 'Risk treatment not found' });
    }
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0 || idx >= (riskTreatment.progressHistory?.length || 0)) {
      return res.status(400).json({ message: 'Invalid progress history index' });
    }
    riskTreatment.progressHistory.splice(idx, 1);
    await riskTreatment.save();
    return res.json({ message: 'Progress history entry removed', data: riskTreatment });
  } catch (error) {
    console.error('Error removing progress history entry:', error);
    return res.status(500).json({ message: 'Error removing progress history entry' });
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
      .populate('treatmentOwner', 'name')
      .populate('effectiveness', 'controlEffectiveness factor');

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
    const {
      risk,
      treatment,
      treatmentOwner,
      targetDate,
      status,
      convertedToControl,
      validationNotes,
      validationDate,
      frequency,
      controlName,
      effectiveness,
      controlType
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    const updateObj = {
      risk,
      treatment,
      treatmentOwner,
      targetDate,
      status,
      convertedToControl,
      validationNotes,
      validationDate,
      frequency,
      controlName,
      effectiveness,
      controlType
    };
    const updatedRiskTreatment = await RiskTreatment.findOneAndUpdate(
      { _id: id, tenantId },
      updateObj,
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
      .populate('treatmentOwner', 'name')
      .populate('effectiveness', 'controlEffectiveness factor');

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

// Update a risk treatment with validation data by ID
router.put('/validate/:id', authenticateToken, checkLicenseStatus, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { convertedToControl, validationNotes, validationDate, controlName, frequency, controlType } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    // Find the risk treatment and populate risk and treatmentOwner
    const riskTreatment = await RiskTreatment.findOne({ _id: id, tenantId })
      .populate({
        path: 'risk',
        select: 'riskNameElement',
      })
      .populate('treatmentOwner', 'name');

    if (!riskTreatment) {
      return res.status(404).json({ message: 'Risk treatment not found' });
    }

    // Update the risk treatment
    const updatedRiskTreatment = await RiskTreatment.findOneAndUpdate(
      { _id: id, tenantId },
      {
        convertedToControl: convertedToControl === 'Yes',
        validationNotes,
        validationDate,
        controlName,
        frequency,
        status: 'Completed',
        controlType
      },
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

    // Send response immediately
    res.json({ data: updatedRiskTreatment });

    // Handle email sending asynchronously
    (async () => {
      try {
        // Find the team to get champions
        const team = await Team.findById(riskTreatment.treatmentOwner?._id);
        const teamChampions = await User.find({ isRiskChampion: true, tenantId, teamId: team?._id });

        if (teamChampions && Array.isArray(teamChampions) && teamChampions.length > 0) {
          const risk = updatedRiskTreatment?.risk as { riskNameElement?: string };
          const riskName = risk?.riskNameElement || '';
          const treatmentName = riskTreatment.treatment;
          const subject = 'Risk Treatment';
          let body = '';

          if (convertedToControl === 'Yes') {
            body = `Dear Team,<br/><br/>Please note that <b>${treatmentName}</b> for <b>${riskName}</b> has been converted to a control.<br/><br/>Regards,<br/>Risk Management Team`;
          } else {
            body = `Dear Team,<br/><br/>Please note that <b>${treatmentName}</b> for <b>${riskName}</b> could not be converted to a control and has been sent back for implementation.<br/><br/>Regards,<br/>Risk Management Team`;
          }

          // Send emails concurrently without waiting
          teamChampions.map(async (champion) => {
            if (champion.email) {
              try {
                await graphService.sendMail(
                  tenantId,
                  req.user?.id || '',
                  champion.email,
                  subject,
                  body
                );
              } catch (err) {
                console.error('Error sending email to champion:', champion.email, err);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error in async email process:', error);
      }
    })();
    return;
  } catch (error) {
    console.error('Error updating risk treatment validation:', error);
    return res.status(500).json({ message: 'Error updating risk treatment validation' });
  }
});

router.put('/my-treatments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, progressNotes, convertedToControl, validationNotes, validationDate, frequency, controlName, controlType } = req.body;
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in request' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in request' });
    }

    const riskTreatment = await RiskTreatment.findOne({_id: id, tenantId}).populate({
      path: 'risk',
      select: 'riskNameElement',
    }).populate('treatmentOwner', 'name');
    if (!riskTreatment) {
      return res.status(404).json({ message: 'Risk treatment not found' });
    }

    // Create new progress history entry
    const progressHistoryEntry = {
      status,
      progressNotes,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    // Update the risk treatment
    const updatedRiskTreatment = await RiskTreatment.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          convertedToControl,
          validationNotes,
          validationDate,
          frequency,
          controlName,
          controlType
        },
        $push: { progressHistory: progressHistoryEntry }
      },
      { new: true }
    ).populate([
      { path: 'risk', select: 'riskNameElement riskCategory' },
      { path: 'risk.riskCategory', select: 'categoryName' },
      { path: 'treatmentOwner', select: 'name' }
    ]);

    // If status is set to Completed, send email to team superUsers
    if (status === 'Completed' && tenantId && updatedRiskTreatment) {
      const superUsers = await User.find({ isRiskSuperUser: true, tenantId });

      if (superUsers && Array.isArray(superUsers) && superUsers.length > 0) {
        const risk = riskTreatment.risk as { riskNameElement?: string };
        const riskName = risk?.riskNameElement || '';
        const treatmentName = riskTreatment.treatment;
        const subject = 'Risk Treatment';
        const body = `Dear Team,<br/><br/>Please note that <b>${treatmentName}</b> for <b>${riskName}</b> has been sent to you for validation.<br/><br/>Regards,<br/>Risk Management Team`;
        
        // Fire and forget email sending
        Promise.all(superUsers.map(async (superUser) => {
          if (superUser.email) {
            try {
              await graphService.sendMail(
                tenantId,
                userId,
                superUser.email,
                subject,
                body
              );
            } catch (err) {
              console.error('Error sending email to superUser:', superUser.email, err);
            }
          }
        })).catch(err => {
          console.error('Error in email sending process:', err);
        });
      }
    }

    return res.json({
      message: 'Risk treatment updated successfully',
      data: updatedRiskTreatment
    });
  } catch (error) {
    console.error('Error updating risk treatment:', error);
    return res.status(500).json({ message: 'Error updating risk treatment' });
  }
});

export default router; 