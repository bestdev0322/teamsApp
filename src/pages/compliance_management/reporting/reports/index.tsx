import React, { useState, useEffect, useMemo } from 'react';
import { Box, InputLabel, Select, MenuItem, FormControl, Button } from '@mui/material';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchComplianceObligations } from '../../../../store/slices/complianceObligationsSlice';
import ComplianceSummary from './components/ComplianceSummary';
import HighRiskObligation from './components/HighRiskObligation';
import ComplianceDetails from './components/ComplianceDetails';

const StyledFormControl = FormControl;
const ViewButton = Button;

type ReportType = 'compliance-summary' | 'high-risk-obligation' | 'compliance-details';

const Reports: React.FC = () => {
  const dispatch = useAppDispatch();
  const { obligations, status } = useAppSelector(state => state.complianceObligations);
  
  // Get available years from obligations and current year
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const obligationYears = obligations
      .flatMap(o => o.update?.map(u => u.year) || [])
      .filter((year): year is string => !!year);
    
    const uniqueYearsSet = new Set([currentYear, ...obligationYears]);
    const uniqueYears = Array.from(uniqueYearsSet)
      .sort((a, b) => parseInt(b) - parseInt(a));

    return uniqueYears;
  }, [obligations]);

  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedReport, setSelectedReport] = useState<ReportType>('compliance-summary');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [isLoading, setIsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchComplianceObligations());
    }
  }, [status, dispatch]);

  const handleView = () => {
    setIsLoading(true);
    setTimeout(() => {
      setShowReport(true);
      setIsLoading(false);
    }, 500);
  };

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const reports = [
    { value: 'compliance-summary', label: 'Compliance Summary' },
    { value: 'high-risk-obligation', label: 'High-Risk Obligation' },
    { value: 'compliance-details', label: 'Compliance Details' }
  ];

  // Determine if the view button should be disabled
  const isViewButtonDisabled = isLoading || !year || !selectedReport || !selectedQuarter;

  if (status === 'failed') {
    return <Box>Error loading compliance data</Box>;
  }

  const renderReport = () => {
    if (!showReport) return null;

    switch (selectedReport) {
      case 'compliance-summary':
        return <ComplianceSummary year={year} quarter={selectedQuarter} obligations={obligations} />;
      case 'high-risk-obligation':
        return <HighRiskObligation year={year} quarter={selectedQuarter} obligations={obligations} />;
      case 'compliance-details':
        return <ComplianceDetails year={year} quarter={selectedQuarter} obligations={obligations} />;
      default:
        return null;
    }
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
            onChange={(e) => { setYear(e.target.value); setShowReport(false); }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <StyledFormControl sx={{ flex: 2 }}>
          <InputLabel>Report</InputLabel>
          <Select
            value={selectedReport}
            label="Report"
            onChange={(e) => { 
              setSelectedReport(e.target.value as ReportType); 
              setShowReport(false); 
            }}
          >
            {reports.map((report) => (
              <MenuItem key={report.value} value={report.value}>
                {report.label}
              </MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <StyledFormControl sx={{ flex: 0.7 }}>
          <InputLabel>Quarter</InputLabel>
          <Select
            value={selectedQuarter}
            label="Quarter"
            onChange={(e) => { setSelectedQuarter(e.target.value); setShowReport(false); }}
          >
            {quarters.map((q) => (
              <MenuItem key={q} value={q}>{q}</MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <ViewButton
          variant="contained"
          disabled={isViewButtonDisabled}
          onClick={handleView}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {isLoading ? 'Loading...' : 'View'}
        </ViewButton>
      </Box>

      {renderReport()}
    </Box>
  );
};

export default Reports;
