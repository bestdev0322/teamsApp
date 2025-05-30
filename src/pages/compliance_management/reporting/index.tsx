import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import Dashboard from './dashboard';
import Reports from './reports';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quarterly-update-tabpanel-${index}`}
      aria-labelledby={`quarterly-update-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ComplianceReporting: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Box sx={{ mt: 2 }}>
             <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={tabValue} onChange={handleTabChange} aria-label="reports tabs">
                    <StyledTab label="Organization Compliance Dashboard" />
                    <StyledTab label="Reports" />
                </StyledTabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                 <Dashboard />
            </TabPanel>

             <TabPanel value={tabValue} index={1}>
                <Reports />
            </TabPanel>
        </Box>
    );
};

export default ComplianceReporting;
