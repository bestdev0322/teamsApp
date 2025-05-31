import React, { useState, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Sidebar from './Sidebar';
import Content from './Content';
import { PageProps } from '../types';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { getCurrentQuarterYear } from '../store/slices/complianceObligationsSlice';
import { fetchComplianceSettings } from '../store/slices/complianceSettingsSlice';

interface LayoutProps {
  // selectedTabChanger: (tab: string) => void;
  pages: PageProps[];
}

const Layout: React.FC<LayoutProps> = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [activePageTitle, setActivePageTitle] = useState('Dashboard');
  const location = useLocation();
  const [selectedTabItem, setSelectedTabItem] = useState('Dashboard');
  const { user } = useAuth();
  const obligations = useAppSelector((state: any) => state.complianceObligations.obligations);
  const dispatch = useAppDispatch();
  const { year: currentYear, quarter: currentQuarter } = useAppSelector(getCurrentQuarterYear);
  const settingsStatus = useAppSelector((state: any) => state.complianceSettings.status);
  let { quarterlyBadge, reviewBadge } = useAppSelector((state) => state.complianceObligations);



  if (user?.isComplianceChampion && currentYear && currentQuarter) {
    quarterlyBadge = obligations.filter((ob: any) => {
      if (ob.status !== 'Active') return false;
      const update = ob.update?.find((u: any) => u.year === currentYear.toString() && u.quarter === currentQuarter);
      return !update || (update.assessmentStatus !== 'Submitted' && update.assessmentStatus !== 'Approved');
    }).length;
  }
  if (user?.isComplianceSuperUser && currentYear && currentQuarter) {
    reviewBadge = obligations.filter((ob: any) => {
      if (ob.status !== 'Active') return false;
      const update = ob.update?.find((u: any) => u.year === currentYear.toString() && u.quarter === currentQuarter);
      return update && update.assessmentStatus === 'Submitted';
    }).length;
  }
  useEffect(() => {
    setSelectedTabItem(location.pathname.split('/')[2]);
  }, [location]);

  useEffect(() => {
    if (settingsStatus === 'idle') {
      dispatch(fetchComplianceSettings());
    }
  }, [dispatch, settingsStatus]);

  // const pages = React.Children.toArray(props.children) as PageElement[];
  const pages = props.pages as PageProps[];
  const pagePropsList: PageProps[] = pages.map((page) => ({
    title: page.title,
    icon: page.icon || null,
    tabs: page.tabs,
    path: page.path,
    show: page.show,
    element: page.element
  }));

  useEffect(() => {
    // Example: /employee-dev-plan/training-and-courses-management
    const segments = location.pathname.split('/').filter(Boolean);

    // Find the matching page
    const activePage = pagePropsList.find(page =>
      segments.length > 0 && page.path.replace('/*', '').split('/').filter(Boolean)[0] === segments[0]
    );

    setActivePageTitle(activePage ? activePage.title : '');

    // Find the matching tab (if any)
    if (activePage && segments.length > 1) {
      const tabSegment = segments[1];
      const activeTab = activePage.tabs.find(tab =>
        tab.toLowerCase().replace(/\s+/g, '-') === tabSegment
      );
      setSelectedTabItem(activeTab || '');
    } else {
      setSelectedTabItem('');
    }
  }, [location.pathname, pagePropsList]);

  // Handle sidebar state on screen resize
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const handlePageChange = (title: string) => {
    setActivePageTitle(title);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleTabChange = (tab: string) => {
    setSelectedTabItem(tab);
  };

  const renderContent = () => {
    if (pagePropsList.length === 0) {
      return (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}>
          <p className="text-gray-500">No content available</p>
        </Box>
      );
    }

    const activePage = pagePropsList.find((page) => page.title === activePageTitle);
    if (!activePage) {
      return (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}>
          <p className="text-gray-500">Page not found</p>
        </Box>
      );
    }

    return (
      <Content
        title={activePage.title}
        tabs={activePage.tabs}
        icon={activePage.icon}
        selectedTab={selectedTabItem}
        onTabChange={handleTabChange}
        user={user}
        quarterlyBadge={quarterlyBadge}
        reviewBadge={reviewBadge}
      />
    );
  };

  return (
    <Box sx={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      bgcolor: '#F9FAFB'
    }}>
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        activePageTitle={activePageTitle}
        onPageChange={handlePageChange}
        pagePropsList={pagePropsList}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: isSidebarOpen ? '310px' : '64px',
          height: '100vh',
          overflow: 'auto',
          position: 'relative',
          '@media (max-width: 600px)': {
            marginLeft: isSidebarOpen ? '0' : '64px',
            width: '100%',
          },
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
};

export default Layout; 