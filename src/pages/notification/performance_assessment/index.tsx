import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
  IconButton,
  Chip,
  Skeleton,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import { AnnualTarget, QuarterType, QuarterlyTargetObjective } from '@/types';
import { Notification } from '@/types';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { PersonalQuarterlyTargetObjective, PersonalPerformance } from '../../../types/personalPerformance';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { api } from '../../../services/api';
import EvidenceModal from './EvidenceModal';
import { fetchNotifications } from '../../../store/slices/notificationSlice';
import SendBackModal from '../../../components/Modal/SendBackModal';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import PersonalFeedback from './PersonalFeedback';
import { fetchFeedback } from '../../../store/slices/feedbackSlice';
import ViewSendBackMessageModal from '../../../components/Modal/ViewSendBackMessageModal';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
import { createSelector } from '@reduxjs/toolkit';
import EditCommentModal from '../../../components/EditCommentModal';


// Memoized selector for feedbacks
const selectFeedbacks = createSelector(
  [
    (state: RootState) => state.feedback.feedbacks,
    (_state: RootState, annualTargetId: string | undefined) => annualTargetId,
    (_state: RootState, _annualTargetId: string | undefined, quarter: QuarterType) => quarter
  ],
  (feedbacks, annualTargetId, quarter) =>
    feedbacks.filter(feedback =>
      feedback.annualTargetId === annualTargetId &&
      feedback.enableFeedback.some(ef => ef.quarter === quarter && ef.enable)
    )
);

interface PersonalQuarterlyTargetProps {
  annualTarget: AnnualTarget;
  quarter: QuarterType;
  isEnabledTwoQuarterMode: boolean;
  onBack?: () => void;
  notification?: Notification | null;
}

