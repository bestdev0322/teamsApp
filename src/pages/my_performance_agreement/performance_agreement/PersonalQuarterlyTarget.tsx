import React, { useState, useEffect, useRef } from 'react';
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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Autocomplete,
  TextField,
  InputLabel,
  Select,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { AnnualTarget, QuarterType, QuarterlyTargetKPI, AnnualTargetRatingScale } from '@/types/annualCorporateScorecard';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { PersonalQuarterlyTargetObjective, PersonalPerformance, PersonalQuarterlyTarget, AgreementStatus, PdfType, AgreementReviewStatus } from '../../../types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddInitiativeModal from './AddInitiativeModal';
import RatingScalesModal from '../../../components/RatingScalesModal';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { updatePersonalPerformance } from '../../../store/slices/personalPerformanceSlice';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import ViewSendBackMessageModal from '../../../components/Modal/ViewSendBackMessageModal';
import CommentModal from '../../../components/CommentModal';

import { ExportButton } from '../../../components/Buttons';

import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { exportPdf } from '../../../utils/exportPdf';
import { useToast } from '../../../contexts/ToastContext';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
import { fetchNotifications } from '../../../store/slices/notificationSlice';



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
  const [personalQuarterlyObjectives, setPersonalQuarterlyObjectives] = React.useState<PersonalQuarterlyTargetObjective[]>([]);
  const [isAddInitiativeModalOpen, setIsAddInitiativeModalOpen] = useState(false);
  const [isAddFromExistingOpen, setIsAddFromExistingOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<PersonalQuarterlyTargetObjective | null>(null);
  const [selectedRatingScales, setSelectedRatingScales] = useState<AnnualTargetRatingScale[] | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isAgreementReviewed, setIsAgreementReviewed] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<{ id: string, name: string }[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [initiativeToDelete, setInitiativeToDelete] = useState<PersonalQuarterlyTargetObjective | null>(null);
  const [status, setStatus] = useState<AgreementStatus | null>(null);
  const tableRef = useRef();
  const { user } = useAuth();
  const notifications = useAppSelector((state: RootState) => state.notification.notifications);


  // Add state for the dialog
  const [sourceScorecardId, setSourceScorecardId] = useState('');
  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const [viewSendBackModalOpen, setViewSendBackModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState('');

  useEffect(() => {
    fetchCompanyUsers();
  }, []);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    if (personalPerformance) {
      setPersonalQuarterlyObjectives(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.objectives || []);
      const supervisorId = personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.supervisorId || '';
      if (companyUsers.some(user => user.id === supervisorId)) {
        setSelectedSupervisor(supervisorId);
      } else {
        setSelectedSupervisor('');
      }
      setIsSubmitted(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.agreementStatus === AgreementStatus.Submitted);
      setIsApproved(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.agreementStatus === AgreementStatus.Approved);
      setIsAgreementReviewed(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.agreementReviewStatus === AgreementReviewStatus.Reviewed);
      setStatus(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.agreementStatus);
    }
  }, [personalPerformance, companyUsers, quarter]);

  const fetchCompanyUsers = async () => {
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
  }

  const handleSupervisorChange = (event: SelectChangeEvent) => {
    setSelectedSupervisor(event.target.value);
    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
      if (target.quarter === quarter) {
        return {
          ...target,
          supervisorId: event.target.value,
          agreementStatus: AgreementStatus.Draft,
          agreementStatusUpdatedAt: new Date(),
        }
      }

      if (quarter === 'Q1' && target.isEditable === false) {
        return {
          ...target,
          supervisorId: event.target.value,
          agreementStatus: AgreementStatus.Draft,
          agreementStatusUpdatedAt: new Date(),
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

    setStatus(AgreementStatus.Draft);

  };

  const handleEdit = (objective: PersonalQuarterlyTargetObjective) => {
    setEditingObjective(objective);
    setIsAddInitiativeModalOpen(true);
  };

  const handleInitiativeSave = async (data: {
    perspectiveId: number;
    objectiveName: string;
    initiative: string;
    kpis: QuarterlyTargetKPI[];
  }) => {
    const newObjective: PersonalQuarterlyTargetObjective = {
      perspectiveId: data.perspectiveId,
      name: data.objectiveName,
      initiativeName: data.initiative,
      KPIs: data.kpis,
    };

    let newPersonalQuarterlyObjectives = [...personalQuarterlyObjectives];

    if (editingObjective) {
      newPersonalQuarterlyObjectives = newPersonalQuarterlyObjectives.map(obj =>
        (obj.name === editingObjective.name &&
          obj.initiativeName === editingObjective.initiativeName &&
          obj.perspectiveId === editingObjective.perspectiveId)
          ? newObjective
          : obj
      );
      setPersonalQuarterlyObjectives(newPersonalQuarterlyObjectives);
    } else {
      newPersonalQuarterlyObjectives.push(newObjective);
      setPersonalQuarterlyObjectives(newPersonalQuarterlyObjectives);
    }

    setEditingObjective(null);
    setIsAddInitiativeModalOpen(false);
    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
      if (target.quarter === quarter) {
        return {
          ...target,
          agreementStatus: AgreementStatus.Draft,
          agreementStatusUpdatedAt: new Date(),
          supervisorId: selectedSupervisor,
          objectives: newPersonalQuarterlyObjectives
        }
      }

      if (quarter === 'Q1' && target.isEditable === false) {
        return {
          ...target,
          agreementStatus: AgreementStatus.Draft,
          agreementStatusUpdatedAt: new Date(),
          isEditable: calculateTotalWeight(newPersonalQuarterlyObjectives) === 100 ? true : false,
          supervisorId: selectedSupervisor,
          objectives: newPersonalQuarterlyObjectives
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
    setStatus(AgreementStatus.Draft);
  };

  const handleViewRatingScales = (kpi: QuarterlyTargetKPI) => {
    setSelectedRatingScales(kpi.ratingScales);
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
      const agreementNotification = notifications.find((n: any) => 
        n.type === 'resolve_agreement' && 
        n.annualTargetId === personalPerformance?.annualTargetId &&
        n.quarter === quarter
      );

      if (agreementNotification) {
        await api.post(`/notifications/read/${agreementNotification._id}`);
      }

      const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
        if (target.quarter === quarter) {
          return {
            ...target,
            agreementStatus: AgreementStatus.Submitted,
            agreementStatusUpdatedAt: new Date(),
            supervisorId: selectedSupervisor,
            objectives: personalQuarterlyObjectives
          }
        }

        if (quarter === 'Q1' && target.isEditable === false && calculateTotalWeight(personalQuarterlyObjectives) <= 100) {
          return {
            ...target,
            agreementStatus: AgreementStatus.Draft,
            agreementStatusUpdatedAt: new Date(),
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
        await api.post('/notifications/agreement/submit', {
          recipientId: selectedSupervisor,
          annualTargetId: personalPerformance?.annualTargetId || '',
          quarter: quarter,
          personalPerformanceId: personalPerformance?._id || ''
        });
        showToast('Performance agreement submitted successfully', 'success');
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        showToast('Performance agreement submitted successfully, but email notification failed', 'success');
      }

      setIsSubmitted(true);
      setStatus(AgreementStatus.Submitted);
    } catch (error) {
      console.error('Error submitting quarterly target:', error);
      showToast('Failed to submit performance agreement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleRecall = async () => {
    if (hasAnyAgreementComment()) {
      showToast('You cannot recall as Supervisor is busy reviewing your agreement or assessment.', 'error');
      return;
    }

    setIsSubmitting(true);
    const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
      if (target.quarter === quarter) {
        return {
          ...target,
          agreementStatus: target.isAgreementCommitteeSendBack ? AgreementStatus.CommitteeSendBack : AgreementStatus.Draft,
          agreementStatusUpdatedAt: new Date(),
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
        await api.post('/notifications/agreement/recall', {
          recipientId: selectedSupervisor,
          annualTargetId: personalPerformance?.annualTargetId || '',
          quarter: quarter,
          personalPerformanceId: personalPerformance?._id || ''
        });
        showToast('Performance agreement recalled successfully', 'success');
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        showToast('Performance agreement recalled successfully, but email notification failed', 'success');
      }

      setIsSubmitted(false);
      const currentTarget = newPersonalQuarterlyTargets?.find(target => target.quarter === quarter);
      setStatus(currentTarget?.isAgreementCommitteeSendBack ? AgreementStatus.CommitteeSendBack : AgreementStatus.Draft);
    } catch (error) {
      console.error('Error recalling quarterly target:', error);
      showToast('Failed to recall performance agreement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add date validation function
  const isWithinPeriod = () => {
    const contractingPeriod = annualTarget.content.contractingPeriod[quarter];
    if (!contractingPeriod) return false;

    const today = new Date();
    const startDate = new Date(contractingPeriod.startDate);
    const endDate = new Date(contractingPeriod.endDate);

    return today >= startDate && today <= endDate;
  };

  // Update canEdit function to also check submission status
  const canEdit = () => {
    const quarterlyTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
    return isWithinPeriod() &&
      quarterlyTarget?.isEditable !== false &&
      !isSubmitted && !isApproved
  };

  // Add validation function for submit button
  const canSubmit = () => {
    return selectedSupervisor !== '' && calculateTotalWeight(personalQuarterlyObjectives) === 100 && !isApproved;
  };

  const handleDeleteConfirm = async () => {
    if (initiativeToDelete) {
      // Update local state
      const updatedObjectives = personalQuarterlyObjectives.filter(obj =>
        !(obj.name === initiativeToDelete.name &&
          obj.initiativeName === initiativeToDelete.initiativeName &&
          obj.perspectiveId === initiativeToDelete.perspectiveId)
      );

      setPersonalQuarterlyObjectives(updatedObjectives);

      // Update Redux state
      const newPersonalQuarterlyTargets = personalPerformance?.quarterlyTargets.map((target: PersonalQuarterlyTarget) => {
        if (target.quarter === quarter) {
          return {
            ...target,
            objectives: updatedObjectives
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

      setDeleteConfirmOpen(false);
      setInitiativeToDelete(null);
    }
  };

  const handleExportPDF = async () => {
    const title = `${user.displayName} Performance Agreement - ${annualTarget?.name} ${isEnabledTwoQuarterMode ? QUARTER_ALIAS[quarter as keyof typeof QUARTER_ALIAS] : quarter}`;
    if (personalQuarterlyObjectives.length > 0) {
      exportPdf(PdfType.PerformanceEvaluation, tableRef, title, `Total Weight: ${calculateTotalWeight(personalQuarterlyObjectives)}`, '', [0.15, 0.15, 0.2, 0.1, 0.2, 0.1, 0.1]);
    }
  }

  const handleAddFromExisting = async () => {
    if (!sourceScorecardId) return;

    try {
      const response = await api.post('/personal-performance/copy-initiatives', {
        sourceScorecardId,
        targetPerformanceId: personalPerformance?._id,
      });

      // Update the redux store with the response data
      dispatch(updatePersonalPerformance(response.data.data));

      // Update local state with the new objectives
      const updatedQuarterlyTarget = response.data.data.quarterlyTargets.find(
        (target: PersonalQuarterlyTarget) => target.quarter === quarter
      );
      setPersonalQuarterlyObjectives(updatedQuarterlyTarget?.objectives || []);

      setIsAddFromExistingOpen(false);
      setSourceScorecardId('');
    } catch (error) {
      console.error('Error copying initiatives:', error);
    }
  };

  const canAddFromExisting = quarter === 'Q1' && personalQuarterlyObjectives.length === 0;

  const hasAnyAgreementComment = () => {
    return personalQuarterlyObjectives.some(objective =>
      objective.KPIs.some(kpi => {
        return kpi.agreementComment !== undefined && kpi.agreementComment.trim() !== '';
      })
    );
  };

  const showCommentModal = (initiative: PersonalQuarterlyTargetObjective, kpiIndex: number) => {
    setSelectedComment(initiative.KPIs[kpiIndex].previousAgreementComment || '');
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
        {`${annualTarget.name}, ${user?.displayName} Performance Agreement ${isEnabledTwoQuarterMode ? QUARTER_ALIAS[quarter as keyof typeof QUARTER_ALIAS] : quarter}`}
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
          {companyUsers.length > 0 ? (
            <Autocomplete
              value={companyUsers.find(user => user.id === selectedSupervisor) || null}
              onChange={(event, newValue) => {
                if (newValue) {
                  const event = { target: { value: newValue.id } } as SelectChangeEvent;
                  handleSupervisorChange(event);
                }
              }}
              disabled={!canEdit()}
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
                    cursor: !canEdit() ? 'not-allowed' : 'text',
                  },
                },
              }}
            />
          ) : (
            <TextField
              value=""
              placeholder="No supervisors available"
              size="small"
              disabled
            />
          )}
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {canEdit() && (
            <>
              <Button
                onClick={() => setIsAddInitiativeModalOpen(true)}
                variant="outlined"
                color="primary"
                sx={{
                  minWidth: '100px',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
              >
                Add Initiative / KPA
              </Button>
              {canAddFromExisting && (
                <Button
                  onClick={() => setIsAddFromExistingOpen(true)}
                  variant="outlined"
                  color="primary"
                  sx={{
                    minWidth: '100px',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                >
                  Add from Existing Initiatives
                </Button>
              )}
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isAgreementReviewed && (
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
              {
                personalQuarterlyObjectives.length > 0 &&
                <Chip
                  label={status}
                  size="medium"
                  color={status == 'Send Back' || status == 'Committee Send Back' ? 'error' : 'warning'}
                  sx={{
                    height: '30px',
                    fontSize: '0.75rem',
                    alignSelf: 'center',
                    cursor: status == 'Committee Send Back' ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (status === 'Committee Send Back') {
                      const currentTarget = personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter);
                      if (currentTarget?.agreementCommitteeSendBackMessage) {
                        setViewSendBackModalOpen(true);
                      }
                    }
                  }}
                />
              }
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
          Total Weight: {Math.round(calculateTotalWeight(personalQuarterlyObjectives) * 1000) / 1000}%
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

      <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
        <TableContainer>
          <Table ref={tableRef}>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Perspective</StyledHeaderCell>
                <StyledHeaderCell>Strategic Objective</StyledHeaderCell>
                <StyledHeaderCell>Initiative/KPA</StyledHeaderCell>
                <StyledHeaderCell align="center">Weight %</StyledHeaderCell>
                <StyledHeaderCell>Key Performance Indicator</StyledHeaderCell>
                <StyledHeaderCell align="center">Baseline</StyledHeaderCell>
                <StyledHeaderCell align="center">Target</StyledHeaderCell>
                <StyledHeaderCell align="center" className='noprint'>Rating Agreement</StyledHeaderCell>
                <StyledHeaderCell align="center" className='noprint'>Comments</StyledHeaderCell>
                <StyledHeaderCell align="center" className='noprint'>Actions</StyledHeaderCell>
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
                            <StyledTableCell align="center" className='noprint'>
                              <IconButton
                                size="small"
                                onClick={() => handleViewRatingScales(kpi)}
                                sx={{
                                  borderColor: '#E5E7EB',
                                  color: '#374151',
                                  '&:hover': {
                                    borderColor: '#D1D5DB',
                                    backgroundColor: '#F9FAFB',
                                  },
                                }}
                              >
                                <DescriptionIcon />
                              </IconButton>
                            </StyledTableCell>
                            <StyledTableCell align="center" className='noprint'>
                              {kpi.previousAgreementComment &&
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
                            {kpiIndex === 0 && (
                              <StyledTableCell align="center" rowSpan={initiative.KPIs.length} className='noprint'>
                                {canEdit() ? (
                                  <Stack direction="row" spacing={1} justifyContent="center">
                                    <IconButton
                                      size="small"
                                      sx={{ color: '#6B7280' }}
                                      onClick={() => handleEdit(initiative)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      sx={{ color: '#6B7280' }}
                                      onClick={() => {
                                        setInitiativeToDelete(initiative);
                                        setDeleteConfirmOpen(true);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: '#6B7280',
                                      fontStyle: 'italic'
                                    }}
                                  >
                                    Not Editable
                                  </Typography>
                                )}
                              </StyledTableCell>
                            )}
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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>

      </Box>

      {isAddInitiativeModalOpen && (
        <AddInitiativeModal
          open={isAddInitiativeModalOpen}
          onClose={() => {
            setEditingObjective(null);
            setIsAddInitiativeModalOpen(false);
          }}
          annualTarget={annualTarget}
          onSave={handleInitiativeSave}
          editingObjective={editingObjective}
          personalQuarterlyObjectives={personalQuarterlyObjectives}
        />
      )}

      {selectedRatingScales && (
        <RatingScalesModal
          open={!!selectedRatingScales}
          onClose={() => setSelectedRatingScales(null)}
          ratingScales={selectedRatingScales}
        />
      )}

      {/* Add confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setInitiativeToDelete(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this objective? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteConfirmOpen(false);
              setInitiativeToDelete(null);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add the dialog for copying initiatives */}
      <Dialog
        open={isAddFromExistingOpen}
        onClose={() => setIsAddFromExistingOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add from Existing Initiatives</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, minWidth: 400 }}>
            <FormControl fullWidth>
              <InputLabel>Select Annual Target</InputLabel>
              <Select
                value={sourceScorecardId}
                onChange={(e) => setSourceScorecardId(e.target.value)}
                label="Select Annual Target"
              >
                {annualTargets.map((target) => (
                  <MenuItem key={target._id} value={target._id}>
                    {target.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddFromExistingOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddFromExisting}
            variant="contained"
            disabled={!sourceScorecardId}
          >
            Copy Initiatives
          </Button>
        </DialogActions>
      </Dialog>

      <ViewSendBackMessageModal
        open={viewSendBackModalOpen}
        onClose={() => setViewSendBackModalOpen(false)}
        emailSubject={`${annualTarget.name}, Performance Agreement ${quarter}(PM Committee Review)`}
        emailBody={personalPerformance?.quarterlyTargets.find(target => target.quarter === quarter)?.agreementCommitteeSendBackMessage || 'No message available'}
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
