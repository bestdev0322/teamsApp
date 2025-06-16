import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import RiskCategories from './risk_categories';
import ImpactSettings from './impact_settings';
import LikelihoodSettings from './likelihood_settings';
import RiskRating from './risk_rating';
import RiskResponse from './risk_responses';
import ControlEffectiveness from './control_effectiveness';
import RiskChampions from './risk_champions';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const RiskSettings: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Box sx={{ mt: 2 }}>
             <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
                    <StyledTab label="Risk Champions" />
                    <StyledTab label="Risk Responses" />
                    <StyledTab label="Control Effectiveness" />
                    <StyledTab label="Risk Rating" />
                    <StyledTab label="Likelihood Settings" />
                    <StyledTab label="Impact Settings" />
                    <StyledTab label="Risk Categories" />
                </StyledTabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
                <RiskChampions />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <RiskResponse />
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
                <ControlEffectiveness />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
                <RiskRating />
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
                <LikelihoodSettings />
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
                <ImpactSettings />
            </TabPanel>

            <TabPanel value={tabValue} index={6}>
                 <RiskCategories />
            </TabPanel>
            
        </Box>
    );
};

export default RiskSettings;
