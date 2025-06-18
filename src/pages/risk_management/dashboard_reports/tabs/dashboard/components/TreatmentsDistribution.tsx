import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { api } from '../../../../../../services/api';
import { useAuth } from '../../../../../../contexts/AuthContext';
import RiskChart from '../../../../../../components/RiskChart';
import { ExportButton } from '../../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

const STATUS_COLOR_MAP = {
    'Planned': '#3498db',
    'In Progress': '#f39c12',
    'Completed': '#e74c3c'
};

interface TreatmentsDistributionProps {
    year: string;
    quarter: string;
}

const TreatmentsDistribution: React.FC<TreatmentsDistributionProps> = ({ year, quarter }) => {
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const { user } = useAuth();

    const evaluateStatus = (treatment) => {
        if (treatment.status !== 'Completed') {
            return treatment.status;
        } else {
            if (treatment.convertedToControl) {
                return 'Completed';
            } else {
                return 'In Progress';
            }
        }
    }

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [treatmentsRes, teamsRes] = await Promise.all([
                api.get('/risk-treatments'),
                api.get(`/teams/${user?.tenantId}`)
            ]);
            const treatments = treatmentsRes.data.data || [];
            const teams = teamsRes.data.data || [];
            setTeams(teams);
            setTreatments(treatments);
            // Group by status (assuming status field is one of the labels)
            const statusCounts = Object.keys(STATUS_COLOR_MAP).map(label => ({
                name: label,
                value: treatments.filter(t => evaluateStatus(t).toLowerCase() === label.toLowerCase().replace(/ /g, '')).length
            }));
        } catch (e) {
            setTeams([]);
            setTreatments([]);
        }
        setLoading(false);
    }, [user?.tenantId]);

    const getTeamChartData = (teamId) => {
        const teamTreatments = treatments.filter(t => t.treatmentOwner?._id === teamId);
        const total = teamTreatments.length;
        return Object.keys(STATUS_COLOR_MAP).map(label => {
            const value = teamTreatments.filter(t => evaluateStatus(t) === label).length;
            return { name: label, value, percent: total ? ((value / total) * 100).toFixed(1) : '0.0' };
        });
    };

    const getOrgChartData = () => {
        const total = treatments.length;
        return Object.keys(STATUS_COLOR_MAP).map(label => {
            const value = treatments.filter(t => evaluateStatus(t) === label).length;
            return { name: label, value, percent: total ? ((value / total) * 100).toFixed(1) : '0.0' };
        });
    }

    // Export screenshot to PDF
    const handleExportPDF = async () => {
        const title = `${year} Risk Treatments Distribution`;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const titleHeight = 30; // mm, space for title on first page
        let y = titleHeight;
        let isFirstPage = true;
        console.log(pdfWidth, 'width', pdfHeight, 'height')
        // Render each chart block to an image
        const chartBlocks = document.querySelectorAll('[data-chart-block]');
        const blockImages: { imgData: string, imgHeight: number }[] = [];
        for (const block of Array.from(chartBlocks)) {
            const canvas = await html2canvas(block as HTMLElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            console.log(imgProps.height, 'props', imgProps.width)
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
        const title = `${year} Risk Treatments Distribution`;

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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <Box>
            {loading ? <CircularProgress /> : (
                <>
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, display: 'inline-block' }}>Risk Treatment Implementation Status - {year}</Typography>
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
                    </Box>
                    <div data-chart-block>
                        <RiskChart
                            data={getOrgChartData()}
                            colors={STATUS_COLOR_MAP}
                            title="Organization-Wide Risk Treatment Status"
                        />
                    </div>
                    {teams.map(team => (
                        <div key={team._id} data-chart-block>
                            <RiskChart
                                key={team._id}
                                data={getTeamChartData(team._id)}
                                colors={STATUS_COLOR_MAP}
                                title={`${team.name} Team Risk Treatment Status`}
                            />
                        </div>
                    ))}
                </>
            )}
        </Box>
    );
};

export default TreatmentsDistribution;