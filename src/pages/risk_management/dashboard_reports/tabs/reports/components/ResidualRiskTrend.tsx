import React, { useEffect, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress } from '@mui/material';
import { api } from '../../../../../../services/api';
import { ExportButton } from '../../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../../utils/exportPdf';
import { exportExcel } from '../../../../../../utils/exportExcel';
import { calculateRiskResidualLevel } from "../../../../residual_risk_assessments/residual_assessment/ResidualDetailView";
import { exportWord } from '../../../../../../utils/exportWord';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

interface ResidualRiskTrendPageProps {
    currentYear: string;
}

const ResidualRiskTrend: React.FC<ResidualRiskTrendPageProps> = ({ currentYear }) => {
    const [risks, setRisks] = useState([]);
    const [riskTreatments, setRiskTreatments] = useState([]);
    const [riskRatings, setRiskRatings] = useState([]);
    const [effectivenessOptions, setEffectivenessOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const tableRef = React.useRef<any>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [risksRes, treatmentsRes, ratingsRes, effRes] = await Promise.all([
                api.get('/risks'),
                api.get('/risk-treatments'),
                api.get('/risk-ratings'),
                api.get('/risk-control-effectiveness'),
            ]);
            setRisks(risksRes.data.data || []);
            setRiskTreatments(treatmentsRes.data.data || []);
            setRiskRatings(ratingsRes.data.data || []);
            setEffectivenessOptions(effRes.data.data || []);
        } catch (e) {
            // handle error
        }
        setLoading(false);
    };

    // Calculate inherent risk as in risk_assessment/index.tsx
    const calculateRiskInherentLevel = (impactScore, likelihoodScore) => {
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

    const handleExportPDF = () => {
        exportPdf('ResidualRiskTrend', tableRef, `${currentYear} - Residual Risk Trend`, '', '', [0.05, 0.25, 0.1, 0.075, 0.075, 0.075, 0.075, 0.075, 0.075, 0.075, 0.075]);
    };

    const handleExportExcel = () => {
        exportExcel(tableRef.current, `${currentYear} - Residual Risk Trend`);
    };

    const handleExportWord = () => {
        const wordColumnWidths = [0.05, 0.25, 0.1, 0.075, 0.075, 0.075, 0.075, 0.075, 0.075, 0.075, 0.075];
        exportWord(tableRef, `${currentYear} - Residual Risk Trend`, wordColumnWidths);
    };

    return (
        <Box mt={2}>
            <Typography variant="h6" sx={{ mb: 2 }}>Residual Risk Trend - {currentYear}</Typography>
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
            {loading ? <CircularProgress /> : (
                <TableContainer component={Paper}>
                    <Table ref={tableRef} size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>No.</TableCell>
                                <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>Risk Name</TableCell>
                                <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>Risk Category</TableCell>
                                {quarters.map(q => (
                                    <TableCell key={q} align="center" colSpan={2} sx={{ fontWeight: 'bold' }} data-align="center">{q}</TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                {quarters.map(q => (
                                    <React.Fragment key={q}>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }} data-align="center">IR</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }} data-align="center">RR</TableCell>
                                    </React.Fragment>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {risks.map((risk, idx) => (
                                <TableRow key={risk._id}>
                                    <TableCell>R{idx + 1}</TableCell>
                                    <TableCell>{risk.riskNameElement}</TableCell>
                                    <TableCell>{risk.riskCategory?.categoryName}</TableCell>
                                    {quarters.map((q, qIdx) => {
                                        const treatments = treatmentsByRisk[risk._id] || [];
                                        // For now, use the same risk scores for all quarters
                                        const impactScore = risk.impact?.score || 0;
                                        const likelihoodScore = risk.likelihood?.score || 0;
                                        const inherent = impactScore && likelihoodScore ? calculateRiskInherentLevel(impactScore, likelihoodScore) : null;
                                        const residual = calculateRiskResidualLevel(risk, { year: currentYear, quarter: q }, riskRatings, effectivenessOptions, treatments);

                                        return (
                                            <React.Fragment key={qIdx}>
                                                <TableCell align="center" data-align="center" data-color={inherent?.color}>
                                                    {inherent ? (
                                                        <Typography sx={{ color: inherent.color, fontWeight: 'bold' }}>{inherent.score} - {inherent.name}</Typography>
                                                    ) : ''}
                                                </TableCell>
                                                <TableCell align="center" data-align="center" data-color={residual?.color}>
                                                    {residual ? (
                                                        <Typography sx={{ color: residual.color, fontWeight: 'bold' }}>{residual.score} - {residual.name}</Typography>
                                                    ) : ''}
                                                </TableCell>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default ResidualRiskTrend;