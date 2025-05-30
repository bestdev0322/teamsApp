import React, { useRef } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { Obligation } from '../../../../../types/compliance';
import { ExportButton } from '../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../utils/exportPdf';
import { exportExcel } from '../../../../../utils/exportExcel';
import { exportWord } from '../../../../../utils/exportUtils';
import { PdfType } from '../../../../../types';

interface OrganizationComplianceProps {
  year: string;
  quarter: string;
  obligations: Obligation[];
}

const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'High':
      return '#DC2626';  // Red
    case 'Medium':
      return '#D97706';  // Amber
    case 'Low':
      return '#059669';  // Green
    default:
      return 'inherit';
  }
};

export const getComplianceStatusColor = (status: string) => {
  switch (status) {
    case 'Compliant':
      return '#059669';  // Green
    case 'Not Compliant':
      return '#DC2626';  // Red
    default:
      return 'inherit';
  }
};

const OrganizationCompliance: React.FC<OrganizationComplianceProps> = ({ year, quarter, obligations }) => {
  const tableRef = useRef<any>(null);

  const getFilteredObligations = () => {
    return obligations.filter(obligation => {
      const update = obligation.update?.find(u => u.year === year && u.quarter === quarter);
      return update && update.assessmentStatus === 'Approved';
    });
  };

  const filteredObligations = getFilteredObligations();

  const handleExportPDF = () => {
    if (filteredObligations.length > 0) {
      const title = `${year}, ${quarter} Organization Compliance`;
      exportPdf(PdfType.OrganizationCompliance, tableRef, title, '', '', [0.2, 0.15, 0.15, 0.15, 0.15, 0.2]);
    }
  };

  const handleExportExcel = () => {
    if (filteredObligations.length > 0) {
      const headers = ['Obligation', 'Area', 'Owner', 'Frequency', 'Risk Level', 'Compliance Status'];
      const data = filteredObligations.map(obligation => [
        obligation.complianceObligation,
        obligation.complianceArea.areaName,
        obligation.owner.name,
        obligation.frequency,
        obligation.riskLevel,
        obligation.complianceStatus
      ]);
      
      exportExcel(tableRef.current, `${year}_${quarter}_Organization_Compliance`);
    }
  };

  const handleExportWord = () => {
    if (filteredObligations.length > 0) {
      const title = `${year}, ${quarter} Organization Compliance`;
      exportWord(tableRef, title, [0.2, 0.15, 0.15, 0.15, 0.15, 0.2]);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {year}, {quarter} Organization Compliance
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
      <TableContainer component={Paper} variant="outlined">
        <Table ref={tableRef}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Obligation</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Risk Level</TableCell>
              <TableCell>Compliance Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredObligations.map((obligation) => (
              <TableRow 
                key={obligation._id}
                sx={{
                  backgroundColor: obligation.complianceStatus === 'Not Compliant' 
                    ? '#fff4f4' 
                    : 'inherit'
                }}
              >
                <TableCell>{obligation.complianceObligation}</TableCell>
                <TableCell>{obligation.complianceArea.areaName}</TableCell>
                <TableCell>{obligation.owner.name}</TableCell>
                <TableCell>{obligation.frequency}</TableCell>
                <TableCell 
                  sx={{ color: getRiskLevelColor(obligation.riskLevel) }}
                  data-color={getRiskLevelColor(obligation.riskLevel)}
                >
                  {obligation.riskLevel}
                </TableCell>
                <TableCell 
                  sx={{ color: getComplianceStatusColor(obligation.complianceStatus || '') }}
                  data-color={getComplianceStatusColor(obligation.complianceStatus || '')}
                >
                  {obligation.complianceStatus}
                </TableCell>
              </TableRow>
            ))}
            {filteredObligations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No compliance details found for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OrganizationCompliance; 