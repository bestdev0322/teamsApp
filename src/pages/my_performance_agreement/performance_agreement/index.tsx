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
import { AnnualTarget, QuarterType } from '../../../types/annualCorporateScorecard';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { fetchPersonalPerformances } from '../../../store/slices/personalPerformanceSlice';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { PersonalPerformance } from '../../../types';
import PersonalQuarterlyTargetContent from './PersonalQuarterlyTarget';

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

const PersonalPerformanceAgreement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [showQuarterlyTargets, setShowQuarterlyTargets] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedPersonalPerformance, setSelectedPersonalPerformance] = useState<PersonalPerformance | null>(null);
  const [showPersonalQuarterlyTarget, setShowPersonalQuarterlyTarget] = useState(false);
  const teams = useAppSelector((state: RootState) =>
    state.teams.teams
  );

  const annualTargets = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets
  );

  const personalPerformances = useAppSelector((state: RootState) =>
    state.personalPerformance.personalPerformances
  );

  const selectedAnnualTarget: AnnualTarget | undefined = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );

  useEffect(() => {
    dispatch(fetchAnnualTargets());
  }, [dispatch]);

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowQuarterlyTargets(false);
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value);
    setShowQuarterlyTargets(false);
  };

  const handleView = () => {
    if (selectedAnnualTarget && selectedQuarter) {
      dispatch(fetchPersonalPerformances({ annualTargetId: selectedAnnualTargetId, quarter: selectedQuarter }));
      setShowQuarterlyTargets(true);
      setShowPersonalQuarterlyTarget(false);
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
            {selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.map((quarter) => (
              <MenuItem key={quarter.quarter} value={quarter.quarter}>
                {quarter.quarter}
              </MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <ViewButton
          variant="contained"
          disabled={!selectedAnnualTargetId}
          onClick={handleView}
        >
          View
        </ViewButton>


      </Box>
      {showQuarterlyTargets && selectedAnnualTarget && (
        <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <StyledHeaderCell>Annual Corporate Scorecard</StyledHeaderCell>
                  <StyledHeaderCell>Start Date</StyledHeaderCell>
                  <StyledHeaderCell>End Date</StyledHeaderCell>
                  <StyledHeaderCell>Status</StyledHeaderCell>
                  <StyledHeaderCell>Team</StyledHeaderCell>
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
                  <StyledTableCell>{selectedAnnualTarget?.status}</StyledTableCell>
                  <StyledTableCell>{teams.find(team => team._id === personalPerformance.teamId)?.name}</StyledTableCell>
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

export default PersonalPerformanceAgreement;
