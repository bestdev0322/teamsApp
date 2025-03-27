import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  styled,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Contracting from '../pages/admin/Contracting';
import Assessments from '../pages/admin/Assessments';
import Teams from '../pages/admin/Teams';

// Custom styled components for the tabs
const StyledTabs = styled(Tabs)({
  minHeight: '40px',
  '& .MuiTabs-flexContainer': {
    gap: '12px', // Consistent spacing between tabs
  },
  '& .MuiTabs-indicator': {
    display: 'none',
  },
});

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: '40px',
  padding: '8px 20px', // Slightly more horizontal padding
  borderRadius: '20px',
  textTransform: 'none',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease-in-out',
  border: '1px solid transparent',
  
  '&.Mui-selected': {
    color: '#fff',
    backgroundColor: '#0078D4',
    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.1)',
  },
  
  '&:not(.Mui-selected)': {
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #E5E7EB',
    '&:hover': {
      backgroundColor: '#F9FAFB',
      borderColor: '#D1D5DB',
      color: '#111827',
    },
  },
  
  '&:active': {
    transform: 'scale(0.98)',
  },
}));

interface ContentProps {
  title: string;
  tabs: string[];
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Content: React.FC<ContentProps> = ({
  title,
  tabs,
  icon,
  children
}) => {
  const [selectedTab, setSelectedTab] = useState<string>(tabs[0]);
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

  // Function to render content based on selected tab
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Performance Contracting Periods':
        return <Contracting />;
      case 'Performance Assessments Periods':
        return <Assessments />;
      case 'Teams':
        return <Teams />;
      default:
        return null;
    }
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        height: '100vh',
        overflow: 'auto',
        backgroundColor: '#f5f5f5',
        padding: '20px',
      }}
    >
      <Container maxWidth="xl">
        {/* Header with title */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
        </Box>

        {/* Tabs and New button section */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StyledTabs
              value={selectedTab}
              onChange={handleTabChange}
              sx={{
                backgroundColor: 'transparent',
              }}
            >
              {tabs.map((tab, index) => (
                <StyledTab 
                  key={index} 
                  label={tab} 
                  value={tab}
                  disableRipple // Removes the ripple effect for cleaner interaction
                />
              ))}
            </StyledTabs>
          </Box>
        </Box>

        {/* Conditional content rendering */}
        {renderTabContent()}
      </Container>
    </Box>
  );
};

export default Content; 