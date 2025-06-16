import express, { Response } from 'express';
import Obligation from '../models/Obligation';
import { AuthenticatedRequest } from '../types/user';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User';
import { graphService } from '../services/graphService';
import { sendComplianceReminders } from '../services/complianceReminderService';


const router = express.Router();

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    console.log('Upload directory:', uploadDir);

    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created upload directory');
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error as Error, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    // Keep original filename but make it unique with timestamp
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${uniqueSuffix}-${file.originalname}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ storage });

// Get all obligations for the tenant
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.isComplianceSuperUser) {
      const obligations = await Obligation.find({ tenantId: req.user?.tenantId })
        .populate('complianceArea')
        .populate('owner');
      return res.json({ data: obligations });
    } else {
      const obligations = await Obligation.find({ tenantId: req.user?.tenantId, owner: req.user?.teamId })
        .populate('complianceArea')
        .populate('owner');
      return res.json({ data: obligations });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching obligations' });
  }
});

// Create a new obligation
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { complianceObligation, complianceArea, frequency, lastDueDate, owner, riskLevel, status } = req.body;
    const obligation = new Obligation({
      complianceObligation,
      complianceArea,
      frequency,
      lastDueDate,
      owner,
      riskLevel,
      status: status || 'Active',
      tenantId: req.user?.tenantId
    });
    await obligation.save();
    const populatedObligation = await Obligation.findById(obligation._id)
      .populate('complianceArea')
      .populate('owner');
    return res.status(201).json({ data: populatedObligation });
  } catch (error) {
    return res.status(400).json({ message: 'Error creating obligation' });
  }
});

// Update an obligation
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { complianceObligation, complianceArea, frequency, lastDueDate, owner, riskLevel, status } = req.body;
    const obligation = await Obligation.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user?.tenantId },
      {
        complianceObligation,
        complianceArea,
        frequency,
        lastDueDate,
        owner,
        riskLevel,
        status
      },
      { new: true }
    ).populate('complianceArea').populate('owner');

    if (!obligation) {
      return res.status(404).json({ message: 'Obligation not found' });
    }
    return res.json({ data: obligation });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating obligation' });
  }
});

// Update an obligation
router.put('/:id/update', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { complianceStatus, comments, attachments, year, quarter } = req.body;

    // First check if an update entry exists for this year and quarter
    const obligation = await Obligation.findOne({
      _id: req.params.id,
      tenantId: req.user?.tenantId,
      'update.year': year,
      'update.quarter': quarter
    });

    let result;
    if (obligation) {
      // Update existing entry
      result = await Obligation.findOneAndUpdate(
        {
          _id: req.params.id,
          tenantId: req.user?.tenantId
        },
        {
          $set: {
            'update.$[elem].complianceStatus': complianceStatus,
            'update.$[elem].comments': comments,
            'update.$[elem].attachments': attachments
          }
        },
        {
          new: true,
          arrayFilters: [
            { 'elem.year': year, 'elem.quarter': quarter }
          ]
        }
      ).populate('complianceArea').populate('owner');
    } else {
      // Add new entry
      result = await Obligation.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user?.tenantId },
        {
          $push: {
            update: {
              year,
              quarter,
              complianceStatus,
              comments,
              assessmentStatus: 'Draft',
              attachments
            }
          }
        },
        { new: true }
      ).populate('complianceArea').populate('owner');
    }
    if (!result) {
      return res.status(404).json({ message: 'Obligation not found' });
    }
    return res.json({ data: result });
  } catch (error) {
    console.error('Error updating obligation with new update:', error);
    return res.status(400).json({ message: 'Error updating obligation' });
  }
});

// Delete an obligation
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const obligation = await Obligation.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user?.tenantId
    });
    if (!obligation) {
      return res.status(404).json({ message: 'Obligation not found' });
    }
    return res.json({ message: 'Obligation deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting obligation' });
  }
});

