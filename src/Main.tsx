import React, { useEffect, useState } from 'react';
import Layout from './layouts/Layout';
import './styles/globals.css';
import AnnualCorporateScorecard from './pages/scorecards';
import Teams from './pages/teams';
import { ManagePage } from './pages/manage';
import { BoardSplitRegular, GridRegular, PeopleTeamRegular, Organization20Regular, Alert24Regular } from '@fluentui/react-icons';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAuth } from './contexts/AuthContext';
import OrganizationPerformance from './pages/organization_performance';
import NotificationPage from './pages/notification';
import MyPerformanceAgreement from './pages/my_performance_agreement';
import MyPerformanceAssessment from './pages/my_performance_assessment';
import Reports from './pages/reports';
const iconSize = 24;

function Main() {
  const [selectedTab, setSelectedTab] = useState('');
  const { user } = useAuth();
  const isAppOwner = user?.email === 'admin@siliconsoftwaresolutions.onmicrosoft.com';
  const selectedTabChanger = (tab: string) => {
    setSelectedTab(tab);
  }

  return (
    <Provider store={store}>
      <Layout selectedTabChanger={selectedTabChanger}>
        {/* <AdminPanel /> */}
        {isAppOwner && (
          <ManagePage
            title="Manage Companies"
            icon={<GridRegular fontSize={iconSize} />}
            tabs={['Companies', 'Companies Super Users', 'Companies Licenses']}
            selectedTab={selectedTab}
          />
        )}
        <Reports
          title='Reports'
          icon={<Organization20Regular fontSize={iconSize} />}
          tabs={['Teams Performances', 'Teams Performance Assessments Completions', 'Teams Performance Agreements Completions', 'Teams Performance Assessments', 'Teams Performance Agreements']}
          selectedTab={selectedTab}
        />
        <MyPerformanceAssessment
          title='My Performance Assessment'
          icon={<Organization20Regular fontSize={iconSize} />}
          tabs={['My Assessments', 'Team Performances']}
          selectedTab={selectedTab}
        />
        <MyPerformanceAgreement
          title='My Performance Agreement'
          icon={<Organization20Regular fontSize={iconSize} />}
          tabs={['My Quarterly Targets']}
          selectedTab={selectedTab}
        />
        <OrganizationPerformance
          title='Organization Performance'
          icon={<Organization20Regular fontSize={iconSize} />}
          tabs={['Performance Evaluations', 'Organization Performance']}
          selectedTab={selectedTab}
        />
        <AnnualCorporateScorecard
          title="Annual Corporate Scorecard"
          icon={<PeopleTeamRegular fontSize={iconSize} />}
          tabs={['Quarterly Targets', 'Annual Targets']}
          selectedTab={selectedTab}
        />
        <Teams
          title='Teams'
          icon={<BoardSplitRegular fontSize={iconSize} />}
          tabs={['Teams']}
          selectedTab={selectedTab}
        />
        <NotificationPage 
          title='Notifications'
          icon={<Alert24Regular fontSize={iconSize} />}
          tabs={['Quarterly Targets', 'Performance Assessments']}
          selectedTab={selectedTab}
        />
      </Layout>
    </Provider>
  );
}

export default Main; 
