import React, { useRef } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { Obligation } from '../../../../../types/compliance';
import { ExportButton } from '../../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportPdf } from '../../../../../utils/exportPdf';
import { exportExcel } from '../../../../../utils/exportExcel';
import { exportWord } from '../../../../../utils/exportUtils';
import { PdfType } from '../../../../../types';
import { getComplianceStatusColor } from './OrganizationCompliance';
import { getRiskLevelColor } from './OrganizationCompliance';

interface HighRiskOverdueProps {
  year: string;
  quarter: string;
  obligations: Obligation[];
}

const HighRiskObligation: React.FC<HighRiskOverdueProps> = ({ year, quarter, obligations }) => {
  const tableRef = useRef<any>(null);

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

  const getHighRiskOverdueObligations = () => {
    return obligations.filter(obligation => {
      // Only consider active obligations
      if (obligation.status !== 'Active') return false;

      const effectiveStatus = findEffectiveStatusForReporting(obligation, year, quarter);

      return (
        effectiveStatus === 'Not Compliant' &&
        obligation.riskLevel === 'High'
      );
    });
  };

  const overdueObligations = getHighRiskOverdueObligations();

  const handleExportPDF = () => {
    if (overdueObligations.length > 0) {
      const title = `${year}, ${quarter} High-Risk Overdue Obligations`;
      exportPdf(PdfType.HighRiskOverdue, tableRef, title, '', '', [0.2, 0.15, 0.15, 0.15, 0.15, 0.2]);
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
      exportWord(tableRef, title, [0.2, 0.15, 0.15, 0.15, 0.15, 0.2]);
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
              <TableCell>Risk Level</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Compliance Status</TableCell>
              <TableCell>Comments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overdueObligations.map((obligation) => {
              const effectiveStatus = findEffectiveStatusForReporting(obligation, year, quarter);
              const currentUpdate = obligation.update?.find(
                u => u.year === year && u.quarter === quarter && u.assessmentStatus === 'Approved'
              );
              const displayComplianceStatus = effectiveStatus || 'N/A';
              const displayComments = currentUpdate?.comments || '';

              return (
                <TableRow key={obligation._id}>
                  <TableCell>{obligation.complianceObligation}</TableCell>
                  <TableCell data-color={getRiskLevelColor(obligation.riskLevel)} sx={{ color: getRiskLevelColor(obligation.riskLevel) }}>{obligation.riskLevel}</TableCell>
                  <TableCell>{obligation.complianceArea.areaName}</TableCell>
                  <TableCell>{obligation.owner.name}</TableCell>
                  <TableCell
                    data-color={getComplianceStatusColor(displayComplianceStatus)}
                    sx={{ color: getComplianceStatusColor(displayComplianceStatus) }}
                  >{displayComplianceStatus}</TableCell>
                  <TableCell>
                    {displayComments}
                  </TableCell>
                </TableRow>
              );
            })}
            {overdueObligations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
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