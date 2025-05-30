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
  TextField,
  InputAdornment,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { AnnualTarget, AnnualTargetRatingScale, QuarterlyTargetObjective, QuarterType } from '../../../types/annualCorporateScorecard';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { fetchPersonalPerformances } from '../../../store/slices/personalPerformanceSlice';
import { StyledHeaderCell, StyledTableCell, StyledMenuItem, StyledListItemIcon } from '../../../components/StyledTableComponents';
import { PersonalPerformance, PersonalQuarterlyTarget } from '../../../types';
import { api } from '../../../services/api';
import PersonalQuarterlyTargetContent from './PersonalQuarterlyTarget';
import SearchIcon from '@mui/icons-material/Search';
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

const PersonalPerformanceAgreement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [showQuarterlyTargets, setShowQuarterlyTargets] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showPersonalQuarterlyTarget, setShowPersonalQuarterlyTarget] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<{ id: string, name: string, team: string, position: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const teams = useAppSelector((state: RootState) =>
    state.teams.teams
  );
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

  useEffect(() => {
    dispatch(fetchAnnualTargets());
  }, [dispatch]);

  const fetchCompanyUsers = async () => {
    try {
      const response = await api.get('/personal-performance/manage-performance-agreement/company-users', {
        params: {
          annualTargetId: selectedAnnualTargetId,
          quarter: selectedQuarter
        }
      });
      if (response.status === 200) {
        setCompanyUsers(response.data.data);
      } else {
        setCompanyUsers([]);
      }
    } catch (error) {
      setCompanyUsers([]);
    }
  }

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
      dispatch(fetchPersonalPerformances({ annualTargetId: selectedAnnualTargetId }));
      setShowQuarterlyTargets(true);
      setShowPersonalQuarterlyTarget(false);
      fetchCompanyUsers();

    }
  };
  
  const filteredUsers = companyUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.position.toLowerCase().includes(searchLower) ||
      user.team.toLowerCase().includes(searchLower)
    );
  });

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
          disabled={!selectedAnnualTargetId}
          onClick={handleView}
        >
          View
        </ViewButton>
      </Box>

      {showQuarterlyTargets && selectedAnnualTarget && (
        <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by name, position, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  '& fieldset': {
                    borderColor: '#E5E7EB',
                  },
                  '&:hover fieldset': {
                    borderColor: '#D1D5DB',
                  },
                },
              }}
            />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <StyledHeaderCell align="center">Full Name</StyledHeaderCell>
                  <StyledHeaderCell align="center">Position</StyledHeaderCell>
                  <StyledHeaderCell align="center">Team</StyledHeaderCell>
                  <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <StyledTableCell align="center">{user.name}</StyledTableCell>
                    <StyledTableCell align="center">{user.position}</StyledTableCell>
                    <StyledTableCell align="center">{user.team}</StyledTableCell>
                    <StyledTableCell align="center">
                      <Button variant="contained" color="primary" onClick={() => {
                        setShowPersonalQuarterlyTarget(true);
                        setShowQuarterlyTargets(false);
                        setSelectedUserId(user.id);
                      }}>
                        View
                      </Button>
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
          annualTarget={selectedAnnualTarget as AnnualTarget}
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
          userId={selectedUserId}
          userName={filteredUsers.find(user => user.id === selectedUserId)?.name || ''}
        />
      )}
    </Box>
  );
};

export default PersonalPerformanceAgreement;
