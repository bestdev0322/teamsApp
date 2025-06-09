import React from 'react';
import { Box } from '@mui/material';
import { PageProps } from '../../types';
import Settings from './settings';
import RiskIdentification from './risk_identification';
import RiskAssessment from './risk_assessment';
import { Routes, Route, Navigate } from 'react-router-dom';

const RiskManagement: React.FC<PageProps> = ({ title, icon, tabs }) => {
  return (
    <Box>
      <Routes>
        <Route path="/*" element={<Navigate to="risk-assessment" replace />} />
        <Route path="risk-settings/*" element={<Settings />} />
        <Route path="risk-identification/*" element={<RiskIdentification />} />
        <Route path="risk-assessment/*" element={<RiskAssessment />} />
      </Routes>
    </Box>
  );
};

export default RiskManagement; 
