import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import superUserRoutes from './routes/super_users';
import complianceUserRoutes from './routes/compliance_users';
import riskUserRoutes from './routes/risk_users';
import licenseRoutes from './routes/licenses';
import { errorHandler } from './middleware/errorHandler';
import scoreCardRoutes from './routes/score_card';
import personalPerformanceRoutes from './routes/personal_performance';
import notificationRoutes from './routes/notifications';
import teamRoutes from './routes/teams';
import reportRoutes from './routes/report';
import { authenticateToken } from './middleware/auth';
import { checkLicenseStatus } from './middleware/licenseCheck';
import userRoutes from './routes/User';
import orgDevPlanRoutes from './routes/org_dev_plan';
import trainingCoursesRoutes from './routes/training_courses';
import trainingRoutes from './routes/training';
import feedbackRoutes from './routes/feedback';
import moduleRoutes from './routes/module';
import submitFeedbackRoutes from './routes/submit_feedback';
import { checkFeedbackMail } from './services/feedbackService';
import performanceCalibrationRoutes from './routes/performance_calibration';
import complianceChampionRoutes from './routes/compliance_champions';
import complianceAreaRoutes from './routes/compliance_area';
import complianceObligationRoutes from './routes/compliance_obligations';
import complianceSettingRoutes from './routes/compliance_setting';
import RiskCategoriesRoutes from './routes/risk_category';
import RiskImpactSettingsRoutes from './routes/risk_impact_setting';
import RiskLikelihoodSettingsRoutes from './routes/risk_likelihood_setting';
import RiskImpactResponseRoutes from './routes/risk_impact_response';
import RiskControlEffectivenessRoutes from './routes/risk_control_effectiveness';
import RiskChampionsRoutes from './routes/risk_champions';
import RiskRatingRoutes from './routes/risk_rating';
import RiskRoutes from './routes/risk';
import RiskTreatmentRoutes from './routes/risk_treatment';
import ResidualRiskAssessmentCycleRoutes from './routes/residual_risk_assessment_cycle';

// import { applySecurityMiddleware } from './middleware/security';

const app = express();

// Middleware
app.use(cors({
  origin: [
    config.frontend,
    'https://app.teamscorecards.online'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// // Apply security middleware
// applySecurityMiddleware(app);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('public'));

// Public routes (no license check)
app.use('/api/v1/auth', authRoutes);

// Protected routes with license check
// Apply both authentication and license check middleware
app.use('/api/v1/companies', authenticateToken, checkLicenseStatus, companyRoutes);
app.use('/api/v1/super-users', authenticateToken, checkLicenseStatus, superUserRoutes);
app.use('/api/v1/compliance-users', authenticateToken, checkLicenseStatus, complianceUserRoutes);
app.use('/api/v1/risk-users', authenticateToken, checkLicenseStatus, riskUserRoutes);
app.use('/api/v1/compliance-champions', authenticateToken, checkLicenseStatus, complianceChampionRoutes);
app.use('/api/v1/compliance-areas', authenticateToken, checkLicenseStatus, complianceAreaRoutes);
app.use('/api/v1/compliance-obligations', authenticateToken, checkLicenseStatus, complianceObligationRoutes);
app.use('/api/v1/licenses', authenticateToken, checkLicenseStatus, licenseRoutes);
app.use('/api/v1/score-card', authenticateToken, checkLicenseStatus, scoreCardRoutes);
app.use('/api/v1/personal-performance', authenticateToken, checkLicenseStatus, personalPerformanceRoutes);
app.use('/api/v1/notifications', authenticateToken, checkLicenseStatus, notificationRoutes);
app.use('/api/v1/teams', authenticateToken, checkLicenseStatus, teamRoutes);
app.use('/api/v1/report', authenticateToken, checkLicenseStatus, reportRoutes);
app.use('/api/v1/users', authenticateToken, checkLicenseStatus, userRoutes);
app.use('/api/v1/users/org-dev-plan', orgDevPlanRoutes);
app.use('/api/v1/training-courses', trainingCoursesRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/feedback', authenticateToken, checkLicenseStatus, feedbackRoutes);
app.use('/api/v1/module', authenticateToken, checkLicenseStatus, moduleRoutes);
app.use('/api/v1/submit-feedback', submitFeedbackRoutes);
app.use('/api/v1/users/performance-calibration', performanceCalibrationRoutes);
app.use('/api/v1/compliance-settings', authenticateToken, checkLicenseStatus, complianceSettingRoutes);
app.use('/api/v1/risk-categories', authenticateToken, checkLicenseStatus, RiskCategoriesRoutes);
app.use('/api/v1/risk-impact-settings', authenticateToken, checkLicenseStatus, RiskImpactSettingsRoutes);
app.use('/api/v1/risk-likelihood-settings', authenticateToken, checkLicenseStatus, RiskLikelihoodSettingsRoutes);
app.use('/api/v1/risk-impact-responses', authenticateToken, checkLicenseStatus, RiskImpactResponseRoutes);
app.use('/api/v1/risk-control-effectiveness', authenticateToken, checkLicenseStatus, RiskControlEffectivenessRoutes);
app.use('/api/v1/risk-champions', authenticateToken, checkLicenseStatus, RiskChampionsRoutes);
app.use('/api/v1/risk-ratings', authenticateToken, checkLicenseStatus, RiskRatingRoutes);
app.use('/api/v1/risks', RiskRoutes);
app.use('/api/v1/risk-treatments', authenticateToken, checkLicenseStatus, RiskTreatmentRoutes);
app.use('/api/v1/residual-risk-assessment-cycle', authenticateToken, checkLicenseStatus, ResidualRiskAssessmentCycleRoutes);


// app.use('/api/v1/get-personal-performance-info', CustomerRoute);

// Connect to MongoDB
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    setInterval(checkFeedbackMail, 1000 * 60 * 60 * 1);
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Error handling middleware
app.use(errorHandler);

export default app;
