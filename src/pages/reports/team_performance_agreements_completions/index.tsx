import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
  SelectChangeEvent,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Paper,
  InputLabel,
  styled,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { TeamPerformance } from '../../../types';
import { StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { api } from '../../../services/api';
import { exportPdf } from '../../../utils/exportPdf';
import { PdfType } from '../../../types';
import { ExportButton } from '../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { enableTwoQuarterMode, isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
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

const TeamPerformances: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [showTable, setShowTable] = useState(false);

  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
  const selectedAnnualTarget = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );
  const [teamPerformances, setTeamPerformances] = useState([]);
  const tableRef = useRef();
  const { user } = useAuth();
  useEffect(() => {
    dispatch(fetchAnnualTargets());
  }, [dispatch]);

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowTable(false);
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value);
    setShowTable(false);
  };

  const fetchTeamPerformances = async () => {
    try {
      const response = await api.get(`/report/team-performances?annualTargetId=${selectedAnnualTargetId}`);
      if (response.status === 200) {
        setTeamPerformances(response.data.data);
      } else {
        setTeamPerformances([]);
      }
    } catch (error) {
      console.error('Error fetching team performances:', error);
      setTeamPerformances([]);
    }
  }

  const handleView = () => {
    if (selectedAnnualTargetId && selectedQuarter) {
      fetchTeamPerformances();
      setShowTable(true);
    }
  };

  const handleExportPDF = async () => {
    if (teamPerformances.length > 0) {
      const title = `${annualTargets.find(target => target._id === selectedAnnualTargetId)?.name} ${isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter(quarter => quarter.editable).map(quarter => quarter.quarter), user?.isTeamOwner || user?.role === 'SuperUser') ? QUARTER_ALIAS[selectedQuarter as keyof typeof QUARTER_ALIAS] : selectedQuarter} Performance Agreements Completions`;
      exportPdf(PdfType.PerformanceEvaluation, tableRef, title, '', '', [0.15, 0.25, 0.25, 0.1, 0.25]);
    }
  }

  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <StyledFormControl fullWidth>
          <Select
            value={selectedAnnualTargetId}
            onChange={handleScorecardChange}
            displayEmpty
            sx={{ backgroundColor: '#fff' }}
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
            { selectedAnnualTarget && enableTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter(quarter => quarter.editable).map(quarter => quarter.quarter), user?.isTeamOwner || user?.role === 'SuperUser')
              .map((quarter) => (
                <MenuItem key={quarter.key} value={quarter.key}>
                  {quarter.alias}
                </MenuItem>
              ))}
          </Select>
        </StyledFormControl>

        <Button
          variant="contained"
          onClick={handleView}
          disabled={!selectedAnnualTargetId || !selectedQuarter}
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': { backgroundColor: '#106EBE' },
          }}
        >
          View
        </Button>
      </Box>

      {showTable && (
        <Paper sx={{ boxShadow: 'none', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <ExportButton
            className="pdf"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportPDF}
            size="small"
            sx={{ margin: 2 }}
          >
            Export to PDF
          </ExportButton>
          <Table ref={tableRef}>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Full Name</StyledHeaderCell>
                <StyledHeaderCell>Job Title</StyledHeaderCell>
                <StyledHeaderCell>Team</StyledHeaderCell>
                <StyledHeaderCell>Status</StyledHeaderCell>
                <StyledHeaderCell>Date, Time</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                teamPerformances.map((performance: TeamPerformance) => (
                  <TableRow key={performance._id}>
                    <StyledTableCell>{performance.fullName}</StyledTableCell>
                    <StyledTableCell>{performance.jobTitle}</StyledTableCell>
                    <StyledTableCell>{performance.team}</StyledTableCell>
                    <StyledTableCell>{performance.quarterlyTargets.find(quarter => quarter.quarter === selectedQuarter)?.agreementStatus}</StyledTableCell>
                    <StyledTableCell>{new Date().toLocaleString()}</StyledTableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default TeamPerformances;
