import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import { api } from '../../../../../../services/api';
import { useToast } from '../../../../../../contexts/ToastContext';
import { formatDate } from '../../../../../../utils/date';
import { ExportButton } from '../../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../../utils/exportPdf';
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
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTreatment, setSelectedTreatment] = useState(null);
    const [selectedEffectiveness, setSelectedEffectiveness] = useState('');
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();
    const tableRef = React.useRef<any>(null);

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
        return rating ? { name: rating.rating, color: rating.color, score } : null;
    };

    // Fetch risk ratings for color mapping
    const [riskRatings, setRiskRatings] = useState([]);
    useEffect(() => {
        api.get('/risk-ratings').then(res => setRiskRatings(res.data.data || []));
    }, []);

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
        exportPdf('RiskRegister', tableRef, 'Risk Register', '', '', [0.05, 0.125, 0.125, 0.125, 0.1, 0.1, 0.175, 0.05, 0.05, 0.05, 0.05, 0.05]);
    };

    const handleExportExcel = () => {
        exportExcel(tableRef.current, 'Risk Register');
    };

    return (
        <Box>
            <Typography variant="h6">Residual Risk Assessment Detail</Typography>
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
            </Box>
            <Box mt={4}>
                {loading ? <CircularProgress /> : (
                    <TableContainer component={Paper}>
                        <Table ref={tableRef}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>No.</TableCell>
                                    <TableCell>Risk Name</TableCell>
                                    <TableCell>Risk Category</TableCell>
                                    <TableCell>Risk Owner</TableCell>
                                    <TableCell>Inherent Risk</TableCell>
                                    <TableCell>Residual Risk</TableCell>
                                    <TableCell>Mitigations</TableCell>
                                    <TableCell>Mitigations Type</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Owner</TableCell>
                                    <TableCell>Effectiveness</TableCell>
                                    <TableCell>Due Date</TableCell>
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
                                                <TableCell rowSpan={treatments.length}>{idx + 1}</TableCell>
                                                <TableCell rowSpan={treatments.length}>{risk.riskNameElement}</TableCell>
                                                <TableCell rowSpan={treatments.length}>{risk.riskCategory?.categoryName}</TableCell>
                                                <TableCell rowSpan={treatments.length}>{risk.riskOwner?.name}</TableCell>
                                                <TableCell rowSpan={treatments.length}>
                                                    {inherent ? (
                                                        <Typography sx={{ color: inherent.color, fontWeight: 'bold', textAlign: 'center' }}>{inherent.score} - {inherent.name}</Typography>
                                                    ) : ''}
                                                </TableCell>
                                                <TableCell rowSpan={treatments.length}>
                                                    {residual ? (
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
                                                        <TableCell rowSpan={treatments.length}>{idx + 1}</TableCell>
                                                        <TableCell rowSpan={treatments.length}>{risk.riskNameElement}</TableCell>
                                                        <TableCell rowSpan={treatments.length}>{risk.riskCategory?.categoryName}</TableCell>
                                                        <TableCell rowSpan={treatments.length}>{risk.riskOwner?.name}</TableCell>
                                                        <TableCell rowSpan={treatments.length} data-color={inherent.color}>
                                                            {inherent ? (
                                                                <Typography sx={{ color: inherent.color, fontWeight: 'bold', textAlign: 'center' }}>{inherent.score} - {inherent.name}</Typography>
                                                            ) : ''}
                                                        </TableCell>
                                                        <TableCell rowSpan={treatments.length} data-color={residual.color}>
                                                            {residual ? (
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