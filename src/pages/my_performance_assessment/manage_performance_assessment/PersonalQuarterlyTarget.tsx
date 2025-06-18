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
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { AnnualTarget, QuarterType, QuarterlyTargetObjective, AnnualTargetRatingScale } from '@/types/annualCorporateScorecard';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { PersonalQuarterlyTargetObjective, PersonalPerformance, AssessmentStatus, AssessmentReviewStatus } from '../../../types/personalPerformance';
import { api } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import EvidenceModal from './EvidenceModal';
import SendBackModal from '../../../components/Modal/SendBackModal';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
import CommentModal from '../../../components/CommentModal';

interface CompanyUser {
    id: string;
    fullName: string;
    jobTitle: string;
    team: string;
    teamId: string
}

interface PersonalQuarterlyTargetProps {
    annualTarget: AnnualTarget;
    quarter: QuarterType;
    isEnabledTwoQuarterMode: boolean;
    onBack?: () => void;
    userId: string;
    userName: string;
}

const PersonalQuarterlyTargetContent: React.FC<PersonalQuarterlyTargetProps> = ({
    annualTarget,
    quarter,
    isEnabledTwoQuarterMode,
    onBack,
    userId,
    userName
}) => {
    const [selectedSupervisor, setSelectedSupervisor] = React.useState('');
    const [personalQuarterlyObjectives, setPersonalQuarterlyObjectives] = React.useState<PersonalQuarterlyTargetObjective[]>([]);
    const [personalPerformance, setPersonalPerformance] = React.useState<PersonalPerformance | null>(null);
    const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
    const [evidenceModalData, setEvidenceModalData] = useState<{
        evidence: string;
        attachments: Array<{ name: string; url: string }>;
    } | null>(null);
    const [isApproved, setIsApproved] = useState(false);
    const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [selectedComment, setSelectedComment] = useState('');

    const fetchCompanyUsers = useCallback(async () => {
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
    }, []);

    const fetchPersonalPerformance = useCallback(async () => {
        try {
            const response = await api.get(`/personal-performance/personal-performance/`, {
                params: {
                    userId: userId,
                    annualTargetId: annualTarget._id,
                }
            });

            if (response.status === 200) {
                setPersonalPerformance(response.data.data);
                setIsApproved(response.data.data.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentStatus === AssessmentStatus.Approved);
            }
        } catch (error) {
            console.error('Personal performance error:', error);
        }
    }, [userId, annualTarget._id, quarter]);

    useEffect(() => {
        fetchPersonalPerformance();
        fetchCompanyUsers();
    }, [fetchPersonalPerformance, fetchCompanyUsers]);

    useEffect(() => {
        if (personalPerformance) {
            setPersonalQuarterlyObjectives(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.objectives || []);
            const supervisorId = personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.supervisorId || '';
            if (companyUsers.some(user => user.id === supervisorId)) {
                setSelectedSupervisor(supervisorId);
            } else {
                setSelectedSupervisor('');
            }
            setIsApproved(personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.assessmentStatus === AssessmentStatus.Approved);
        }
    }, [personalPerformance, companyUsers, quarter]);

    const calculateTotalWeight = () => {
        return personalQuarterlyObjectives.reduce((total, objective) => {
            const totalWeight = objective.KPIs.reduce((sum, kpi) => sum + kpi.weight, 0);
            return total + totalWeight;
        }, 0);
    };

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

    const getRatingScaleInfo = (score: number | null) => {
        if (!score || !annualTarget) return null;

        return annualTarget.content.ratingScales.find(
            scale => scale.score === score
        );
    };

    const handleSendBack = (emailSubject: string, emailBody: string) => {
        if (personalPerformance) {
            setIsSubmitting(true);
            (async () => {
                try {
                    try {
                        // Then try to send the email notification
                        const response = await api.post(`/personal-performance/send-back`, {
                            emailSubject,
                            emailBody,
                            supervisorId: personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.supervisorId,
                            userId: personalPerformance.userId,
                            manageType: 'Assessment',
                            performanceId: personalPerformance._id,
                            quarter: quarter
                        });

                        if (response.status === 200) {
                            showToast('Performance assessment sent back successfully', 'success');
                            onBack?.();
                        }
                    } catch (emailError) {
                        console.error('Error sending email notification:', emailError);
                        showToast('Performance assessment sent back successfully, but email notification failed', 'success');
                        onBack?.();
                    }
                } catch (error) {
                    console.error('Error updating assessment status:', error);
                    showToast('Failed to send back performance assessment', 'error');
                } finally {
                    setIsSubmitting(false);
                }
            })();
        }
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
                <Typography variant="h6">
                    {`${annualTarget.name}, ${userName} Performance Assessment ${isEnabledTwoQuarterMode ? QUARTER_ALIAS[quarter as keyof typeof QUARTER_ALIAS] : quarter}`}
                </Typography>
            </Box>

            <Box sx={{
                mb: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
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
            {isApproved && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
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
                        <Chip
                            label={'Approved'}
                            size="medium"
                            color={'success'}
                            sx={{
                                height: '30px',
                                fontSize: '0.75rem',
                                alignSelf: 'center'
                            }}
                        />
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
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : 'Send Back'}
                        </Button>
                    </Box>
                </Box>
            )}

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
                        color: calculateTotalWeight() > 100 ? '#DC2626' : '#374151'
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
                                <StyledHeaderCell align="center">Comments</StyledHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(() => {
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

                                return Object.values(groups).map(perspectiveGroup => {
                                    let firstInPerspective = true;
                                    const perspectiveRowSpan = Object.values(perspectiveGroup.objectives)
                                        .reduce((sum, obj) => sum + obj.initiatives.reduce((kpiSum, initiative) =>
                                            kpiSum + initiative.KPIs.length, 0), 0);

                                    return Object.values(perspectiveGroup.objectives).map(objectiveGroup => {
                                        let firstInObjective = true;
                                        const objectiveRowSpan = objectiveGroup.initiatives.reduce((sum, initiative) =>
                                            sum + initiative.KPIs.length, 0);

                                        return objectiveGroup.initiatives.map((initiative) =>
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
                    const ratingScale = getRatingScaleInfo(score);

                    if (!score || !ratingScale) {
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
                            color: ratingScale.color,
                            fontWeight: 600,
                            px: 2,
                            py: 0.5,
                            borderRadius: 1
                        }}>
                            {`${score} ${ratingScale.name} (${ratingScale.min}-${ratingScale.max})`}
                        </Typography>
                    );
                })()}
            </Box>

            <SendBackModal
                open={sendBackModalOpen}
                onClose={() => setSendBackModalOpen(false)}
                onSendBack={handleSendBack}
                title="Send Back Email"
                emailSubject={`${annualTarget.name} - Performance Agreement ${quarter}`}
            />
            {evidenceModalData && (
                <EvidenceModal
                    open={!!evidenceModalData}
                    onClose={() => setEvidenceModalData(null)}
                    evidence={evidenceModalData.evidence}
                    attachments={evidenceModalData.attachments}
                />
            )}
            <CommentModal
                open={commentModalOpen}
                onClose={() => setCommentModalOpen(false)}
                comment={selectedComment}
            />
        </Box>
    );
};

export default PersonalQuarterlyTargetContent;
