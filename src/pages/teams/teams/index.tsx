import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, TableContainer, Table, TableHead, TableRow, TableBody, TextField, IconButton, Tooltip, Chip, ClickAwayListener, useTheme, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { createTeam, deleteTeam, fetchTeams, fetchAllTeamMembers, fetchTeamOwner, setTeamOwner, addTeamMembers, removeTeamMember } from '../../../store/slices/teamsSlice';
import { RootState } from '../../../store';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { api } from '../../../services/api';
import PeoplePickerModal, { Person } from '../../../components/PeoplePickerModal';
import { useAuth } from '../../../contexts/AuthContext';
import { StyledHeaderCell, StyledTableCell, ViewButton } from '../../../components/StyledTableComponents';

enum ViewStatus {
  TEAM_LIST = 'TEAM_LIST',
  TEAM_ADDING = 'TEAM_ADDING',
  MEMBER_LIST = 'MEMBER_LIST',
  MEMBER_ADDING = 'MEMBER_ADDING',
}

const Teams: React.FC = () => {
  const dispatch = useAppDispatch();
  const { teams, teamMembers, loading } = useAppSelector((state: RootState) => state.teams);
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [status, setStatus] = useState<ViewStatus>(ViewStatus.TEAM_LIST);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  
  // Check if user has admin/super user privileges
  const canManageTeams = user?.role === 'AppOwner' || user?.role === 'SuperUser';
  
  // Get the members for the currently selected team
  const currentTeamMembers = selectedTeamId ? (teamMembers[selectedTeamId] || []) : [];
  
  // Get the current team object
  const currentTeam = teams.find(team => team._id === selectedTeamId);

  // Get all team members across all teams
  const allTeamMembers = React.useMemo(() => {
    return Object.values(teamMembers).flat();
  }, [teamMembers]);

  const handleViewClick = (teamId: string) => {
    setStatus(ViewStatus.MEMBER_LIST);
    setSelectedTeamId(teamId);
    // Fetch the team owner when viewing team members
    dispatch(fetchTeamOwner(teamId));
  };

  const handleBackClick = () => {
    setStatus(ViewStatus.TEAM_LIST);
  };

  const handleAddTeamClick = () => {
    setStatus(ViewStatus.TEAM_ADDING);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddMemberClick = () => {
    setIsPickerOpen(true);
  };

  const handlePeopleSelected = async (selectedPeople: Person[]) => {
    try {
      const userIds = selectedPeople.map(person => person.MicrosoftId);
      await dispatch(addTeamMembers({ teamId: selectedTeamId, userIds })).unwrap();
      setIsPickerOpen(false);
    } catch (error) {
      console.error('Error adding team members:', error);
    }
  };

  const handleNewTeamNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTeamName(event.target.value);
  };

  const handleAddNewTeam = () => {
    if (newTeamName.trim()) {
      dispatch(createTeam({
        tenantId: tenantId,
        teamName: newTeamName
      }))
        .then(() => {
          // Refresh the teams list after creation
          dispatch(fetchTeams(tenantId));
          setNewTeamName('');
          setStatus(ViewStatus.TEAM_LIST);
        })
        .catch((error) => {
          console.error('Error creating team:', error);
        });
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddNewTeam();
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    dispatch(deleteTeam(teamId))
      .then(() => {
        // Refresh the teams list after deletion
        dispatch(fetchTeams(tenantId));
      })
      .catch((error) => {
        console.error('Error deleting team:', error);
      });
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await dispatch(removeTeamMember({ teamId: selectedTeamId, memberId })).unwrap();
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  // Handle setting a user as team owner
  const handleSetTeamOwner = async (memberId: string | null) => {
    try {
      await dispatch(setTeamOwner({ teamId: selectedTeamId, userId: memberId }));
      // Refresh the team data after setting owner
      dispatch(fetchTeamOwner(selectedTeamId));
    } catch (error) {
      console.error('Error setting team owner:', error);
    }
  };

  // Check if a member is the team owner
  const isTeamOwner = (memberId: string) => {
    return currentTeam?.owner?.MicrosoftId === memberId;
  };

  const handleCancelAddTeam = () => {
    setStatus(ViewStatus.TEAM_LIST);
    setNewTeamName('');
  };

  // Add function to handle team name update
  const handleUpdateTeam = async (teamId: string, newName: string) => {
    try {
      await api.put(`/teams/${teamId}`, { name: newName });
      dispatch(fetchTeams(tenantId));
      setEditingTeamId(null);
      setEditingTeamName('');
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  // Add function to handle edit mode
  const handleEditClick = (team: { _id: string; name: string }) => {
    setEditingTeamId(team._id);
    setEditingTeamName(team.name);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  // Add function to handle edit cancel
  const handleEditCancel = () => {
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  // Add function to handle edit save
  const handleEditSave = (teamId: string) => {
    if (editingTeamName.trim()) {
      handleUpdateTeam(teamId, editingTeamName.trim());
    }
  };

  // Add keyboard event handler for editing
  const handleEditKeyPress = (event: React.KeyboardEvent, teamId: string) => {
    if (event.key === 'Enter') {
      handleEditSave(teamId);
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  // Filtered members for search
  const filteredTeamMembers = status === ViewStatus.MEMBER_LIST
    ? currentTeamMembers.filter(member =>
        member.name?.toLowerCase().includes(search.toLowerCase()) ||
        member.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
        member.role?.toLowerCase().includes(search.toLowerCase()) ||
        member.email?.toLowerCase().includes(search.toLowerCase())
      )
    : currentTeamMembers;

  // Fetch teams and all team members when component mounts or tenantId changes
  useEffect(() => {
    dispatch(fetchTeams(tenantId));
    dispatch(fetchAllTeamMembers(tenantId));
  }, [dispatch, tenantId]);

  if (loading) {
    return <Box>Loading teams...</Box>;
  }

  return (
    <Box>
      {/* Action Buttons Section - Made responsive */}
      <Box sx={{ 
        mb: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        '& .MuiButton-root': {
          width: { xs: '100%', sm: 'auto' }
        }
      }}>
        {(status !== ViewStatus.TEAM_LIST && status !== ViewStatus.TEAM_ADDING) && (
          <Box sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            width: '100%'
          }}>
            {status === ViewStatus.MEMBER_LIST && canManageTeams && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsPickerOpen(true)}
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
            <Button
              variant="outlined"
              onClick={handleBackClick}
              sx={{
                textTransform: 'none',
                borderColor: '#DC2626',
                color: '#DC2626',
                '&:hover': {
                  borderColor: '#B91C1C',
                  backgroundColor: 'rgba(220, 38, 38, 0.04)',
                }
              }}
            >
              Back
            </Button>
          </Box>
        )}

        {status === ViewStatus.TEAM_LIST && canManageTeams && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setStatus(ViewStatus.TEAM_ADDING)}
            sx={{
              textTransform: 'none',
              backgroundColor: '#0078D4',
              '&:hover': {
                backgroundColor: '#106EBE',
              }
            }}
          >
            Add Team
          </Button>
        )}
      </Box>

      {/* Search box for member list */}
      {status === ViewStatus.MEMBER_LIST && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <TextField
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, job role, or email"
            size="small"
            sx={{ width: 320 }}
          />
        </Box>
      )}

      {/* Table Section - Made responsive */}
      <TableContainer 
        component={Paper} 
        variant="outlined" 
        sx={{ 
          borderRadius: 1, 
          border: '1px solid #E5E7EB',
          overflowX: 'auto',
          '& .MuiTable-root': {
            minWidth: {
              xs: status === ViewStatus.MEMBER_LIST ? '800px' : '500px',
              sm: '100%'
            }
          },
          '& .MuiTableCell-root': {
            px: { xs: 1, sm: 2 },
            py: 1.5,
            whiteSpace: 'nowrap'
          },
          '& .MuiTableCell-head': {
            backgroundColor: '#F9FAFB',
          }
        }}
      >
        <Table>
          <TableHead>
            {status === ViewStatus.TEAM_LIST || status === ViewStatus.TEAM_ADDING ? (
              <TableRow>
                <StyledHeaderCell width={isMobile ? "60%" : "70%"}>Name</StyledHeaderCell>
                <StyledHeaderCell width={isMobile ? "40%" : "30%"} align="center">Actions</StyledHeaderCell>
              </TableRow>
            ) : (
              <TableRow>
                <StyledHeaderCell width={isMobile ? "15%" : "15%"}>Name</StyledHeaderCell>
                <StyledHeaderCell width={isMobile ? "25%" : "25%"}>Job Role</StyledHeaderCell>
                <StyledHeaderCell width={isMobile ? "30%" : "30%"}>Email</StyledHeaderCell>
                <StyledHeaderCell width={isMobile ? "15%" : "15%"}>Role</StyledHeaderCell>
                <StyledHeaderCell width={isMobile ? "15%" : "15%"}>Owner</StyledHeaderCell>
                {canManageTeams && <StyledHeaderCell width={isMobile ? "15%" : "15%"} align="center">Actions</StyledHeaderCell>}
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {status === ViewStatus.TEAM_ADDING && canManageTeams && (
              <ClickAwayListener onClickAway={handleCancelAddTeam}>
                <TableRow>
                  <StyledTableCell>
                    <TextField
                      inputRef={inputRef}
                      value={newTeamName}
                      onChange={handleNewTeamNameChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter team name"
                      fullWidth
                      variant="standard"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleCancelAddTeam();
                        }
                      }}
                    />
                  </StyledTableCell>
                  <StyledTableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleAddNewTeam}
                        sx={{
                          fontSize: '0.75rem',
                          padding: '4px 12px',
                          minWidth: 'auto',
                          backgroundColor: '#0078D4',
                          '&:hover': {
                            backgroundColor: '#106EBE',
                          }
                        }}>
                        Add
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleCancelAddTeam}
                        sx={{
                          fontSize: '0.75rem',
                          padding: '4px 12px',
                          minWidth: 'auto',
                        }}>
                        Cancel
                      </Button>
                    </Box>
                  </StyledTableCell>
                </TableRow>
              </ClickAwayListener>
            )}

            {(status === ViewStatus.TEAM_LIST || status === ViewStatus.TEAM_ADDING) && teams.map(team => (
              <TableRow key={team._id} hover>
                <StyledTableCell>
                  {editingTeamId === team._id ? (
                    <ClickAwayListener onClickAway={handleEditCancel}>
                      <TextField
                        inputRef={editInputRef}
                        value={editingTeamName}
                        onChange={(e) => setEditingTeamName(e.target.value)}
                        onKeyDown={(e) => handleEditKeyPress(e, team._id)}
                        fullWidth
                        variant="standard"
                        size="small"
                        autoFocus
                      />
                    </ClickAwayListener>
                  ) : (
                    team.name
                  )}
                </StyledTableCell>
                <StyledTableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    {editingTeamId === team._id ? (
                      <>
                        <Button
                          variant="contained"
                          onClick={() => handleEditSave(team._id)}
                          sx={{
                            fontSize: '0.75rem',
                            padding: '4px 12px',
                            minWidth: 'auto',
                            backgroundColor: '#0078D4',
                            '&:hover': {
                              backgroundColor: '#106EBE',
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleEditCancel}
                          sx={{
                            fontSize: '0.75rem',
                            padding: '4px 12px',
                            minWidth: 'auto',
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          onClick={() => handleViewClick(team._id)}
                          sx={{
                            fontSize: '0.75rem',
                            padding: '4px 8px',
                            minWidth: 'auto',
                          }}
                        >
                          View
                        </Button>
                        {canManageTeams && (
                          <>
                            <Button
                              variant="outlined"
                              onClick={() => handleEditClick(team)}
                              sx={{
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                minWidth: 'auto',
                              }}
                            >
                              Edit
                            </Button>
                            {(!teamMembers[team._id] || teamMembers[team._id].length === 0) && (
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={() => handleDeleteTeam(team._id)}
                                sx={{
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  minWidth: 'auto',
                                }}
                              >
                                Delete
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </Box>
                </StyledTableCell>
              </TableRow>
            ))}

            {status === ViewStatus.MEMBER_LIST && filteredTeamMembers.map((member, index) => (
              <TableRow key={index} hover>
                <StyledTableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {member.name}
                  </Box>
                </StyledTableCell>
                <StyledTableCell>{member.jobTitle}</StyledTableCell>
                <StyledTableCell>{member.email}</StyledTableCell>
                <StyledTableCell>{member.role}</StyledTableCell>
                <StyledTableCell>
                  {currentTeam?.owner?.MicrosoftId === member.MicrosoftId ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label="Owner"
                        size="small"
                        color="primary"
                        sx={{ 
                          height: '20px',
                          fontSize: '0.75rem',
                          alignSelf: 'center'
                        }}
                      />
                      {canManageTeams && (
                        <Tooltip title="Remove Owner Status">
                          <IconButton
                            color="error"
                            onClick={() => handleSetTeamOwner(null)}
                            size="small"
                          >
                            <AdminPanelSettingsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ) : (
                    canManageTeams && (
                      <Tooltip title="Set as Team Owner">
                        <IconButton
                          color="primary"
                          onClick={() => handleSetTeamOwner(member.MicrosoftId)}
                          size="small"
                        >
                          <AdminPanelSettingsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )
                  )}
                </StyledTableCell>
                {canManageTeams && (
                  <StyledTableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveMember(member.MicrosoftId)}
                        size="small"
                        title="Remove member"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </StyledTableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Custom People Picker Modal - Only for admin/super users */}
      {canManageTeams && (
        <PeoplePickerModal
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelectPeople={handlePeopleSelected}
          title="Select Team Members"
          multiSelect={true}
          tenantId={tenantId}
          currentTeamMembers={allTeamMembers}
        />
      )}
    </Box>
  );
};

export default Teams;
