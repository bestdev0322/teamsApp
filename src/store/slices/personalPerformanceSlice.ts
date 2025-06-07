import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { AxiosError } from 'axios';
import { PersonalPerformance, TeamPerformance } from '@/types';

interface PersonalPerformanceState {
  personalPerformances: PersonalPerformance[];
  teamPerformances: TeamPerformance[];
  teamPerformancesByTarget: { [targetId: string]: TeamPerformance[] };
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: PersonalPerformanceState = {
  personalPerformances: [],
  teamPerformances: [],
  teamPerformancesByTarget: {},
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchPersonalPerformances = createAsyncThunk(
  'personalPerformance/fetchPersonalPerformances',
  async (payload: { annualTargetId?: string }) => {
    try {
      const response = await api.get(`/personal-performance/personal-performances`, {
        params: payload.annualTargetId ? {
          annualTargetId: payload.annualTargetId,
        } : {}
      });

      if (response.status === 200) {
        return response.data.data as PersonalPerformance[];
      } else {
        return [];
      }
    } catch (error) {
      console.log('error', error);
      return [];
    }
  }
);

export const fetchTeamPerformances = createAsyncThunk(
  'personalPerformance/fetchTeamPerformances',
  async (annualTargetId: string) => {
    try {
      const response = await api.get(`/personal-performance/team-performances`, {
        params: {
          annualTargetId: annualTargetId
        }
      });
      if (response.status === 200) {
        return {
          targetId: annualTargetId,
          performances: response.data.data as TeamPerformance[]
        };
      } else {
        return {
          targetId: annualTargetId,
          performances: []
        };
      }
    } catch (error) {
      console.log('error', error);
      return {
        targetId: annualTargetId,
        performances: []
      };
    }
  }
);

export const clearTeamPerformances = createAsyncThunk(
  'personalPerformance/clearTeamPerformances',
  async () => {
    return true;
  }
);

export const createPersonalPerformance = createAsyncThunk(
  'personalPerformance/createPersonalPerformance',
  async (target: Omit<PersonalPerformance, '_id'>) => {
    try {
      // Replace with your API call
      const response = await api.post('/personal-performance/create-personal-performance', {
        personalPerformance: target,
      });

      if (response.status === 200) {
        return response.data.data as PersonalPerformance;
      } else {

      }
    } catch (error) {
      console.log('error', error);
    }
  }
);

export const updatePersonalPerformance = createAsyncThunk(
  'personalPerformance/updatePersonalPerformance',
  async (target: PersonalPerformance) => {
    try {
      const response = await api.put(`/personal-performance/update-personal-performance/${target._id}`, {
        personalPerformance: target
      });
      if (response.status === 200) {
        return response.data.data as PersonalPerformance;
      } else {
      }
    } catch (error) {
      console.log('error', error);
    }
  }
);

export const deletePersonalPerformance = createAsyncThunk(
  'personalPerformance/deletePersonalPerformance',
  async (targetId: string) => {
    // Replace with your API call
    try {
      const response = await api.delete(`/personal-performance/delete-personal-performance/${targetId}`);
      if (response.status === 200) {
        return targetId;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }
);

const personalPerformanceSlice = createSlice({
  name: 'personalPerformance',
  initialState,
  reducers: {
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonalPerformances.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPersonalPerformances.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.personalPerformances = action.payload;
      })
      .addCase(fetchPersonalPerformances.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch targets';
      })
      .addCase(fetchTeamPerformances.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeamPerformances.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Store performances by target ID
        state.teamPerformancesByTarget[action.payload.targetId] = action.payload.performances;
        
        // Combine all performances from all targets
        const allPerformances = Object.values(state.teamPerformancesByTarget).flat();
        
        // Remove duplicates based on _id
        const uniquePerformances = Array.from(
          new Map(allPerformances.map(item => [item._id, item])).values()
        );
        
        state.teamPerformances = uniquePerformances;
      })
      .addCase(clearTeamPerformances.fulfilled, (state) => {
        state.teamPerformances = [];
        state.teamPerformancesByTarget = {};
      })
      .addCase(createPersonalPerformance.fulfilled, (state, action) => {
        // if (action.payload) {
        //   state.personalPerformance.push(action.payload);
        // }
      })
      .addCase(updatePersonalPerformance.fulfilled, (state, action) => {
        if (action.payload) {
          state.personalPerformances = state.personalPerformances.map(personalPerformance =>
            personalPerformance._id === action.payload?._id ? action.payload : personalPerformance
          ) as PersonalPerformance[];
        }
      })
      .addCase(deletePersonalPerformance.fulfilled, (state, action) => {
        // state.personalPerformance = state.personalPerformance.filter(
        //   target => target._id !== action.payload
        // );
      });
  },
});

export default personalPerformanceSlice.reducer; 