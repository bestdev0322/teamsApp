import React from 'react';
import { Box } from '@mui/material';
import { PageProps } from '../../types';
import Settings from './settings';
import RiskIdentification from './risk_identification';
import RiskAssessment from './risk_assessment';
import RiskTreatmentAdmin from './risk_treatment_admin';
import MyRiskTreatment from './my_risk_treatment';
import ResidualRiskAssessment from './residual_risk_assessments';
import DashboardReports from './dashboard_reports';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RiskManagement: React.FC<PageProps> = ({ title, icon, tabs }) => {
  const { user } = useAuth();
  const isRiskSuperUser = user?.isRiskSuperUser;
  const isRiskChampion = user?.isRiskChampion;

  return (
    <Box>
      <Routes>
        <Route path="/*" element={isRiskSuperUser ? <Navigate to="dashboard-&-reports" replace /> : <Navigate to="my-risk-treatments" replace />} />
        {isRiskSuperUser && <Route path="risk-settings/*" element={<Settings />} />}
        {isRiskSuperUser && <Route path="risk-identification/*" element={<RiskIdentification />} />}
        {isRiskSuperUser && <Route path="risk-assessment/*" element={<RiskAssessment />} />}
        {isRiskSuperUser && <Route path="risk-treatment-admin/*" element={<RiskTreatmentAdmin />} />}
        {isRiskSuperUser && <Route path="residual-risk-assessment/*" element={<ResidualRiskAssessment />} />}
        {isRiskSuperUser && <Route path="dashboard-&-reports/*" element={<DashboardReports />} />}
        <Route path="my-risk-treatments/*" element={<MyRiskTreatment />} />
      </Routes>
    </Box>
  );
};

export default RiskManagement; 
