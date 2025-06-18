import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress } from "@mui/material";
import React, { useEffect, useState, useCallback } from "react";
import { api } from '../../../../../../services/api';
import { useToast } from '../../../../../../contexts/ToastContext';
import { formatDate } from '../../../../../../utils/date';
import { ExportButton } from '../../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../../utils/exportPdf';
import { exportWord } from '../../../../../../utils/exportWord';
import { exportExcel } from '../../../../../../utils/exportExcel';
import { calculateRiskResidualLevel } from "../../../../residual_risk_assessments/residual_assessment/ResidualDetailView";

interface RiskRegisterPageProps {
    currentYear: string;
    currentQuarter: string;
}

const RiskRegister: React.FC<RiskRegisterPageProps> = ({ currentYear, currentQuarter }) => {
    const [risks, setRisks] = useState([]);
    const [riskTreatments, setRiskTreatments] = useState([]);
    const [effectivenessOptions, setEffectivenessOptions] = useState([]);
    const [riskRatings, setRiskRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const tableRef = React.useRef<any>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [risksRes, treatmentsRes, riskRatingRes, effRes] = await Promise.all([
                api.get('/risks'),
                api.get('/risk-treatments'),
                api.get('/risk-ratings'),
                api.get('/risk-control-effectiveness'),
            ]);
            setRisks(risksRes.data.data || []);
            setRiskTreatments(treatmentsRes.data.data || []);
            setRiskRatings(riskRatingRes.data.data || []);
            setEffectivenessOptions(effRes.data.data || []);
        } catch (e) {
            // handle error
            showToast('Failed to fetch risk data.', 'error');
        }
        setLoading(false);
    }, [showToast]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Calculate inherent risk as in risk_assessment/index.tsx
    const calculateRiskInherentLevel = (impactScore, likelihoodScore, riskRatings) => {
        const score = impactScore * likelihoodScore;
        const rating = riskRatings.find(r => score >= r.minScore && score <= r.maxScore);
        return rating ? { name: rating.rating, color: rating.color, score } : null;
    };

    // Group treatments by risk id
    const treatmentsByRisk = {};
    riskTreatments.forEach(t => {
        const riskId = t.risk?._id;
        if (!riskId) return;
        if (!treatmentsByRisk[riskId]) treatmentsByRisk[riskId] = [];
        treatmentsByRisk[riskId].push(t);
    });

    const getStatusFromTreatment = (treatment) => {
        if (treatment.status !== 'Completed') {
            return treatment.status;
        } else {
            return treatment.convertedToControl ? 'Implemented' : 'In Progress';
        }
    };

    const getStatusColor = (status) => {
        return status === 'Implemented' ? '#50C878' : status === 'In Progress' ? '#FFBF00' : 'black';
    };

    const handleExportPDF = () => {
        exportPdf('RiskRegister', tableRef, 'Risk Register', '', '', [0.05, 0.15, 0.1, 0.125, 0.05, 0.05, 0.2, 0.05, 0.05, 0.075, 0.05, 0.05]);
    };

    const handleExportWord = () => {
        exportWord(tableRef, 'Risk Register', [0.05, 0.15, 0.1, 0.125, 0.05, 0.05, 0.2, 0.05, 0.05, 0.075, 0.05, 0.05]);
    };

    const handleExportExcel = () => {
        exportExcel(tableRef.current, 'Risk Register');
    };

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Residual Risk Assessment Detail - {currentYear}, {currentQuarter}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <ExportButton
                    className="excel"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportExcel}
                    size="small"
                >
                    Export to Excel
                </ExportButton>
                <ExportButton
                    className="pdf"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportPDF}
                    size="small"
                >
                    Export to PDF
                </ExportButton>
                <ExportButton
                    className="word"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportWord}
                    size="small"
                >
                    Export to Word
                </ExportButton>
            </Box>
            <Box mt={4}>
                {loading ? <CircularProgress /> : (
                    <TableContainer component={Paper}>
                        <Table ref={tableRef}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: '5%' }}>No.</TableCell>
                                    <TableCell sx={{ width: '15%' }}>Risk Name</TableCell>
                                    <TableCell sx={{ width: '10%' }}>Risk Category</TableCell>
                                    <TableCell sx={{ width: '12.5%' }}>Risk Owner</TableCell>
                                    <TableCell sx={{ width: '5%' }}>IR</TableCell>
                                    <TableCell sx={{ width: '5%' }}>RR</TableCell>
                                    <TableCell sx={{ width: '20%' }}>Mitigations</TableCell>
                                    <TableCell sx={{ width: '5%' }}>Mitigations Type</TableCell>
                                    <TableCell sx={{ width: '5%' }}>Status</TableCell>
                                    <TableCell sx={{ width: '7.5%' }}>Owner</TableCell>
                                    <TableCell sx={{ width: '5%' }}>Effectiveness</TableCell>
                                    <TableCell sx={{ width: '5%' }}>Due Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {risks.filter(risk => risk.status === 'Active').map((risk, idx) => {
                                    const treatments = treatmentsByRisk[risk._id] || [];
                                    // Calculate inherent/residual risk
                                    const impactScore = risk.impact?.score || 0;
                                    const likelihoodScore = risk.likelihood?.score || 0;
                                    const inherent = impactScore && likelihoodScore ? calculateRiskInherentLevel(impactScore, likelihoodScore, riskRatings) : null;
                                    const residual = calculateRiskResidualLevel(risk, { year: currentYear, quarter: currentQuarter }, riskRatings, effectivenessOptions, treatments);
                                    // Initial residual risk = inherent risk
                                    return treatments.length === 0 ?
                                        <TableRow key={risk._id}>
                                            <>
                                                <TableCell rowSpan={treatments.length}>R{idx + 1}</TableCell>
                                                <TableCell rowSpan={treatments.length}>{risk.riskNameElement}</TableCell>
                                                <TableCell rowSpan={treatments.length}>{risk.riskCategory?.categoryName}</TableCell>
                                                <TableCell rowSpan={treatments.length}>{risk.riskOwner?.name}</TableCell>
                                                <TableCell rowSpan={treatments.length}>
                                                    {inherent && inherent.color ? (
                                                        <Typography sx={{ color: inherent.color, fontWeight: 'bold', textAlign: 'center' }}>{inherent.score} - {inherent.name}</Typography>
                                                    ) : ''}
                                                </TableCell>
                                                <TableCell rowSpan={treatments.length}>
                                                    {residual && residual.color ? (
                                                        <Typography sx={{ color: residual.color, fontWeight: 'bold', textAlign: 'center' }}>{residual.score} - {residual.name}</Typography>
                                                    ) : ''}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                            </>
                                        </TableRow>
                                        : treatments.map((treatment, tIdx) => (
                                            <TableRow key={risk._id + treatment._id}>
                                                {tIdx === 0 && (
                                                    <>
                                                        <TableCell rowSpan={treatments.length}>R{idx + 1}</TableCell>
                                                        <TableCell rowSpan={treatments.length}>{risk.riskNameElement}</TableCell>
                                                        <TableCell rowSpan={treatments.length}>{risk.riskCategory?.categoryName}</TableCell>
                                                        <TableCell rowSpan={treatments.length}>{risk.riskOwner?.name}</TableCell>
                                                        <TableCell rowSpan={treatments.length} data-color={inherent?.color || ''}>
                                                            {inherent && inherent.color ? (
                                                                <Typography sx={{ color: inherent.color, fontWeight: 'bold', textAlign: 'center' }}>{inherent.score} - {inherent.name}</Typography>
                                                            ) : ''}
                                                        </TableCell>
                                                        <TableCell rowSpan={treatments.length} data-color={residual?.color || ''}>
                                                            {residual && residual.color ? (
                                                                <Typography sx={{ color: residual.color, fontWeight: 'bold', textAlign: 'center' }}>{residual.score} - {residual.name}</Typography>
                                                            ) : ''}
                                                        </TableCell>
                                                    </>
                                                )}
                                                <TableCell>{treatment.treatment}</TableCell>
                                                <TableCell>{treatment.convertedToControl === true ? 'Control' : 'Treatment'}</TableCell>
                                                <TableCell sx={{ color: getStatusColor(getStatusFromTreatment(treatment)) }} data-color={getStatusColor(getStatusFromTreatment(treatment))}>{getStatusFromTreatment(treatment)}</TableCell>
                                                <TableCell>{treatment.treatmentOwner?.name}</TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const currentEffectiveness = treatment.effectiveness?.find(eff =>
                                                            eff.year === currentYear && eff.quarter === currentQuarter
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
                                                    {formatDate(new Date(treatment.targetDate))}
                                                </TableCell>
                                            </TableRow>
                                        ));
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Box>
    );
};

export default RiskRegister;