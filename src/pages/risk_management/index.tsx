import React from 'react';
import { Box } from '@mui/material';
import { PageProps } from '../../types';
import Settings from './settings';
import RiskIdentification from './risk_identification';
import RiskAssessment from './risk_assessment';
import RiskTreatmentAdmin from './risk_treatment_admin';
import MyRiskTreatment from './my_risk_treatment';
import ResidualRiskAssessment from './residual_risk_assessments';
import { Routes, Route, Navigate } from 'react-router-dom';

const RiskManagement: React.FC<PageProps> = ({ title, icon, tabs }) => {
  return (
    <Box>
      <Routes>
        <Route path="/*" element={<Navigate to="residual-risk-assessment" replace />} />
        <Route path="risk-settings/*" element={<Settings />} />
        <Route path="risk-identification/*" element={<RiskIdentification />} />
        <Route path="risk-assessment/*" element={<RiskAssessment />} />
        <Route path="risk-treatment-admin/*" element={<RiskTreatmentAdmin />} />
        <Route path="my-risk-treatments/*" element={<MyRiskTreatment />} />
        <Route path="residual-risk-assessment/*" element={<ResidualRiskAssessment />} />
      </Routes>
    </Box>
  );
};

export default RiskManagement; 
