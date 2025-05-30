import React, { useState, useEffect, useMemo } from 'react';
import { Box, InputLabel, Select, MenuItem, FormControl, Button } from '@mui/material';
import { useAuth } from '../../../../contexts/AuthContext';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchComplianceObligations } from '../../../../store/slices/complianceObligationsSlice';
import ComplianceView from './components/ComplianceView';
import ComplianceTrendView from './components/ComplianceTrendView';

const StyledFormControl = FormControl;
const ViewButton = Button;

const ComplianceAreas: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { obligations, status } = useAppSelector(state => state.complianceObligations);

  // Get available years from obligations and current year
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const obligationYears = obligations
      .flatMap(o => o.update?.map(u => u.year) || [])
      .filter((year): year is string => !!year);

    const uniqueYearsSet = new Set([currentYear, ...obligationYears]);
    const uniqueYears = Array.from(uniqueYearsSet)
      .sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending

    return uniqueYears;
  }, [obligations]);

  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<'compliance-view' | 'compliance-trend-view'>('compliance-view');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const isComplianceSuperUser = user?.isComplianceSuperUser;
  const isComplianceChampion = user?.isComplianceChampion;

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchComplianceObligations());
    }
  }, [status, dispatch]);

  const handleView = () => {
    setIsLoading(true);
    setTimeout(() => {
      setShowDashboard(true);
      setIsLoading(false);
    }, 500);
  };

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Determine if the view button should be disabled
  const isViewButtonDisabled = isLoading || !year || (!selectedQuarter && viewMode === 'compliance-view') || !viewMode;

  if (status === 'failed') {
    return <Box>Error loading compliance data</Box>;
  }

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
            onChange={(e) => { setYear(e.target.value); setShowDashboard(false); }}
        >
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </Select>
      </StyledFormControl>

        {(isComplianceSuperUser || isComplianceChampion) && (
          <StyledFormControl sx={{ 
            flex: viewMode === 'compliance-trend-view' ? 2 : 1,
            width: { xs: '100%' }
          }}>
          <InputLabel>View Mode</InputLabel>
          <Select
            value={viewMode}
            label="View Mode"
            onChange={(e) => {
                setViewMode(e.target.value as 'compliance-view' | 'compliance-trend-view');
              setShowDashboard(false);
            }}
          >
              <MenuItem value="compliance-view">Compliance View</MenuItem>
              <MenuItem value="compliance-trend-view">Compliance Trend View</MenuItem>
          </Select>
        </StyledFormControl>
      )}

        {viewMode !== 'compliance-trend-view' && <StyledFormControl sx={{ flex: 0.7, width: { xs: '100%' } }}>
        <InputLabel>Quarter</InputLabel>
        <Select
          value={selectedQuarter}
          label="Quarter"
            onChange={(e) => { setSelectedQuarter(e.target.value); setShowDashboard(false); }}
          >
            {quarters.map((q) => (
              <MenuItem key={q} value={q}>{q}</MenuItem>
          ))}
        </Select>
        </StyledFormControl>}

      <ViewButton
        variant="contained"
          disabled={isViewButtonDisabled}
        onClick={handleView}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        {isLoading ? 'Loading...' : 'View'}
      </ViewButton>
    </Box>

      {showDashboard && status === 'succeeded' && (
        viewMode === 'compliance-view' ? (
          <ComplianceView
            year={year}
            quarter={selectedQuarter}
            obligations={obligations}
          />
        ) : (
          <ComplianceTrendView
            year={year}
            quarter={selectedQuarter}
            obligations={obligations}
          />
        )
      )}
    </Box>
  );
};

export default ComplianceAreas;
