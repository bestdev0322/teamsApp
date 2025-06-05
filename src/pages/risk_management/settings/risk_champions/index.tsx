import React, { useEffect, useState } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody } from '@mui/material';
import { StyledHeaderCell, StyledTableCell } from '../../../../components/StyledTableComponents';
import RiskMembers from './RiskMembers';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { RootState } from '../../../../store';
import { fetchTeams, fetchTeamMembers } from '../../../../store/slices/teamsSlice';
import { useAuth } from '../../../../contexts/AuthContext';
import PeoplePickerModal from '../../../../components/PeoplePickerModal';
import { api } from '../../../../services/api';

const RiskChampions: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { teams, teamMembers, loading } = useAppSelector((state: RootState) => state.teams);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (tenantId) {
        await dispatch(fetchTeams(tenantId));
        setIsInitialized(true);
      }
    };
    initializeData();
  }, [dispatch, tenantId]);

  // Set champions state when teams are fetched
  useEffect(() => {
    if (isInitialized && teams && Array.isArray(teams)) {
      const updatedTeamsList = teams.map(team => ({
        _id: team._id,
        name: team.name
      }));
      setTeamsList(updatedTeamsList);
      
      // Fetch members for each team
      teams.forEach(team => {
        dispatch(fetchTeamMembers(team._id));
      });
    }
  }, [teams, dispatch, isInitialized]);

  // Update teams list with members
  useEffect(() => {
    if (teamMembers && typeof teamMembers === 'object') {
      setTeamsList(prevTeams => 
        prevTeams.map(team => ({
          ...team,
          members: (teamMembers[team._id] || []).filter((member: any) => member?.isRiskChampion === true)
        }))
      );
    }
  }, [teamMembers]);

  const handleViewClick = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const handleBack = () => {
    setSelectedTeamId(null);
  };

  const handleAddChampion = () => {
    setIsPickerOpen(true);
  };

  const handleRemoveMember = async (email: string) => {
    if (!selectedTeamId) return;
    try {
      await api.delete(`/risk-champions/tenant/by-email/${email}`);
      await dispatch(fetchTeamMembers(selectedTeamId));
    } catch (error) {
      console.error('Error removing risk champion:', error);
    }
  };

  const handlePeopleSelected = async (selectedPeople: any[]) => {
    if (!selectedTeamId) return;
    try {
      for (const person of selectedPeople) {
        await api.post('/risk-champions/tenant', {
          email: person.email,
          teamId: selectedTeamId
        });
      }
      await dispatch(fetchTeamMembers(selectedTeamId));
      setIsPickerOpen(false);
    } catch (error) {
      console.error('Error adding risk champions:', error);
    }
  };

  const selectedTeam = teamsList.find(c => c._id === selectedTeamId);

  const eligibleMembers = selectedTeam
    ? (teamMembers[selectedTeam._id] || []).filter((m: any) => !m.isRiskChampion).map(member => ({...member, displayName: member.name}))
    : [];

  if (selectedTeamId && selectedTeam) {
    return (
      <>
        <RiskMembers
          champion={selectedTeam}
          onBack={handleBack}
          onAddChampion={handleAddChampion}
          onRemoveMember={handleRemoveMember}
        />
        <PeoplePickerModal
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelectPeople={handlePeopleSelected}
          title="Select Risk Champions"
          multiSelect={true}
          tenantId={tenantId}
          eligibleMembers={eligibleMembers}
          isElegibleModeOn={true}
        />
      </>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto', mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <StyledHeaderCell>Name</StyledHeaderCell>
              <StyledHeaderCell align="center">Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teamsList.map(team => (
              <TableRow key={team._id} hover>
                <StyledTableCell>{team.name}</StyledTableCell>
                <StyledTableCell align="center">
                  <Button
                    variant="outlined"
                    onClick={() => handleViewClick(team._id)}
                    sx={{ textTransform: 'none', borderColor: '#0078D4', color: '#0078D4', fontWeight: 500 }}
                  >
                    VIEW
                  </Button>
                </StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RiskChampions;
