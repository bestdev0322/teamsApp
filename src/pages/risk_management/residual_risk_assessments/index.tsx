import React, { useState } from 'react';
import { Box } from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import ResidualAssessment from './residual_assessment';
import ResidualAssessmentCyclePage from './residual_cycle';

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
            id={`residual-risk-assessment-tabpanel-${index}`}
            aria-labelledby={`residual-risk-assessment-tab-${index}`}
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

const ResidualRiskAssessment: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={currentTab} onChange={handleTabChange} aria-label="risk treatment tabs">
                    <StyledTab label="Residual Risk Assessment" />
                    <StyledTab label="Residual Risk Assessment Cycle" />
                </StyledTabs>
            </Box>

            <TabPanel value={currentTab} index={0}>
                <ResidualAssessment />
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
                <ResidualAssessmentCyclePage />
            </TabPanel>

        </Box>
    );
};

export default ResidualRiskAssessment;
