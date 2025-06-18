import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Autocomplete,
  TextField,
  styled,
  Chip,
  Alert,
  Switch,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { AnnualTarget, QuarterType, QuarterlyTargetObjective, QuarterlyTargetKPI } from '../../../types/annualCorporateScorecard';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { PersonalQuarterlyTargetObjective, PersonalPerformance, PersonalQuarterlyTarget, AssessmentStatus, AssessmentReviewStatus, AgreementStatus } from '../../../types/personalPerformance';
import { PdfType } from '../../../types';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { fetchPersonalPerformances, updatePersonalPerformance } from '../../../store/slices/personalPerformanceSlice';
import { RootState } from '../../../store';
import { api } from '../../../services/api';
import KPIModal from './KPIModal';
import EvidenceModal from './EvidenceModal';
import { useAuth } from '../../../contexts/AuthContext';
import ViewSendBackMessageModal from '../../../components/Modal/ViewSendBackMessageModal';

import { ExportButton } from '../../../components/Buttons';

import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { exportPdf } from '../../../utils/exportPdf';

import DeleteIcon from '@mui/icons-material/Delete';
import SelectCourseModal from '../../../components/Modal/SelectCourseModal';
import { Course } from '../../../types/course';
import { fetchFeedback } from '../../../store/slices/feedbackSlice';
import PersonalFeedback from './PersonalFeedback';
import { useToast } from '../../../contexts/ToastContext';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
import { createSelector } from '@reduxjs/toolkit';
import CommentModal from '../../../components/CommentModal';
import { fetchNotifications } from '../../../store/slices/notificationSlice';


const AccessButton = styled(Button)({
  backgroundColor: '#0078D4',
  color: 'white',
  textTransform: 'none',
  padding: '6px 16px',
  minWidth: 'unset',
  '&:hover': {
    backgroundColor: '#106EBE',
  },
});

// Memoized selector for feedbacks
const selectFeedbacks = createSelector(
  [
    (state: RootState) => state.feedback.feedbacks,
    (_state: RootState, annualTargetId: string | undefined) => annualTargetId,
    (_state: RootState, _annualTargetId: string | undefined, quarter: QuarterType) => quarter
  ],
  (feedbacks, annualTargetId, quarter) =>
    feedbacks.filter(f =>
      f.annualTargetId === annualTargetId &&
      f.enableFeedback.some(ef => ef.quarter === quarter && ef.enable)
    )
);

interface PersonalQuarterlyTargetProps {
  annualTarget: AnnualTarget;
  quarter: QuarterType;
  isEnabledTwoQuarterMode: boolean;
  onBack?: () => void;
  personalPerformance?: PersonalPerformance | null;
}

