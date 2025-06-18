import React, { useEffect, useState } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody } from '@mui/material';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import ChampionMembers from './ChampionMembers';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { RootState } from '../../../store';
import { fetchTeams, fetchTeamMembers, removeComplianceChampion, addComplianceChampion } from '../../../store/slices/teamsSlice';
import { useAuth } from '../../../contexts/AuthContext';
import PeoplePickerModal from '../../../components/PeoplePickerModal';


const Champions: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { teams, teamMembers, loading } = useAppSelector((state: RootState) => state.teams);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchTeams(tenantId));
  }, [dispatch, tenantId]);

  // Set champions state when teams are fetched
  useEffect(() => {
    if (teams && Array.isArray(teams)) {
      setTeamsList(teams.map(team => ({
        _id: team._id,
        name: team.name
      })));
      // Fetch members for each team
      teams.forEach(team => {
        dispatch(fetchTeamMembers(team._id));
      });
    }
  }, [teams, dispatch, tenantId]);

  useEffect(() => {
    if (teamMembers && typeof teamMembers === 'object') {
      setTeamsList(teamsList.map(team => ({
        ...team,
        members: (teamMembers[team._id] || []).filter((member: any) => member?.isComplianceChampion === true)
      })));
    }
  }, [teamMembers]);

  useEffect(() => {
  }, [teamsList]);

  const handleViewClick = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const handleBack = () => {
    setSelectedTeamId(null);
  };

  // Open PeoplePicker modal
  const handleAddChampion = () => {
    setIsPickerOpen(true);
  };

  // Remove champion
  const handleRemoveMember = async (email: string) => {
    if (!selectedTeamId) return;
    await dispatch(removeComplianceChampion({ teamId: selectedTeamId, email }));
    await dispatch(fetchTeamMembers(selectedTeamId));
  };

  // Handle selection from PeoplePicker
  const handlePeopleSelected = async (selectedPeople: any[]) => {
    if (!selectedTeamId) return;
    for (const person of selectedPeople) {
      await dispatch(addComplianceChampion({ teamId: selectedTeamId, email: person.email }));
    }
    await dispatch(fetchTeamMembers(selectedTeamId));
    setIsPickerOpen(false);
  };

  const selectedTeam = teamsList.find(c => c._id === selectedTeamId);

  // Eligible members: not already champions
  const eligibleMembers = selectedTeam
    ? (teamMembers[selectedTeam._id] || []).filter((m: any) => !m.isComplianceChampion).map(member => ({...member, displayName: member.name}))
    : [];

  if (selectedTeamId && selectedTeam) {
    return (
      <>
        <ChampionMembers
          champion={selectedTeam}
          onBack={handleBack}
          onAddChampion={handleAddChampion}
          onRemoveMember={handleRemoveMember}
        />
        <PeoplePickerModal
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelectPeople={handlePeopleSelected}
          title="Select Compliance Champions"
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

export default Champions;
