import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { TeamPerformance, AnnualTarget, QuarterlyTargetObjective, QuarterType } from '../../../types';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { PersonalPerformance } from '../../../types/personalPerformance';
import { api } from '../../../services/api';
import { fetchFeedback } from '../../../store/slices/feedbackSlice';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';

interface HeatmapByTeamProps {
  teamPerformances: TeamPerformance[];
  selectedQuarter: string;
  selectedAnnualTarget?: AnnualTarget;
  viewMode: 'teamPerformance' | 'completion' | 'strategyMap' | 'strategyExecution'| '';
}

interface TeamTableRow {
  teamName: string;
  agreement: number;
  assessment: number;
  performance: number | null;
}

interface RatingScaleInfo {
  color: string;
  min: string;
  max: string;
  name: string;
}

export const HeatmapByTeam: React.FC<HeatmapByTeamProps> = ({
  teamPerformances,
  selectedQuarter,
  selectedAnnualTarget,
  viewMode
}) => {
  const feedbackTemplates = useAppSelector((state: RootState) => state.feedback.feedbacks);
  const [enableFeedback, setEnableFeedback] = useState(false);
  const dispatch = useAppDispatch();

  const checkFeedbackModule = async () => {
    const isModuleEnabled = await api.get('/module/Feedback/is-enabled');
    if (isModuleEnabled.data.data.isEnabled) {
      setEnableFeedback(true);
    }
  }

  useEffect(() => {
    checkFeedbackModule();
    dispatch(fetchFeedback());
  }, [dispatch]);

  if (!selectedQuarter || !selectedAnnualTarget) {
    return null;
  }

  const teams = Array.from(new Set(teamPerformances.map(performance => performance.team))).sort();

  // Calculate agreement percentages
  const agreementResult = teams.map(team => {
    const agreementStatus = teamPerformances
      .filter(p => p.team === team)
      .map(performance => performance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter)?.agreementStatus);
    const approvedCount = agreementStatus.filter(tmp => tmp === 'Approved').length;
    const totalCount = agreementStatus.length;
    return totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  });

  // Calculate assessment percentages
  const assessmentResult = teams.map(team => {
    const assessmentStatus = teamPerformances
      .filter(p => p.team === team)
      .map(performance => performance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter)?.assessmentStatus);
    const approvedCount = assessmentStatus.filter(tmp => tmp === 'Approved').length;
    const totalCount = assessmentStatus.length;
    return totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  });

  // Calculate performance scores
  const getPersonalPerformanceScore = (objectives: QuarterlyTargetObjective[]) => {
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

  const calculateFeedbackOverallScore = (quarter: QuarterType, performance: TeamPerformance) => {
    const target = performance?.quarterlyTargets.find(t => t.quarter === quarter);
    const selectedFeedbackId = target?.selectedFeedbackId;
    const feedbackResponses = target?.feedbacks.filter(f => f.feedbackId === selectedFeedbackId) || [];
    const feedbackTemplate = feedbackTemplates.find(f => f._id === selectedFeedbackId);

    if (!feedbackTemplate || feedbackResponses.length === 0) return null;

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

    return totalWeightedScore;
  };

  const performanceResult = teams.map(team => {
    const ownerPerformance = teamPerformances.find(p => p.team === team && p.isTeamOwner);
    const quarterlyTarget = ownerPerformance?.quarterlyTargets.find(qt => qt.quarter === selectedQuarter);
    const overallScore = quarterlyTarget ? getPersonalPerformanceScore(quarterlyTarget.objectives) : null;

    if (enableFeedback) {
      const selectedFeedbackId = quarterlyTarget?.selectedFeedbackId;
      const feedbackTemplate = feedbackTemplates.find(f => f._id === selectedFeedbackId);
      if (feedbackTemplate?.status === 'Active' && feedbackTemplate?.enableFeedback.some(ef => ef.quarter === selectedQuarter && ef.enable)) {
        const contribution = feedbackTemplate?.contributionScorePercentage;
        const feedbackOverallScore = calculateFeedbackOverallScore(selectedQuarter as QuarterType, ownerPerformance as TeamPerformance);
        const finalScore = (overallScore && feedbackOverallScore) ? (overallScore * (1 - contribution / 100)) + (feedbackOverallScore * (contribution / 100)) : null;
        return Number(finalScore?.toFixed(0));
      } else {
        return overallScore;
      }
    }
    return overallScore;
  });

  const getRatingScaleInfo = (score: number | null): RatingScaleInfo => {
    if (score === null) {
      return {
        color: '#666666',
        min: '0',
        max: '0',
        name: 'N/A'
      };
    }

    const ratingScale = selectedAnnualTarget.content.ratingScales.find(
      scale => scale.score === score
    );

    if (!ratingScale) {
      return {
        color: '#666666',
        min: '0',
        max: '0',
        name: 'N/A'
      };
    }

    return {
      color: ratingScale.color,
      min: ratingScale.min,
      max: ratingScale.max,
      name: ratingScale.name
    };
  };

  const teamsTable: TeamTableRow[] = teams.filter(team => team !== undefined).map((team, index) => ({
    teamName: team,
    agreement: agreementResult[index],
    assessment: assessmentResult[index],
    performance: performanceResult[index]
  }));

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400, overflowY: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <StyledHeaderCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', }} align="center">Team</StyledHeaderCell>
            {viewMode === 'completion' && <StyledHeaderCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }} align="center">Agreements</StyledHeaderCell>}
            {viewMode === 'completion' && <StyledHeaderCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }} align="center">Assessments</StyledHeaderCell>}
            {viewMode === 'teamPerformance' && <StyledHeaderCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }} align="center">Performance</StyledHeaderCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {teamsTable.map(teamsRow => (
            <TableRow key={teamsRow.teamName} hover>
              <StyledTableCell sx={{ fontWeight: 500 }} align="center">
                {teamsRow.teamName}
              </StyledTableCell>
              {viewMode === 'completion' && <StyledTableCell
                sx={{ fontWeight: 500 }}
                align="center"
              >
                {teamsRow.agreement}%
              </StyledTableCell>}
              {viewMode === 'completion' && <StyledTableCell
                sx={{ fontWeight: 500 }}
                align="center"
              >
                {teamsRow.assessment}%
              </StyledTableCell>}
              {viewMode === 'teamPerformance' && <StyledTableCell
                sx={{
                  color: getRatingScaleInfo(teamsRow.performance).color,
                  fontWeight: 500
                }}
                align="center"
              >
                {
                  teamsRow.performance !== null && !isNaN(teamsRow.performance) && getRatingScaleInfo(teamsRow.performance).name !== 'N/A' ?
                    `${teamsRow.performance} ${getRatingScaleInfo(teamsRow.performance).name} (${getRatingScaleInfo(teamsRow.performance).min}%-${getRatingScaleInfo(teamsRow.performance).max}%)`
                    : 'N/A'
                }
              </StyledTableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 