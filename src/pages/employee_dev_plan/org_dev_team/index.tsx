import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import PeoplePickerModal, { Person } from '../../../components/PeoplePickerModal';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';

interface OrgDevTeamMember {
  MicrosoftId: string;
  displayName: string;
  email: string;
  jobTitle: string;
}

const OrganizationalDevelopmentTeam: React.FC = () => {
  const { user, setUser } = useAuth();
  const [members, setMembers] = useState<OrgDevTeamMember[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has super user privileges
  const isSuperUser = user?.role === 'SuperUser';
  const isAppOwner = user?.role === 'AppOwner';

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/org-dev-plan/get-all-members/${user?.tenantId}`);
      // Map the response data to match the OrgDevTeamMember interface
      const mappedMembers = response.data.data.map((member: any) => ({
        MicrosoftId: member.MicrosoftId,
        displayName: member.name,
        email: member.email,
        jobTitle: member.jobTitle
      }));
      setMembers(mappedMembers);
      setError(null);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (user?.tenantId) {
      fetchMembers();
    }
  }, [user?.tenantId, fetchMembers]);

  const handleAddMemberClick = () => {
    setIsPickerOpen(true);
  };

  const handlePeopleSelected = async (selectedPeople: Person[]) => {
    try {
      const userIds = selectedPeople.map(person => person.MicrosoftId);
      await api.post('/users/org-dev-plan/add-member', { userIds });
      await fetchMembers();
      
      // Update auth context if current user was added
      if (user && userIds.includes(user.id)) {
        setUser({ ...user, isDevMember: true });
      }
      
      setIsPickerOpen(false);
    } catch (error) {
      console.error('Error adding team members:', error);
      setError('Failed to add team members');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/users/org-dev-plan/remove-member/${memberId}`);
      await fetchMembers();
      
      // Update auth context if current user was removed
      if (user && memberId === user.id) {
        setUser({ ...user, isDevMember: false });
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      setError('Failed to remove team member');
    }
  };

  if (loading) {
    return <Box>Loading team members...</Box>;
  }

  if (error) {
    return <Box color="error.main">{error}</Box>;
  }

  return (
    <Box>
      {/* Action Buttons Section */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        {(isSuperUser || isAppOwner) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddMemberClick}
            sx={{
              textTransform: 'none',
              backgroundColor: '#0078D4',
              '&:hover': {
                backgroundColor: '#106EBE',
              }
            }}
          >
            Add Member
          </Button>
        )}
      </Box>

      {/* Members Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <StyledHeaderCell>Name</StyledHeaderCell>
              <StyledHeaderCell>Job Title</StyledHeaderCell>
              <StyledHeaderCell>Email</StyledHeaderCell>
              {(isSuperUser || isAppOwner) && <StyledHeaderCell align="center">Actions</StyledHeaderCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.MicrosoftId} hover>
                <StyledTableCell>{member.displayName}</StyledTableCell>
                <StyledTableCell>{member.jobTitle}</StyledTableCell>
                <StyledTableCell>{member.email}</StyledTableCell>
                {(isSuperUser || isAppOwner) && (
                  <StyledTableCell align="center">
                    <Tooltip title="Remove member">
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveMember(member.MicrosoftId)}
                        size="small"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </StyledTableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* People Picker Modal */}
      {(isSuperUser || isAppOwner) && (
        <PeoplePickerModal
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelectPeople={handlePeopleSelected}
          title="Select Team Members"
          multiSelect={true}
          tenantId={user?.tenantId || ''}
          currentTeamMembers={members}
        />
      )}
    </Box>
  );
};

export default OrganizationalDevelopmentTeam;
