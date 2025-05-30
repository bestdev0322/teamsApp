import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
  SelectChangeEvent,
  Typography,
  InputLabel,
  styled,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import PerformanceDistributionChart from './PerformanceDistributionChart';
import { api } from '../../../services/api';
import { PersonalPerformance, PersonalQuarterlyTargetObjective } from '../../../types';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable'
import { enableTwoQuarterMode, isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';
import { fetchFeedback } from '../../../store/slices/feedbackSlice';
import { Feedback as FeedbackType } from '../../../types/feedback';
import { useAuth } from '../../../contexts/AuthContext';

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

const StyledTitle = styled(Typography)({
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
  padding: '12px 0',
  borderBottom: '2px solid #E5E7EB',
  marginBottom: '24px',
  textAlign: 'center',
  width: '100%'
});

const PerformanceDistributionReport: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [personalPerformances, setPersonalPerformances] = useState<PersonalPerformance[]>([]);
  const teams = useAppSelector((state: RootState) => state.teams.teams);
  const { user } = useAuth();
  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
  const selectedAnnualTarget = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );

  const feedbackTemplates = useAppSelector((state: RootState) => state.feedback.feedbacks as FeedbackType[]);
  const enableFeedback = true; // Placeholder, set dynamically if needed

  useEffect(() => {
    dispatch(fetchAnnualTargets());
    dispatch(fetchFeedback());
  }, [dispatch]);

  const fetchPersonalPerformances = async () => {
    try {
      const response = await api.get('/report/personal-performances', {
        params: {
          annualTargetId: selectedAnnualTargetId,
        }
      });
      if (response.status === 200) {
        const newPersonalPerformances = [];
        response.data.data.forEach((item: any) => {
          if (item.quarterlyTargets.find((quarter: any) => quarter.quarter === selectedQuarter).assessmentStatus === 'Approved') {
            newPersonalPerformances.push(item);
          }
        });
        setPersonalPerformances(newPersonalPerformances);

      }
    } catch (error) {
      console.error('Error fetching performance distribution:', error);
    }
  };

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowReport(false);
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value);
    setShowReport(false);
  };

  const handleView = () => {
    if (selectedAnnualTargetId && selectedQuarter) {
      fetchPersonalPerformances();
      setShowReport(true);
    }
  };

  const calculateOverallScore = (objectives: PersonalQuarterlyTargetObjective[]) => {
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

  const calculateFeedbackOverallScore = (quarter: string, performance: PersonalPerformance) => {
    const target = performance.quarterlyTargets.find(t => t.quarter === quarter);
    const selectedFeedbackId = target?.selectedFeedbackId;
    const feedbackResponses = target?.feedbacks?.filter(f => f.feedbackId === selectedFeedbackId) || [];
    const feedbackTemplate = feedbackTemplates.find(f => f._id === selectedFeedbackId);
    if (!feedbackTemplate || feedbackResponses.length === 0) return '-';
    let totalWeightedScore = 0;
    let totalWeight = 0;
    feedbackTemplate.dimensions.forEach(dimension => {
      let totalDimensionScore = 0;
      let totalDimensionResponses = 0;
      const dimensionQuestions = feedbackTemplate.dimensions.find(d => d.name === dimension.name)?.questions || [];
      dimensionQuestions.forEach(question => {
        feedbackResponses.forEach(feedback => {
          const response = feedback.feedbacks.find(f => f.dimension === dimension.name && f.question === question);
          if (response?.response.score) {
            totalDimensionScore += response.response.score;
            totalDimensionResponses++;
          }
        });
      });
      if (totalDimensionResponses > 0) {
        const dimensionScore = totalDimensionScore / totalDimensionResponses;
        totalWeightedScore += dimensionScore * (dimension.weight / 100);
        totalWeight += dimension.weight / 100;
      }
    });
    if (totalWeight === 0) return '-';
    return totalWeightedScore.toFixed(2);
  };

  const calculateFinalScore = (quarter: string, overallScore: number | null, performance: PersonalPerformance) => {
    if (overallScore === null) return null;
    const target = performance.quarterlyTargets.find(t => t.quarter === quarter);
    const selectedFeedbackId = target?.selectedFeedbackId;
    const feedbackOverallScore = calculateFeedbackOverallScore(quarter, performance);
    const selectedFeedback = feedbackTemplates?.find((f: FeedbackType) => f._id === selectedFeedbackId);
    const contributionScorePercentage = selectedFeedback?.contributionScorePercentage || 0;
    if(selectedFeedback?.status === 'Active' && selectedFeedback?.enableFeedback?.some(ef => ef.quarter === quarter && ef.enable)){
      if (feedbackOverallScore === '-') return overallScore;
      const finalScore = (Number(feedbackOverallScore) * (contributionScorePercentage / 100)) + (Number(overallScore) * (1 - contributionScorePercentage / 100));
      return finalScore;
    }
    return overallScore;
  };

  const getChartData = (data: PersonalPerformance[], selectedQuarter: string) => {
    const scores = data.map(item => {
      const quarterObj = item.quarterlyTargets.find(target => target.quarter === selectedQuarter);
      const qScore = calculateOverallScore(quarterObj?.objectives);
      const isFeedbackEnabled = feedbackTemplates
        ?.find((template: FeedbackType) => template._id === (quarterObj?.selectedFeedbackId ?? quarterObj?.feedbacks?.[0]?.feedbackId) && template.status === 'Active')
        ?.enableFeedback?.find(ef => ef.quarter === selectedQuarter && ef.enable)?.enable;
      if (enableFeedback) {
        return isFeedbackEnabled ? calculateFinalScore(selectedQuarter, qScore, item) : qScore;
      } else {
        return qScore;
      }
    });
    const chartData = selectedAnnualTarget?.content.ratingScales.map(scale => ({
      rating: scale.score,
      count: scores.filter(score => Math.round(Number(score)) === scale.score).length,
    }));
    return chartData;
  }

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Set to landscape
    const pageWidth = doc.internal.pageSize.getWidth();

    const pageHeight = doc.internal.pageSize.getHeight();

    const addNewPageIfNeeded = (yPosition, extraSpace = 0) => {
      if (yPosition + extraSpace >= pageHeight - 20) {
        doc.addPage();
        return 20; // Reset Y position to top of new page with margin
      }
      return yPosition;
    };

    doc.text(`${selectedAnnualTarget?.name} - ${isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter(quarter => quarter.editable).map(quarter => quarter.quarter), user?.isTeamOwner || user?.role === 'SuperUser') ? QUARTER_ALIAS[selectedQuarter as keyof typeof QUARTER_ALIAS] : selectedQuarter} Performance Distribution`, pageWidth / 2, 20, { align: 'center' });

    let finalY = 35;

    doc.setFontSize(13);
    doc.text('Organization Performance Distribution', 10, finalY, { align: 'left' });

    finalY += 5;

    doc.setLineWidth(0.5);
    doc.line(10, finalY, pageWidth - 10, finalY);

    finalY += 5;

    // Add Organization Performance Distribution table
    const organizationChartData = getChartData(personalPerformances, selectedQuarter);


    const tableWidth = pageWidth - 30; // Adjust margins

    autoTable(doc, {
      head: [['Performance Rating Score', 'Description', 'No of Employees', '%']],
      body: selectedAnnualTarget?.content.ratingScales.map(scale => [scale.score, scale.name, organizationChartData.find(data => data.rating === scale.score)?.count, ((organizationChartData.find(data => data.rating === scale.score)?.count / (organizationChartData.reduce((prev, current) => prev + current.count, 0) || 1)) * 100).toFixed(2)]),
      startY: finalY,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.2 },
        1: { cellWidth: tableWidth * 0.3 },
        2: { cellWidth: tableWidth * 0.3 },
        3: { cellWidth: tableWidth * 0.2 }
      },
      didDrawPage: (data) => {
        finalY = data.cursor.y;
      }
    });

    doc.setFontSize(13);
    doc.text('Team Performance Distribution', 10, finalY + 10, { align: 'left' });

    doc.setLineWidth(0.5);
    doc.line(10, finalY + 15, pageWidth - 10, finalY + 15);

    teams.map((team, index) => {
      const teamName = team.name;

      const teamChartData = getChartData(personalPerformances.filter((personalPerformance) =>
        personalPerformance.teamId === team._id), selectedQuarter)

      finalY = addNewPageIfNeeded(finalY + 25, 30);

      doc.text(teamName, 10, finalY, { align: 'left' });

      autoTable(doc, {
        head: [['Performance Rating Score', 'Description', 'No of Employees', '%']],
        startY: finalY + 5,
        body: selectedAnnualTarget?.content.ratingScales.map(scale => [scale.score, scale.name, teamChartData.find(data => data.rating === scale.score)?.count, ((teamChartData.find(data => data.rating === scale.score)?.count / (teamChartData.reduce((prev, current) => prev + current.count, 0) || 1)) * 100).toFixed(2)]),
        didDrawPage: (data) => {
          finalY = data.cursor.y;
        }
      });

    })

    doc.save(`${selectedAnnualTarget?.name} - ${selectedQuarter} Performance Distribution.pdf`);
  };

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

        <StyledFormControl sx={{ minWidth: 200 }}>
          <InputLabel>Quarter</InputLabel>
          <Select
            value={selectedQuarter}
            label="Quarter"
            onChange={handleQuarterChange}
          >
            {selectedAnnualTarget && enableTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
              quarter.editable
            )).map((quarter) => (
              quarter.quarter
            )), user?.isTeamOwner || user?.role === 'SuperUser').map((quarter) => (
              <MenuItem key={quarter.key} value={quarter.key}>
                {quarter.alias}
              </MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <Button
          variant="contained"
          onClick={handleView}
          disabled={!selectedAnnualTargetId || !selectedQuarter}
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': { backgroundColor: '#106EBE' },
          }}
        >
          View
        </Button>
      </Box>

      {showReport && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportPDF}
              sx={{
                borderColor: '#E5E7EB',
                color: '#374151',
                '&:hover': {
                  borderColor: '#D1D5DB',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              Export to PDF
            </Button>
          </Box>

          <Box sx={{ mb: 4 }}>
            <StyledTitle>
              Organization Performance Distribution
            </StyledTitle>
            <PerformanceDistributionChart
              title="Organization Performance Distribution"
              annualTarget={selectedAnnualTarget}
              chartData={getChartData(personalPerformances, selectedQuarter)}
            />
          </Box>
          <Box sx={{ mb: 4 }}>
            <StyledTitle>
              Team Performance Distribution
            </StyledTitle>
            {
              (() => {
                return teams.map((team, index) => {
                  const teamName = team.name;
                  return (
                    <PerformanceDistributionChart
                      key={index}
                      title={teamName}
                      annualTarget={selectedAnnualTarget}
                      chartData={getChartData(personalPerformances.filter((personalPerformance) =>
                        personalPerformance.teamId === team._id), selectedQuarter)}
                    />
                  );
                })
              })()
            }
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PerformanceDistributionReport;
