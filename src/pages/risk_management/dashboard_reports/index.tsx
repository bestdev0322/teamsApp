import React, { useState } from 'react';
import { Box } from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import Dashboard from './tabs/dashboard';
import Reports from './tabs/reports';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

// TabPanel component
const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`dashboard-reports-tabpanel-${index}`}
            aria-labelledby={`dashboard-reports-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 0 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

const DashboardReports: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={currentTab} onChange={handleTabChange} aria-label="risk treatment tabs">
                    <StyledTab label="Dashboard" />
                    <StyledTab label="Reports" />
                </StyledTabs>
            </Box>

            <TabPanel value={currentTab} index={0}>
                <Dashboard />
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
                <Reports />
            </TabPanel>

        </Box>
    );
};

export default DashboardReports;
