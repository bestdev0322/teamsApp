import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface ComplianceSetting {
  id: string;
  year: number;
  firstMonth: string;
  quarters: { quarter: string; start: string; end: string }[];
}

interface ComplianceSettingsState {
  settings: ComplianceSetting[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ComplianceSettingsState = {
  settings: [],
  status: 'idle',
  error: null,
};

export const fetchComplianceSettings = createAsyncThunk(
  'complianceSettings/fetchAll',
  async () => {
    const response = await api.get('/compliance-settings');
    return response.data.data;
  }
);

const complianceSettingsSlice = createSlice({
  name: 'complianceSettings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplianceSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchComplianceSettings.fulfilled, (state, action: PayloadAction<ComplianceSetting[]>) => {
        state.status = 'succeeded';
        state.settings = action.payload;
      })
      .addCase(fetchComplianceSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch compliance settings';
      });
  },
});

export default complianceSettingsSlice.reducer; 