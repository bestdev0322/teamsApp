import express from 'express';
import { checkLicenseAuth } from '../middleware/licenseAuth';
import User from '../models/User';
import PersonalPerformance from '../models/PersonalPerformance';
import AnnualTarget from '../models/AnnualTarget';

const router = express.Router();

export default router;

// GET /api/v1/get-personal-performance-info
router.get('/get-personal-performance-info', checkLicenseAuth, async (req, res) => {
    try {
        const { email, scorecardName, quarterName } = req.query;
        if (!email || !scorecardName || !quarterName) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }

        // Find user by email
        const dbUser = await User.findOne({ email });
        if (!dbUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log(scorecardName.toString().trim(), 'name')
        // Find annual target (scorecard) by name
        const annualTarget = await AnnualTarget.findOne({ name: scorecardName.toString().trim() });
        console.log(annualTarget, 'aT')
        if (!annualTarget) {
            return res.status(404).json({ error: 'Scorecard not found' });
        }

        // Determine enabled quarters in the scorecard
        const enabledQuarters = (annualTarget.content?.quarterlyTarget?.quarterlyTargets || []).filter(quarter=> quarter.editable).map(q => q.quarter);
        let quarter = quarterName;
        if (
            Array.isArray(enabledQuarters) &&
            enabledQuarters.length === 2 &&
            enabledQuarters.includes('Q1') &&
            enabledQuarters.includes('Q2')
        ) {
            // Only Q1 and Q2 enabled, apply mid-term/final mapping
            if (typeof quarterName === 'string') {
                if (quarterName.toLowerCase() === 'mid-term') quarter = 'Q1';
                else if (quarterName.toLowerCase() === 'final') quarter = 'Q2';
            }
        } else {
            // Use as provided (Q1~Q4)
            quarter = quarterName;
        }

        // Find personal performance for this user and scorecard
        const personalPerformance = await PersonalPerformance.findOne({
            userId: dbUser._id.toString(),
            annualTargetId: annualTarget._id.toString()
        }).lean();
        if (!personalPerformance) {
            console.log(dbUser._id.toString(), annualTarget._id.toString());
            return res.status(404).json({ error: 'No personal performance info found' });
        }

        // Find the correct quarter
        const quarterData = personalPerformance.quarterlyTargets?.find(qt => qt.quarter === quarter);
        if (!quarterData) {
            console.log(quarter, 'quarter')
            return res.status(404).json({ error: 'No data for the specified quarter' });
        }

        // Get supervisor info if available
        let supervisor = null;
        if (quarterData.supervisorId) {
            const supervisorUser = await User.findById(quarterData.supervisorId);
            supervisor = supervisorUser ? supervisorUser.name : null;
        }

        // Compose objectives and KPIs
        const objectives = (quarterData.objectives || []).map(obj => ({
            perspectiveName: (annualTarget.content.perspectives.find(p => p.index === obj.perspectiveId)?.name) || '',
            objectiveName: obj.name,
            initiativeName: obj.initiativeName,
            KPIs: (obj.KPIs || []).map(kpi => ({
                indicator: kpi.indicator,
                weight: kpi.weight,
                baseline: kpi.baseline,
                target: kpi.target,
                ratingScore: (kpi.ratingScales || []).find(rs => rs.score === kpi.ratingScore) || {},
                actualAchieved: kpi.actualAchieved,
                evidence: kpi.evidence,
                agreementComment: kpi.agreementComment || '',
                previousAgreementComment: kpi.previousAgreementComment || ''
            }))
        }));

        // Compose response
        res.json({
            fullName: dbUser.name,
            email: dbUser.email,
            jobTitle: dbUser.jobTitle,
            annualTarget: annualTarget.name,
            quarter: quarterName,
            supervisor,
            objectives
        });
        return;
    } catch (error) {
        console.error('Error in get-personal-performance-info:', error);
        res.status(500).json({ error: 'Failed to fetch personal performance info' });
        return;
    }
}); 