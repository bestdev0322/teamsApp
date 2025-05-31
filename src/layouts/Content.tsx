import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  styled,
  Badge,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppSelector } from '../hooks/useAppSelector';
import { UserProfile } from '../types';

interface ContentProps {
  title: string;
  tabs: string[];
  icon: React.ReactNode;
  selectedTab: string;
  onTabChange: (tab: string) => void;
  children?: React.ReactNode;
  user?: UserProfile | null;
  quarterlyBadge: number;
  reviewBadge: number;
}

const TabContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid #E5E7EB',
  backgroundColor: '#fff',
  overflowX: 'hidden',
});

const StyledNavLink = styled(NavLink)(({ theme }) => ({
  padding: '8px 20px',
  whiteSpace: 'nowrap',
  backgroundColor: 'transparent',
  color: '#374151',
  border: '1px solid #E5E7EB',
  borderRadius: '20px',
  margin: '0 4px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textDecoration: 'none',
  '&:hover': {
    backgroundColor: '#F9FAFB',
  },
  '&.active': {
    backgroundColor: '#0078D4',
    color: '#fff',
    border: 'none',
    '&:hover': {
      backgroundColor: '#0078D4',
    },
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  '&.active-menu-item': {
    backgroundColor: '#0078D4 !important',
    color: '#fff !important',
    '& .nav-link': {
      color: '#fff !important',
    },
    '&:hover': {
      backgroundColor: '#0078D4 !important',
    },
  },
}));

const StyledNavMenuItem = styled(NavLink)(({ theme }) => ({
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
  width: '100%',
  '&.active': {
    backgroundColor: '#0078D4',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#0078D4',
    },
  },
}));

const Content: React.FC<ContentProps> = ({
  title,
  tabs,
  icon,
  selectedTab,
  onTabChange,
  user,
  quarterlyBadge,
  reviewBadge,
}) => {
  const [visibleTabs, setVisibleTabs] = useState<string[]>([]);
  const [overflowTabs, setOverflowTabs] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const calculateVisibleTabs = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      let totalWidth = 0;
      const visible: string[] = [];
      const overflow: string[] = [];

      // Calculate which tabs fit
      tabs.forEach((tab) => {
        // Approximate width calculation (adjust these values as needed)
        const tabWidth = tab.length * 10 + 40; // characters * avg char width + padding
        if (totalWidth + tabWidth < containerWidth - 60) { // 60px for overflow menu
          totalWidth += tabWidth;
          visible.push(tab);
        } else {
          overflow.push(tab);
        }
      });

      setVisibleTabs(visible);
      setOverflowTabs(overflow);
    };

    calculateVisibleTabs();
    window.addEventListener('resize', calculateVisibleTabs);
    return () => window.removeEventListener('resize', calculateVisibleTabs);
  }, [tabs]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabSelect = (tab: string) => {
    onTabChange(tab);
    handleMenuClose();
  };

  const getTabPath = (tab: string) => {
    // Get the base path from the current location
    const basePath = location.pathname.split('/').slice(0, -1).join('/');
    // Convert tab name to URL-friendly format and append to base path
    const tabPath = tab.toLowerCase().replace(/\s+/g, '-');
    return `${basePath}/${tabPath}`;
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'auto', bgcolor: '#f5f5f5', p: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="h5">{title}</Typography>
        </Box>

        <TabContainer ref={containerRef} sx={{ bgcolor: '#f5f5f5' }}>
          {visibleTabs.map((tab) => {
            const isQuarterlyTab = tab.toLowerCase().includes('quarterly compliance updates');
            const isReviewTab = tab.toLowerCase().includes('compliance reviews');
            return (
              <StyledNavLink
                key={tab}
                to={getTabPath(tab)}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                {isQuarterlyTab && user?.isComplianceChampion && quarterlyBadge > 0 ? (
                  <Badge
                    color="error"
                    badgeContent={quarterlyBadge}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    overlap="rectangular"
                    sx={{
                      ml: 0,
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                        minWidth: 20,
                        height: 20,
                        right: -15,
                        top: 2
                      }
                    }}
                  >
                    <span>{tab}</span>
                  </Badge>
                ) : isReviewTab && user?.isComplianceSuperUser && reviewBadge > 0 ? (
                  <Badge
                    color="error"
                    badgeContent={reviewBadge}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    overlap="rectangular"
                    sx={{
                      ml: 0,
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                        minWidth: 20,
                        height: 20,
                        right: -15,
                        top: 2
                      }
                    }}
                  >
                    <span>{tab}</span>
                  </Badge>
                ) : tab}
              </StyledNavLink>
            );
          })}

          {overflowTabs.length > 0 && (
            <>
              <IconButton onClick={handleMenuClick} size="small">
                <MoreHorizIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: { overflow: 'visible' }
                }}
              >
                {overflowTabs.map((tab) => {
                  const tabPath = getTabPath(tab);
                  const lastSegment = location.pathname.split('/').filter(Boolean).pop();
                  const tabSegment = tabPath.split('/').filter(Boolean).pop();
                  const isActive = lastSegment === tabSegment;
                  const isQuarterlyTab = tab.toLowerCase().includes('quarterly compliance updates');
                  const isReviewTab = tab.toLowerCase().includes('compliance reviews');
                  return (
                    <NavLink
                      key={tab}
                      to={tabPath}
                      style={{ textDecoration: 'none' }}
                      onClick={() => handleTabSelect(tab)}
                    >
                      <StyledMenuItem className={isActive ? 'active-menu-item' : ''}>
                        {isQuarterlyTab && user?.isComplianceChampion && quarterlyBadge > 0 ? (
                          <Badge
                            color="error"
                            badgeContent={quarterlyBadge}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            overlap="rectangular"
                            sx={{
                              ml: 0,
                              '& .MuiBadge-badge': {
                                fontSize: '0.7rem',
                                minWidth: 20,
                                height: 20,
                                right: -15,
                                top: 2
                              }
                            }}
                          >
                            <span>{tab}</span>
                          </Badge>
                        ) : isReviewTab && user?.isComplianceSuperUser && reviewBadge > 0 ? (
                          <Badge
                            color="error"
                            badgeContent={reviewBadge}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            overlap="rectangular"
                            sx={{
                              ml: 0,
                              '& .MuiBadge-badge': {
                                fontSize: '0.7rem',
                                minWidth: 20,
                                height: 20,
                                right: -15,
                                top: 2
                              }
                            }}
                          >
                            <span>{tab}</span>
                          </Badge>
                        ) : (
                          tab
                        )}
                      </StyledMenuItem>
                    </NavLink>
                  );
                })}
              </Menu>
            </>
          )}
        </TabContainer>

        <Box sx={{ mt: 3 }}>
          <Outlet />
        </Box>
      </Container>
    </Box>
  );
};

export default Content; 