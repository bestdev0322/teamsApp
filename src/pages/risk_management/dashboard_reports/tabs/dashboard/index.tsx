import React, { useState, useMemo, useEffect } from 'react';
import { Box, InputLabel, Select, MenuItem, FormControl, Button, CircularProgress, Typography, TableRow, TableBody, Table, TableContainer, TableHead, Paper, TableCell } from '@mui/material';
import { useAuth } from '../../../../../contexts/AuthContext';
import Heatmap from './components/Heatmap';
import TreatmentsDistribution from './components/TreatmentsDistribution';
import { api } from '../../../../../services/api';
import { ExportButton } from '../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

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

// New types for Impact and Likelihood Settings
interface ImpactSetting {
    _id: string;
    score: number;
}

interface LikelihoodSetting {
    _id: string;
    score: number;
}

// Helper function to parse quarter string to a number for comparison
const parseQuarter = (q: string): number => parseInt(q.replace('Q', ''), 10);

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [year, setYear] = useState<string>('');
    const [viewMode, setViewMode] = useState<'heatmap' | 'risk-treatments-distribution'>('heatmap');
    const [selectedQuarter, setSelectedQuarter] = useState('Q1');
    const [isLoading, setIsLoading] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);

    // Heatmap data
    const [risks, setRisks] = useState<Risk[]>([]);
    const [riskRatings, setRiskRatings] = useState<RiskRating[]>([]);
    const [riskTreatments, setRiskTreatments] = useState<Treatment[]>([]);
    const [effectivenessOptions, setEffectivenessOptions] = useState<EffectivenessOption[]>([]);
    const [impactSettings, setImpactSettings] = useState<ImpactSetting[]>([]);
    const [likelihoodSettings, setLikelihoodSettings] = useState<LikelihoodSetting[]>([]);
    const [loadingHeatmap, setLoadingHeatmap] = useState(false);

    const isRiskSuperUser = user?.isRiskSuperUser;
    const isRiskChampion = user?.isRiskChampion;

    // Fetch available years from residual risk assessments
    useEffect(() => {
        const fetchAvailableYears = async () => {
            try {
                const response = await api.get('/residual-risk-assessment-cycle/assessment-years');
                const years = response.data.data || [];
                setAvailableYears(years);
                // Set the most recent year as default if available
                if (years.length > 0) {
                    setYear(years[0]);
                }
            } catch (error) {
                console.error('Error fetching available years:', error);
                setAvailableYears([]);
            }
        };

        fetchAvailableYears();
    }, []);

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

    // Fetch all necessary data for heatmap
    useEffect(() => {
        if (showDashboard && viewMode === 'heatmap') {
            setLoadingHeatmap(true);
            Promise.all([
                api.get('/risks'),
                api.get('/risk-ratings'),
                api.get('/risk-treatments'),
                api.get('/risk-control-effectiveness'),
                api.get('/risk-impact-settings'), // Fetch impact settings
                api.get('/risk-likelihood-settings') // Fetch likelihood settings
            ]).then(([risksRes, ratingsRes, treatmentsRes, effOptionsRes, impactRes, likelihoodRes]) => {
                // Assign risk numbers (R1, R2, ...)
                const risksData = (risksRes.data.data || []).map((r: any, idx: number) => ({
                    ...r,
                    no: `R${idx + 1}`
                }));
                setRisks(risksData);
                setRiskRatings(ratingsRes.data.data || []);
                setRiskTreatments(treatmentsRes.data.data || []);
                setEffectivenessOptions(effOptionsRes.data.data || []);
                setImpactSettings(impactRes.data.data || []); // Set impact settings
                setLikelihoodSettings(likelihoodRes.data.data || []); // Set likelihood settings
                setLoadingHeatmap(false);
            }).catch((error) => {
                console.error("Error fetching heatmap data:", error);
                setRisks([]);
                setRiskRatings([]);
                setRiskTreatments([]);
                setEffectivenessOptions([]);
                setImpactSettings([]);
                setLikelihoodSettings([]);
                setLoadingHeatmap(false);
            });
        }
    }, [showDashboard, viewMode]);

    // Dynamically generate axis labels based on fetched settings
    const xLabels = useMemo(() => {
        const maxImpactScore = impactSettings.reduce((max, setting) => Math.max(max, setting.score), 0);
        return Array.from({ length: maxImpactScore }, (_, i) => i + 1);
    }, [impactSettings]);

    const yLabels = useMemo(() => {
        const maxLikelihoodScore = likelihoodSettings.reduce((max, setting) => Math.max(max, setting.score), 0);
        return Array.from({ length: maxLikelihoodScore }, (_, i) => i + 1);
    }, [likelihoodSettings]);

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

    // Export screenshot to PDF
    const handleExportPDF = async () => {
        const title = `${year}, ${selectedQuarter} Risk Heatmap`;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const titleHeight = 30; // mm, space for title on first page
        let y = titleHeight;
        let isFirstPage = true;

        // Render each chart block to an image
        const chartBlocks = document.querySelectorAll('[data-chart-block]');
        const blockImages: { imgData: string, imgHeight: number }[] = [];
        for (const block of Array.from(chartBlocks)) {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(block as HTMLElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const blockWidth = pdfWidth;
            const blockHeight = (imgProps.height * blockWidth) / imgProps.width;
            blockImages.push({ imgData, imgHeight: blockHeight });
        }

        // Add title to the first page
        pdf.setFontSize(22);
        pdf.text(title, pdfWidth / 2, 20, { align: 'center' });

        // Add chart blocks, packing them onto pages
        for (const { imgData, imgHeight } of blockImages) {
            if ((y + imgHeight > pdfHeight - 5)) {
                pdf.addPage();
                y = 10; // top margin for subsequent pages
                isFirstPage = false;
            }
            pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, imgHeight);
            y += imgHeight + 4; // 4mm gap between blocks
        }

        pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    };

    // Export screenshot to Word
    const handleExportWord = async () => {
        const title = `${year}, ${selectedQuarter} Risk Heatmap`;

        // Render each chart block to an image first
        const chartBlocks = document.querySelectorAll('[data-chart-block]');
        const children = [
            new Paragraph({
                children: [
                    new TextRun({ text: title, size: 24, bold: true })
                ],
                spacing: { after: 200 },
                alignment: 'center',
            })
        ];

        if (chartBlocks.length === 0) {
            children.push(new Paragraph({ text: 'No charts available.' }));
        } else {
            for (const block of Array.from(chartBlocks)) {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(block as HTMLElement, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const base64Data = imgData.split(',')[1];

                children.push(
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: base64Data,
                                transformation: {
                                    width: 600,
                                    height: (canvas.height * 600) / canvas.width,
                                },
                                type: 'png',
                            }),
                        ],
                        spacing: { after: 200 },
                    })
                );
            }
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${title.replace(/\s+/g, '_')}.docx`);
    };

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
                        {availableYears.map((y) => (
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
                            <Typography variant="h6">Risk Heatmaps - {year}, {selectedQuarter}</Typography>
                            {/* Export Buttons */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
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
                            </Box>
                            <Box>
                                {(!inherentRisks.length && !residualRisks.length && !risks.length) ? (
                                    <Box sx={{ py: 8, textAlign: 'center' }}>
                                        <Typography variant="h6" color="text.secondary">
                                            No risk data available for this period.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <>
                                        <Box sx={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }} data-chart-block>
                                            <Box>
                                                <Heatmap
                                                    title="Inherent Risk Heatmap"
                                                    risks={inherentRisks}
                                                    riskRatings={riskRatings}
                                                    xLabels={xLabels}
                                                    yLabels={yLabels}
                                                    year={year}
                                                    showLegend={false}
                                                />
                                            </Box>
                                            <Box>
                                                <Heatmap
                                                    title="Residual Risk Heatmap"
                                                    risks={residualRisks}
                                                    riskRatings={riskRatings}
                                                    xLabels={xLabels}
                                                    yLabels={yLabels}
                                                    year={year}
                                                    showLegend={false}
                                                />
                                            </Box>
                                        </Box>
                                        <Box sx={{ mt: 4, maxWidth: 800, mx: 'auto', padding: 2 }} data-chart-block>
                                            <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                                                Risk Legend
                                            </Typography>
                                            <TableContainer component={Paper} variant="outlined">
                                                <Table size="medium">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>No.</TableCell>
                                                            <TableCell>Risk Name</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {risks.map((r) => (
                                                            <TableRow key={r._id}>
                                                                <TableCell sx={{ width: 40 }}>{r.no}</TableCell>
                                                                <TableCell>{r.riskNameElement}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </>
                                )}
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
