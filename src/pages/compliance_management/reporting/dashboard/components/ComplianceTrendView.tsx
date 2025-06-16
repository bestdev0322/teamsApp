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
  totalObligations: number;
}

interface TeamComplianceTrend {
  team: string;
  data: ComplianceData[];
}

const ComplianceTrendView: React.FC<ComplianceTrendViewProps> = ({ year, obligations }) => {
  const { user } = useAuth();
  const isComplianceSuperUser = user?.isComplianceSuperUser;
  const orgTableRef = useRef<any>(null);

  // Helper to find the effective compliance status for reporting
  const findEffectiveStatusForReporting = (obligation: Obligation, targetYear: string, targetQuarter: string): 'Compliant' | 'Not Compliant' | null => {
      // 1. Try to find an Approved update for the target quarter
      const targetQuarterUpdate = obligation.update?.find(u =>
          u.year === targetYear &&
          u.quarter === targetQuarter &&
          u.assessmentStatus === 'Approved'
      );

      if (targetQuarterUpdate) {
          return targetQuarterUpdate.complianceStatus as 'Compliant' | 'Not Compliant';
      }

      // 2. If no Approved update for the target quarter, find the latest Approved update from any previous quarter
      const previousApprovedUpdates = obligation.update
          ?.filter(u =>
              u.assessmentStatus === 'Approved' &&
              (parseInt(u.year) < parseInt(targetYear) || (parseInt(u.year) === parseInt(targetYear) && u.quarter < targetQuarter))
          )
          .sort((a, b) => {
              if (parseInt(b.year) !== parseInt(a.year)) return parseInt(b.year) - parseInt(a.year);
              return b.quarter.localeCompare(a.quarter);
          });

      if (previousApprovedUpdates && previousApprovedUpdates.length > 0) {
          return previousApprovedUpdates[0].complianceStatus as 'Compliant' | 'Not Compliant';
      }

      // 3. If no approved status found for current or previous quarters
      return null; 
  };

  const calculateCompliance = (filteredObligations: Obligation[], quarter: string) => {
    const total = filteredObligations.length;
    if (total === 0) return { compliance: 0, nonCompliance: 0, totalObligations: 0 };
    
    const compliantCount = filteredObligations.filter(o => 
      findEffectiveStatusForReporting(o, year.toString(), quarter) === 'Compliant'
    ).length;
    
    const compliance = Math.round((compliantCount / total) * 100);
    return {
      compliance,
      nonCompliance: 100 - compliance,
      totalObligations: total
    };
  };

  const getComplianceTrendData = () => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const activeObligations = obligations.filter(o => o.status === 'Active');

    // Calculate organization compliance for each quarter
    const organizationTrend: ComplianceData[] = quarters.map(q => {
      // For trend view, we consider all active obligations for each quarter
      // and then determine their effective status for that quarter.
      const { compliance, nonCompliance, totalObligations } = calculateCompliance(activeObligations, q);
      return {
        quarter: q,
        compliance,
        nonCompliance,
        totalObligations
      };
    });

    // Group by teams and calculate their trends
    const teams = Array.from(new Set(activeObligations.map(o => typeof o.owner === 'object' ? o.owner.name : o.owner)));
    const teamTrends: TeamComplianceTrend[] = teams.map(teamName => {
      const teamData: ComplianceData[] = quarters.map(q => {
        const teamActiveObligations = activeObligations.filter(o => (typeof o.owner === 'object' ? o.owner.name : o.owner) === teamName);
        const { compliance, nonCompliance, totalObligations } = calculateCompliance(teamActiveObligations, q);
        return {
          quarter: q,
          compliance,
          nonCompliance,
          totalObligations
        };
      });
      return { team: teamName, data: teamData };
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
      head: [['Quarter', 'Total Obligations', 'Compliance %', 'Non-Compliance %']],
      body: organizationTrend.map(row => [
        row.quarter,
        row.totalObligations.toString(),
        `${row.compliance}%`,
        `${row.nonCompliance}%`
      ]),
      startY: finalY,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.25 },
        1: { cellWidth: tableWidth * 0.25 },
        2: { cellWidth: tableWidth * 0.25 },
        3: { cellWidth: tableWidth * 0.25 }
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

    teamTrends.forEach((teamEntry) => {
      finalY = finalY + 25;
      if (finalY >= pageHeight - 40) {
        doc.addPage();
        finalY = 20;
      }

      doc.text(teamEntry.team, 10, finalY);

      autoTable(doc, {
        head: [['Quarter', 'Total Obligations', 'Compliance %', 'Non-Compliance %']],
        body: teamEntry.data.map(row => [
          row.quarter,
          row.totalObligations.toString(),
          `${row.compliance}%`,
          `${row.nonCompliance}%`
        ]),
        startY: finalY + 5,
        columnStyles: {
          0: { cellWidth: tableWidth * 0.25 },
          1: { cellWidth: tableWidth * 0.25 },
          2: { cellWidth: tableWidth * 0.25 },
          3: { cellWidth: tableWidth * 0.25 }
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
          new DocxTableCell({ children: [new Paragraph('Quarter')], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new DocxTableCell({ children: [new Paragraph('Total Obligations')], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new DocxTableCell({ children: [new Paragraph('Compliance %')], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new DocxTableCell({ children: [new Paragraph('Non-Compliance %')], width: { size: 25, type: WidthType.PERCENTAGE } }),
        ],
      }),
      ...organizationTrend.map(row =>
        new DocxTableRow({
          children: [
            new DocxTableCell({ children: [new Paragraph(row.quarter)] }),
            new DocxTableCell({ children: [new Paragraph(row.totalObligations.toString())] }),
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

    const teamTables = teamTrends.map(teamEntry => [ 
      new Paragraph({
        children: [
          new TextRun({ text: teamEntry.team, size: 20, bold: true })
        ],
        spacing: { after: 100 },
      }),
      new DocxTable({
        rows: [
          new DocxTableRow({
            children: [
              new DocxTableCell({ children: [new Paragraph('Quarter')], width: { size: 25, type: WidthType.PERCENTAGE }  }),
              new DocxTableCell({ children: [new Paragraph('Total Obligations')], width: { size: 25, type: WidthType.PERCENTAGE }  }),
              new DocxTableCell({ children: [new Paragraph('Compliance %')], width: { size: 25, type: WidthType.PERCENTAGE }  }),
              new DocxTableCell({ children: [new Paragraph('Non-Compliance %')], width: { size: 25, type: WidthType.PERCENTAGE }  }),
            ],
          }),
          ...teamEntry.data.map(row =>
            new DocxTableRow({
              children: [
                new DocxTableCell({ children: [new Paragraph(row.quarter)] }),
                new DocxTableCell({ children: [new Paragraph(row.totalObligations.toString())] }),
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
                <TableCell align="right">Total Obligations</TableCell>
                <TableCell align="right">Compliance %</TableCell>
                <TableCell align="right">Non-Compliance %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizationTrend.map((row) => (
                <TableRow key={row.quarter}>
                  <TableCell>{row.quarter}</TableCell>
                  <TableCell align="right">{row.totalObligations}</TableCell>
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
        {teamTrends.map((teamEntry) => (
          <Box key={teamEntry.team} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, color: '#666' }}>
              {teamEntry.team}
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Quarter</TableCell>
                    <TableCell align="right">Total Obligations</TableCell>
                    <TableCell align="right">Compliance %</TableCell>
                    <TableCell align="right">Non-Compliance %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamEntry.data.map((row) => (
                    <TableRow key={row.quarter}>
                      <TableCell>{row.quarter}</TableCell>
                      <TableCell align="right">{row.totalObligations}</TableCell>
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