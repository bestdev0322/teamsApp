import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CreateTeamPayload, Team } from '@/types/teams';
import { api } from '../../services/api';

// Enhanced interface to include members and loading states
interface TeamsState {
  teams: Team[];
  teamMembers: { [teamId: string]: any[] };
  loading: boolean;
  error: string | null;
}

const initialState: TeamsState = {
  teams: [],
  teamMembers: {},
  loading: false,
  error: null
};

// Fetch all teams for a tenant
export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (tenantId: string) => {
    try {
      const response = await api.get(`/teams/${tenantId}`);
      if (response.status === 200) {
        return response.data.data as Team[];
      } else {
        return [];
      }
    } catch (error) {
      console.log('error', error);
      return [];
    }
  }
);

// Fetch all team members for all teams in a tenant
export const fetchAllTeamMembers = createAsyncThunk(
  'teams/fetchAllTeamMembers',
  async (tenantId: string) => {
    try {
      const response = await api.get(`/users/tenant/${tenantId}`);
      if (response.status === 200) {
        const allUsers = response.data.data || [];
        
        // Group users by teamId
        const teamMembersMap: { [teamId: string]: any[] } = {};
        
        allUsers.forEach((user: any) => {
          if (user.teamId) {
            if (!teamMembersMap[user.teamId]) {
              teamMembersMap[user.teamId] = [];
            }
            teamMembersMap[user.teamId].push(user);
          }
        });
        
        return teamMembersMap;
      } else {
        return {};
      }
    } catch (error) {
      console.error('Error fetching all team members:', error);
      return {};
    }
  }
);

// Fetch members for a specific team
export const fetchTeamMembers = createAsyncThunk(
  'teams/fetchTeamMembers',
  async (teamId: string) => {
    try {
      const response = await api.get(`/users/team/${teamId}`);
      if (response.status === 200) {
        return { 
          teamId,
          members: response.data.data || []
        };
      } else {
        return { teamId, members: [] };
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      return { teamId, members: [] };
    }
  }
);

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async ({tenantId, teamName}: CreateTeamPayload) => {
    const response = await api.post('/teams', { tenantId, name: teamName });
    return response.data.data as Team;
  }
);

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (teamId: string) => {
    const response = await api.delete(`/teams/${teamId}`);
    return response.data.data as string;
    // await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
    // return teamId;
  }
);

// Add these new action creators for team owner operations
export const fetchTeamOwner = createAsyncThunk(
  'teams/fetchTeamOwner',
  async (teamId: string) => {
    try {
      const response = await api.get(`/teams/${teamId}/owner`);
      if (response.status === 200) {
        return { 
          teamId,
          owner: response.data.data 
        };
      } else {
        return { teamId, owner: null };
      }
    } catch (error) {
      console.error('Error fetching team owner:', error);
      return { teamId, owner: null };
    }
  }
);

export const setTeamOwner = createAsyncThunk(
  'teams/setTeamOwner',
  async ({ teamId, userId }: { teamId: string, userId: string | null }) => {
    try {
      const response = await api.put(`/teams/${teamId}/owner${userId ? `/${userId}` : ''}`);
      if (response.status === 200) {
        // After setting the owner, fetch their details
        if (userId) {
          const ownerResponse = await api.get(`/teams/${teamId}/owner`);
          if (ownerResponse.status === 200) {
            return { 
              teamId, 
              owner: ownerResponse.data.data 
            };
          }
        }
      }
      return { teamId, owner: null };
    } catch (error) {
      console.error('Error setting team owner:', error);
      return { teamId, owner: null };
    }
  }
);

// Add these new action creators for team member operations
export const addTeamMembers = createAsyncThunk(
  'teams/addTeamMembers',
  async ({ teamId, userIds }: { teamId: string, userIds: string[] }) => {
    try {
      await api.post(`/teams/${teamId}/members`, { userIds });
      // After adding members, fetch the updated team members
      const response = await api.get(`/users/team/${teamId}`);
      return {
        teamId,
        members: response.data.data || []
      };
    } catch (error) {
      console.error('Error adding team members:', error);
      throw error;
    }
  }
);

