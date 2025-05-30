import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Button,
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
import { AnnualTarget, AnnualTarget as AnnualTargetType, QuarterType } from '../../../types/annualCorporateScorecard';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { PersonalQuarterlyTargetObjective, TeamPerformance, PdfType } from '../../../types';
import { Feedback as FeedbackType } from '../../../types/feedback';
import { fetchFeedback } from '../../../store/slices/feedbackSlice';
import { StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { ExportButton } from '../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { api } from '../../../services/api';
import { exportPdf } from '../../../utils/exportPdf';
import { enableTwoQuarterMode } from '../../../utils/quarterMode';
import { useToast } from '../../../contexts/ToastContext';
import { exportExcel } from '../../../utils/exportExcel';
import { useAuth } from '../../../contexts/AuthContext';
import { importExcelFile } from '../../../utils/excelImport';

const EmployeePerformanceRating: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [excelData, setExcelData] = useState<{ email: string; orgUnit: string }[]>([]);
  const [fileName, setFileName] = useState('');
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets as AnnualTargetType[]);
  const feedbackTemplates = useAppSelector((state: RootState) => state.feedback.feedbacks as FeedbackType[]);
  const [teamPerformances, setTeamPerformances] = useState<TeamPerformance[]>([]);

  const tableRef = useRef();
  const enableFeedback = true;

  useEffect(() => {
    dispatch(fetchAnnualTargets());
    dispatch(fetchFeedback());
  }, [dispatch]);

  useEffect(() => {
    if (selectedAnnualTargetId && !annualTargets.some(t => t._id === selectedAnnualTargetId)) {
      setSelectedAnnualTargetId('');
    }
  }, [annualTargets, selectedAnnualTargetId]);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importExcelFile(file, {
      requiredColumns: [
        { name: 'email', aliases: ['email', 'e-mail', 'mail'] },
        { name: 'orgUnit', aliases: ['org', 'unit', 'department', 'division'] }
      ],
      onSuccess: (rows) => {
        setExcelData(rows);
        setFileName(file.name);
        setShowTable(true);
        showToast('Excel file imported successfully', 'success');
      },
      onError: (error) => {
        showToast(`Error importing file: ${error}`, 'error');
      }
    });
  };

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowTable(false);
    setTeamPerformances([]);
  };

  const handleView = () => {
    if (selectedAnnualTargetId) {
      fetchTeamPerformancesData();
      setShowTable(true);
    }
  };

  const fetchTeamPerformancesData = async () => {
    try {
      const response = await api.get(`/report/team-performances?annualTargetId=${selectedAnnualTargetId}`);
      if (response.status === 200) {
        setTeamPerformances(response.data.data);
      } else {
        setTeamPerformances([]);
      }
    } catch (error) {
      console.error('Error fetching team performances:', error);
      setTeamPerformances([]);
    }
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

  const getRatingScaleInfo = (score: number | null, annualTarget: AnnualTargetType) => {
    if (!score) return null;

    return annualTarget.content.ratingScales.find(
      scale => scale.score === score
    );
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
      if (totalDimensionResponses > 0) {
        const dimensionScore = totalDimensionScore / totalDimensionResponses;
        totalWeightedScore += dimensionScore * (dimension.weight / 100);
        totalWeight += dimension.weight / 100;
      }
    });


    if (totalWeight === 0) return '-';
    return totalWeightedScore.toFixed(2);
  };

  const calculateFinalScore = (quarter: QuarterType, overallScore: number | null, performance: TeamPerformance) => {
    if (overallScore === null) return null;
    const target = performance.quarterlyTargets.find(t => t.quarter === quarter);
    const selectedFeedbackId = target?.selectedFeedbackId;
    const feedbackOverallScore = calculateFeedbackOverallScore(quarter, performance);
    const selectedFeedback = feedbackTemplates?.find((f: FeedbackType) => f._id === selectedFeedbackId);
    const contributionScorePercentage = selectedFeedback?.contributionScorePercentage || 0;
    if(selectedFeedback?.status === 'Active' && selectedFeedback?.enableFeedback.some(ef => ef.quarter === quarter && ef.enable)){
      if (feedbackOverallScore === '-') return overallScore; // If no feedback score, return original overall score
      const finalScore = (Number(feedbackOverallScore) * (contributionScorePercentage / 100)) + (Number(overallScore) * (1 - contributionScorePercentage / 100));
      return finalScore;
    }
    return overallScore;
  }

  const handleExportPDF = async () => {
    if (teamPerformances.length > 0) {
      const title = `${annualTargets.find(target => target._id === selectedAnnualTargetId)?.name} Team Performance`;
      exportPdf(PdfType.PerformanceEvaluation, tableRef, title, '', '', [0.1, 0.15, 0.15, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    }
  }

  const handleExportExcel = async () => {
    if (teamPerformances.length > 0) {
      const title = `${annualTargets.find(target => target._id === selectedAnnualTargetId)?.name || 'Team'} Performance`;
      exportExcel(tableRef.current, title);
    }
  }
  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl fullWidth>
          {annualTargets.length > 0 ? (
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
          ) : (
            <Select value="" displayEmpty disabled sx={{ backgroundColor: '#fff' }}>
              <MenuItem value="">No scorecards available</MenuItem>
            </Select>
          )}
        </FormControl>

        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileIcon />}
          sx={{ minWidth: 180 }}
        >
          {fileName || 'Import Excel'}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleImportExcel}
            ref={fileInputRef}
          />
        </Button>

        <Button
          variant="contained"
          onClick={handleView}
          disabled={!selectedAnnualTargetId || excelData.length === 0}
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': { backgroundColor: '#106EBE' },
          }}
        >
          View
        </Button>
      </Box>

      {showTable && (
        <Paper sx={{ boxShadow: 'none', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
          <ExportButton
            className="pdf"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportPDF}
            size="small"
            sx={{ margin: 2 }}
          >
            Export to PDF
          </ExportButton>
          <ExportButton
            className="excel"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
            size="small"
            sx={{ margin: 2 }}
          >
            Export to Excel
          </ExportButton>
          <Table ref={tableRef}>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Full Name</StyledHeaderCell>
                <StyledHeaderCell>Job Title</StyledHeaderCell>
                <StyledHeaderCell>Team</StyledHeaderCell>
                <StyledHeaderCell>Orgnizational Unit</StyledHeaderCell>
                {enableTwoQuarterMode(annualTargets.find(target => target._id === selectedAnnualTargetId)?.content.quarterlyTarget.quarterlyTargets.filter(quarter => quarter.editable).map(quarter => quarter.quarter), user?.isTeamOwner || user?.role === 'SuperUser')
                  .map((quarter) => (
                    <StyledHeaderCell key={quarter.key}>{quarter.alias} Overall Performance Score</StyledHeaderCell>
                  ))}
                <StyledHeaderCell>Overall Annual Performance Score</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teamPerformances.filter(performance => excelData.some(data => data.email === (performance.userId as { email: string })?.email)).map((performance: TeamPerformance, index: number) => {
                const quarterScores = performance.quarterlyTargets.filter(quarter => !(user?.isTeamOwner || user?.role === 'SuperUser')?annualTargets.find(target => target._id === selectedAnnualTargetId)?.content.quarterlyTarget.quarterlyTargets.find(qt => qt.quarter === quarter.quarter)?.editable:quarter).map(quarter => {
                  const qScore = calculateQuarterScore(quarter.objectives);
                  const isFeedbackEnabled = feedbackTemplates
                  ?.find((template: FeedbackType) => template._id === (quarter.selectedFeedbackId ?? quarter.feedbacks[0]?.feedbackId) && template.status === 'Active')
                  ?.enableFeedback
                    .find(ef => ef.quarter === quarter.quarter && ef.enable)?.enable;
                  if (enableFeedback) { // This is the global enableFeedback flag
                    return isFeedbackEnabled // This is specific to the template and quarter
                      ? calculateFinalScore(quarter.quarter, qScore, performance)
                      : qScore
                  } else {
                    return qScore
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
                    <StyledTableCell>{excelData.find(data => data.email === (performance.userId as { email: string })?.email)?.orgUnit}</StyledTableCell>
                    {quarterScores.map((score, idx) => {
                      const ratingScale = getRatingScaleInfo(Math.round(Number(score)), annualTargets.find(target => target._id === selectedAnnualTargetId) as AnnualTarget);
                      return (
                        <StyledTableCell key={idx} data-color={ratingScale?.color || '#DC2626'}>
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
                          <Typography sx={{ color: ratingScale?.color }}>
                            {ratingScale ? `${Math.round(Number(annualScore))} ${ratingScale.name} (${ratingScale.min}-${ratingScale.max})` : 'N/A'}
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

export default EmployeePerformanceRating;
