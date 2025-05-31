import { configureStore } from '@reduxjs/toolkit';
import scorecardReducer from './slices/scorecardSlice';
import teamsReducer from './slices/teamsSlice';
import personalPerformanceReducer from './slices/personalPerformanceSlice';
import notificationReducer from './slices/notificationSlice';
import devPlanReducer from './slices/devPlanSlice';
import trainingEmployeesReducer from './slices/trainingEmployeesSlice';
import feedbackReducer from './slices/feedbackSlice';
import complianceObligationsReducer from './slices/complianceObligationsSlice';
import complianceSettingsReducer from './slices/complianceSettingsSlice';

export const store = configureStore({
  reducer: {
    scorecard: scorecardReducer,
    teams: teamsReducer,
    personalPerformance: personalPerformanceReducer,
    notification: notificationReducer,
    devPlan: devPlanReducer,
    trainingEmployees: trainingEmployeesReducer,
    feedback: feedbackReducer,
    complianceObligations: complianceObligationsReducer,
    complianceSettings: complianceSettingsReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 