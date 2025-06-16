import React, { useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ComplianceChart from '../../../../../components/ComplianceChart';
import { Obligation } from '../../../../../types/compliance';
import { useAuth } from '../../../../../contexts/AuthContext';
import { ExportButton } from '../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

interface ComplianceViewProps {
  year: string;
  quarter: string;
  obligations: Obligation[];
}

const ComplianceView: React.FC<ComplianceViewProps> = ({ year, quarter, obligations }) => {
  const { user } = useAuth();
  const isComplianceSuperUser = user?.isComplianceSuperUser;
  const calculateCompliance = (filteredObligations: Obligation[]) => {
    if (!filteredObligations.length) return null;
    const compliantCount = filteredObligations.filter(o => o.complianceStatus === 'Compliant').length;
    return Math.round((compliantCount / filteredObligations.length) * 100);
  };

  const getComplianceData = () => {
    // Filter obligations for the selected year and quarter
    const filteredObligations = obligations.filter(o => {
      const update = o.update?.find(u => u.year === year && u.quarter === quarter);
      return update && update.assessmentStatus === 'Approved';
    });

    // Calculate organization-wide compliance
    const organizationCompliance = calculateCompliance(filteredObligations);

    // Group obligations by team (owner) and calculate team compliance
    const teamObligations = filteredObligations.reduce((acc: { [key: string]: Obligation[] }, curr) => {
      const teamName = curr.owner.name;
      if (!acc[teamName]) acc[teamName] = [];
      acc[teamName].push(curr);
      return acc;
    }, {});

    const teamCompliance = Object.entries(teamObligations).map(([team, obligations]) => ({
      teamName: team,
      compliancePercentage: calculateCompliance(obligations)
    }));

    return { organizationCompliance, teamCompliance, hasData: filteredObligations.length > 0 };
  };

  const { organizationCompliance, teamCompliance, hasData } = getComplianceData();

  // Export screenshot to PDF
  const handleExportPDF = async () => {
    const title = `${year}, ${quarter} Compliance View`;
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
    const title = `${year}, ${quarter} Compliance View`;
    
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

  if (!hasData) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No compliance data available for {year}, {quarter}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
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
      {/* Charts Screenshot Area */}
      <div>
        {isComplianceSuperUser && (
          <div data-chart-block>
            <ComplianceChart
              title={`${year}, ${quarter} Organization Compliance`}
              compliancePercentage={organizationCompliance || 0}
            />
          </div>
        )}
        {teamCompliance.map((team) => (
          <div key={team.teamName} data-chart-block>
            <ComplianceChart
              title={`${year}, ${quarter} ${team.teamName} Teams Compliance`}
              teamName={team.teamName}
              compliancePercentage={team.compliancePercentage || 0}
            />
          </div>
        ))}
      </div>
    </Box>
  );
};

export default ComplianceView; 