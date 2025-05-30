import React, { useRef } from "react";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { RootState } from "../../../store";
import { Box, Paper, Typography } from "@mui/material";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EvidenceModal from '../../organization_performance/performance_evaluations/EvidenceModal';
import { ExportButton } from "../../../components/Buttons";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';


interface StrategyExecutionProps {
    annualTargetId: string;
    quarter: string | undefined;
}


const StrategyExecution: React.FC<StrategyExecutionProps> = ({ annualTargetId, quarter }) => {
    const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
    const selectedAnnualTarget = annualTargets.find(target => target._id === annualTargetId);
    // Build the strategy map data from perspectives and objectives
    const perspectives = selectedAnnualTarget?.content.perspectives || [];
    const objectives = selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.find(q => q.quarter === quarter)?.objectives || [];
    const ratingScales = selectedAnnualTarget?.content.ratingScales || [];
    const [evidenceModalOpen, setEvidenceModalOpen] = React.useState(false);
    const [selectedEvidence, setSelectedEvidence] = React.useState<any>(null);
    const pageRef = useRef<HTMLElement | null>(null);
    const dashboardRef = useRef<HTMLDivElement | null>(null);

    const handleExportPDF = async () => {
        const title = selectedAnnualTarget?.name || 'Strategy Execution';
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        // PDF page dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const titleHeight = 30; // mm, space for title on first page
        let y = titleHeight;
        let isFirstPage = true;

        // Render each perspective block to an image
        const perspectiveBlocks = document.querySelectorAll('[data-perspective-block]');
        const blockImages: { imgData: string, imgProps: any, imgHeight: number }[] = [];
        for (const block of Array.from(perspectiveBlocks)) {
            const canvas = await html2canvas(block as HTMLElement, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const imgProps = pdf.getImageProperties(imgData);
            const blockWidth = pdfWidth;
            const blockHeight = (imgProps.height * blockWidth) / imgProps.width;
            blockImages.push({ imgData, imgProps, imgHeight: blockHeight });
        }

        // Add title to the first page
        pdf.setFontSize(22);
        pdf.text(title, pdfWidth / 2, 20, { align: 'center' });
        pdf.setFontSize(14);
        pdf.text(`Quarter: ${quarter ?? ''}`, pdfWidth / 2, 28, { align: 'center' });

        // Add perspective blocks, packing them onto pages
        for (const { imgData, imgHeight } of blockImages) {
            // If block doesn't fit on current page, add a new page
            if ((y + imgHeight > pdfHeight - 5)) {
                pdf.addPage();
                y = 10; // top margin for subsequent pages
                isFirstPage = false;
            }
            pdf.addImage(imgData, 'PNG', 0, y, pdfWidth, imgHeight);
            y += imgHeight + 4; // 4mm gap between blocks
        }

        pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    }

    // Helper to get color for a strategy (objective) from quarterly data, using average ratingScore
    const getObjectiveColor = (objectiveName: string): string | undefined => {
        if (!selectedAnnualTarget || !quarter) return undefined;
        const quarterly = selectedAnnualTarget.content.quarterlyTarget.quarterlyTargets.find(q => q.quarter === quarter);
        if (!quarterly) return undefined;
        const qObjective = quarterly.objectives.find(obj => obj.name === objectiveName);
        if (!qObjective || !qObjective.KPIs.length) return undefined;
        // Calculate average ratingScore
        const validScores = qObjective.KPIs.map(kpi => kpi.ratingScore).filter(score => typeof score === 'number' && !isNaN(score));
        if (!validScores.length) return undefined;
        const avgScore = Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
        const foundScale = ratingScales.find(scale => scale.score === avgScore);
        return foundScale?.color;
    };

    return (
        <Box>
            <ExportButton
                className="pdf"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportPDF}
                size="small"
                sx={{ margin: 2 }}
            >
                Export to PDF
            </ExportButton>
            <div ref={dashboardRef}>
                {perspectives.map(perspective => (
                    <Box
                        data-perspective-block
                        ref={pageRef} key={perspective.index}>
                        <Typography variant="h5" sx={{ mb: 3, ml: 1 }}>
                            {perspective.name}
                        </Typography>
                        {objectives.filter(objective => objective.perspectiveId === perspective.index).map(objective => (
                            <Box
                                key={objective.name + perspective.index} sx={{
                                    border: `1px solid #E5E7EB`,
                                    borderRadius: '12px',
                                    padding: 2,
                                    margin: 2
                                }}>
                                <Typography variant="h6" sx={{ mb: 3, ml: 1 }}>
                                    {objective.name}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 3,
                                        ml: 1,
                                        justifyContent: { xs: 'center', sm: 'flex-start' },
                                    }}
                                >
                                    {objective.KPIs.map((kpi, idx) => (
                                        <Paper
                                            key={idx}
                                            sx={{
                                                p: 2,
                                                mb: 2,
                                                width: { xs: '100%', sm: 320, md: 340 },
                                                minWidth: { xs: '100%', sm: 280 },
                                                maxWidth: 400,
                                                boxShadow: 'none',
                                                border: `3px solid ${getObjectiveColor(objective.name) ?? '#E5E7EB'}`,
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                                KPI: {kpi.indicator}
                                            </Typography>
                                            <Box sx={{ mb: 1 }}>
                                                <Typography variant="body2">
                                                    Baseline <b>{kpi.baseline}</b>
                                                </Typography>
                                                <Typography variant="body2">
                                                    Target <b>{kpi.target}</b>
                                                </Typography>
                                                <Typography variant="body2">
                                                    Actual <b>{kpi.actualAchieved}</b>
                                                </Typography>
                                            </Box>
                                            {typeof kpi.ratingScore === 'number' && !isNaN(kpi.ratingScore) && (
                                                <Typography
                                                    sx={{
                                                        color: (() => {
                                                            const foundScale = ratingScales.find(
                                                                (scale) => scale.score === kpi.ratingScore
                                                            );
                                                            return foundScale?.color || 'black';
                                                        })(),
                                                        fontWeight: 500,
                                                        mb: 1,
                                                    }}
                                                >
                                                    {kpi.ratingScore} – {(() => {
                                                        const foundScale = ratingScales.find(
                                                            (scale) => scale.score === kpi.ratingScore
                                                        );
                                                        return foundScale
                                                            ? `${foundScale.name} (Score Range: ${foundScale.min}-${foundScale.max})`
                                                            : '';
                                                    })()}
                                                </Typography>
                                            )}
                                            {kpi.evidence && (
                                                <Typography
                                                    sx={{
                                                        color: '#888',
                                                        fontSize: 14,
                                                        mt: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => {
                                                        setSelectedEvidence(kpi.evidence);
                                                        setEvidenceModalOpen(true);
                                                    }}
                                                >
                                                    <AttachFileIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                                                    Evidence Attached
                                                </Typography>
                                            )}
                                        </Paper>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ))}
            </div>

            <EvidenceModal
                open={evidenceModalOpen}
                onClose={() => setEvidenceModalOpen(false)}
                evidence={selectedEvidence}
                attachments={selectedEvidence?.attachments || []}
            />
        </Box>
    );
};

export default StrategyExecution;