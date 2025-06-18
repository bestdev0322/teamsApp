import React, { useEffect, useState } from 'react';
import { Box, MenuItem, Button, FormControl, Select, SelectChangeEvent, TableRow, Paper, Table, TableHead, TableBody, Switch } from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { api } from '../../../services/api';
import { fetchAnnualTargets, updateQuarterlyTarget } from '../../../store/slices/scorecardSlice';
import { StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { AnnualTarget } from '../../../types'
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
import { isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
import { useAuth } from '../../../contexts/AuthContext';


const EnableEmployeesDevelopment: React.FC = () => {
  const dispatch = useAppDispatch();
  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [quarterlyTargets, setQuarterlyTargets] = useState<any[]>([]);
  const [isEnabledTwoQuarter, setIsEnabledTwoQuarter] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const { user } = useAuth();
  const selectedAnnualTarget: AnnualTarget | undefined = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );
  useEffect(() => {
    if (selectedAnnualTarget) {
      setIsEnabledTwoQuarter(isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter(quarter => quarter.editable).map(quarter => quarter.quarter), user?.isTeamOwner || user?.role === 'SuperUser'));
    }
  }, [selectedAnnualTarget, user?.isTeamOwner, user?.role]);

  useEffect(() => {
    dispatch(fetchAnnualTargets());
  }, [dispatch]);

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowTable(false);
  };

  const handleView = () => {
    if (selectedAnnualTargetId && selectedAnnualTarget) {
      setQuarterlyTargets(selectedAnnualTarget.content.quarterlyTarget.quarterlyTargets);
      setShowTable(true);
    }
  };

  const handleEnableChange = async (index: number) => {
    try {
      const updatedTargets = [...quarterlyTargets];
      const newStatus = !updatedTargets[index].isDevelopmentPlanEnabled;
      
      // Update local state
      updatedTargets[index] = {
        ...updatedTargets[index],
        isDevelopmentPlanEnabled: newStatus
      };
      setQuarterlyTargets(updatedTargets);

      // Call API to update in database
      await api.post('/users/org-dev-plan/update-quarterly-target', {
        annualTargetId: selectedAnnualTargetId,
        quarter: updatedTargets[index].quarter,
        isEnabled: newStatus
      });

      // Update store with new value
      if (selectedAnnualTarget) {
        const updatedAnnualTarget = {
          ...selectedAnnualTarget,
          content: {
            ...selectedAnnualTarget.content,
            quarterlyTarget: {
              ...selectedAnnualTarget.content.quarterlyTarget,
              quarterlyTargets: updatedTargets
            }
          }
        };
        dispatch(updateQuarterlyTarget(updatedAnnualTarget));
      }
    } catch (error) {
      console.error('Error updating enable status:', error);
      // Revert local state on error
      if (selectedAnnualTarget) {
        setQuarterlyTargets(selectedAnnualTarget.content.quarterlyTarget.quarterlyTargets);
      }
    }
  };

  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl fullWidth>
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
        </FormControl>

        <Button
          variant="contained"
          onClick={handleView}
          disabled={!selectedAnnualTargetId}
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': { backgroundColor: '#106EBE' },
          }}
        >
          View
        </Button>
      </Box>

      {showTable && (
        <Paper sx={{ boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <Table>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Quarter</StyledHeaderCell>
                <StyledHeaderCell>Enable</StyledHeaderCell>
                <StyledHeaderCell>Action</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quarterlyTargets.filter(quarterlyTarget => !(user?.isTeamOwner || user?.role === 'SuperUser')?quarterlyTarget.editable:quarterlyTarget).map((quarterlyTarget, index) => (
                <TableRow key={index}>
                  <StyledTableCell>{isEnabledTwoQuarter ? QUARTER_ALIAS[quarterlyTarget.quarter as keyof typeof QUARTER_ALIAS] : quarterlyTarget.quarter}</StyledTableCell>
                  <StyledTableCell>
                    {quarterlyTarget.isDevelopmentPlanEnabled ? 'Yes' : 'No'}
                  </StyledTableCell>
                  <StyledTableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Switch
                        checked={quarterlyTarget.isDevelopmentPlanEnabled}
                        onChange={() => handleEnableChange(index)}
                        color="primary"
                      />
                    </Box>
                  </StyledTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default EnableEmployeesDevelopment;
