import React, { useState } from 'react';
import { Box } from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import CurrentReview from './tabs/CurrentReview';
import ApprovedReview from './tabs/ApprovedReivew';

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
            id={`reviews-tabpanel-${index}`}
            aria-labelledby={`reviews-tab-${index}`}
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

const ComplianceReviews: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={tabValue} onChange={handleTabChange} aria-label="compliance review tabs">
                    <StyledTab label="Review Compliance Obligations" />
                    <StyledTab label="Approve Compliance Obligations" />
                </StyledTabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <CurrentReview />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <ApprovedReview />
            </TabPanel>
        </Box>
    );
};

export default ComplianceReviews;
