import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  styled,
  SelectChangeEvent,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { AnnualTarget, QuarterType } from '../../../types/annualCorporateScorecard';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { fetchPersonalPerformances } from '../../../store/slices/personalPerformanceSlice';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { PersonalPerformance } from '../../../types';
import PersonalQuarterlyTargetContent from './PersonalQuarterlyTarget';
import { format } from 'date-fns';
import { enableTwoQuarterMode, isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
import { createSelector } from '@reduxjs/toolkit';
import { useAuth } from '../../../contexts/AuthContext';


const StyledFormControl = styled(FormControl)({
  backgroundColor: '#fff',
  borderRadius: '8px',
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#E5E7EB',
    },
    '&:hover fieldset': {
      borderColor: '#D1D5DB',
    },
  },
});

const ViewButton = styled(Button)({
  backgroundColor: '#0078D4',
  color: 'white',
  textTransform: 'none',
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: '#106EBE',
  },
});

// Memoized selector for selectedAnnualTarget
export const selectAnnualTargetById = createSelector(
  [
    (state: RootState) => state.scorecard.annualTargets,
    (_: RootState, selectedAnnualTargetId: string) => selectedAnnualTargetId
  ],
  (annualTargets, selectedAnnualTargetId) =>
    annualTargets.find(target => target._id === selectedAnnualTargetId)
);

const PersonalPerformanceAgreement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [showQuarterlyTargets, setShowQuarterlyTargets] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedPersonalPerformance, setSelectedPersonalPerformance] = useState<PersonalPerformance | null>(null);
  const [showPersonalQuarterlyTarget, setShowPersonalQuarterlyTarget] = useState(false);
  const { user } = useAuth();

  const annualTargets = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets
  );

  const personalPerformances = useAppSelector((state: RootState) =>
    state.personalPerformance.personalPerformances
  );

  const selectedAnnualTarget: AnnualTarget | undefined = useAppSelector(state => selectAnnualTargetById(state, selectedAnnualTargetId));

  useEffect(() => {
    dispatch(fetchAnnualTargets());
    dispatch(fetchPersonalPerformances({ annualTargetId: selectedAnnualTargetId }));
  }, [dispatch, selectedAnnualTargetId]);

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowQuarterlyTargets(false);
    setShowPersonalQuarterlyTarget(false);
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value);
    setShowQuarterlyTargets(false);
    setShowPersonalQuarterlyTarget(false);
  };

  const handleView = () => {
    if (selectedAnnualTarget && selectedQuarter) {
      dispatch(fetchPersonalPerformances({ annualTargetId: selectedAnnualTargetId }))
        .then(() => {
          setShowQuarterlyTargets(true);
          setShowPersonalQuarterlyTarget(false);
        })
        .catch((error) => {
          console.error('Error fetching personal performances:', error);
        });
    }
  };

  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <StyledFormControl fullWidth>
          <InputLabel>Annual Corporate Scorecard</InputLabel>
          <Select
            value={selectedAnnualTargetId}
            label="Annual Corporate Scorecard"
            onChange={handleScorecardChange}
          >
            {annualTargets.map((target) => (
              <MenuItem key={target._id} value={target._id}>
                {target.name}
              </MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <StyledFormControl sx={{ minWidth: 200 }}>
          <InputLabel>Quarter</InputLabel>
          <Select
            value={selectedQuarter}
            label="Quarter"
            onChange={handleQuarterChange}
          >
            {selectedAnnualTarget && enableTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
              quarter.editable
            )).map((quarter) => (
              quarter.quarter
            )), user?.isTeamOwner).map((quarter) => (
              <MenuItem key={quarter.key} value={quarter.key}>
                {quarter.alias}
              </MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <ViewButton
          variant="contained"
          disabled={!selectedAnnualTargetId || !selectedQuarter}
          onClick={handleView}
        >
          View
        </ViewButton>
      </Box>

      {showQuarterlyTargets && selectedAnnualTarget && personalPerformances.length > 0 && (
        <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <StyledHeaderCell>Annual Corporate Scorecard</StyledHeaderCell>
                  <StyledHeaderCell>Start Date</StyledHeaderCell>
                  <StyledHeaderCell>End Date</StyledHeaderCell>
                  <StyledHeaderCell>Status</StyledHeaderCell>
                  <StyledHeaderCell>Date, Time</StyledHeaderCell>
                  <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {personalPerformances.map((personalPerformance: PersonalPerformance, index: number) => (
                  <TableRow key={index}>
                    <StyledTableCell>{selectedAnnualTarget?.name}</StyledTableCell>
                    <StyledTableCell>
                      {selectedAnnualTarget?.content.contractingPeriod[selectedQuarter as keyof typeof selectedAnnualTarget.content.contractingPeriod]?.startDate}
                    </StyledTableCell>
                    <StyledTableCell>
                      {selectedAnnualTarget?.content.contractingPeriod[selectedQuarter as keyof typeof selectedAnnualTarget.content.contractingPeriod]?.endDate}
                    </StyledTableCell>
                    <StyledTableCell>
                      {personalPerformance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter)?.agreementStatus}
                    </StyledTableCell>
                    <StyledTableCell>
                      {format(personalPerformance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter)?.agreementStatusUpdatedAt || new Date(), 'yyyy-MM-dd HH:mm:ss')}
                    </StyledTableCell>
                    <StyledTableCell align="center">
                      <ViewButton
                        size="small"
                        onClick={() => {
                          setSelectedPersonalPerformance(personalPerformance);
                          setShowQuarterlyTargets(false);
                          setShowPersonalQuarterlyTarget(true);
                        }}
                      >
                        View
                      </ViewButton>
                    </StyledTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      {showPersonalQuarterlyTarget && selectedAnnualTarget && (
        <PersonalQuarterlyTargetContent
          annualTarget={selectedAnnualTarget}
          quarter={selectedQuarter as QuarterType}
          isEnabledTwoQuarterMode={isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
            quarter.editable
          )).map((quarter) => (
            quarter.quarter
          )), user?.isTeamOwner)}
          onBack={() => {
            handleView();
          }}
          personalPerformance={selectedPersonalPerformance}
        />
      )}
    </Box>
  );
};

export default PersonalPerformanceAgreement;