export const removeTeamMember = createAsyncThunk(
  'teams/removeTeamMember',
  async ({ teamId, memberId }: { teamId: string, memberId: string }) => {
    try {
      await api.delete(`/teams/${teamId}/members/${memberId}`);
      return { teamId, memberId };
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }
);

// Add a champion to a team
export const addComplianceChampion = createAsyncThunk(
  'teams/addComplianceChampion',
  async ({ teamId, email }: { teamId: string, email: string }) => {
    await api.post(`/compliance-champions/tenant`, {teamId, email });
    // Refresh team members
    const response = await api.get(`/users/team/${teamId}`);
    return { teamId, members: response.data.data || [] };
  }
);

// Remove a champion from a team
export const removeComplianceChampion = createAsyncThunk(
  'teams/removeComplianceChampion',
  async ({ teamId, email }: { teamId: string, email: string }) => {
    await api.delete(`/compliance-champions/tenant/by-email/${email}`);
    // Refresh team members
    const response = await api.get(`/users/team/${teamId}`);
    return { teamId, members: response.data.data || [] };
  }
);

// Add a champion to a team
export const addRiskChampion = createAsyncThunk(
  'teams/addRiskChampion',
  async ({ teamId, email }: { teamId: string, email: string }) => {
    await api.post(`/risk-champions/tenant`, {teamId, email });
    // Refresh team members
    const response = await api.get(`/users/team/${teamId}`);
    return { teamId, members: response.data.data || [] };
  }
);

// Remove a champion from a team
export const removeRiskChampion = createAsyncThunk(
  'teams/removeRiskChampion',
  async ({ teamId, email }: { teamId: string, email: string }) => {
    await api.delete(`/risk-champions/tenant/by-email/${email}`);
    // Refresh team members
    const response = await api.get(`/users/team/${teamId}`);
    return { teamId, members: response.data.data || [] };
  }
);

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Fetch teams cases
    builder.addCase(fetchTeams.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTeams.fulfilled, (state, action) => {
      state.teams = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchTeams.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch teams';
    });
    
    // Fetch all team members cases
    builder.addCase(fetchAllTeamMembers.fulfilled, (state, action) => {
      state.teamMembers = action.payload;
    });
    
    // Fetch specific team members cases
    builder.addCase(fetchTeamMembers.fulfilled, (state, action) => {
      const { teamId, members } = action.payload;
      state.teamMembers[teamId] = members;
    });
    
    // Create team cases
    builder.addCase(createTeam.fulfilled, (state, action) => {
      state.teams.push(action.payload);
    });
    
    // Delete team cases
    builder.addCase(deleteTeam.fulfilled, (state, action) => {
      state.teams = state.teams.filter(team => team._id !== action.payload);
      // Clean up members for the deleted team
      if (state.teamMembers[action.payload]) {
        delete state.teamMembers[action.payload];
      }
    });
    
    // Add team owner cases
    builder.addCase(fetchTeamOwner.fulfilled, (state, action) => {
      const { teamId, owner } = action.payload;
      // Find the team and update its owner
      const team = state.teams.find(t => t._id === teamId);
      if (team) {
        team.owner = owner;
      }
    });
    
    // Add team members cases
    builder.addCase(addTeamMembers.fulfilled, (state, action) => {
      const { teamId, members } = action.payload;
      state.teamMembers[teamId] = members;
      
      // Update the team owner if it was cleared during member addition
      const team = state.teams.find(t => t._id === teamId);
      if (team) {
        const member = members.find(m => m.MicrosoftId === team.owner?.MicrosoftId);
        if (!member) {
          team.owner = null;
        }
      }
    });

    // Remove team member cases
    builder.addCase(removeTeamMember.fulfilled, (state, action) => {
      const { teamId, memberId } = action.payload;
      if (state.teamMembers[teamId]) {
        state.teamMembers[teamId] = state.teamMembers[teamId].filter(
          member => member.MicrosoftId !== memberId
        );
      }
      
      // If the removed member was the owner, update the team's owner field
      const team = state.teams.find(t => t._id === teamId);
      if (team && team.owner?.MicrosoftId === memberId) {
        team.owner = null;
      }
    });

    // Set team owner cases
    builder.addCase(setTeamOwner.fulfilled, (state, action) => {
      const { teamId, owner } = action.payload;
      // Find the team and update its owner
      const team = state.teams.find(t => t._id === teamId);
      if (team) {
        team.owner = owner;
      }
    });
  },
});

export default teamsSlice.reducer;