import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
  styled,
  SelectChangeEvent,
  Typography,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { fetchTeamPerformances } from '../../../store/slices/personalPerformanceSlice';
import { TeamPerformance, PersonalQuarterlyTargetObjective, PdfType, AnnualTarget, QuarterType } from '../../../types';

import { ExportButton } from '../../../components/Buttons';
import { useAuth } from '../../../contexts/AuthContext';

import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { exportPdf } from '../../../utils/exportPdf';
import { StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { api } from '../../../services/api';
import { enableTwoQuarterMode } from '../../../utils/quarterMode';

const StyledFormControl = styled(FormControl)({
  backgroundColor: '#fff',
  borderRadius: '8px',
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#E5E7EB',
    },
    '&:hover fieldset': {
      borderColor: '#D1D5DB',
    },
  },
});

const TeamPerformances: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [enableFeedback, setEnableFeedback] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
  const teamPerformancesByTarget = useAppSelector((state: RootState) => state.personalPerformance.teamPerformancesByTarget);
  const feedbackTemplates = useAppSelector((state: RootState) => state.feedback.feedbacks);
  const tableRef = useRef();
  const { user } = useAuth();

  useEffect(() => {
    dispatch(fetchAnnualTargets());
    checkFeedbackModule();
  }, [dispatch]);

  const checkFeedbackModule = async () => {
    const isModuleEnabled = await api.get('/module/Feedback/is-enabled');
    if (isModuleEnabled.data.data.isEnabled) {
      setEnableFeedback(true);
    }
  }

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowTable(false);
  };

  const handleView = async () => {
    if (selectedAnnualTargetId) {
      await dispatch(fetchTeamPerformances(selectedAnnualTargetId));
      setShowTable(true);
    }
  };

  const calculateFeedbackOverallScore = (quarter: QuarterType, performance: TeamPerformance) => {
    const target = performance.quarterlyTargets.find(t => t.quarter === quarter);
    const selectedFeedbackId = target?.selectedFeedbackId;
    const feedbackResponses = target?.feedbacks.filter(f => f.feedbackId === selectedFeedbackId) || [];
    const feedbackTemplate = feedbackTemplates.find(f => f._id === selectedFeedbackId);

    if (!feedbackTemplate || feedbackResponses.length === 0) return '-';

    let totalWeightedScore = 0;
    let totalWeight = 0;

    feedbackTemplate.dimensions.forEach(dimension => {
      let totalDimensionScore = 0;
      let totalDimensionResponses = 0;
      // Get all questions for this dimension
      const dimensionQuestions = feedbackTemplate.dimensions
        .find(d => d.name === dimension.name)?.questions || [];

      // For each question in the dimension
      dimensionQuestions.forEach(question => {
        feedbackResponses.forEach(feedback => {
          const response = feedback.feedbacks.find(f =>
            f.dimension === dimension.name && f.question === question
          );
          if (response?.response.score) {
            totalDimensionScore += response.response.score;
            totalDimensionResponses++;
          }
        });
      });
      const dimensionScore = totalDimensionScore / totalDimensionResponses;
      totalWeightedScore += dimensionScore * (dimension.weight / 100);
      totalWeight += dimension.weight / 100;
    });


    if (totalWeight === 0) return '-';
    return totalWeightedScore.toFixed(2);
  };

  const calculateFinalScore = (quarter: QuarterType, overallScore: number, performance: TeamPerformance) => {
    const target = performance.quarterlyTargets.find(t => t.quarter === quarter);
    const selectedFeedbackId = target?.selectedFeedbackId;
    const feedbackOverallScore = calculateFeedbackOverallScore(quarter, performance);
    const selectedFeedback = feedbackTemplates.find(f => f._id === selectedFeedbackId);
    const contributionScorePercentage = selectedFeedback?.contributionScorePercentage || 0;
    if(selectedFeedback?.status === 'Active' && selectedFeedback?.enableFeedback.some(ef => ef.quarter === quarter && ef.enable)){
      const finalScore = (Number(feedbackOverallScore) * (contributionScorePercentage / 100)) + (Number(overallScore) * (1 - contributionScorePercentage / 100));
      return finalScore;
    }
    return overallScore;
  }

  const calculateQuarterScore = (objectives: PersonalQuarterlyTargetObjective[]) => {
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

  const getRatingScaleInfo = (score: number | null, annualTarget: AnnualTarget) => {
    if (!score) return null;

    return annualTarget.content.ratingScales.find(
      scale => scale.score === score
    );
  };

  const handleExportPDF = async () => {
    if (teamPerformancesByTarget[selectedAnnualTargetId].length > 0) {
      const title = `${user.organizationName} Overall Performances - ${annualTargets.find(target => target._id === selectedAnnualTargetId)?.name}`;
      exportPdf(PdfType.PerformanceEvaluation, tableRef, title, '', '', [0.1, 0.1, 0.05, 0.15, 0.15, 0.15, 0.15, 0.15]);
    }
  }

  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <StyledFormControl fullWidth>
          <Select
            value={selectedAnnualTargetId}
            onChange={handleScorecardChange}
            displayEmpty
            sx={{ backgroundColor: '#fff' }}
          >
            {annualTargets.map((target) => (
              <MenuItem key={target._id} value={target._id}>
                {target.name}
              </MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <Button
          variant="contained"
          onClick={handleView}
          disabled={!selectedAnnualTargetId}
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': { backgroundColor: '#106EBE' },
          }}
        >
          View
        </Button>
      </Box>



      {showTable && (
        <Paper sx={{ boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <ExportButton
            className="pdf"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportPDF}
            size="small"
            sx={{ margin: 2 }}
          >
            Export to PDF
          </ExportButton>
          <Table ref={tableRef}>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Full Name</StyledHeaderCell>
                <StyledHeaderCell>Job Title</StyledHeaderCell>
                <StyledHeaderCell>Team</StyledHeaderCell>
                {
                  enableTwoQuarterMode(annualTargets.find(target => target._id === selectedAnnualTargetId)?.content.quarterlyTarget.quarterlyTargets.filter(qt => qt.editable).map((quarter, index) => (
                    quarter.quarter
                  )), user?.isTeamOwner || user?.role === 'SuperUser').map((quarter) => (
                    <StyledHeaderCell key={quarter.key}>{quarter.alias} Overall Performance Score</StyledHeaderCell>
                  ))
                  }
                <StyledHeaderCell>Overall Annual Performance Score</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamPerformancesByTarget[selectedAnnualTargetId].map((performance: TeamPerformance, index: number) => {
                const quarterScores = performance.quarterlyTargets
                .filter(quarter => !(user?.isTeamOwner || user?.role === 'SuperUser')?annualTargets.find(target => target._id === selectedAnnualTargetId)?.content.quarterlyTarget.quarterlyTargets.find(qt => qt.quarter === quarter.quarter)?.editable:quarter)
                .map(quarter => {
                  const isFeedbackEnabled = feedbackTemplates
                  .find(template => template._id === (quarter.selectedFeedbackId ?? quarter.feedbacks[0]?.feedbackId) && template.status === 'Active')
                  ?.enableFeedback
                    .find(ef => ef.quarter === quarter.quarter && ef.enable)?.enable;
                  if (enableFeedback) {
                    return isFeedbackEnabled
                      ? calculateFinalScore(quarter.quarter, calculateQuarterScore(quarter.objectives), performance)
                      : calculateQuarterScore(quarter.objectives)
                  } else {
                    return calculateQuarterScore(quarter.objectives)
                  }
                });

                const validScores = quarterScores.filter(score => score) as number[];
                const annualScore = validScores.length === quarterScores.length
                  ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
                  : null;

                return (
                  <TableRow key={performance._id}>
                    <StyledTableCell>{performance.fullName}</StyledTableCell>
                    <StyledTableCell>{performance.jobTitle}</StyledTableCell>
                    <StyledTableCell>{performance.team}</StyledTableCell>
                    {quarterScores.map((score, idx) => {
                      const ratingScale = getRatingScaleInfo(Math.round(Number(score)), annualTargets.find(target => target._id === selectedAnnualTargetId) as AnnualTarget);
                      return (
                        <StyledTableCell key={idx}
                          data-color={ratingScale?.color || '#DC2626'}
                        >
                          <Typography sx={{ color: ratingScale?.color }}>
                            {ratingScale ? `${Math.round(Number(score))} ${ratingScale.name} (${ratingScale.min}-${ratingScale.max})` : 'N/A'}
                          </Typography>
                        </StyledTableCell>
                      )
                    })}
                    {(() => {
                      const ratingScale = getRatingScaleInfo(annualScore, annualTargets.find(target => target._id === selectedAnnualTargetId) as AnnualTarget);
                      return (
                        <StyledTableCell data-color={ratingScale?.color || '#DC2626'}>
                          <Typography sx={{ color: ratingScale?.color }}
                          >
                            {ratingScale ? `${annualScore} ${ratingScale.name} (${ratingScale.min}-${ratingScale.max})` : 'N/A'}
                          </Typography>
                        </StyledTableCell>
                      );
                    })()}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default TeamPerformances;
