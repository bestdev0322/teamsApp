import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import { api } from '../../../../services/api';
import {useToast} from '../../../../contexts/ToastContext'

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
        return rating ? { name: rating.rating, color: rating.color } : null;
    };

    // Calculate residual risk as in risk_assessment/index.tsx
    const calculateRiskResidualLevel = (impactScore, likelihoodScore, effectivenesses, riskRatings) => {
        let residual = Number(impactScore * likelihoodScore);
        effectivenesses.forEach(effectiveness => {
            const effectivenessOption = effectivenessOptions.find(e => e._id === (effectiveness?._id || effectiveness));
            if (effectivenessOption) {
                residual = residual * (1 - (Number(effectivenessOption.factor) / 100));
            }
        });
        const rating = riskRatings.find(r => Math.round(residual * 1000) / 1000 >= r.minScore && Math.round(residual) <= r.maxScore);
        return rating ? { name: rating.rating, color: rating.color } : null;
    };

    // Fetch risk ratings for color mapping
    const [riskRatings, setRiskRatings] = useState([]);
    useEffect(() => {
        api.get('/risk-ratings').then(res => setRiskRatings(res.data.data || []));
    }, []);

    // Open modal for a treatment
    const handleAssess = (treatment) => {
        setSelectedTreatment(treatment);
        setSelectedEffectiveness(treatment.effectiveness ? (treatment.effectiveness._id || treatment.effectiveness) : '');
        setModalOpen(true);
    };

    const handleSaveEffectiveness = async () => {
        if (!selectedTreatment || !selectedEffectiveness) return;
        setSaving(true);
        try {
            await api.put(`/risk-treatments/${selectedTreatment._id}`, { effectiveness: selectedEffectiveness });
            await fetchAll();
            setModalOpen(false);
        } catch (e) {
            // handle error
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
                                {risks.map((risk, idx) => {
                                    const treatments = treatmentsByRisk[risk._id] || [];
                                    // Calculate inherent/residual risk
                                    const impactScore = risk.impact?.score || 0;
                                    const likelihoodScore = risk.likelihood?.score || 0;
                                    const inherent = impactScore && likelihoodScore ? calculateRiskInherentLevel(impactScore, likelihoodScore, riskRatings) : null;
                                    const residual = calculateRiskResidualLevel(impactScore, likelihoodScore, treatments.filter(t => t.convertedToControl === true).map(t => t?.effectiveness ?? ''), riskRatings);
                                    // Initial residual risk = inherent risk
                                    return treatments.length === 0 ? null : treatments.filter(t => t.convertedToControl === true).map((treatment, tIdx) => (
                                        <TableRow key={treatment._id}>
                                            {tIdx === 0 && (
                                                <>
                                                    <TableCell rowSpan={treatments.length}>{idx + 1}</TableCell>
                                                    <TableCell rowSpan={treatments.length}>{risk.riskNameElement}</TableCell>
                                                    <TableCell rowSpan={treatments.length}>{risk.riskCategory?.categoryName}</TableCell>
                                                    <TableCell rowSpan={treatments.length}>{risk.riskOwner?.name}</TableCell>
                                                    <TableCell rowSpan={treatments.length}>
                                                        {inherent ? (
                                                            <Typography sx={{ color: inherent.color, fontWeight: 'bold', textAlign: 'center' }}>{inherent.name}</Typography>
                                                        ) : ''}
                                                    </TableCell>
                                                    <TableCell rowSpan={treatments.length}>
                                                        {residual ? (
                                                            <Typography sx={{ color: residual.color, fontWeight: 'bold', textAlign: 'center' }}>{residual.name}</Typography>
                                                        ) : ''}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell>{treatment.treatment}</TableCell>
                                            <TableCell>{treatment.treatmentOwner?.name}</TableCell>
                                            <TableCell>
                                                {treatment.effectiveness ? (
                                                    effectivenessOptions.find(e => e._id === (treatment.effectiveness._id || treatment.effectiveness))?.controlEffectiveness + ' (' + effectivenessOptions.find(e => e._id === (treatment.effectiveness._id || treatment.effectiveness))?.factor + '%)'
                                                ) : ''}
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