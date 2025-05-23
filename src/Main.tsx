import { useEffect, useState } from 'react';
import Layout from './layouts/Layout';
import './styles/globals.css';
import AnnualCorporateScorecard from './pages/scorecards';
import { ManagePage } from './pages/manage';
import { GridRegular, Alert24Regular, LearningApp24Regular, DocumentText24Regular, ClipboardCheckmark24Regular, DataTrending24Regular, Handshake24Regular, PeopleTeam24Regular, Globe24Regular, Home24Regular, Settings24Regular } from '@fluentui/react-icons';
import { useAuth } from './contexts/AuthContext';
import OrganizationPerformance from './pages/organization_performance';
import NotificationPage from './pages/notification';
import MyPerformanceAgreement from './pages/my_performance_agreement';
import MyPerformanceAssessment from './pages/my_performance_assessment';
import Reports from './pages/reports';
import { fetchNotifications } from './store/slices/notificationSlice';
import { useAppDispatch } from './hooks/useAppDispatch';
import { fetchAnnualTargets } from './store/slices/scorecardSlice';
import { useSocket } from './hooks/useSocket';
import { SocketEvent } from './types/socket';
import { fetchTeams, fetchTeamOwner } from './store/slices/teamsSlice';
import { api } from './services/api';
import Dashboard from './pages/dashboard';
import EmployeeDevPlan from './pages/employee_dev_plan';
import TeamsPage from './pages/teams';
import Feedback from './pages/feedback';
import PerformanceCalibration from './pages/performance_calibration';
const iconSize = 24;