router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the URL for accessing the file
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(fileUrl, 'url')
    return res.json(fileUrl);

  } catch (error) {
    console.error('Upload file error:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/delete-file', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileUrl } = req.body;
    const filePath = path.join(__dirname, '../../public/', fileUrl);
    fs.unlinkSync(filePath);
    return res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
});

router.post('/submit-quarterly-updates', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { obligationIds, year, quarter, status } = req.body;
    const tenantId = req.user?.tenantId;

    if (!obligationIds || !Array.isArray(obligationIds) || obligationIds.length === 0) {
      return res.status(400).json({ message: 'No obligation IDs provided' });
    }

    if (!year || !quarter || !status) {
      return res.status(400).json({ message: 'Missing year, quarter, or status' });
    }

    const updatedObligations = [];

    for (const obligationId of obligationIds) {
      let obligation = await Obligation.findOne({ _id: obligationId, tenantId: tenantId });

      if (!obligation) {
        console.warn(`Obligation with ID ${obligationId} not found or does not belong to tenant ${tenantId}`);
        continue; // Skip to the next obligation
      }

      // Find the update entry for the current year and quarter, ensuring year comparison is string-based
      const existingUpdateIndex = obligation.update?.findIndex(
        (u) => String(u.year) === String(year) && u.quarter === quarter
      );

      if (existingUpdateIndex !== -1 && obligation.update) {
        // Update existing entry's assessmentStatus
        obligation.update[existingUpdateIndex!].assessmentStatus = status as any;
      } else {
        // Create a new update entry for the current quarter
        if (!obligation.update) {
          obligation.update = [];
        }
        obligation.update.push({
          year: String(year), // Ensure year is stored as a string for consistency
          quarter,
          comments: '', // Default empty comments on new submission
          attachments: [], // Default empty attachments on new submission
          assessmentStatus: status as any,
        });
      }

      // Save the updated obligation document. This will trigger schema validation.
      await obligation.save();
      updatedObligations.push(obligation);
    }

    if (status === 'Submitted') {
      // Get the team name from the first obligation that was actually processed
      const firstProcessedObligation = updatedObligations[0];
      let teamName = 'Unknown Team';
      if (firstProcessedObligation) {
        const populatedObligation = await Obligation.findOne({ _id: firstProcessedObligation._id }).populate<{ owner: { name: string } }>('owner');
        teamName = populatedObligation?.owner?.name || 'Unknown Team';
      }

      // Get all compliance super users in the tenant
      const complianceSuperUsers = await User.find({
        tenantId: tenantId,
        isComplianceSuperUser: true
      });

      // Send email to each compliance super user
      const emailSubject = `Review ${teamName} Compliance Obligation`;
      const emailContent = `
      <html>
        <body>
          <h2>Compliance Obligation Review Request</h2>
          <p>Dear Compliance Team,</p>
          <p>A compliance obligation has been submitted for review by the ${teamName}.</p>
          <p>Best Regards,<br>${teamName}</p>
        </body>
      </html>
    `;

      // Send emails to all compliance super users
      for (const user of complianceSuperUsers) {
        if (user.email && tenantId) {
          await graphService.sendMail(
            tenantId,
            req.user?.id || '',
            user.email,
            emailSubject,
            emailContent
          );
        }
      }

      return res.json({
        message: 'Obligations updated successfully and notifications sent',
        updatedCount: updatedObligations.length,
        data: updatedObligations
      });
    } else {
      return res.json({
        message: 'Obligations updated successfully',
        updatedCount: updatedObligations.length,
        data: updatedObligations
      });
    }

  } catch (error) {
    console.error('Error submitting quarterly updates:', error);
    return res.status(500).json({ message: 'Error submitting quarterly updates' });
  }
});

router.post('/send-reminders', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, quarter, endDate } = req.body;

    if (!year || !quarter || !endDate) {
      return res.status(400).json({ message: 'Year, quarter, and endDate are required' });
    }

    const result = await sendComplianceReminders(year, quarter, endDate);
    return res.json(result);
  } catch (error) {
    console.error('Error sending compliance reminders:', error);
    return res.status(500).json({ message: 'Failed to send compliance reminders' });
  }
});

export default router; 