const PersonalQuarterlyTargetContent: React.FC<PersonalQuarterlyTargetProps> = ({
  annualTarget,
  quarter,
  isEnabledTwoQuarterMode,
  onBack,
  personalPerformance = null,
}) => {
  const dispatch = useAppDispatch();
  const [selectedSupervisor, setSelectedSupervisor] = React.useState('');
  const [enableFeedback, setEnableFeedback] = useState(false);
  const [personalQuarterlyObjectives, setPersonalQuarterlyObjectives] = React.useState<PersonalQuarterlyTargetObjective[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<{ kpi: QuarterlyTargetKPI, perspectiveId: number, objectiveName: string, initiativeName: string, kpiIndex: number } | null>(null);
  const [evidenceModalData, setEvidenceModalData] = useState<{
    evidence: string;
    attachments: Array<{ name: string; url: string }>;
  } | null>(null);
  const [companyUsers, setCompanyUsers] = useState<{ id: string, name: string }[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  const [status, setStatus] = useState<AssessmentStatus | null>(null);
  const [isNotApplicable, setIsNotApplicable] = useState(false);
  const tableRef = useRef();
  const { user } = useAuth();
  const [isSelectCourseModalOpen, setIsSelectCourseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const [viewSendBackModalOpen, setViewSendBackModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState('');
  const notifications = useAppSelector((state: RootState) => state.notification.notifications);


  // Use memoized selector
  const feedbacks = useAppSelector(state => selectFeedbacks(state, personalPerformance?.annualTargetId, quarter));

  const annualQuarterlyTarget = annualTarget?.content.quarterlyTarget.quarterlyTargets.find(
    target => target.quarter === quarter
  );
  const isDevelopmentEnabled = annualQuarterlyTarget?.isDevelopmentPlanEnabled;

  const fetchCompanyUsers = useCallback(async () => {
    try {
      const response = await api.get('/personal-performance/company-users');
      if (response.status === 200) {
        setCompanyUsers(response.data.data);
      } else {
        setCompanyUsers([]);
      }
    } catch (error) {
      setCompanyUsers([]);
    }
  }, []);

  const checkFeedbackModule = useCallback(async () => {
    const isModuleEnabled = await api.get('/module/Feedback/is-enabled');
    if (isModuleEnabled.data.data.isEnabled) {
      setEnableFeedback(true);
    }
  }, []);

  useEffect(() => {
    fetchCompanyUsers();
    checkFeedbackModule();
    dispatch(fetchFeedback());
    dispatch(fetchNotifications());
  }, [dispatch, fetchCompanyUsers, checkFeedbackModule]);

  useEffect(() => {
    if (personalPerformance) {
      setPersonalQuarterlyObjectives(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.objectives || []);
      setSelectedSupervisor(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.supervisorId || '');
      setIsSubmitted(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentStatus === 'Submitted');
      setIsApproved(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentStatus === 'Approved');
      setStatus(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentStatus);
    }
  }, [personalPerformance, quarter]);

  const handleSupervisorChange = (event: SelectChangeEvent) => {
    setSelectedSupervisor(event.target.value);
    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {

      if (target.quarter === quarter) {
        return {
          ...target,
          assessmentStatus: AssessmentStatus.Draft,
          assessmentStatusUpdatedAt: new Date(),
          supervisorId: event.target.value,
        }
      }

      if (quarter === 'Q1' && target.isEditable === false) {
        return {
          ...target,
          assessmentStatus: AssessmentStatus.Draft,
          assessmentStatusUpdatedAt: new Date(),
          supervisorId: event.target.value,
        }

      }
      return target;
    });

    dispatch(updatePersonalPerformance({
      _id: personalPerformance?._id || '',
      teamId: personalPerformance?.teamId || '',
      annualTargetId: personalPerformance?.annualTargetId || '',
      quarterlyTargets: newPersonalQuarterlyTargets || []
    }));

    setStatus(AssessmentStatus.Draft);
  };

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
  const calculateTotalWeight = (objectives: PersonalQuarterlyTargetObjective[]) => {
    return objectives.reduce((total, objective) => {
      const totalWeight = objective.KPIs.reduce((sum, kpi) => sum + kpi.weight, 0);
      return total + totalWeight;
    }, 0);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const assessmentNotification = notifications.find((n: any) =>
        n.type === 'resolve_assessment' &&
        n.annualTargetId === personalPerformance?.annualTargetId &&
        n.quarter === quarter
      );

      if (assessmentNotification) {
        // Mark notification as read
        await api.post(`/notifications/read/${assessmentNotification._id}`);
      }

      const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
        if (target.quarter === quarter) {
          return {
            ...target,
            assessmentStatus: AssessmentStatus.Submitted,
            assessmentStatusUpdatedAt: new Date(),
            supervisorId: selectedSupervisor,
            objectives: personalQuarterlyObjectives
          }
        }

        if (quarter === 'Q1' && target.isEditable === false) {
          return {
            ...target,
            assessmentStatus: AssessmentStatus.Draft,
            assessmentStatusUpdatedAt: new Date(),
            isEditable: calculateTotalWeight(personalQuarterlyObjectives) === 100 ? true : false,
            supervisorId: selectedSupervisor,
            objectives: personalQuarterlyObjectives
          }
        }

        return target;
      });

      await dispatch(updatePersonalPerformance({
        _id: personalPerformance?._id || '',
        teamId: personalPerformance?.teamId || '',
        annualTargetId: personalPerformance?.annualTargetId || '',
        quarterlyTargets: newPersonalQuarterlyTargets || []
      }));

      try {
        await api.post('/notifications/assessment/submit', {
          recipientId: selectedSupervisor,
          annualTargetId: personalPerformance?.annualTargetId || '',
          quarter: quarter,
          personalPerformanceId: personalPerformance?._id || ''
        });
        showToast('Performance assessment submitted successfully', 'success');
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        showToast('Performance assessment submitted successfully, but email notification failed', 'success');
      }

      setIsSubmitted(true);
      setStatus(AssessmentStatus.Submitted);
    } catch (error) {
      console.error('Error submitting quarterly target:', error);
      showToast('Failed to submit performance assessment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasAnyAssessmentComment = () => {
    return personalQuarterlyObjectives.some(objective =>
      objective.KPIs.some(kpi => {
        return kpi.assessmentComment !== undefined && kpi.assessmentComment.trim() !== '';
      })
    );
  };

  const handleRecall = async () => {
    if (hasAnyAssessmentComment()) {
      showToast('You cannot recall as Supervisor is busy reviewing your assessment.', 'error');
      return;
    }
    setIsSubmitting(true);
    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
      if (target.quarter === quarter) {
        return {
          ...target,
          assessmentStatus: target.isAssessmentCommitteeSendBack ? AssessmentStatus.CommitteeSendBack : AssessmentStatus.Draft,
          assessmentStatusUpdatedAt: new Date(),
          supervisorId: selectedSupervisor,
          objectives: personalQuarterlyObjectives
        }
      }
      return target;
    });

    try {
      await dispatch(updatePersonalPerformance({
        _id: personalPerformance?._id || '',
        teamId: personalPerformance?.teamId || '',
        annualTargetId: personalPerformance?.annualTargetId || '',
        quarterlyTargets: newPersonalQuarterlyTargets || []
      }));

      try {
        await api.post('/notifications/assessment/recall', {
          recipientId: selectedSupervisor,
          annualTargetId: personalPerformance?.annualTargetId || '',
          quarter: quarter,
          personalPerformanceId: personalPerformance?._id || ''
        });
        showToast('Performance assessment recalled successfully', 'success');
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        showToast('Performance assessment recalled successfully, but email notification failed', 'success');
      }

      setIsSubmitted(false);
      const currentTarget = newPersonalQuarterlyTargets?.find(target => target.quarter === quarter);
      setStatus(currentTarget?.isAssessmentCommitteeSendBack ? AssessmentStatus.CommitteeSendBack : AssessmentStatus.Draft);
    } catch (error) {
      console.error('Error recalling quarterly target:', error);
      showToast('Failed to recall performance assessment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const areAllKPIsEvaluated = () => {
    return personalQuarterlyObjectives.every(objective =>
      objective.KPIs.every(kpi =>
        kpi.actualAchieved !== ""
      )
    );
  };

  const isAssessmentsEmpty = () => {
    return personalQuarterlyObjectives.every(objective =>
      objective.KPIs.every(kpi =>
        kpi.actualAchieved === ""
      )
    );
  }

  // Add date validation function
  const isWithinPeriod = () => {
    const assessmentPeriod = annualTarget.content.assessmentPeriod[quarter];
    if (!assessmentPeriod) return false;

    const today = new Date();
    const startDate = new Date(assessmentPeriod.startDate);
    const endDate = new Date(assessmentPeriod.endDate);

    return today >= startDate && today <= endDate;
  };

  // Update canEdit function to also check submission status
  const canEdit = () => {
    const quarterlyTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
    return isWithinPeriod() &&
      quarterlyTarget?.agreementStatus === AgreementStatus.Approved &&
      !isSubmitted && !isApproved;
  };

  // Add validation function for submit button
  const canSubmit = () => {
    return selectedSupervisor !== '' && calculateTotalWeight(personalQuarterlyObjectives) === 100 && !isApproved && areAllKPIsEvaluated();
  };

  const handleSave = async (newKPI: QuarterlyTargetKPI) => {
    if (selectedKPI) {
      const newPersonalQuarterlyObjectives = personalQuarterlyObjectives.map(objective => {
        if (objective.perspectiveId === selectedKPI.perspectiveId && objective.name === selectedKPI.objectiveName && objective.initiativeName === selectedKPI.initiativeName) {
          return {
            ...objective,
            KPIs: objective.KPIs.map((kpi, kpiIndex) => kpiIndex === selectedKPI.kpiIndex ? newKPI : kpi)
          }
        }
        return objective;
      })
      setPersonalQuarterlyObjectives(newPersonalQuarterlyObjectives);
      setSelectedKPI(null);

      const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {

        if (target.quarter === quarter) {
          return {
            ...target,
            assessmentStatus: AssessmentStatus.Draft,
            assessmentStatusUpdatedAt: new Date(),
            supervisorId: selectedSupervisor,
            objectives: newPersonalQuarterlyObjectives
          }
        }

        if (quarter === 'Q1' && target.isEditable === false) {
          return {
            ...target,
            assessmentStatus: AssessmentStatus.Draft,
            assessmentStatusUpdatedAt: new Date(),
            isEditable: calculateTotalWeight(newPersonalQuarterlyObjectives) === 100 ? true : false,
            supervisorId: selectedSupervisor,
            objectives: newPersonalQuarterlyObjectives
          }

        }
        return target;
      });

      dispatch(updatePersonalPerformance({
        _id: personalPerformance?._id || '',
        teamId: personalPerformance?.teamId || '',
        annualTargetId: personalPerformance?.annualTargetId || '',
        quarterlyTargets: newPersonalQuarterlyTargets || []
      }));

      setStatus(AssessmentStatus.Draft);
    }
  };

  const handleExportPDF = async () => {
    if (personalQuarterlyObjectives.length > 0) {
      const score = calculateOverallScore(personalQuarterlyObjectives);
      const ratingScore = getRatingScoreInfo(score);
      if (ratingScore) {
        const title = `${user.displayName ? user.displayName : ''} Performance Assessment - ${annualTarget?.name} ${isEnabledTwoQuarterMode ? QUARTER_ALIAS[quarter as keyof typeof QUARTER_ALIAS] : quarter}`;
        exportPdf(PdfType.PerformanceEvaluation, tableRef, title, `Total Weight: ${calculateTotalWeight(personalQuarterlyObjectives)}`, '', [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2],
          { score: `${score} ${ratingScore.name} (${ratingScore.min}-${ratingScore.max})`, color: ratingScore.color });
      } else {
        showToast('No Assessment evaluation found', 'error');
      }
    }
  }

  const handleNotApplicableToggle = async () => {
    const newValue = !isNotApplicable;
    setIsNotApplicable(newValue);

    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
      if (target.quarter === quarter) {
        return {
          ...target,
          isPersonalDevelopmentNotApplicable: newValue
        }
      }
      return target;
    });

    await dispatch(updatePersonalPerformance({
      _id: personalPerformance?._id || '',
      teamId: personalPerformance?.teamId || '',
      annualTargetId: personalPerformance?.annualTargetId || '',
      quarterlyTargets: newPersonalQuarterlyTargets || []
    }));
  };

  // Add new function to check if course is already requested in any quarter
  const isCourseAlreadyRequested = (courseName: string) => {
    return personalPerformance?.quarterlyTargets.some(target =>
      target.personalDevelopment?.some(course => course.name === courseName)
    ) || false;
  };

  const handleAddPersonalDevelopment = async (selectedCourses: Course[]) => {
    // Filter out courses that are already requested in any quarter
    const newCourses = selectedCourses.filter(course => !isCourseAlreadyRequested(course.name));

    if (newCourses.length < selectedCourses.length) {
      // Some courses were filtered out because they were already requested
      console.warn('Some courses were already requested in other quarters and were filtered out');
    }

    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
      if (target.quarter === quarter) {
        return {
          ...target,
          personalDevelopment: [...target.personalDevelopment, ...newCourses].filter((course, index, self) =>
            index === self.findIndex((c) => c._id === course._id)
          )
        }
      }
      return target;
    });

    const updatedPersonalPerformance = await dispatch(updatePersonalPerformance({
      _id: personalPerformance?._id || '',
      teamId: personalPerformance?.teamId || '',
      annualTargetId: personalPerformance?.annualTargetId || '',
      quarterlyTargets: newPersonalQuarterlyTargets || []
    }));

    await dispatch(fetchPersonalPerformances({
      annualTargetId: personalPerformance?.annualTargetId || '',
    }));
  };

  const handleDeleteCourse = async (courseToDelete: Course) => {
    console.log(courseToDelete, 'courseToDelete');

    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
      if (target.quarter === quarter) {
        return {
          ...target,
          personalDevelopment: target.personalDevelopment.filter(course => course._id !== courseToDelete._id)
        }
      }
      return target;
    });

    const updatedPersonalPerformance = await dispatch(updatePersonalPerformance({
      _id: personalPerformance?._id || '',
      teamId: personalPerformance?.teamId || '',
      annualTargetId: personalPerformance?.annualTargetId || '',
      quarterlyTargets: newPersonalQuarterlyTargets || []
    }));

    dispatch(fetchPersonalPerformances({
      annualTargetId: personalPerformance?.annualTargetId || '',
    }));
  };

  const showCommentModal = (initiative: PersonalQuarterlyTargetObjective, kpiIndex: number) => {
    setSelectedComment(initiative.KPIs[kpiIndex].previousAssessmentComment || '');
    setCommentModalOpen(true);
  };

  return (
    <Box>
      <Box sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>

        <ExportButton
          className="pdf"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportPDF}
          size="small"
          sx={{ marginTop: 2 }}
        >
          Export to PDF
        </ExportButton>
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
      <Typography variant="h6">
        {`${annualTarget.name}, ${user?.displayName} Performance Assessment ${isEnabledTwoQuarterMode ? QUARTER_ALIAS[quarter as keyof typeof QUARTER_ALIAS] : quarter}`}
      </Typography>
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
          <Autocomplete
            value={companyUsers.find(user => user.id === selectedSupervisor) || null}
            onChange={(event, newValue) => {
              if (newValue) {
                const event = { target: { value: newValue.id } } as SelectChangeEvent;
                handleSupervisorChange(event);
              }
            }}
            // disabled={!canEdit()}
            options={companyUsers}
            getOptionLabel={(option) => option.name || ''}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Select Supervisor"
                size="small"
              />
            )}
            renderOption={(props, option) => (
              <MenuItem {...props} value={option.id}>
                {option.name}
              </MenuItem>
            )}
            disableClearable
            sx={{
              '& .MuiAutocomplete-inputRoot': {
                '& .MuiAutocomplete-input': {
                  // cursor: !canEdit() ? 'not-allowed' : 'text',
                },
              },
            }}
          />
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'flex-end' }}>
        {personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentReviewStatus === AssessmentReviewStatus.Reviewed && (
          <Chip
            label="PM Committee Reviewed"
            size="medium"
            color="primary"
            sx={{
              height: '30px',
              fontSize: '0.75rem',
              alignSelf: 'center'
            }}
          />
        )}
        {isApproved ? (
          <Chip
            label="Approved"
            size="medium"
            color="success"
            sx={{
              height: '30px',
              fontSize: '0.75rem',
              alignSelf: 'center'
            }}
          />
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {personalQuarterlyObjectives.length > 0 && !isAssessmentsEmpty() && (
              <Chip
                label={status}
                size="medium"
                color={status === AssessmentStatus.SendBack || status === AssessmentStatus.CommitteeSendBack ? 'error' : 'warning'}
                sx={{
                  height: '30px',
                  fontSize: '0.75rem',
                  alignSelf: 'center',
                  cursor: status === AssessmentStatus.CommitteeSendBack ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (status === AssessmentStatus.CommitteeSendBack) {
                    const currentTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
                    if (currentTarget?.assessmentCommitteeSendBackMessage) {
                      setViewSendBackModalOpen(true);
                    }
                  }
                }}
              />
            )}
            <Button
              variant="contained"
              sx={{
                backgroundColor: isSubmitted ? '#EF4444' : '#059669',
                '&:hover': {
                  backgroundColor: isSubmitted ? '#DC2626' : '#047857'
                },
                '&.Mui-disabled': {
                  backgroundColor: '#E5E7EB',
                  color: '#9CA3AF'
                }
              }}
              onClick={() => isSubmitted ? handleRecall() : handleSubmit()}
              disabled={isSubmitting || (!isSubmitted && !canSubmit())}
            >
              {isSubmitting ? 'Processing...' : (isSubmitted ? 'Recall' : 'Submit')}
            </Button>
          </Box>
        )}
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
            color: calculateTotalWeight(personalQuarterlyObjectives) === 100 ? '#059669' : '#DC2626'
          }}
        >
          Total Weight: {calculateTotalWeight(personalQuarterlyObjectives)}%
          {calculateTotalWeight(personalQuarterlyObjectives) > 100 && (
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

      {/* Show helper text only when not submitted */}
      {!isSubmitted && !canSubmit() && (
        <Typography
          variant="caption"
          sx={{
            color: '#DC2626',
            display: 'block',
            mt: 1,
            textAlign: 'right'
          }}
        >
          {!selectedSupervisor ? 'Please select a supervisor' : 'Total weight must be 100%'}
        </Typography>
      )}

      {!areAllKPIsEvaluated() && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please ensure all KPIs are evaluated before submitting.
        </Alert>
      )}

      {/* Performance Assessment Block */}
      <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB', mb: 4 }}>
        <Typography variant="h6" sx={{ p: 3, borderBottom: '1px solid #E5E7EB' }}>
          Employee Performance Assessment
        </Typography>
        <TableContainer>
          <Table ref={tableRef}>
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
                <StyledHeaderCell align="center" className='noprint'>Evidence</StyledHeaderCell>
                <StyledHeaderCell align="center" className='noprint'>Comments</StyledHeaderCell>
                <StyledHeaderCell align="center" className='noprint'>Review</StyledHeaderCell>
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
                            <StyledTableCell align="center"
                              sx={{ color: kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.color }}
                              data-color={kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.color || '#DC2626'}
                            >
                              {
                                kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore)) &&
                                `${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.score} ${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.name} (${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.min} - ${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.max})`
                              }
                            </StyledTableCell>
                            <StyledTableCell align="center" className='noprint'>
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
                            <StyledTableCell align="center" className='noprint'>
                              {kpi.previousAssessmentComment &&
                                <IconButton
                                  size="small"
                                  onClick={() => showCommentModal(initiative, kpiIndex)}
                                  sx={{
                                    color: '#DC2626',
                                    '&:hover': {
                                      backgroundColor: '#FEF2F2',
                                    },
                                  }}
                                >
                                  <DescriptionIcon />
                                </IconButton>}
                            </StyledTableCell>
                            <StyledTableCell align="center" className='noprint'>
                              {canEdit() ? (
                                <AccessButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedKPI({
                                      kpi: kpi,
                                      kpiIndex: kpiIndex,
                                      perspectiveId: perspectiveGroup.perspectiveId,
                                      objectiveName: objectiveGroup.name,
                                      initiativeName: initiative.initiativeName
                                    });
                                  }}
                                >
                                  Review
                                </AccessButton>
                              ) : (
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#6B7280', fontStyle: 'italic' }}
                                >
                                  Not Editable
                                </Typography>
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mt: 2, mb: 4 }}>
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
            editable={canEdit()}
          />

        </Paper>
      )}

      {/* Personal Development Block */}
      {isDevelopmentEnabled && (
        <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <Typography variant="h6" sx={{ p: 3, borderBottom: '1px solid #E5E7EB' }}>
            Employee Personal Development Plan
          </Typography>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#0078D4',
                  '&:hover': {
                    backgroundColor: '#106EBE'
                  },
                  textTransform: 'none'
                }}
                onClick={() => setIsSelectCourseModalOpen(true)}
                disabled={isNotApplicable || !canEdit()}
              >
                Add Personal Development
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  checked={isNotApplicable}
                  onChange={handleNotApplicableToggle}
                  size="small"
                  disabled={!canEdit()}
                />
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  Not Applicable
                </Typography>
              </Box>
            </Box>

            {!isNotApplicable && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledHeaderCell>Course Name</StyledHeaderCell>
                      <StyledHeaderCell>Description</StyledHeaderCell>
                      <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)
                      ?.personalDevelopment?.map((course: any, index) => {
                        return (
                          <TableRow key={course._id}>
                            <StyledTableCell>{course.name}</StyledTableCell>
                            <StyledTableCell>{course.description}</StyledTableCell>
                            <StyledTableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteCourse(course)}
                                sx={{ color: '#6B7280', ml: 1 }}
                                disabled={!canEdit()}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </StyledTableCell>
                          </TableRow>
                        );
                      })}
                    {(!personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.personalDevelopment ||
                      personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.personalDevelopment?.length === 0) && (
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
            )}
          </Box>
        </Paper>
      )}
      {selectedKPI && (
        <KPIModal
          open={!!selectedKPI}
          onClose={() => setSelectedKPI(null)}
          onSave={handleSave}
          selectedKPI={selectedKPI.kpi}
        />
      )}

      {evidenceModalData && (
        <EvidenceModal
          open={!!evidenceModalData}
          onClose={() => setEvidenceModalData(null)}
          evidence={evidenceModalData.evidence}
          attachments={evidenceModalData.attachments}
        />
      )}

      <SelectCourseModal
        open={isSelectCourseModalOpen}
        onClose={() => setIsSelectCourseModalOpen(false)}
        onSelect={handleAddPersonalDevelopment}
        tenantId={user?.tenantId || ''}
        validateCourse={(course) => !isCourseAlreadyRequested(course.name)}
      />

      <ViewSendBackMessageModal
        open={viewSendBackModalOpen}
        onClose={() => setViewSendBackModalOpen(false)}
        emailSubject={`${annualTarget.name}, Performance Assessment ${quarter}(PM Committee Review)`}
        emailBody={personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentCommitteeSendBackMessage || 'No message available'}
      />

      <CommentModal
        open={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        comment={selectedComment}
      />
    </Box >
  );
};

export default PersonalQuarterlyTargetContent;
