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
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Menu,
  ListItemText,
  TableContainer,
  IconButton,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { AnnualTarget, AnnualTargetRatingScale, QuarterlyTargetObjective, QuarterType } from '../../../types/annualCorporateScorecard';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { fetchPersonalPerformances } from '../../../store/slices/personalPerformanceSlice';
import { StyledHeaderCell, StyledTableCell, StyledMenuItem, StyledListItemIcon } from '../../../components/StyledTableComponents';
import { PersonalPerformance, PersonalQuarterlyTarget } from '../../../types';
import PersonalQuarterlyTargetContent from './PersonalQuarterlyTarget';
import { format } from 'date-fns';
import { enableTwoQuarterMode, isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
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

const PerformanceAssessment: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [showQuarterlyTargets, setShowQuarterlyTargets] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedPersonalPerformance, setSelectedPersonalPerformance] = useState<PersonalPerformance | null>(null);
  const [showPersonalQuarterlyTarget, setShowPersonalQuarterlyTarget] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const annualTargets = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets
  );

  const personalPerformances = useAppSelector((state: RootState) =>
    state.personalPerformance.personalPerformances
  );

  const selectedAnnualTarget: AnnualTarget | undefined = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );

  const teams = useAppSelector((state: RootState) =>
    state.teams.teams
  );

  useEffect(() => {
    dispatch(fetchAnnualTargets());
  }, [dispatch]);

  useEffect(() => {
    if (personalPerformances.length > 0 && selectedAnnualTargetId) {
      const personalPerformance = personalPerformances.find(performance => performance.annualTargetId === selectedAnnualTargetId);
      setSelectedPersonalPerformance(personalPerformance || null);
    }
  }, [personalPerformances, selectedAnnualTargetId]);

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowQuarterlyTargets(false);
    setSelectedPersonalPerformance(null);
    setShowPersonalQuarterlyTarget(false);
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value);
    setShowQuarterlyTargets(false);
    setSelectedPersonalPerformance(null);
    setShowPersonalQuarterlyTarget(false);
  };

  const handleView = async () => {
    if (selectedAnnualTarget && selectedQuarter) {
      setIsLoading(true);
      try {
        await dispatch(fetchPersonalPerformances({ annualTargetId: selectedAnnualTargetId }));
        setShowQuarterlyTargets(true);
        setShowPersonalQuarterlyTarget(false);
      } finally {
        setIsLoading(false);
      }
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
          disabled={!selectedAnnualTargetId || !selectedQuarter || isLoading}
          onClick={handleView}
        >
          {isLoading ? 'Loading...' : 'View'}
        </ViewButton>
      </Box>

      {showQuarterlyTargets && selectedAnnualTarget && !isLoading && (
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
                {personalPerformances
                  .filter(performance => performance.annualTargetId === selectedAnnualTargetId)
                  .map((personalPerformance: PersonalPerformance, index: number) => (
                    <TableRow key={index}>
                      <StyledTableCell>{selectedAnnualTarget?.name}</StyledTableCell>
                      <StyledTableCell>
                        {selectedAnnualTarget?.content.assessmentPeriod[selectedQuarter as keyof typeof selectedAnnualTarget.content.assessmentPeriod]?.startDate}
                      </StyledTableCell>
                      <StyledTableCell>
                        {selectedAnnualTarget?.content.assessmentPeriod[selectedQuarter as keyof typeof selectedAnnualTarget.content.assessmentPeriod]?.endDate}
                      </StyledTableCell>
                      <StyledTableCell>{personalPerformance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter)?.assessmentStatus}</StyledTableCell>
                      <StyledTableCell>{format(personalPerformance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter)?.assessmentStatusUpdatedAt || new Date(), 'yyyy-MM-dd HH:mm:ss')}</StyledTableCell>
                      <StyledTableCell align="center">
                        <ViewButton
                          size="small"
                          onClick={() => {
                            setShowQuarterlyTargets(false);
                            setShowPersonalQuarterlyTarget(true);
                            setSelectedPersonalPerformance(personalPerformance);
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
            setShowPersonalQuarterlyTarget(false);
            setShowQuarterlyTargets(true);
          }}
          personalPerformance={selectedPersonalPerformance}
        />
      )}
    </Box>
  );
};

export default PerformanceAssessment;