const PersonalQuarterlyTargetContent: React.FC<PersonalQuarterlyTargetProps> = ({
  annualTarget,
  quarter,
  isEnabledTwoQuarterMode,
  onBack,
  notification = null,
}) => {
  const dispatch = useAppDispatch();
  const [personalQuarterlyObjectives, setPersonalQuarterlyObjectives] = React.useState<PersonalQuarterlyTargetObjective[]>([]);
  const [evidenceModalData, setEvidenceModalData] = useState<{
    evidence: string;
    attachments: Array<{ name: string; url: string }>;
  } | null>(null);
  const [personalPerformance, setPersonalPerformance] = useState<PersonalPerformance | null>(null);
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [enableFeedback, setEnableFeedback] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSendingBack, setIsSendingBack] = useState(false);
  const [viewSendBackModalOpen, setViewSendBackModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [kpiId, setKpiId] = useState(-1);
  const [selectedObjective, setSelectedObjective] = useState('');
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [currentComment, setCurrentComment] = useState('');
  const [previousComment, setPreviousComment] = useState('');

  const { showToast } = useToast();

  // Use memoized selector
  const feedbacks = useAppSelector(state => selectFeedbacks(state, personalPerformance?.annualTargetId, quarter));

  useEffect(() => {
    fetchPersonalPerformance();
    checkFeedbackModule();
    dispatch(fetchFeedback());

  }, []);

  useEffect(() => {
    if (personalPerformance) {
      setPersonalQuarterlyObjectives(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.objectives || []);
    }
  }, [personalPerformance]);

  const fetchPersonalPerformance = async () => {
    try {
      const response = await api.get(`/notifications/personal-performance/${notification?._id}`);
      if (response.status === 200) {
        setPersonalPerformance(response.data.data);
      } else {
        setPersonalPerformance(null);
      }
    } catch (error) {
      console.error('Error fetching personal performance:', error);
    }
  }

  const checkFeedbackModule = async () => {
    const isModuleEnabled = await api.get('/module/Feedback/is-enabled');
    if (isModuleEnabled.data.data.isEnabled) {
      setEnableFeedback(true);
    }
  }

  // Add function to calculate overall rating score
  const calculateOverallScore = (objectives: QuarterlyTargetObjective[]) => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    objectives.forEach(objective => {
      objective.KPIs.forEach(kpi => {
        if (kpi.ratingScore !== -1) {
          totalWeightedScore += (kpi.ratingScore * kpi.weight);
          totalWeight += kpi.weight;
        }
      });
    });

    if (totalWeight === 0) return null;

    return Math.round(totalWeightedScore / totalWeight);
  };

  // Add function to get rating score info
  const getRatingScoreInfo = (score: number | null) => {
    if (!score || !annualTarget) return null;

    return annualTarget.content.ratingScales.find(
      scale => scale.score === score
    );
  };

  // Add total weight calculation function
  const calculateTotalWeight = () => {
    return personalQuarterlyObjectives.reduce((total, objective) => {
      const totalWeight = objective.KPIs.reduce((sum, kpi) => sum + kpi.weight, 0);
      return total + totalWeight;
    }, 0);
  };

  // Helper to get timestamp
  function getTimestamp() {
    const now = new Date();
    return `[${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;
  }

  const handleApprove = async () => {
    if (notification) {
      setIsApproving(true);
      try {
        // Move assessmentComment to previousAssessmentComment for all KPIs before approving
        const currentTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
        if (currentTarget) {
          const updatedObjectives = currentTarget.objectives.map(objective => ({
            ...objective,
            KPIs: objective.KPIs.map(kpi => ({
              ...kpi,
              previousAssessmentComment: kpi.assessmentComment ? `${getTimestamp()} ${kpi.assessmentComment}` : '',
              assessmentComment: ''
            }))
          }));
          await api.put(`/notifications/personal-performance/${notification._id}`, {
            quarter,
            objectives: updatedObjectives
          });
        }
        const response = await api.post(`/notifications/approve/${notification._id}`);
        if (response.status === 200) {
          dispatch(fetchNotifications());
          showToast('Performance assessment approved successfully', 'success');
          onBack?.();
        }
      } catch (error) {
        console.error('Error approving notification:', error);
        showToast('Failed to approve performance assessment', 'error');
      } finally {
        setIsApproving(false);
      }
    }
  };

  const handleSendBack = (emailSubject: string, emailBody: string) => {
    if (notification) {
      setIsSendingBack(true);
      (async () => {
        try {
          // First update the assessment status and comments
          const currentTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
          if (currentTarget) {
            const updatedObjectives = currentTarget.objectives.map(objective => ({
              ...objective,
              KPIs: objective.KPIs.map(kpi => ({
                ...kpi,
                previousAssessmentComment: kpi.assessmentComment ? `${getTimestamp()} ${kpi.assessmentComment}` : '',
                assessmentComment: ''
              }))
            }));
            await api.put(`/notifications/personal-performance/${notification._id}`, {
              quarter,
              objectives: updatedObjectives
            });
          }

          try {
            // Then try to send the email notification
            const response = await api.post(`/notifications/send-back/${notification._id}`, {
              emailSubject,
              emailBody,
              senderId: notification.sender._id
            });

            if (response.status === 200) {
              dispatch(fetchNotifications());
              showToast('Performance assessment sent back successfully', 'success');
              onBack?.();
            }
          } catch (emailError) {
            console.error('Error sending email notification:', emailError);
            dispatch(fetchNotifications());
            showToast('Performance assessment sent back successfully, but email notification failed', 'success');
            onBack?.();
          }
        } catch (error) {
          console.error('Error updating assessment status:', error);
          showToast('Failed to send back performance assessment', 'error');
        } finally {
          setIsSendingBack(false);
        }
      })();
    }
  };

  const editComment = (kpiIndex: number, objectiveName: string, initiativeName: string) => {
    // Find the current comment for this KPI
    const objective = personalQuarterlyObjectives.find(obj =>
      obj.name === objectiveName && obj.initiativeName === initiativeName
    );
    const currentKpiComment = objective?.KPIs[kpiIndex]?.assessmentComment || '';
    const previousKpiComment = objective?.KPIs[kpiIndex]?.previousAssessmentComment || '';

    // Store the KPI's current comment, index, and context
    setKpiId(kpiIndex);
    setSelectedObjective(objectiveName);
    setSelectedInitiative(initiativeName);
    setCurrentComment(currentKpiComment);
    setPreviousComment(previousKpiComment);
    setCommentModalOpen(true);
  }

  const handleSaveComment = async (comment: string, kpiId: number) => {
    try {
      // Find the current quarterly target
      const currentTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
      if (!currentTarget) return;

      // Find and update only the specific objective and initiative
      const updatedObjectives = currentTarget.objectives.map(objective => {
        if (objective.name === selectedObjective && objective.initiativeName === selectedInitiative) {
          return {
            ...objective,
            KPIs: objective.KPIs.map((kpi, index) => {
              if (index === kpiId) {
                return {
                  ...kpi,
                  assessmentComment: comment
                };
              } else {
                return { ...kpi }
              }
            })
          };
        }
        return objective;
      });

      // Update the personal performance with the new comment
      const response = await api.put(`/notifications/personal-performance/${notification?._id}`, {
        quarter,
        objectives: updatedObjectives
      });

      if (response.status === 200) {
        showToast('Performance assessment comment updated successfully', 'success');
        // Refresh the personal performance data
        await fetchPersonalPerformance();
      }
    } catch (error) {
      console.error('Error updating personal performance comment:', error);
      showToast('Failed to update performance assessment comment', 'error');
    } finally {
      setCommentModalOpen(false);
      setSelectedObjective('');
      setSelectedInitiative('');
      setCurrentComment('');
    }
  }

  const hasAnyKpiComment = () => {
    return personalQuarterlyObjectives.some(objective =>
      objective.KPIs.some(kpi => {
        return kpi.assessmentComment !== undefined && kpi.assessmentComment.trim() !== '';
      })
    );
  };

  const assessmentStatus = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentStatus;

  return (
    <Box>
      <Box sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">
          {`${annualTarget.name}, ${notification?.sender.fullName} ${notification?.type === 'agreement' ? 'Agreement' : 'Assessment'} ${isEnabledTwoQuarterMode ? QUARTER_ALIAS[quarter as keyof typeof QUARTER_ALIAS] : quarter}`}
        </Typography>

        <Button
          onClick={onBack}
          variant="outlined"
          color="primary"
          sx={{
            minWidth: '100px',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          Back
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.isAssessmentCommitteeSendBack && (
            <Chip
              label="PM Committee Send Back"
              size="medium"
              color="error"
              sx={{
                height: '30px',
                fontSize: '0.75rem',
                alignSelf: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                const currentTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
                if (currentTarget?.assessmentCommitteeSendBackMessage) {
                  setViewSendBackModalOpen(true);
                }
              }}
            />
          )}
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#059669',
              '&:hover': {
                backgroundColor: '#047857'
              },
              '&.Mui-disabled': {
                backgroundColor: '#E5E7EB',
                color: '#9CA3AF'
              }
            }}
            onClick={handleApprove}
            disabled={isApproving || isSendingBack}
          >
            {isApproving ? 'Processing...' : 'Approve'}
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#F59E0B',
              '&:hover': {
                backgroundColor: '#D97706'
              },
              '&.Mui-disabled': {
                backgroundColor: '#E5E7EB',
                color: '#9CA3AF'
              }
            }}
            onClick={() => setSendBackModalOpen(true)}
            disabled={isApproving || isSendingBack || !hasAnyKpiComment()}
          >
            {isSendingBack ? 'Processing...' : 'Send Back'}
          </Button>
        </Box>
      </Box>

      {/* Add total weight display */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          p: 2,
          borderTop: '1px solid #E5E7EB'
        }}
      >
        <Typography
          sx={{
            fontWeight: 500,
            color: calculateTotalWeight() === 100 ? '#059669' : '#DC2626'
          }}
        >
          Total Weight: {calculateTotalWeight()}%
          {calculateTotalWeight() > 100 && (
            <Typography
              component="span"
              sx={{
                color: '#DC2626',
                ml: 2,
                fontSize: '0.875rem'
              }}
            >
              (Total weight cannot exceed 100%)
            </Typography>
          )}
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Perspective</StyledHeaderCell>
                <StyledHeaderCell>Strategic Objective</StyledHeaderCell>
                <StyledHeaderCell>Initiative</StyledHeaderCell>
                <StyledHeaderCell align="center">Weight %</StyledHeaderCell>
                <StyledHeaderCell>Key Performance Indicator</StyledHeaderCell>
                <StyledHeaderCell align="center">Baseline</StyledHeaderCell>
                <StyledHeaderCell align="center">Target</StyledHeaderCell>
                <StyledHeaderCell align="center">Actual Achieved</StyledHeaderCell>
                <StyledHeaderCell align="center">Performance Rating Score</StyledHeaderCell>
                <StyledHeaderCell align="center">Evidence</StyledHeaderCell>
                <StyledHeaderCell align="center">Comment</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                // Group by perspective and strategic objective
                const groups = personalQuarterlyObjectives.reduce((acc, obj) => {
                  const perspectiveKey = `${obj.perspectiveId}`;
                  const objectiveKey = `${obj.perspectiveId}-${obj.name}`;

                  if (!acc[perspectiveKey]) {
                    acc[perspectiveKey] = {
                      perspectiveId: obj.perspectiveId,
                      perspectiveName: annualTarget.content.perspectives.find(p => p.index === obj.perspectiveId)?.name,
                      objectives: {}
                    };
                  }

                  if (!acc[perspectiveKey].objectives[objectiveKey]) {
                    acc[perspectiveKey].objectives[objectiveKey] = {
                      name: obj.name,
                      initiatives: []
                    };
                  }

                  acc[perspectiveKey].objectives[objectiveKey].initiatives.push(obj);
                  return acc;
                }, {} as Record<string, {
                  perspectiveId: number;
                  perspectiveName: string | undefined;
                  objectives: Record<string, {
                    name: string;
                    initiatives: PersonalQuarterlyTargetObjective[];
                  }>;
                }>);

                // Calculate row spans considering KPI counts
                return Object.values(groups).map(perspectiveGroup => {
                  let firstInPerspective = true;
                  // Calculate total rows for perspective including all KPIs
                  const perspectiveRowSpan = Object.values(perspectiveGroup.objectives)
                    .reduce((sum, obj) => sum + obj.initiatives.reduce((kpiSum, initiative) =>
                      kpiSum + initiative.KPIs.length, 0), 0);

                  return Object.values(perspectiveGroup.objectives).map(objectiveGroup => {
                    let firstInObjective = true;
                    // Calculate total rows for objective including all KPIs
                    const objectiveRowSpan = objectiveGroup.initiatives.reduce((sum, initiative) =>
                      sum + initiative.KPIs.length, 0);

                    return objectiveGroup.initiatives.map((initiative) =>
                      // Map each KPI to a row
                      initiative.KPIs.map((kpi, kpiIndex) => {
                        const row = (
                          <TableRow key={`${initiative.perspectiveId}-${initiative.name}-${initiative.initiativeName}-${kpiIndex}`}>
                            {firstInPerspective && kpiIndex === 0 && (
                              <StyledTableCell rowSpan={perspectiveRowSpan}>
                                {perspectiveGroup.perspectiveName}
                              </StyledTableCell>
                            )}
                            {firstInObjective && kpiIndex === 0 && (
                              <StyledTableCell rowSpan={objectiveRowSpan}>
                                {objectiveGroup.name}
                              </StyledTableCell>
                            )}
                            {kpiIndex === 0 && (
                              <StyledTableCell rowSpan={initiative.KPIs.length}>
                                {initiative.initiativeName}
                              </StyledTableCell>
                            )}
                            <StyledTableCell align="center">
                              {kpi.weight}
                            </StyledTableCell>
                            <StyledTableCell>
                              {kpi.indicator}
                            </StyledTableCell>
                            <StyledTableCell align="center">
                              {kpi.baseline}
                            </StyledTableCell>
                            <StyledTableCell align="center">
                              {kpi.target}
                            </StyledTableCell>
                            <StyledTableCell align="center">
                              {kpi.actualAchieved}
                            </StyledTableCell>
                            <StyledTableCell align="center" sx={{ color: kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.color }}>
                              {
                                kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore)) &&
                                `${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.score} ${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.name} (${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.min} - ${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.max})`
                              }
                            </StyledTableCell>
                            <StyledTableCell align="center">
                              {kpi.evidence && (
                                <IconButton
                                  size="small"
                                  onClick={() => setEvidenceModalData({
                                    evidence: kpi.evidence,
                                    attachments: kpi.attachments
                                  })}
                                  sx={{ color: '#6B7280' }}
                                >
                                  <DescriptionIcon />
                                </IconButton>
                              )}
                            </StyledTableCell>
                            <StyledTableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => editComment(kpiIndex, objectiveGroup.name, initiative.initiativeName)}
                                sx={{ color: '#6B7280' }}
                              >
                                <EditIcon />
                              </IconButton>
                            </StyledTableCell>
                          </TableRow>
                        );

                        if (kpiIndex === 0) {
                          firstInObjective = false;
                        }
                        if (firstInPerspective && kpiIndex === 0) {
                          firstInPerspective = false;
                        }
                        return row;
                      })
                    ).flat();
                  }).flat();
                }).flat();
              })()}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
          Overall Rating Score =
        </Typography>
        {(() => {
          const score = calculateOverallScore(personalQuarterlyObjectives);
          const ratingScore = getRatingScoreInfo(score);

          if (!score || !ratingScore) {
            return (
              <Typography variant="body2" sx={{
                color: '#DC2626',
                fontWeight: 600,
                px: 2,
                py: 0.5,
                borderRadius: 1
              }}>
                N/A
              </Typography>
            );
          }

          return (
            <Typography variant="body2" sx={{
              color: ratingScore.color,
              fontWeight: 600,
              px: 2,
              py: 0.5,
              borderRadius: 1
            }}>
              {`${score} ${ratingScore.name} (${ratingScore.min}-${ratingScore.max})`}
            </Typography>
          );
        })()}
      </Box>

      {/* Feedback Block */}
      {enableFeedback && feedbacks.length > 0 && (
        <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <Typography variant="h6" sx={{ p: 3, borderBottom: '1px solid #E5E7EB' }}>
            Feedback
          </Typography>

          <PersonalFeedback
            quarter={quarter}
            annualTargetId={personalPerformance?.annualTargetId || ''}
            personalPerformance={personalPerformance}
            overallScore={{
              score: calculateOverallScore(personalQuarterlyObjectives),
              name: getRatingScoreInfo(calculateOverallScore(personalQuarterlyObjectives))?.name
            }}
          />
        </Paper>
      )}

      {/* Personal Development Courses Block */}
      {!personalPerformance?.quarterlyTargets?.find(qt => qt.quarter === quarter)?.isPersonalDevelopmentNotApplicable &&
        personalPerformance?.quarterlyTargets?.find(qt => qt.quarter === quarter)?.personalDevelopment?.length > 0 && (
          <Box sx={{ mt: 4, mb: 2, backgroundColor: '#F3F4F6', padding: 2, borderRadius: 2 }}>
            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant="h6">
                Personal Development Courses
              </Typography>
            </Box>

            <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB', mb: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledHeaderCell>Course Name</StyledHeaderCell>
                      <StyledHeaderCell>Description</StyledHeaderCell>
                      <StyledHeaderCell align="center">Status</StyledHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {personalPerformance?.quarterlyTargets?.find(qt => qt.quarter === quarter)?.personalDevelopment?.map((course, index) => (
                      <TableRow key={course._id}>
                        <StyledTableCell>
                          {typeof course === 'string' ? (
                            <Skeleton variant="text" width={200} />
                          ) : (
                            course.name
                          )}
                        </StyledTableCell>
                        <StyledTableCell>
                          {typeof course === 'string' ? (
                            <Skeleton variant="text" width={300} />
                          ) : (
                            course.description
                          )}
                        </StyledTableCell>
                        <StyledTableCell align="center">
                          {typeof course === 'string' ? (
                            <Skeleton variant="text" width={100} />
                          ) : (
                            <Chip
                              label={course.status}
                              size="small"
                              sx={{
                                backgroundColor: course.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                                color: course.status === 'active' ? '#059669' : '#DC2626',
                                fontWeight: 500
                              }}
                            />
                          )}
                        </StyledTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}

      {evidenceModalData && (
        <EvidenceModal
          open={!!evidenceModalData}
          onClose={() => setEvidenceModalData(null)}
          evidence={evidenceModalData.evidence}
          attachments={evidenceModalData.attachments}
        />
      )}

      <SendBackModal
        open={sendBackModalOpen}
        onClose={() => setSendBackModalOpen(false)}
        onSendBack={handleSendBack}
        title="Send Back Email"
        emailSubject={`${annualTarget.name} - Performance ${notification?.type === 'agreement' ? 'Agreement' : 'Assessment'} ${quarter}`}
      />

      <ViewSendBackMessageModal
        open={viewSendBackModalOpen}
        onClose={() => setViewSendBackModalOpen(false)}
        emailSubject={`${annualTarget.name}, Performance Assessment ${quarter}(PM Committee Review)`}
        emailBody={personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentCommitteeSendBackMessage || 'No message available'}
      />

      <EditCommentModal
        open={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false);
          setSelectedObjective('');
          setSelectedInitiative('');
          setCurrentComment('');
          setPreviousComment('');
        }}
        onSave={handleSaveComment}
        kpiId={kpiId}
        initialComment={currentComment}
        previousComment={previousComment}
      />
    </Box >
  );
};

export default PersonalQuarterlyTargetContent;
