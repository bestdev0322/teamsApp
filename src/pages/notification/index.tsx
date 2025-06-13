import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, Paper, styled, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { AnnualTarget, PageProps } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchAnnualTargets } from '../../store/slices/scorecardSlice';
import { RootState } from '../../store';
import { useAppSelector } from '../../hooks/useAppSelector';
import { api } from '../../services/api';
import { Notification } from '@/types';
import PersonalQuarterlyTargetContent from './quarterly_target';
import PersonalPerformanceAssessmentContent from './performance_assessment';
import { isEnabledTwoQuarterMode } from '../../utils/quarterMode';
import { QUARTER_ALIAS } from '../../constants/quarterAlias';
import { fetchNotifications } from '../../store/slices/notificationSlice';
import { useAuth } from '../../contexts/AuthContext';
import MyPerformanceAgreementContent from '../my_performance_agreement/performance_agreement/PersonalQuarterlyTarget';
import MyPerformanceAssessmentContent from '../my_performance_assessment/my_assessment/PersonalQuarterlyTarget';
import { PersonalPerformance } from '../../types/personalPerformance';
import { Routes, Route, Navigate } from 'react-router-dom';

const ViewButton = styled(Button)({
  backgroundColor: '#0078D4',
  color: 'white',
  textTransform: 'none',
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: '#106EBE',
  },
});

