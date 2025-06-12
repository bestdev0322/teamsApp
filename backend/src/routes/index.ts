import { Application } from 'express';
import residualRiskAssessmentCycleRouter from './residual_risk_assessment_cycle';

export default function registerRoutes(app: Application) {
  app.use('/api/residual-risk-assessment-cycle', residualRiskAssessmentCycleRouter);
} 