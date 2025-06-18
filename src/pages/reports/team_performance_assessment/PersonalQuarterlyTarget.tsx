import React, { useState, useEffect, useCallback } from 'react';
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
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Skeleton,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { RootState } from '../../../store';
import { AnnualTarget, QuarterType, QuarterlyTargetObjective } from '@/types/annualCorporateScorecard';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { PersonalQuarterlyTargetObjective, PersonalPerformance } from '@/types/personalPerformance';
import { api } from '../../../services/api';
import EvidenceModal from './EvidenceModal';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { fetchFeedback } from '../../../store/slices/feedbackSlice';
import PersonalFeedback from './PersonalFeedback';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
import { Feedback as FeedbackType } from '../../../types/feedback';

interface Supervisor {
  id: string;
  name: string;
}

interface PersonalQuarterlyTargetProps {
  annualTarget: AnnualTarget;
  quarter: QuarterType;
  supervisors?: Supervisor[];
  onSupervisorChange?: (supervisorId: string) => void;
  onBack?: () => void;
  userId: string;
  teamId: string;
  userName: string;
  isEnabledTwoQuarterMode: boolean;
}

const PersonalQuarterlyTargetContent: React.FC<PersonalQuarterlyTargetProps> = ({
  annualTarget,
  quarter,
  onBack,
  userId = '',
  teamId = '',
  userName,
  isEnabledTwoQuarterMode
}) => {
  const dispatch = useAppDispatch();

  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [personalQuarterlyObjectives, setPersonalQuarterlyObjectives] = React.useState<PersonalQuarterlyTargetObjective[]>([]);
  const [personalPerformance, setPersonalPerformance] = useState<PersonalPerformance | null>(null);
  const [companyUsers, setCompanyUsers] = useState<{ id: string, fullName: string, jobTitle: string, team: string, teamId: string }[]>([]);
  const [enableFeedback, setEnableFeedback] = useState(false);
  const feedbackTemplates = useAppSelector((state: RootState) => state.feedback.feedbacks as FeedbackType[]);


  const [evidenceModalData, setEvidenceModalData] = useState<{
    evidence: string;
    attachments: Array<{ name: string; url: string }>;
  } | null>(null);

  const fetchPersonalPerformance = useCallback(async () => {
    try {
      const response = await api.get(`/personal-performance/personal-performance/`, {
        params: {
          userId: userId,
          annualTargetId: annualTarget._id,
          teamId: teamId
        }
      });

      if (response.status === 200) {
        setPersonalPerformance(response.data.data);
      }
    } catch (error) {
      console.error('Personal performance error:', error);
    }
  }, [userId, teamId, annualTarget._id]);

  useEffect(() => {
    fetchPersonalPerformance();
    fetchCompanyUsers();
    checkFeedbackModule();
    dispatch(fetchFeedback());
  }, [fetchPersonalPerformance, dispatch]);

  useEffect(() => {
    if (personalPerformance) {
      setPersonalQuarterlyObjectives(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.objectives || []);
      setSelectedSupervisor(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.supervisorId || '');
    }
  }, [personalPerformance, quarter]);

  const checkFeedbackModule = async () => {
    const isModuleEnabled = await api.get('/module/Feedback/is-enabled');
    if (isModuleEnabled.data.data.isEnabled) {
      setEnableFeedback(true);
    }
  }

  const fetchCompanyUsers = async () => {
    try {
      const response = await api.get('/report/company-users');
      if (response.status === 200) {
        setCompanyUsers(response.data.data);
      } else {
        setCompanyUsers([]);
      }
    } catch (error) {
      setCompanyUsers([]);
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

  const isFeedbackEnabled = feedbackTemplates
    ?.find((template: FeedbackType) => template._id === personalPerformance?.quarterlyTargets.find(quarter => quarter?.selectedFeedbackId ?? quarter.feedbacks[0]?.feedbackId)?.toString() && template.status === 'Active')
    ?.enableFeedback
    .find(ef => ef.quarter === quarter && ef.enable)?.enable;

  const isPersonalDevelopmentPlanEnabled = !personalPerformance?.quarterlyTargets?.find(qt => qt.quarter === quarter)?.isPersonalDevelopmentNotApplicable && personalPerformance?.quarterlyTargets?.find(qt => qt.quarter === quarter)?.personalDevelopment?.length > 0;

  return (
    <Box>
      <Box sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">
          {`${annualTarget.name}, ${userName} Performance Assessment ${isEnabledTwoQuarterMode ? QUARTER_ALIAS[quarter as keyof typeof QUARTER_ALIAS] : quarter}`}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl
          variant="outlined"
          size="small"
          sx={{
            mt: 1,
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#E5E7EB',
              },
              '&:hover fieldset': {
                borderColor: '#D1D5DB',
              },
            },
          }}
        >
          <Select
            value={selectedSupervisor}
            displayEmpty
            disabled={true}
          >
            {companyUsers.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.fullName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}>
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

      <Paper
        className="performance-table"
        sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}
      >
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
      {enableFeedback && isFeedbackEnabled && (
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

      {isPersonalDevelopmentPlanEnabled && <Box sx={{ mt: 4, mb: 2, backgroundColor: '#F3F4F6', padding: 2, borderRadius: 2 }}>
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
                  <TableRow key={typeof course === 'string' ? course : course._id}>
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
                {(!personalPerformance?.quarterlyTargets?.find(qt => qt.quarter === quarter)?.personalDevelopment ||
                  personalPerformance.quarterlyTargets.find(qt => qt.quarter === quarter)?.personalDevelopment.length === 0) && (
                    <TableRow>
                      <StyledTableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          No personal development courses added
                        </Typography>
                      </StyledTableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>}


      {evidenceModalData && (
        <EvidenceModal
          open={!!evidenceModalData}
          onClose={() => setEvidenceModalData(null)}
          evidence={evidenceModalData.evidence}
          attachments={evidenceModalData.attachments}
        />
      )}
    </Box >
  );
};

export default PersonalQuarterlyTargetContent;
