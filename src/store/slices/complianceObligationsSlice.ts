import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { Obligation } from '../../types/compliance';
import moment from 'moment';

interface ComplianceObligationsState {
    obligations: Obligation[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    quarterlyBadge: number;
    reviewBadge: number;
}

const initialState: ComplianceObligationsState = {
    obligations: [],
    status: 'idle',
    error: null,
    quarterlyBadge: 0,
    reviewBadge: 0
};

export const fetchComplianceObligations = createAsyncThunk(
    'complianceObligations/fetchAll',
    async () => {
        const response = await api.get('/compliance-obligations');
        return response.data.data;
    }
);

export const submitQuarterlyUpdates = createAsyncThunk(
    'complianceObligations/submitQuarterlyUpdates',
    async ({ obligationIds, year, quarter, status }: { 
        obligationIds: string[], 
        year: string, 
        quarter: string, 
        status: string 
    }) => {
        const response = await api.post('/compliance-obligations/submit-quarterly-updates', {
            obligationIds,
            year,
            quarter,
            status
        });
        return response.data;
    }
);

// Memoized selector to get current quarter and year from compliance settings
export const getCurrentQuarterYear = createSelector(
  [(state: any) => state.complianceSettings?.settings],
  (settings) => {
    const today = moment().startOf('day');
    // Sort settings by year descending
    const sortedSettings = [...(settings || [])].sort((a, b) => b.year - a.year);
    let foundQuarter = null;
    let foundYear = null;
    for (const setting of sortedSettings) {
      for (const quarter of setting.quarters) {
        const quarterStart = moment(quarter.start).startOf('day');
        const quarterEnd = moment(quarter.end).startOf('day');
        if (today.isBetween(quarterStart, quarterEnd, null, '[]')) {
          foundQuarter = quarter.quarter;
          foundYear = setting.year;
          break;
        }
      }
      if (foundQuarter) break;
    }
    return { year: foundYear, quarter: foundQuarter };
  }
);

const complianceObligationsSlice = createSlice({
    name: 'complianceObligations',
    initialState,
    reducers: {
        updateBadgeCounts(state, action: PayloadAction<{ quarterlyBadge: number; reviewBadge: number }>) {
            state.quarterlyBadge = action.payload.quarterlyBadge;
            state.reviewBadge = action.payload.reviewBadge;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchComplianceObligations.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchComplianceObligations.fulfilled, (state, action: PayloadAction<Obligation[]>) => {
                state.status = 'succeeded';
                state.obligations = action.payload;
            })
            .addCase(fetchComplianceObligations.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch obligations';
            })
            .addCase(submitQuarterlyUpdates.fulfilled, (state) => {
                // After successful submission, we'll refetch the obligations
                state.status = 'idle';
            });
    }
});

export const { updateBadgeCounts } = complianceObligationsSlice.actions;

export default complianceObligationsSlice.reducer; 