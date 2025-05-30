import React, { useRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { Obligation } from '../../../../../types/compliance';
import { ExportButton } from '../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { useAuth } from '../../../../../contexts/AuthContext';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType, TextRun } from 'docx';

interface ComplianceTrendViewProps {
  year: string;
  quarter: string;
  obligations: Obligation[];
}

interface ComplianceData {
  quarter: string;
  compliance: number;
  nonCompliance: number;
}

const ComplianceTrendView: React.FC<ComplianceTrendViewProps> = ({ year, obligations }) => {
  const { user } = useAuth();
  const isComplianceSuperUser = user?.isComplianceSuperUser;
  const orgTableRef = useRef<any>(null);

  const calculateCompliance = (filteredObligations: Obligation[]) => {
    if (!filteredObligations.length) return { compliance: 0, nonCompliance: 0 };
    const compliantCount = filteredObligations.filter(o => o.complianceStatus === 'Compliant').length;
    const total = filteredObligations.length;
    const compliance = Math.round((compliantCount / total) * 100);
    return {
      compliance,
      nonCompliance: 100 - compliance
    };
  };

  const getComplianceTrendData = () => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    // Calculate organization compliance for each quarter
    const organizationTrend: ComplianceData[] = quarters.map(q => {
      const quarterObligations = obligations.filter(o => {
        const update = o.update?.find(u => u.year === year && u.quarter === q);
        return update && update.assessmentStatus === 'Approved';
      });
      const { compliance, nonCompliance } = calculateCompliance(quarterObligations);
      return {
        quarter: q,
        compliance,
        nonCompliance
      };
    });

    // Group by teams and calculate their trends
    const teams = Array.from(new Set(obligations.map(o => o.owner.name)));
    const teamTrends = teams.map(team => {
      const teamData = quarters.map(q => {
        const quarterObligations = obligations.filter(o => {
          const update = o.update?.find(u => u.year === year && u.quarter === q);
          return update && update.assessmentStatus === 'Approved' && o.owner.name === team;
        });
        const { compliance, nonCompliance } = calculateCompliance(quarterObligations);
        return {
          quarter: q,
          compliance,
          nonCompliance
        };
      });
      return { team, data: teamData };
    });

    return { organizationTrend, teamTrends };
  };

  const { organizationTrend, teamTrends } = getComplianceTrendData();

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add title
    doc.setFontSize(13);
    doc.text(`${year} Compliance Trend Report`, pageWidth / 2, 20, { align: 'center' });

    let finalY = 35;

    // Organization Compliance Table
    doc.text('Organization Compliance Trend', 10, finalY);
    finalY += 5;
    doc.setLineWidth(0.5);
    doc.line(10, finalY, pageWidth - 10, finalY);
    finalY += 5;

    const tableWidth = pageWidth - 30;

    // Organization table
    autoTable(doc, {
      head: [['Quarter', 'Compliance %', 'Non-Compliance %']],
      body: organizationTrend.map(row => [
        row.quarter,
        `${row.compliance}%`,
        `${row.nonCompliance}%`
      ]),
      startY: finalY,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.4 },
        1: { cellWidth: tableWidth * 0.3 },
        2: { cellWidth: tableWidth * 0.3 }
      },
      didDrawPage: (data) => {
        finalY = data.cursor.y;
      }
    });

    // Team Compliance Tables
    doc.setFontSize(13);
    doc.text('Team Compliance Trends', 10, finalY + 10);
    doc.setLineWidth(0.5);
    doc.line(10, finalY + 15, pageWidth - 10, finalY + 15);

    teamTrends.forEach((team, index) => {
      finalY = finalY + 25;
      if (finalY >= pageHeight - 40) {
        doc.addPage();
        finalY = 20;
      }

      doc.text(team.team, 10, finalY);

      autoTable(doc, {
        head: [['Quarter', 'Compliance %', 'Non-Compliance %']],
        body: team.data.map(row => [
          row.quarter,
          `${row.compliance}%`,
          `${row.nonCompliance}%`
        ]),
        startY: finalY + 5,
        columnStyles: {
          0: { cellWidth: tableWidth * 0.4 },
          1: { cellWidth: tableWidth * 0.3 },
          2: { cellWidth: tableWidth * 0.3 }
        },
        didDrawPage: (data) => {
          finalY = data.cursor.y;
        }
      });
    });

    doc.save(`${year}_Compliance_Trend_Report.pdf`);
  };

  const handleExportWord = async () => {
    // Create docx content
    const orgTableRows = [
      new DocxTableRow({
        children: [
          new DocxTableCell({ children: [new Paragraph('Quarter')], width: { size: 33, type: WidthType.PERCENTAGE } }),
          new DocxTableCell({ children: [new Paragraph('Compliance %')], width: { size: 33, type: WidthType.PERCENTAGE } }),
          new DocxTableCell({ children: [new Paragraph('Non-Compliance %')], width: { size: 34, type: WidthType.PERCENTAGE } }),
        ],
      }),
      ...organizationTrend.map(row =>
        new DocxTableRow({
          children: [
            new DocxTableCell({ children: [new Paragraph(row.quarter)] }),
            new DocxTableCell({ children: [new Paragraph(`${row.compliance}%`)] }),
            new DocxTableCell({ children: [new Paragraph(`${row.nonCompliance}%`)] }),
          ],
        })
      ),
    ];
    const orgTable = new DocxTable({
      rows: orgTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const teamTables = teamTrends.map(team => [
      new Paragraph({
        children: [
          new TextRun({ text: team.team, size: 20, bold: true })
        ],
        spacing: { after: 100 },
      }),
      new DocxTable({
        rows: [
          new DocxTableRow({
            children: [
              new DocxTableCell({ children: [new Paragraph('Quarter')] }),
              new DocxTableCell({ children: [new Paragraph('Compliance %')] }),
              new DocxTableCell({ children: [new Paragraph('Non-Compliance %')] }),
            ],
          }),
          ...team.data.map(row =>
            new DocxTableRow({
              children: [
                new DocxTableCell({ children: [new Paragraph(row.quarter)] }),
                new DocxTableCell({ children: [new Paragraph(`${row.compliance}%`)] }),
                new DocxTableCell({ children: [new Paragraph(`${row.nonCompliance}%`)] }),
              ],
            })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    ]).flat();

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${year} Compliance Trend Report`, size: 24, bold: true })
              ],
              spacing: { after: 200 },
              alignment: 'center',
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Organization Compliance Trend', size: 20, bold: true })
              ],
              spacing: { after: 100 },
              alignment: 'left',
            }),
            orgTable,
            new Paragraph({
              children: [
                new TextRun({ text: 'Team Compliance Trends', size: 20, bold: true })
              ],
              spacing: { before: 200, after: 100 },
              alignment: 'left',
            }),
            ...teamTables,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${year}_Compliance_Trend_Report.docx`);
  };

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

      {/* Organization Compliance Table */}
      {isComplianceSuperUser && <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {year}, Organization Compliance
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table ref={orgTableRef}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Quarter</TableCell>
                <TableCell align="right">Compliance %</TableCell>
                <TableCell align="right">Non-Compliance %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizationTrend.map((row) => (
                <TableRow key={row.quarter}>
                  <TableCell>{row.quarter}</TableCell>
                  <TableCell align="right">{row.compliance}%</TableCell>
                  <TableCell align="right">{row.nonCompliance}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>}

      {/* Teams Compliance Tables */}
      <Box>
        <Typography variant="h6" gutterBottom>
          {year}, Teams Compliance
        </Typography>
        {teamTrends.map((team) => (
          <Box key={team.team} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, color: '#666' }}>
              {team.team}
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Quarter</TableCell>
                    <TableCell align="right">Compliance %</TableCell>
                    <TableCell align="right">Non-Compliance %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.data.map((row) => (
                    <TableRow key={row.quarter}>
                      <TableCell>{row.quarter}</TableCell>
                      <TableCell align="right">{row.compliance}%</TableCell>
                      <TableCell align="right">{row.nonCompliance}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ComplianceTrendView; 