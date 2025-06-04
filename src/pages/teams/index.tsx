import React from 'react';
import Teams from './teams';
import SuperUser from './super_user';
import ComplianceUser from './compliance_user';
import RiskUser from './risk_user';
import { PageProps } from '@/types';
import { Routes, Route, Navigate } from 'react-router-dom';

const TeamsPage: React.FC<PageProps> = ({ title, icon, tabs }) => {
  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/*" element={<Navigate to="teams" replace />} />
        <Route path="teams" element={<Teams />} />
        <Route path="super-user" element={<SuperUser />} />
        <Route path="compliance-user" element={<ComplianceUser />} />
        <Route path="risk-user" element={<RiskUser />} />
      </Routes>
    </div>
  );
};

export default TeamsPage;