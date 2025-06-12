import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import { api } from '../../../../services/api';
import { useToast } from '../../../../contexts/ToastContext'

const ResidualDetailView = ({ currentQuarter, handleBackClick }) => {
    const [risks, setRisks] = useState([]);
    const [riskTreatments, setRiskTreatments] = useState([]);
    const [effectivenessOptions, setEffectivenessOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTreatment, setSelectedTreatment] = useState(null);
    const [selectedEffectiveness, setSelectedEffectiveness] = useState('');
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [risksRes, treatmentsRes, effRes] = await Promise.all([
                api.get('/risks'),
                api.get('/risk-treatments'),
                api.get('/risk-control-effectiveness'),
            ]);
            setRisks(risksRes.data.data || []);
            setRiskTreatments(treatmentsRes.data.data || []);
            setEffectivenessOptions(effRes.data.data || []);
        } catch (e) {
            // handle error
            showToast('Failed to fetch risk data.', 'error');
        }
        setLoading(false);
    };

    // Calculate inherent risk as in risk_assessment/index.tsx
    const calculateRiskInherentLevel = (impactScore, likelihoodScore, riskRatings) => {
        const score = impactScore * likelihoodScore;
        const rating = riskRatings.find(r => score >= r.minScore && score <= r.maxScore);
        return rating ? { name: rating.rating, color: rating.color, score: score } : null;
    };

    // Calculate residual risk level based on current and previous quarter's score
    const calculateRiskResidualLevel = (
        risk: any,
        allTreatmentsForThisRisk: any[],
        currentQuarter: { year: string; quarter: string },
        riskRatings: any[],
        effectivenessOptions: any[]
    ) => {
        let previousQuarterScore: number | null = null;
        const currentYear = parseInt(currentQuarter.year);
        const currentQuarterNum = parseInt(currentQuarter.quarter.replace('Q', ''));

        const relevantResidualScores = (risk.residualScores || [])
            .filter(rs => {
                const rsYear = parseInt(rs.year);
                const rsQuarterNum = parseInt(rs.quarter.replace('Q', ''));
                return rsYear < currentYear || (rsYear === currentYear && rsQuarterNum < currentQuarterNum);
            })
            .sort((a, b) => {
                const aYear = parseInt(a.year);
                const bYear = parseInt(b.year);
                const aQuarterNum = parseInt(a.quarter.replace('Q', ''));
                const bQuarterNum = parseInt(b.quarter.replace('Q', ''));
                if (aYear !== bYear) return bYear - aYear; // Most recent year first
                return bQuarterNum - aQuarterNum; // Most recent quarter first
            });
        if (relevantResidualScores.length > 0) {
            previousQuarterScore = relevantResidualScores[0].score;
        }

        let currentCalculatedResidual = previousQuarterScore !== null ? previousQuarterScore : Number(risk.impact?.score || 0) * Number(risk.likelihood?.score || 0);

        allTreatmentsForThisRisk.filter(t => t.convertedToControl === true).forEach(treatment => {
            // Find the effectiveness for the current quarter
            const currentEffectiveness = treatment.effectiveness?.find(eff =>
                eff.year === currentQuarter.year.toString() && eff.quarter === currentQuarter.quarter
            );

            if (currentEffectiveness) {
                const effectivenessOption = effectivenessOptions.find(e => {
                    if (!currentEffectiveness.effectiveness) return false;
                    if (typeof currentEffectiveness.effectiveness === 'object' && currentEffectiveness.effectiveness !== null && '_id' in currentEffectiveness.effectiveness)
                        return e._id === currentEffectiveness.effectiveness._id;
                    return e._id === currentEffectiveness.effectiveness;
                });
                if (effectivenessOption && effectivenessOption.factor !== undefined && effectivenessOption.factor !== null) {
                    currentCalculatedResidual = currentCalculatedResidual * (1 - (Number(effectivenessOption.factor) / 100));
                }
            }
        });

        currentCalculatedResidual = Math.round(currentCalculatedResidual * 100) / 100

        const rating = riskRatings.find(r =>
            currentCalculatedResidual >= r.minScore && currentCalculatedResidual <= r.maxScore
        );
        return rating ? { name: rating.rating, color: rating.color, score: currentCalculatedResidual } : null;
    };

    // Fetch risk ratings for color mapping
    const [riskRatings, setRiskRatings] = useState([]);
    useEffect(() => {
        api.get('/risk-ratings').then(res => setRiskRatings(res.data.data || []));
    }, []);

    // Open modal for a treatment
    const handleAssess = (treatment) => {
        setSelectedTreatment(treatment);
        // Find the effectiveness for the current quarter
        const currentEffectiveness = treatment.effectiveness?.find(eff =>
            eff.year === currentQuarter.year.toString() && eff.quarter === currentQuarter.quarter
        );
        setSelectedEffectiveness(currentEffectiveness ? (currentEffectiveness.effectiveness._id || currentEffectiveness.effectiveness) : '');
        setModalOpen(true);
    };

    const handleSaveEffectiveness = async () => {
        if (!selectedTreatment || !selectedEffectiveness) return;
        setSaving(true);
        try {
            const parentRisk = risks.find(r => r._id === selectedTreatment.risk?._id);
            if (!parentRisk) {
                showToast('Parent risk not found for selected treatment.', 'error');
                setSaving(false);
                return;
            }

            const allTreatmentsForParentRisk = riskTreatments.filter(t => t.risk?._id === parentRisk._id);

            // Create a new effectiveness entry for the current quarter
            const newEffectivenessEntry = {
                year: currentQuarter.year.toString(),
                quarter: currentQuarter.quarter,
                effectiveness: selectedEffectiveness
            };

            // Update the treatment's effectiveness array
            const updatedTreatmentsForCalc = allTreatmentsForParentRisk.map(t => {
                if (t._id === selectedTreatment._id) {
                    const existingEffectivenessIndex = t.effectiveness?.findIndex(eff =>
                        eff.year === currentQuarter.year.toString() && eff.quarter === currentQuarter.quarter
                    );

                    const updatedEffectiveness = t.effectiveness ? [...t.effectiveness] : [];
                    if (existingEffectivenessIndex !== -1 && existingEffectivenessIndex !== undefined) {
                        updatedEffectiveness[existingEffectivenessIndex] = newEffectivenessEntry;
                    } else {
                        updatedEffectiveness.push(newEffectivenessEntry);
                    }

                    return { ...t, effectiveness: updatedEffectiveness };
                }
                return t;
            });

            const calculatedOverallResidual = calculateRiskResidualLevel(
                parentRisk,
                updatedTreatmentsForCalc,
                currentQuarter,
                riskRatings,
                effectivenessOptions
            );
            const newOverallResidualScore = calculatedOverallResidual?.score;

            if (newOverallResidualScore === undefined) {
                showToast('Could not calculate new residual score.', 'error');
                setSaving(false);
                return;
            }

            const newResidualScoreEntry = {
                score: Number(newOverallResidualScore),
                year: currentQuarter.year,
                quarter: currentQuarter.quarter
            };

            // Find the selected treatment with its updated effectiveness from the calculated array
            const treatmentToUpdate = updatedTreatmentsForCalc.find(t => t._id === selectedTreatment._id);
            if (!treatmentToUpdate) {
                showToast('Updated treatment not found.', 'error');
                setSaving(false);
                return;
            }

            // First update the treatment's effectiveness
            await api.put(`/risk-treatments/${selectedTreatment._id}`, {
                effectiveness: treatmentToUpdate.effectiveness
            });

            // Then add the new residual score to the risk
            await api.post(`/risks/${parentRisk._id}/residual-score`, newResidualScoreEntry);

            showToast('Effectiveness and Residual Score updated successfully!', 'success');
            await fetchAll();
            setModalOpen(false);
        } catch (e) {
            console.error('Error saving effectiveness and residual score:', e);
            showToast('Error saving effectiveness and residual score.', 'error');
        }
        setSaving(false);
    };

    // Group treatments by risk id
    const treatmentsByRisk = {};
    riskTreatments.forEach(t => {
        const riskId = t.risk?._id;
        if (!riskId) return;
        if (!treatmentsByRisk[riskId]) treatmentsByRisk[riskId] = [];
        treatmentsByRisk[riskId].push(t);
    });

    return (
        <Box>
            <Button
                variant="outlined"
                onClick={handleBackClick}
                sx={{
                    textTransform: 'none',
                    borderColor: '#DC2626',
                    color: '#DC2626',
                    mb: 2,
                    '&:hover': {
                        borderColor: '#B91C1C',
                        backgroundColor: 'rgba(220, 38, 38, 0.04)',
                    }
                }}
            >
                Back
            </Button>
            <Typography variant="h6">Residual Risk Assessment Detail</Typography>
            <Typography>Year: {currentQuarter.year}</Typography>
            <Typography>Quarter: {currentQuarter.quarter}</Typography>
            <Box mt={4}>
                {loading ? <CircularProgress /> : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>No.</TableCell>
                                    <TableCell>Risk Name</TableCell>
                                    <TableCell>Risk Category</TableCell>
                                    <TableCell>Risk Owner</TableCell>
                                    <TableCell>Inherent Risk</TableCell>
                                    <TableCell>Residual Risk</TableCell>
                                    <TableCell>Residual Risk Control</TableCell>
                                    <TableCell>Owner</TableCell>
                                    <TableCell>Effectiveness</TableCell>
                                    <TableCell>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {risks.filter(risk => risk.status === 'Active').map((risk, idx) => {
                                    const treatments = treatmentsByRisk[risk._id] || [];
                                    const inherent = calculateRiskInherentLevel(risk.impact?.score, risk.likelihood?.score, riskRatings);
                                    const residual = calculateRiskResidualLevel(risk, treatments, currentQuarter, riskRatings, effectivenessOptions);
                                    return treatments.length === 0 ? null : treatments.filter(t => t.convertedToControl === true).map((treatment, tIdx) => (
                                        <TableRow key={treatment._id}>
                                            {tIdx === 0 && (
                                                <>
                                                    <TableCell rowSpan={treatments.filter(t => t.convertedToControl === true).length}>{idx + 1}</TableCell>
                                                    <TableCell rowSpan={treatments.filter(t => t.convertedToControl === true).length}>{risk.riskNameElement}</TableCell>
                                                    <TableCell rowSpan={treatments.filter(t => t.convertedToControl === true).length}>{risk.riskCategory?.categoryName}</TableCell>
                                                    <TableCell rowSpan={treatments.filter(t => t.convertedToControl === true).length}>{risk.riskOwner?.name}</TableCell>
                                                    <TableCell rowSpan={treatments.filter(t => t.convertedToControl === true).length}>
                                                        {inherent ? (
                                                            <Typography sx={{ color: inherent.color, fontWeight: 'bold', textAlign: 'center' }}>{inherent.name}</Typography>
                                                        ) : ''}
                                                    </TableCell>
                                                    <TableCell rowSpan={treatments.filter(t => t.convertedToControl === true).length}>
                                                        {residual ? (
                                                            <Typography sx={{ color: residual.color, fontWeight: 'bold', textAlign: 'center' }}>{residual.name}</Typography>
                                                        ) : ''}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell>{treatment.treatment}</TableCell>
                                            <TableCell>{treatment.treatmentOwner?.name}</TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const currentEffectiveness = treatment.effectiveness?.find(eff =>
                                                        eff.year === currentQuarter.year.toString() && eff.quarter === currentQuarter.quarter
                                                    );
                                                    if (!currentEffectiveness) return '';
                                                    let effObj = null;
                                                    if (typeof currentEffectiveness.effectiveness === 'object' && currentEffectiveness.effectiveness !== null && '_id' in currentEffectiveness.effectiveness) {
                                                        effObj = effectivenessOptions.find(e => e._id === currentEffectiveness.effectiveness._id);
                                                    } else {
                                                        effObj = effectivenessOptions.find(e => e._id === currentEffectiveness.effectiveness);
                                                    }
                                                    return effObj ? `${effObj.controlEffectiveness} (${effObj.factor}%)` : '';
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="contained" size="small" onClick={() => handleAssess(treatment)}>
                                                    Assess
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ));
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
            {/* Assess Modal */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Control Effectivenes %</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Effectiveness</InputLabel>
                        <Select
                            value={selectedEffectiveness}
                            label="Effectiveness"
                            onChange={e => setSelectedEffectiveness(e.target.value)}
                        >
                            {effectivenessOptions.map(opt => (
                                <MenuItem key={opt._id} value={opt._id}>{opt.controlEffectiveness} ({opt.factor}%)</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSaveEffectiveness} variant="contained" disabled={!selectedEffectiveness || saving}>
                        {saving ? <CircularProgress size={20} /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ResidualDetailView;