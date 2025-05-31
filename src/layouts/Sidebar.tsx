import React from 'react';
import { 
  ChevronLeftRegular,
  ChevronRightRegular,
  SignOut24Regular
} from '@fluentui/react-icons';
import { PageProps } from '../types';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../store';
import { Badge } from '@mui/material';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchComplianceObligations } from '../store/slices/complianceObligationsSlice';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activePageTitle: string;
  onPageChange: (title: string) => void;
  pagePropsList: PageProps[];
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activePageTitle,
  onPageChange: originalOnPageChange,
  pagePropsList
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notifications = useAppSelector((state: RootState) => state.notification.notifications);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    navigate('/logout');
  };

  const handleSidebarNavigation = (pageProps: PageProps) => {
    originalOnPageChange(pageProps.title);

    if (pageProps.title === 'Compliance Management') {
      console.log('Sidebar: Navigating to Compliance Management, fetching obligations...');
      dispatch(fetchComplianceObligations());
    }
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 bg-white shadow-ms z-10 transition-all duration-300 ease-in-out flex flex-col ${
        isOpen ? 'w-80' : 'w-16'
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <button
          className="p-1 rounded-full hover:bg-gray-100 focus:outline-none"
          onClick={onToggle}
        >
          {isOpen ? <ChevronLeftRegular /> : <ChevronRightRegular />}
        </button>
      </div>
      
      {/* Main Navigation */}
      <nav className="mt-4 flex-grow">
        <ul>
          {pagePropsList.filter(page => page.show).map((pageProps, index) => (
            <li key={index}>
              <NavLink
                to={pageProps.path}
                className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                  activePageTitle === pageProps.title
                    ? 'bg-ms-blue bg-opacity-10 text-ms-blue'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleSidebarNavigation(pageProps)}
              >
                <span className="inline-flex items-center justify-center w-6 h-6">
                  {pageProps.title === 'Notifications' ? (
                    <Badge 
                      badgeContent={notifications.length} 
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.6rem',
                          height: '16px',
                          minWidth: '16px'
                        }
                      }}
                    >
                      {pageProps.icon}
                    </Badge>
                  ) : (
                    pageProps.icon
                  )}
                </span>
                {isOpen && <span className="ml-3">{pageProps.title}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="mt-auto border-t">
        {isOpen && (
          <div className="px-4 py-3">
            <div className="text-sm font-medium text-gray-900">{user?.displayName}</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span className="inline-flex items-center justify-center w-6 h-6">
            <SignOut24Regular />
          </span>
          {isOpen && <span className="ml-3">Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar; 