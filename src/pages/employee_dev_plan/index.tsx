import React from 'react';
import { Box } from '@mui/material';
import { PageProps } from '../../types';
import OrganizationalDevelopmentTeam from './org_dev_team';
import TrainingCoursesManagement from './training_course_management';
import EnableEmployeesDevelopment from './enable_employee_dev';
import AnnualOrganizationDevelopmentPlans from './annual_org_dev_plan';
import EmployeesTraining from './employee_training';
import MyTrainingDashboard from './my_training_dashboard';
import { Routes, Route, Navigate } from 'react-router-dom';

const EmployeeDevPlan: React.FC<PageProps> = ({ title, icon, tabs }) => {

  return (
    <Box>
      <Routes>
        <Route path="/*" element={<Navigate to="my-training-dashboard" replace />} />
        <Route path="my-training-dashboard" element={<MyTrainingDashboard />} />
        <Route path="employees-training" element={<EmployeesTraining />} />
        <Route path="enable-employees-development" element={<EnableEmployeesDevelopment />} />
        <Route path="annual-organization-development-plans" element={<AnnualOrganizationDevelopmentPlans />} />
        <Route path="training-&-courses-management" element={<TrainingCoursesManagement />} />
        <Route path="organization-development-team" element={<OrganizationalDevelopmentTeam />} />
      </Routes>
    </Box>
  );
};

export default EmployeeDevPlan; 
