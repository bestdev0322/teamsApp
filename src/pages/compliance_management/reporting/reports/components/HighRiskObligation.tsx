import React, { useRef } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { Obligation } from '../../../../../types/compliance';
import { ExportButton } from '../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../utils/exportPdf';
import { exportExcel } from '../../../../../utils/exportExcel';
import { exportWord } from '../../../../../utils/exportUtils';
import { PdfType } from '../../../../../types';
import { getComplianceStatusColor } from './OrganizationCompliance'

interface HighRiskOverdueProps {
  year: string;
  quarter: string;
  obligations: Obligation[];
}

const HighRiskObligation: React.FC<HighRiskOverdueProps> = ({ year, quarter, obligations }) => {
  const tableRef = useRef<any>(null);

  const getHighRiskOverdueObligations = () => {
    return obligations.filter(obligation => {
      const update = obligation.update?.find(u => u.year === year && u.quarter === quarter);
      return (
        update &&
        update.assessmentStatus === 'Approved' &&
        obligation.riskLevel === 'High' &&
        update.complianceStatus === 'Not Compliant'
      );
    });
  };

  const overdueObligations = getHighRiskOverdueObligations();

  const handleExportPDF = () => {
    if (overdueObligations.length > 0) {
      const title = `${year}, ${quarter} High-Risk Overdue Obligations`;
      exportPdf(PdfType.HighRiskOverdue, tableRef, title, '', '', [0.2, 0.2, 0.2, 0.2, 0.2]);
    }
  };

  const handleExportExcel = () => {
    if (overdueObligations.length > 0) {
      exportExcel(tableRef.current, `${year}_${quarter}_High_Risk_Overdue`);
    }
  };

  const handleExportWord = () => {
    if (overdueObligations.length > 0) {
      const title = `${year}, ${quarter} High-Risk Overdue Obligations`;
      exportWord(tableRef, title, [0.2, 0.2, 0.2, 0.2, 0.2]);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {year}, {quarter} High-Risk Overdue Obligations
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
              <TableCell>Compliance Status</TableCell>
              <TableCell>Comments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overdueObligations.map((obligation) => (
              <TableRow key={obligation._id}>
                <TableCell>{obligation.complianceObligation}</TableCell>
                <TableCell>{obligation.complianceArea.areaName}</TableCell>
                <TableCell>{obligation.owner.name}</TableCell>
                <TableCell
                  data-color={getComplianceStatusColor(obligation.update?.find(u => u.year === year && u.quarter === quarter)?.complianceStatus || '')}
                  sx={{color: getComplianceStatusColor(obligation.update?.find(u => u.year === year && u.quarter === quarter)?.complianceStatus || '')}}
                >{obligation.update?.find(u => u.year === year && u.quarter === quarter)?.complianceStatus}</TableCell>
                <TableCell>
                  {obligation.update?.find(u => u.year === year && u.quarter === quarter)?.comments || ''}
                </TableCell>
              </TableRow>
            ))}
            {overdueObligations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No high-risk overdue obligations found for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default HighRiskObligation; 