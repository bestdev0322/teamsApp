import { useEffect, useState } from 'react';
import Layout from './layouts/Layout';
import './styles/globals.css';
import AnnualCorporateScorecard from './pages/scorecards';
import { ManagePage } from './pages/manage';
import {
  GridRegular,
  Alert24Regular,
  LearningApp24Regular,
  DocumentText24Regular,
  ClipboardCheckmark24Regular,
  DataTrending24Regular,
  Handshake24Regular,
  PeopleTeam24Regular,
  Globe24Regular,
  Home24Regular,
  Settings24Regular,
  ShieldCheckmark24Regular,
  ShieldAdd24Regular,
  PersonFeedback24Regular
} from '@fluentui/react-icons';
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
import { Routes, Route, Navigate } from 'react-router-dom';
import ComplianceManagement from './pages/compliance_management';
import RiskManagement from './pages/risk_management';
const iconSize = 24;

function Main() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [isFeedbackModuleEnabled, setIsFeedbackModuleEnabled] = useState(false);
  const [isPerformanceCalibrationModuleEnabled, setIsPerformanceCalibrationModuleEnabled] = useState(false);
  const [isComplianceModuleEnabled, setIsComplianceModuleEnabled] = useState(false);
  const [isRiskModuleEnabled, setIsRiskModuleEnabled] = useState(false);

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
      const isModuleEnabled = await api.get('/module/Feedback/is-enabled');
      if (isModuleEnabled.data.data.isEnabled) {
        setIsFeedbackModuleEnabled(true);
      }
    }
    checkFeedbackModule();

    const checkPerformanceCalibrationModule = async () => {
      const isModuleEnabled = await api.get('/module/PerformanceCalibration/is-enabled');
      if (isModuleEnabled.data.data.isEnabled) {
        setIsPerformanceCalibrationModuleEnabled(true);
      }
    }
    checkPerformanceCalibrationModule();

    const checkComplianceModule = async () => {
      const isModuleEnabled = await api.get('/module/Compliance/is-enabled');
      if (isModuleEnabled.data.data.isEnabled) {
        setIsComplianceModuleEnabled(true);
      }
    }
    checkComplianceModule();

    const checkRiskModule = async () => {
      const isModuleEnabled = await api.get('/module/Risk/is-enabled');
      if (isModuleEnabled.data.data.isEnabled) {
        setIsRiskModuleEnabled(true);
      }
    }
    checkRiskModule();

    // Cleanup subscription
    return () => {
      unsubscribe(SocketEvent.NOTIFICATION);
    };
  }, [dispatch, subscribe, unsubscribe, isFeedbackModuleEnabled]);

  const isSuperUser = user?.role === 'SuperUser';
  const isAppOwner = user?.email === process.env.REACT_APP_OWNER_EMAIL;
  const [isDevMember, setIsDevMember] = useState(false);
  const [isPerformanceCalibrationMember, setIsPerformanceCalibrationMember] = useState(false);
  const [isTeamOwner, setIsTeamOwner] = useState(false);
  const [isComplianceSuperUser, setIsComplianceSuperUser] = useState(false);
  const [isComplianceChampion, setIsComplianceChampion] = useState(false);
  const [isRiskSuperUser, setIsRiskSuperUser] = useState(false);
  const [isRiskChampion, setIsRiskChampion] = useState(false);

  useEffect(() => {
    if (user) {
      setIsComplianceSuperUser(!!user?.isComplianceSuperUser);
      setIsComplianceChampion(!!user?.isComplianceChampion);
      setIsTeamOwner(!!user?.isTeamOwner);
      setIsDevMember(!!user?.isDevMember);
      setIsPerformanceCalibrationMember(!!user?.isPerformanceCalibrationMember);
      setIsRiskSuperUser(!!user?.isRiskSuperUser);
      setIsRiskChampion(!!user?.isRiskChampion);
    }
  }, [user]);

  const pages = [
    {
      path: "/dashboard/*",
      element: Dashboard,
      title: "Dashboard",
      icon: <Home24Regular fontSize={iconSize} />,
      tabs: ['Dashboard'],
      show: isAppOwner || isSuperUser || isTeamOwner
    },
    {
      path: "/notifications/*",
      element: NotificationPage,
      title: "Notifications",
      icon: <Alert24Regular fontSize={iconSize} />,
      tabs: ['notifications'],
      show: true
    },
    {
      path: "/my-performance-assessment/*",
      element: MyPerformanceAssessment,
      title: "My Performance Assessment",
      icon: <ClipboardCheckmark24Regular fontSize={iconSize} />,
      tabs: isTeamOwner ?
        (isAppOwner || isSuperUser ?
          ['My Assessments', 'My Performances', 'Team Performances', 'Manage Performance Assessment'] :
          ['My Assessments', 'My Performances', 'Team Performances']
        ) :
        (isAppOwner || isSuperUser ?
          ['My Assessments', 'My Performances', 'Manage Performance Assessment'] :
          ['My Assessments', 'My Performances']
        ),
      show: true
    },
    {
      path: "/my-performance-agreement/*",
      element: MyPerformanceAgreement,
      title: "My Performance Agreement",
      icon: <Handshake24Regular fontSize={iconSize} />,
      tabs: isAppOwner || isSuperUser ?
        ['My Performance Agreements', 'Manage Performance Agreement'] :
        ['My Performance Agreements'],
      show: true
    },
    {
      path: "/employee-dev-plan/*",
      element: EmployeeDevPlan,
      title: "Employee Development Plan",
      icon: <LearningApp24Regular fontSize={iconSize} />,
      tabs: (isSuperUser || isAppOwner) ?
        (isDevMember ?
          ['My Training Dashboard', 'Employees Training', 'Enable Employees Development', 'Annual Organization Development Plans', 'Training & Courses Management', 'Organization Development Team'] :
          ['My Training Dashboard', 'Organization Development Team']) :
        (isDevMember ?
          ['My Training Dashboard', 'Employees Training', 'Enable Employees Development', 'Annual Organization Development Plans', 'Training & Courses Management'] :
          ['My Training Dashboard']),
      show: true
    },
    {
      path: "/performance-calibration/*",
      element: PerformanceCalibration,
      title: "Performance Calibration",
      icon: <Settings24Regular fontSize={iconSize} />,
      tabs: (isSuperUser || isAppOwner) && isPerformanceCalibrationMember ?
        ['Performance Calibration Team', 'Performance Agreements', 'Performance Assessments'] :
        (isPerformanceCalibrationMember) ?
          ['Performance Agreements', 'Performance Assessments'] :
          ['Performance Calibration Team'],
      show: (isAppOwner || isSuperUser || isPerformanceCalibrationMember) && isPerformanceCalibrationModuleEnabled
    },
    {
      path: "/feedback/*",
      element: Feedback,
      title: "Employee 360 Degree Feedback",
      icon: <PersonFeedback24Regular fontSize={iconSize} />,
      tabs: ['feedback'],
      show: (isAppOwner || isSuperUser) && isFeedbackModuleEnabled
    },
    {
      path: "/organization-performance/*",
      element: OrganizationPerformance,
      title: "Organization Performance",
      icon: <DataTrending24Regular fontSize={iconSize} />,
      tabs: ['Organization Performance Assessment', 'Annual Organization Performance'],
      show: isAppOwner || isSuperUser
    },
    {
      path: "/annual-corporate-scorecard/*",
      element: AnnualCorporateScorecard,
      title: "Annual Corporate Scorecard",
      icon: <Globe24Regular fontSize={iconSize} />,
      tabs: ['Quarterly Corporate Scorecards', 'Annual Corporate Scorecards'],
      show: isAppOwner || isSuperUser
    },
    {
      path: "/reports/*",
      element: Reports,
      title: "Reports",
      icon: <DocumentText24Regular fontSize={iconSize} />,
      tabs: isAppOwner || isSuperUser ?
        ['Teams Performances', 'Teams Performance Assessments Completions', 'Teams Performance Agreements Completions', 'Teams Performance Assessments', 'Teams Performance Agreements', 'Performance Distribution Report', 'Employee Performance Rating', 'Supervisor Performance Distribution Report'] :
        ['Teams Performances', 'Teams Performance Assessments Completions', 'Teams Performance Agreements Completions', 'Teams Performance Assessments', 'Teams Performance Agreements'],
      show: true
    },
    {
      path: "/teams/*",
      element: TeamsPage,
      title: "Teams",
      icon: <PeopleTeam24Regular fontSize={iconSize} />,
      tabs: isComplianceModuleEnabled ? isRiskModuleEnabled ? ['Teams', 'Super User', 'Compliance User', 'Risk User'] : ['Teams', 'Super User', 'Compliance User'] : isRiskModuleEnabled ? ['Teams', 'Super User', 'Risk User'] : ['Teams', 'Super User'],
      show: isAppOwner || isSuperUser
    },
    {
      path: "/manage/*",
      element: ManagePage,
      title: "Manage Companies",
      icon: <GridRegular fontSize={iconSize} />,
      tabs: ['Companies', 'Companies Super Users', 'Companies Licenses', 'Modules'],
      show: isAppOwner
    },
    {
      path: "/compliance-management/*",
      element: ComplianceManagement,
      title: "Compliance Management",
      icon: <ShieldCheckmark24Regular fontSize={iconSize} />,
      tabs: isComplianceSuperUser ?
        ['Compliance Reporting', 'Compliance Reviews', 'Quarterly Compliance Updates', 'Compliance Review Cycles', 'Compliance Obligations', 'Compliance Areas', 'Compliance Champions'] :
        ['Compliance Reporting', 'Quarterly Compliance Updates'],
      show: (isComplianceSuperUser || isComplianceChampion) && isComplianceModuleEnabled
    },
    {
      path: "/risk-management/*",
      element: RiskManagement,
      title: "Risk Management",
      icon: <ShieldAdd24Regular fontSize={iconSize} />,
      tabs: isRiskSuperUser ?
        ['Dashboard & Reports', 'Residual Risk Assessment', 'My Risk Treatments', 'Risk Treatment Admin', 'Risk Assessment', 'Risk Identification', 'Risk Settings'] :
        ['My Risk Treatments'],
      show: (isRiskSuperUser || isRiskChampion) && isRiskModuleEnabled
    }
  ];

  return (
    <Routes>
      <Route element={<Layout pages={pages} />}>
        <Route path="/*" element={<Navigate to={(isAppOwner || isSuperUser || isTeamOwner) ? "/dashboard" : "/notifications"} replace />} />
        {pages.map((page) => (
          page.show && (
            <Route
              key={page.path}
              path={page.path}
              element={
                <page.element
                  title={page.title}
                  icon={page.icon}
                  tabs={page.tabs}
                  path={page.path}
                  show={page.show}
                  element={page.element}
                />
              }
            />
          )
        ))}
      </Route>
    </Routes>
  );
}

export default Main; 