function Main() {
  const [selectedTab, setSelectedTab] = useState('Dashboard');
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const selectedTabChanger = (tab: string) => {
    setSelectedTab(tab);
  }
  const [isFeedbackModuleEnabled, setIsFeedbackModuleEnabled] = useState(false);
  const [isPerformanceCalibrationModuleEnabled, setIsPerformanceCalibrationModuleEnabled] = useState(false);

  // Add socket subscription
  const { subscribe, unsubscribe } = useSocket(SocketEvent.NOTIFICATION, (data) => {
    dispatch(fetchNotifications());
  });

  useEffect(() => {
    dispatch(fetchNotifications());
    dispatch(fetchAnnualTargets());
    dispatch(fetchTeams(user?.tenantId));
    // Subscribe to notification events
    subscribe(SocketEvent.NOTIFICATION, (data) => {
      dispatch(fetchNotifications());
    });

    //check if feedback module is enabled for company
    const checkFeedbackModule = async () => {
      const isModuleEnabled = await api.get('/module/is-feedback-module-enabled');
      if (isModuleEnabled.data.data.isEnabled) {
        setIsFeedbackModuleEnabled(true);
      }
    }
    checkFeedbackModule();

    const checkPerformanceCalibrationModule = async () => {
      const isModuleEnabled = await api.get('/module/is-pm-calibration-module-enabled');
      if (isModuleEnabled.data.data.isEnabled) {
        setIsPerformanceCalibrationModuleEnabled(true);
      }
    }
    checkPerformanceCalibrationModule();
    // Cleanup subscription
    return () => {
      unsubscribe(SocketEvent.NOTIFICATION);
    };
  }, [dispatch, subscribe, unsubscribe, isFeedbackModuleEnabled]);

  const isSuperUser = user?.role === 'SuperUser';
  const isAppOwner = user?.email === process.env.REACT_APP_OWNER_EMAIL;
  const [isDevMember, setIsDevMember] = useState(false);
  const [isPerformanceCalibrationMember, setIsPerformanceCalibrationMember] = useState(false);
  const [TeamOwnerStatus, setTeamOwnerStatus] = useState(false);

  useEffect(() => {
    if (user) {
      setIsDevMember(!!user.isDevMember);
      setIsPerformanceCalibrationMember(!!user.isPerformanceCalibrationMember);
    }
  }, [user]);

  // Separate effect for team owner status
  useEffect(() => {
    const fetchTeamOwnerFromDB = async () => {
      if (user?.id) {
        try {
          const teamInfo = await api.get(`/users/is_team_owner/${user.id}`);
          const result = teamInfo.data.data;
          setTeamOwnerStatus(result.isTeamOwner);
        } catch (error) {
          console.error('Error fetching team owner:', error);
          setTeamOwnerStatus(false);
        }
      }
    };
    fetchTeamOwnerFromDB();
  }, [user?.id]);

  return (
    <Layout selectedTabChanger={selectedTabChanger}>
      {(TeamOwnerStatus || isAppOwner || isSuperUser) &&
        <Dashboard
          title="Dashboard"
          icon={<Home24Regular fontSize={iconSize} />}
          tabs={['Dashboard']}
          selectedTab={selectedTab}
        />}
      <NotificationPage
        title="Notifications"
        icon={<Alert24Regular fontSize={iconSize} />}
        tabs={[]}
        selectedTab={selectedTab}
      />
      <MyPerformanceAssessment
        title="My Performance Assessment"
        icon={<ClipboardCheckmark24Regular fontSize={iconSize} />}
        tabs={TeamOwnerStatus ?
          (isAppOwner || isSuperUser ?
            ['My Assessments', 'My Performances', 'Team Performances', 'Manage Performance Assessment'] :
            ['My Assessments', 'My Performances', 'Team Performances']
          ) :
          (isAppOwner || isSuperUser ?
            ['My Assessments', 'My Performances', 'Manage Performance Assessment'] :
            ['My Assessments', 'My Performances']
          )}
        selectedTab={selectedTab}
      />
      <MyPerformanceAgreement
        title="My Performance Agreement"
        icon={<Handshake24Regular fontSize={iconSize} />}
        tabs={isAppOwner || isSuperUser ?
          ['My Performance Agreements', 'Manage Performance Agreement'] :
          ['My Performance Agreements']}
        selectedTab={selectedTab}
      />
      {<EmployeeDevPlan
        title="Employee Development Plan"
        icon={<LearningApp24Regular fontSize={iconSize} />}
        tabs={(isSuperUser || isAppOwner) ?
          (isDevMember ?
            ['My Training Dashboard', 'Employees Training', 'Enable Employees Development', 'Annual Organization Development Plans', 'Training & Courses Management', 'Organization Development Team'] :
            ['My Training Dashboard', 'Organization Development Team']) :
          (isDevMember ?
            ['My Training Dashboard', 'Employees Training', 'Enable Employees Development', 'Annual Organization Development Plans', 'Training & Courses Management'] :
            ['My Training Dashboard'])}
        selectedTab={selectedTab}
      />}
      {(isAppOwner || isSuperUser || isPerformanceCalibrationMember) && isPerformanceCalibrationModuleEnabled && (
        <PerformanceCalibration
          title="Performance Calibration"
          icon={<Settings24Regular fontSize={iconSize} />}
          tabs={
            (isSuperUser || isAppOwner) && isPerformanceCalibrationMember ?
              ['Performance Calibration Team', 'Performance Agreements', 'Performance Assessments'] :
              (isPerformanceCalibrationMember) ?
                ['Performance Agreements', 'Performance Assessments'] :
                ['Performance Calibration Team']
          }
          selectedTab={selectedTab}
        />
      )}

      {(isAppOwner || isSuperUser) && isFeedbackModuleEnabled && (
        <Feedback
          title="Employee 360 Degree Feedback"
          icon={<ClipboardCheckmark24Regular fontSize={iconSize} />}
          tabs={[]}
          selectedTab={selectedTab}
        />
      )}

      {(isAppOwner || isSuperUser) && (
        <OrganizationPerformance
          title="Organization Performance"
          icon={<DataTrending24Regular fontSize={iconSize} />}
          tabs={['Organization Performance Assessment', 'Annual Organization Performance']}
          selectedTab={selectedTab}
        />)}
      {(isAppOwner || isSuperUser) && (
        <AnnualCorporateScorecard
          title="Annual Corporate Scorecard"
          icon={<Globe24Regular fontSize={iconSize} />}
          tabs={['Quarterly Corporate Scorecards', 'Annual Corporate Scorecards']}
          selectedTab={selectedTab}
        />
      )}
      {
        <Reports
          title='Reports'
          icon={<DocumentText24Regular fontSize={iconSize} />}
          tabs={isAppOwner || isSuperUser ?
            ['Teams Performances', 'Teams Performance Assessments Completions', 'Teams Performance Agreements Completions', 'Teams Performance Assessments', 'Teams Performance Agreements', 'Performance Distribution Report', 'Employee Performance Rating', 'Supervisor Performance Distribution Report'] :
            ['Teams Performances', 'Teams Performance Assessments Completions', 'Teams Performance Agreements Completions', 'Teams Performance Assessments', 'Teams Performance Agreements', 'Supervisor Performance Distribution Report']}
          selectedTab={selectedTab}
        />
      }
      {(isAppOwner || isSuperUser) && (
        <TeamsPage
          title='Teams'
          icon={<PeopleTeam24Regular fontSize={iconSize} />}
          tabs={['Teams', 'Super User']}
          selectedTab={selectedTab}
        />
      )}


      {isAppOwner && (
        <ManagePage
          title="Manage Companies"
          icon={<GridRegular fontSize={iconSize} />}
          tabs={['Companies', 'Companies Super Users', 'Companies Licenses', 'Modules']}
          selectedTab={selectedTab}
        />
      )}
    </Layout>
  );
}

export default Main; 
