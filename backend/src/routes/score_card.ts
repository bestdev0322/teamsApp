import express, { Response } from 'express';
import AnnualTarget, { AnnualTargetDocument, AnnualTargetStatus } from '../models/AnnualTarget';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ApiError } from '../utils/apiError';

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

router.get('/annual-targets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const annualTargets = await AnnualTarget.find({ tenantId: req.user?.tenantId }) as AnnualTargetDocument[];
    const sortedAnnualTargets = annualTargets.sort((a, b) => {
      if (a.status === AnnualTargetStatus.Active && b.status !== AnnualTargetStatus.Active) {
        return -1;
      } else if (a.status !== AnnualTargetStatus.Active && b.status === AnnualTargetStatus.Active) {
        return 1;
      }
      return 0;
    });
    return res.json(sortedAnnualTargets);
  } catch (error) {
    console.error('Annual targets error:', error);
    return res.status(500).json({ error: 'Failed to get annual targets' });
  }
});

router.post('/create-annual-target', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { annualTarget } = req.body;
    const existingAnnualTarget = await AnnualTarget.findOne({ name: annualTarget.name });
    if (existingAnnualTarget) {
      return res.status(400).json({ error: 'Annual target already exists' });
    }

    const newAnnualTarget = await AnnualTarget.create({ ...annualTarget, tenantId: req.user?.tenantId }) as AnnualTargetDocument;
    return res.json(newAnnualTarget);
  } catch (error) {
    console.error('Create annual target error:', error);
    return res.status(500).json({ error: 'Failed to create annual target' });
  }
});

router.put('/update-annual-target/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { annualTarget } = req.body;

    const updatedAnnualTarget = await AnnualTarget.findByIdAndUpdate(id, annualTarget, { new: true });
    return res.json(updatedAnnualTarget);
  } catch (error) {
    console.error('Update annual target error:', error);
    return res.status(500).json({ error: 'Failed to update annual target' });
  }
});

router.delete('/delete-annual-target/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await AnnualTarget.findByIdAndDelete(id);
    return res.json({ message: 'Annual target deleted successfully' });
  } catch (error) {
    console.error('Delete annual target error:', error);
    return res.status(500).json({ error: 'Failed to delete annual target' });
  }
});

router.put('/update-quarterly-target/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quarterlyTarget } = req.body;

    const updatedQuarterlyTarget = await AnnualTarget.findByIdAndUpdate(id, quarterlyTarget, { new: true });
    return res.json(updatedQuarterlyTarget);
  } catch (error) {
    console.error('Update quarterly target error:', error);
    return res.status(500).json({ error: 'Failed to update quarterly target' });
  }
});

router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the URL for accessing the file
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json(fileUrl);

  } catch (error) {
    console.error('Upload file error:', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/annual-targets/create-from-existing', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, sourceScorecard, startDate, endDate, status, tenantId } = req.body;
    // Validate required fields
    if (!name || !sourceScorecard || !startDate || !endDate || !status || !tenantId) {
      throw new ApiError('Missing required fields', 400);
    }

    // Find the source scorecard
    const sourceTarget = await AnnualTarget.findById(sourceScorecard);
    if (!sourceTarget) {
      throw new ApiError('Source scorecard not found', 404);
    }

    // Check if a scorecard with the same name already exists
    const existingTarget = await AnnualTarget.findOne({ name, tenantId });
    if (existingTarget) {
      throw new ApiError('An annual target with this name already exists', 400);
    }

    // Create quarterly dates based on the start and end date
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Create new annual target with copied content
    const newAnnualTarget = new AnnualTarget({
      name,
      tenantId,
      startDate,
      endDate,
      status,
      content: {
        // Copy perspectives, objectives and rating scales from source
        perspectives: sourceTarget.content.perspectives,
        objectives: sourceTarget.content.objectives,
        ratingScales: sourceTarget.content.ratingScales,
        totalWeight: sourceTarget.content.totalWeight,
        
        // Set new contracting period based on the new dates
        contractingPeriod: {
          Q1: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          },
          Q2: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          },
          Q3: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          },
          Q4: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          }
        },
        
        // Set new assessment period based on the new dates
        assessmentPeriod: {
          Q1: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          },
          Q2: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          },
          Q3: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          },
          Q4: {
            startDate: startDateObj.toISOString().split('T')[0],
            endDate: endDateObj.toISOString().split('T')[0]
          }
        },

        // Initialize quarterly targets
        quarterlyTarget: {
          editable: (sourceTarget.content.totalWeight >= 100) ? true : false,
          quarterlyTargets: ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => ({
            quarter,
            editable: sourceTarget.content.quarterlyTarget.quarterlyTargets.find(qt => qt.quarter === quarter)?.editable ?? false,
            objectives: sourceTarget.content.objectives.map(obj => ({
              perspectiveId: obj.perspectiveId,
              name: obj.name,
              KPIs: obj.KPIs.map(kpi => ({
                indicator: kpi.indicator,
                weight: kpi.weight,
                baseline: kpi.baseline,
                target: kpi.target,
                ratingScales: kpi.ratingScales,
                ratingScore: -1,
                actualAchieved: '',
                evidence: '',
                attachments: []
              }))
            }))
          }))
        }
      }
    });

    const savedTarget = await newAnnualTarget.save();
    return res.json(savedTarget);

  } catch (error) {
    console.error('Create from existing annual target error:', error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to create annual target from existing' });
  }
});

export default router; 