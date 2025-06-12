import React, { useEffect, useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress } from '@mui/material';
import { api } from '../../../../../../services/api';
import { ExportButton } from '../../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../../utils/exportPdf';
import { exportExcel } from '../../../../../../utils/exportExcel';

const riskColor = (level: string) => {
    switch (level) {
        case 'High': return '#DC2626';
        case 'Medium': return '#F59E42';
        case 'Low': return '#059669';
        default: return undefined;
    }
};

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

const ResidualRiskTrend: React.FC = () => {
    const [risks, setRisks] = useState([]);
    const [riskTreatments, setRiskTreatments] = useState([]);
    const [riskRatings, setRiskRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const tableRef = React.useRef<any>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [risksRes, treatmentsRes, ratingsRes] = await Promise.all([
                api.get('/risks'),
                api.get('/risk-treatments'),
                api.get('/risk-ratings'),
            ]);
            setRisks(risksRes.data.data || []);
            setRiskTreatments(treatmentsRes.data.data || []);
            setRiskRatings(ratingsRes.data.data || []);
        } catch (e) {
            // handle error
        }
        setLoading(false);
    };

    // Calculate inherent risk as in risk_assessment/index.tsx
    const calculateRiskInherentLevel = (impactScore, likelihoodScore) => {
        const score = impactScore * likelihoodScore;
        const rating = riskRatings.find(r => score >= r.minScore && score <= r.maxScore);
        return rating ? { name: rating.rating, color: rating.color } : null;
    };

    // Calculate residual risk (for now, same as inherent risk, unless you have effectiveness data per quarter)
    const calculateRiskResidualLevel = (impactScore, likelihoodScore) => {
        // TODO: If you have effectiveness per quarter, adjust this logic
        return calculateRiskInherentLevel(impactScore, likelihoodScore);
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
        exportPdf('ResidualRiskTrend', tableRef, 'Residual Risk Trend', '', '', [0.05, 0.15, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    };

    const handleExportExcel = () => {
        exportExcel(tableRef.current, 'Residual Risk Trend');
    };

    return (
        <Box mt={2}>
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
            {loading ? <CircularProgress /> : (
                <TableContainer component={Paper}>
                    <Table ref={tableRef} size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Risk Name</TableCell>
                                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>Risk Category</TableCell>
                                {quarters.map(q => (
                                    <TableCell key={q} align="center" colSpan={2} sx={{ fontWeight: 'bold' }}>{q}</TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                {quarters.map(q => (
                                    <React.Fragment key={q}>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Inherent Risk</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Residual Risk</TableCell>
                                    </React.Fragment>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {risks.map((risk, idx) => (
                                <TableRow key={risk._id}>
                                    <TableCell>{risk.riskNameElement}</TableCell>
                                    <TableCell>{risk.riskCategory?.categoryName}</TableCell>
                                    {quarters.map((q, qIdx) => {
                                        // For now, use the same risk scores for all quarters
                                        const impactScore = risk.impact?.score || 0;
                                        const likelihoodScore = risk.likelihood?.score || 0;
                                        const inherent = impactScore && likelihoodScore ? calculateRiskInherentLevel(impactScore, likelihoodScore) : null;
                                        const residual = impactScore && likelihoodScore ? calculateRiskResidualLevel(impactScore, likelihoodScore) : null;
                                        return (
                                            <React.Fragment key={qIdx}>
                                                <TableCell align="center" data-color={inherent?.color}>
                                                    <Typography sx={{ color: inherent?.color, fontWeight: 'bold' }}>{inherent?.name || ''}</Typography>
                                                </TableCell>
                                                <TableCell align="center" data-color={inherent?.color}>
                                                    <Typography sx={{ color: residual?.color, fontWeight: 'bold' }}>{residual?.name || ''}</Typography>
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