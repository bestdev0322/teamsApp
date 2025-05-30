import React, { useRef } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { Obligation } from '../../../../../types/compliance';
import { ExportButton } from '../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../utils/exportPdf';
import { exportExcel } from '../../../../../utils/exportExcel';
import { PdfType } from '../../../../../types';
import { useAuth } from '../../../../../contexts/AuthContext';

interface ComplianceSummaryProps {
  year: string;
  quarter: string;
  obligations: Obligation[];
  teamName?: string;
}

interface SummaryRow {
  area: string;
  totalObligations: number;
  compliant: number;
  overdue: number;
  complianceRate: number;
}

const ComplianceSummary: React.FC<ComplianceSummaryProps> = ({ year, quarter, obligations, teamName }) => {
  const tableRef = useRef<any>(null);
  const { user } = useAuth();
  const isComplianceSuperUser = user?.isComplianceSuperUser;

  const calculateSummary = (): SummaryRow[] => {
    // Group obligations by area
    const areaMap = new Map<string, Obligation[]>();
    obligations.forEach(obligation => {
      const area = obligation.complianceArea.areaName;
      if (!areaMap.has(area)) {
        areaMap.set(area, []);
      }
      areaMap.get(area)?.push(obligation);
    });

    // Calculate statistics for each area
    const summary: SummaryRow[] = [];
    areaMap.forEach((areaObligations, area) => {
      const filteredObligations = areaObligations.filter(o => {
        const update = o.update?.find(u => u.year === year && u.quarter === quarter);
        return update && update.assessmentStatus === 'Approved';
      });

      const total = filteredObligations.length;
      const compliant = filteredObligations.filter(o => o.complianceStatus === 'Compliant').length;
      const overdue = filteredObligations.filter(o => o.complianceStatus === 'Not Compliant').length;
      
      summary.push({
        area,
        totalObligations: total,
        compliant,
        overdue,
        complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0
      });
    });

    // Add total row
    const totals = summary.reduce((acc, curr) => ({
      area: 'TOTAL',
      totalObligations: acc.totalObligations + curr.totalObligations,
      compliant: acc.compliant + curr.compliant,
      overdue: acc.overdue + curr.overdue,
      complianceRate: 0
    }), { area: 'TOTAL', totalObligations: 0, compliant: 0, overdue: 0, complianceRate: 0 });
    
    totals.complianceRate = totals.totalObligations > 0 
      ? Math.round((totals.compliant / totals.totalObligations) * 100) 
      : 0;
    
    return [...summary, totals];
  };

  const summaryData = calculateSummary();

  const handleExportPDF = () => {
    if (summaryData.length > 0) {
      const title = `${year}, ${quarter} ${isComplianceSuperUser ? 'Organization' : `${teamName} Team`} Compliance Summary`;
      exportPdf(PdfType.ComplianceSummary, tableRef, title, '', '', [0.25, 0.25, 0.25, 0.25]);
    }
  };

  const handleExportExcel = () => {
    if (summaryData.length > 0) {
      const headers = ['Compliance Area', 'Total Obligations', 'Compliant', 'Compliance Rate'];
      const data = summaryData.map(row => [
        row.area,
        row.totalObligations,
        row.compliant,
        `${row.complianceRate}%`
      ]);
      
      exportExcel(tableRef.current, `${year}_${quarter}_Compliance_Summary`);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {year}, {quarter} {isComplianceSuperUser ? 'Organization' : `${teamName} Team`} Compliance
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table ref={tableRef}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Compliance Area</TableCell>
              <TableCell align="right">Total Obligations</TableCell>
              <TableCell align="right">Compliant</TableCell>
              <TableCell align="right">Compliance Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaryData.map((row, index) => (
              <TableRow 
                key={row.area}
                sx={row.area === 'TOTAL' ? { 
                  backgroundColor: '#f8f9fa',
                  fontWeight: 'bold'
                } : {}}
              >
                <TableCell>{row.area}</TableCell>
                <TableCell align="right">{row.totalObligations}</TableCell>
                <TableCell align="right">{row.compliant}</TableCell>
                <TableCell align="right">{row.complianceRate}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ComplianceSummary; 