const NotificationPage: React.FC<PageProps> = ({ title, icon, tabs }) => {
  const dispatch = useAppDispatch();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showTable, setShowTable] = useState(true);
  const [selectedPersonalPerformance, setSelectedPersonalPerformance] = useState<PersonalPerformance | null>(null);

  const notifications = useAppSelector((state: RootState) => state.notification.notifications);
  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
  const teams = useAppSelector((state: RootState) => state.teams.teams);

  const { user } = useAuth();

  const handleView = async (notification: Notification) => {
    if (!user?._id) {
      console.log('Waiting for user data...');
      return;
    }

    if (notification.type === 'resolve_agreement' || notification.type === 'resolve_assessment') {
      try {
        const res = await api.get('/personal-performance/personal-performance', {
          params: {
            userId: user._id,
            annualTargetId: notification.annualTargetId,
          }
        });
        if (res.data?.data) {
          setSelectedPersonalPerformance(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching personal performance:', error);
      }
    }
    setSelectedNotification(notification);
    setShowTable(false);
  };

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchAnnualTargets());
      dispatch(fetchNotifications());
    }
  }, [dispatch, user?._id]);

  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/*" element={<Navigate to="notifications" replace />} />
        <Route path="notifications" element={
          <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            {showTable && (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Full Name</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell>Annual Corporate Scorecard</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Date, Time</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notifications.map((notification, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {(notification.type==='agreement' || notification.type==='assessment')?notification.sender.fullName:user?.displayName}
                            {(
                              <Chip
                                label="New"
                                size="small"
                                color="error"
                                sx={{
                                  height: '20px',
                                  fontSize: '0.75rem'
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{teams.find((team) => (notification.type==='agreement' || notification.type==='assessment')?team._id === notification.sender.teamId:team._id === user?.teamId)?.name}</TableCell>
                        <TableCell>{annualTargets.find((target) => target._id === notification.annualTargetId)?.name}</TableCell>
                        <TableCell>
                          {`${notification.type === 'resolve_agreement' || notification.type === 'resolve_assessment' ? 'Resolve' : 'Approve'} ${
                            (() => {
                              const target = annualTargets?.find((target) => target._id === notification.annualTargetId);
                              const quarters = target?.content?.quarterlyTarget?.quarterlyTargets
                                ?.filter((quarter) => quarter?.editable)
                                ?.map((quarter) => quarter?.quarter) || [];
                              
                              return isEnabledTwoQuarterMode(quarters, user?.isTeamOwner)
                                ? QUARTER_ALIAS[notification.quarter as keyof typeof QUARTER_ALIAS] 
                                : notification.quarter;
                            })()
                          } ${
                            notification.type === 'agreement' || notification.type === 'resolve_agreement'
                              ? 'Performance Agreement' 
                              : 'Performance Assessment'
                          }`}
                        </TableCell>
                        <TableCell>{new Date(notification.updatedAt).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <ViewButton
                            variant="contained"
                            onClick={() => handleView(notification)}
                          >
                            View
                          </ViewButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {selectedNotification && selectedNotification.type === 'resolve_agreement' && selectedPersonalPerformance && (
              <MyPerformanceAgreementContent
                annualTarget={annualTargets?.find((target) => target._id === selectedNotification.annualTargetId) as AnnualTarget}
                quarter={selectedNotification.quarter}
                isEnabledTwoQuarterMode={(() => {
                  const target = annualTargets?.find((target) => target._id === selectedNotification.annualTargetId);
                  const quarters = target?.content?.quarterlyTarget?.quarterlyTargets
                    ?.filter((quarter) => quarter?.editable)
                    ?.map((quarter) => quarter?.quarter) || [];
                  return isEnabledTwoQuarterMode(quarters, user?.isTeamOwner);
                })()}
                onBack={() => {
                  setSelectedNotification(null);
                  setShowTable(true);
                  setSelectedPersonalPerformance(null);
                }}
                personalPerformance={selectedPersonalPerformance}
              />
            )}

            {selectedNotification && (
              selectedNotification.type === 'resolve_assessment' ? (
                <MyPerformanceAssessmentContent
                  annualTarget={annualTargets?.find((target) => target._id === selectedNotification.annualTargetId) as AnnualTarget}
                  quarter={selectedNotification.quarter}
                  isEnabledTwoQuarterMode={(() => {
                    const target = annualTargets?.find((target) => target._id === selectedNotification.annualTargetId);
                    const quarters = target?.content?.quarterlyTarget?.quarterlyTargets
                      ?.filter((quarter) => quarter?.editable)
                      ?.map((quarter) => quarter?.quarter) || [];
                    return isEnabledTwoQuarterMode(quarters, user?.isTeamOwner);
                  })()}
                  onBack={() => {
                    setSelectedNotification(null);
                    setShowTable(true);
                  }}
                  personalPerformance={selectedPersonalPerformance}
                />
              ) : selectedNotification.type === 'agreement' ? (
                <PersonalQuarterlyTargetContent
                  notification={selectedNotification}
                  annualTarget={annualTargets?.find((target) => target._id === selectedNotification.annualTargetId) as AnnualTarget}
                  quarter={selectedNotification.quarter}
                  isEnabledTwoQuarterMode={(() => {
                    const target = annualTargets?.find((target) => target._id === selectedNotification.annualTargetId);
                    const quarters = target?.content?.quarterlyTarget?.quarterlyTargets
                      ?.filter((quarter) => quarter?.editable)
                      ?.map((quarter) => quarter?.quarter) || [];
                    return isEnabledTwoQuarterMode(quarters, user?.isTeamOwner);
                  })()}
                  onBack={() => {
                    setSelectedNotification(null);
                    setShowTable(true);
                  }}
                />
              ) : selectedNotification.type === 'assessment' && (
                <PersonalPerformanceAssessmentContent
                  notification={selectedNotification}
                  annualTarget={annualTargets?.find((target) => target._id === selectedNotification.annualTargetId) as AnnualTarget}
                  quarter={selectedNotification.quarter}
                  isEnabledTwoQuarterMode={(() => {
                    const target = annualTargets?.find((target) => target._id === selectedNotification.annualTargetId);
                    const quarters = target?.content?.quarterlyTarget?.quarterlyTargets
                      ?.filter((quarter) => quarter?.editable)
                      ?.map((quarter) => quarter?.quarter) || [];
                    return isEnabledTwoQuarterMode(quarters, user?.isTeamOwner);
                  })()}
                  onBack={() => {
                    setSelectedNotification(null);
                    setShowTable(true);
                  }}
                />
              )
            )}
          </Box>
        } />
      </Routes>
    </div>
  );
};

export default NotificationPage; 
