import React, { useState, useMemo, useEffect } from 'react';
import { Box, InputLabel, Select, MenuItem, FormControl, Button, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../../../../contexts/AuthContext';
import Heatmap from './components/Heatmap';
import TreatmentsDistribution from './components/TreatmentsDistribution';
import { api } from '../../../../../services/api';
import { RiskTreatment } from '../../../../risk_management/risk_treatment_admin';

const StyledFormControl = FormControl;
const ViewButton = Button;

// Types for Heatmap
interface RiskRating {
    _id: string;
    rating: string;
    minScore: number;
    maxScore: number;
    color: string;
}
interface ResidualScore {
    year: string;
    quarter: string;
    score: number;
}
interface Risk {
    _id: string;
    no: string; // Risk number, e.g. "R1"
    riskNameElement: string;
    impact: { score: number };
    likelihood: { score: number };
    residualScores?: ResidualScore[];
}

interface Treatment {
    _id: string;
    risk: { _id: string };
    controlType: 'Preventive' | 'Detective' | 'Corrective' | 'Mitigating';
    effectiveness?: Array<{
        year: string;
        quarter: string;
        effectiveness: string | number; // Can be ID or direct number
    }>;
    convertedToControl?: boolean;
}

interface EffectivenessOption {
    _id: string;
    factor: number;
}

// Helper function to parse quarter string to a number for comparison
const parseQuarter = (q: string): number => parseInt(q.replace('Q', ''), 10);

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    // Get available years from obligations and current year
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        // Create an array from currentYear - 5 to currentYear + 1
        return Array.from({ length: 7 }, (_, i) => (currentYear - 5 + i).toString()).reverse();
    }, []);

    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [viewMode, setViewMode] = useState<'heatmap' | 'risk-treatments-distribution'>('heatmap');
    const [selectedQuarter, setSelectedQuarter] = useState('Q1');
    const [isLoading, setIsLoading] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);

    // Heatmap data
    const [risks, setRisks] = useState<Risk[]>([]);
    const [riskRatings, setRiskRatings] = useState<RiskRating[]>([]);
    const [riskTreatments, setRiskTreatments] = useState<Treatment[]>([]);
    const [effectivenessOptions, setEffectivenessOptions] = useState<EffectivenessOption[]>([]);
    const [loadingHeatmap, setLoadingHeatmap] = useState(false);

    const isRiskSuperUser = user?.isRiskSuperUser;
    const isRiskChampion = user?.isRiskChampion;

    const handleView = () => {
        setIsLoading(true);
        setTimeout(() => {
            setShowDashboard(true);
            setIsLoading(false);
        }, 500);
    };

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    // Determine if the view button should be disabled
    const isViewButtonDisabled = isLoading || !year || !selectedQuarter || !viewMode;

    // Fetch risks and risk ratings for heatmap
    useEffect(() => {
        if (showDashboard && viewMode === 'heatmap') {
            setLoadingHeatmap(true);
            Promise.all([
                api.get('/risks'),
                api.get('/risk-ratings'),
                api.get('/risk-treatments'),
                api.get('/risk-control-effectiveness')
            ]).then(([risksRes, ratingsRes, treatmentsRes, effOptionsRes]) => {
                // Assign risk numbers (R1, R2, ...)
                const risksData = (risksRes.data.data || []).map((r: any, idx: number) => ({
                    ...r,
                    no: `R${idx + 1}`
                }));
                setRisks(risksData);
                setRiskRatings(ratingsRes.data.data || []);
                setRiskTreatments(treatmentsRes.data.data || []);
                setEffectivenessOptions(effOptionsRes.data.data || []);
                setLoadingHeatmap(false);
            }).catch((error) => {
                console.error("Error fetching heatmap data:", error);
                setRisks([]);
                setRiskRatings([]);
                setRiskTreatments([]);
                setEffectivenessOptions([]);
                setLoadingHeatmap(false);
            });
        }
    }, [showDashboard, viewMode]);

    // Axis labels (assuming 1-5 for both impact and likelihood)
    const xLabels = [1, 2, 3, 4, 5];
    const yLabels = [1, 2, 3, 4, 5];

    // Prepare data for Inherent and Residual heatmaps
    const inherentRisks = risks.map(r => ({
        _id: r._id,
        no: r.no,
        riskNameElement: r.riskNameElement,
        impact: r.impact,
        likelihood: r.likelihood
    }));

    // Create a map of risk ID to its treatments for efficient lookup
    const riskTreatmentsMap = useMemo(() => {
        const map: { [riskId: string]: Treatment[] } = {};
        riskTreatments.forEach(treatment => {
            if (treatment.risk?._id && treatment.convertedToControl === true) {
                if (!map[treatment.risk._id]) {
                    map[treatment.risk._id] = [];
                }
                map[treatment.risk._id].push(treatment);
            }
        });
        return map;
    }, [riskTreatments]);

    const residualRisks = risks.map(r => {
        let currentResidualImpactScore = r.impact?.score || 0;
        let currentResidualLikelihoodScore = r.likelihood?.score || 0;

        const treatmentsForThisRisk = riskTreatmentsMap[r._id] || [];

        treatmentsForThisRisk.forEach(treatment => {
            // Filter all effectiveness entries relevant to or before the current quarter
            const relevantEffectivenessEntries = (treatment.effectiveness || [])
                .filter(eff => {
                    const effYear = parseInt(eff.year, 10);
                    const currentYearNum = parseInt(year, 10);
                    const effQuarterNum = parseQuarter(eff.quarter);
                    const currentQuarterNum = parseQuarter(selectedQuarter);

                    return (effYear < currentYearNum) || (effYear === currentYearNum && effQuarterNum <= currentQuarterNum);
                })
                .sort((a, b) => {
                    // Sort by year, then by quarter to apply effects chronologically
                    const aYear = parseInt(a.year, 10);
                    const bYear = parseInt(b.year, 10);
                    const aQuarter = parseQuarter(a.quarter);
                    const bQuarter = parseQuarter(b.quarter);

                    if (aYear !== bYear) return aYear - bYear;
                    return aQuarter - bQuarter;
                });

            relevantEffectivenessEntries.forEach(effectivenessEntry => {
                let effectivenessFactor: number | undefined;

                // Determine the effectiveness factor
                if (typeof effectivenessEntry.effectiveness === 'string') {
                    const option = effectivenessOptions.find(opt => opt._id === effectivenessEntry.effectiveness);
                    effectivenessFactor = option?.factor;
                } else if (typeof effectivenessEntry.effectiveness === 'number') {
                    effectivenessFactor = effectivenessEntry.effectiveness;
                }

                if (typeof effectivenessFactor === 'number' && effectivenessFactor !== undefined && effectivenessFactor !== null) {
                    const reductionFactor = 1 - (effectivenessFactor / 100);

                    if (treatment.controlType === 'Preventive' || treatment.controlType === 'Detective') {
                        currentResidualLikelihoodScore *= reductionFactor;
                    } else if (treatment.controlType === 'Corrective' || treatment.controlType === 'Mitigating') {
                        currentResidualImpactScore *= reductionFactor;
                    }
                }
            });
        });

        // Round the scores as per the example
        currentResidualLikelihoodScore = Math.round(currentResidualLikelihoodScore);
        currentResidualImpactScore = Math.round(currentResidualImpactScore);

        // Ensure scores don't go below 1 if your heatmap axis starts from 1
        // (Adjust this logic if 0 is a valid score or you have different min/max)
        if (currentResidualLikelihoodScore < 1 && (r.likelihood?.score || 0) > 0) currentResidualLikelihoodScore = 1;
        if (currentResidualImpactScore < 1 && (r.impact?.score || 0) > 0) currentResidualImpactScore = 1;

        return {
            _id: r._id,
            no: r.no,
            riskNameElement: r.riskNameElement,
            impact: { score: currentResidualImpactScore },
            likelihood: { score: currentResidualLikelihoodScore }
        };
    });

    return (
        <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <Box sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' }
            }}>
                <StyledFormControl sx={{ flex: 2 }}>
                    <InputLabel>Year</InputLabel>
                    <Select
                        value={year}
                        label="Year"
                        onChange={(e) => { setYear(e.target.value); setShowDashboard(false); }}
                    >
                        {years.map((y) => (
                            <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>

                {(isRiskSuperUser || isRiskChampion) && (
                    <StyledFormControl sx={{ flex: 1, width: { xs: '100%' } }}>
                        <InputLabel>View Mode</InputLabel>
                        <Select
                            value={viewMode}
                            label="View Mode"
                            onChange={(e) => {
                                setViewMode(e.target.value as 'heatmap' | 'risk-treatments-distribution');
                                setShowDashboard(false);
                            }}
                        >
                            <MenuItem value="heatmap">Heatmap</MenuItem>
                            <MenuItem value="risk-treatments-distribution">Risk Treatments Distribution</MenuItem>
                        </Select>
                    </StyledFormControl>
                )}

                {viewMode !== 'risk-treatments-distribution' && <StyledFormControl sx={{ flex: 1, width: { xs: '100%' } }}>
                    <InputLabel>Quarter</InputLabel>
                    <Select
                        value={selectedQuarter}
                        label="Quarter"
                        onChange={(e) => { setSelectedQuarter(e.target.value); setShowDashboard(false); }}
                    >
                        {quarters.map((q) => (
                            <MenuItem key={q} value={q}>{q}</MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>}

                <ViewButton
                    variant="contained"
                    disabled={isViewButtonDisabled}
                    onClick={handleView}
                >
                    {isLoading ? 'Loading...' : 'View'}
                </ViewButton>
            </Box>

            {showDashboard && (
                viewMode === 'heatmap' ? (
                    loadingHeatmap ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h6" align="center" sx={{ mb: 2 }}>{year}, {selectedQuarter} Risk Heatmap</Typography>
                            <Box sx={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Heatmap
                                    title="Inherent Risk Heatmap"
                                    risks={inherentRisks}
                                    riskRatings={riskRatings}
                                    xLabels={xLabels}
                                    yLabels={yLabels}
                                />
                                <Heatmap
                                    title="Residual Risk Heatmap"
                                    risks={residualRisks}
                                    riskRatings={riskRatings}
                                    xLabels={xLabels}
                                    yLabels={yLabels}
                                />
                            </Box>
                        </Box>
                    )
                ) : (
                    <TreatmentsDistribution year={year} quarter={selectedQuarter} />
                )
            )}
        </Box>
    );
};

export default Dashboard;
