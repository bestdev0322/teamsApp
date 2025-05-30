import React, { useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  styled,
  Paper,
  Button,
  Typography,
} from '@mui/material';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../store';
import { fetchAnnualTargets } from '../../store/slices/scorecardSlice';
import { fetchTeamPerformances } from '../../store/slices/personalPerformanceSlice';
import { AnnualTarget, QuarterType, QuarterlyTargetObjective } from '../../types/annualCorporateScorecard';
import { TeamPerformance, AgreementStatus, AssessmentStatus } from '../../types/personalPerformance';
import HalfDoughnutCard from '../../components/HalfDoughnutCard';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { PendingTargetsTable } from './components/PendingTargetsTable';
import { PendingAssessmentsTable } from './components/PendingAssessmentsTable';
import PerformanceTable from './components/PerformanceTable';
import { HeatmapByTeam } from './components/HeatmapByTeam';
import StrategyMap from './components/strategyMap';
import { enableTwoQuarterMode } from '../../utils/quarterMode';
import { PersonalQuarterlyTargetObjective } from '../../types';
import { Feedback as FeedbackType } from '../../types/feedback';
import { fetchFeedback } from '../../store/slices/feedbackSlice';
import StrategyExecution from './components/strategyExecution';
import { Routes, Route, Navigate } from 'react-router-dom';

interface DashboardProps {
  title?: string;
  icon?: React.ReactNode;
  tabs?: string[];
  selectedTab?: string;
}

interface PendingTargetsData {
  complete: number;
  pending: number;
  metrics: Array<{
    label: string;
    value: number;
    percentage: number;
  }>;
}

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

const ViewButton = styled(Button)({
  backgroundColor: '#0078D4',
  color: 'white',
  textTransform: 'none',
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: '#106EBE',
  },
});

const DashboardCard = styled(Paper)(({ theme }) => ({
  borderRadius: '12px',
  boxShadow: 'none',
  backgroundColor: '#EBF8FF',
  // height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

const CardHeader = styled(Box)(({ theme }) => ({
  padding: '16px 24px',
  backgroundColor: '#0097A7',
  borderTopLeftRadius: '12px',
  borderTopRightRadius: '12px',
}));

const CardContent = styled(Box)(({ theme }) => ({
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
}));

ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend
);

const Dashboard: React.FC<DashboardProps> = ({ title, icon, tabs, selectedTab }) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterType | ''>('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [showPendingTargetsTable, setShowPendingTargetsTable] = useState(false);
  const [showPendingAssessmentsTable, setShowPendingAssessmentsTable] = useState(false);
  const [showPerformanceTable, setShowPerformanceTable] = useState(false);
  const [userOwnedTeam, setUserOwnedTeam] = useState<string | null>(null);
  const feedbackTemplates = useAppSelector((state: RootState) => state.feedback.feedbacks as FeedbackType[]);
  const [pendingTargetsData, setPendingTargetsData] = useState<PendingTargetsData>({
    complete: 0,
    pending: 0,
    metrics: [
      { label: 'Complete', value: 0, percentage: 0 },
      { label: 'Pending', value: 0, percentage: 0 }
    ]
  });
  const [pendingAssessmentsData, setPendingAssessmentsData] = useState<PendingTargetsData>({
    complete: 0,
    pending: 0,
    metrics: [
      { label: 'Complete', value: 0, percentage: 0 },
      { label: 'Pending', value: 0, percentage: 0 }
    ]
  });
  const [performanceData, setPerformanceData] = useState({
    metrics: [] as Array<{
      label: string;
      value: string;
      color: string;
      percentage: number;
    }>
  });
  const [tableData, setTableData] = useState<{ [key: number]: { count: number; percentage: number } }>({});

  const [viewMode, setViewMode] = useState<'teamPerformance' | 'completion' | 'strategyMap' | 'strategyExecution' | ''>('');
  const [isLoading, setIsLoading] = useState(true);

  const isSuperUser = user?.role === 'SuperUser';
  const isAppOwner = user?.email === process.env.REACT_APP_OWNER_EMAIL;
  const canViewManagementCharts = isAppOwner || isSuperUser;

  const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
  const teamPerformancesByTarget = useAppSelector((state: RootState) => state.personalPerformance.teamPerformancesByTarget);
  const selectedAnnualTarget: AnnualTarget | undefined = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );

  const [enableFeedback, setEnableFeedback] = useState(false);

  const checkFeedbackModule = async () => {
    const response = await api.get('/module/Feedback/is-enabled');
    if (response.data.data.isEnabled) {
      setEnableFeedback(true);
    }
  }

  useEffect(() => {
    const fetchTeamOwnerFromDB = async () => {
      if (user?.id) {
        try {
          const teamInfo = await api.get(`/users/is_team_owner/${user.id}`);
          const result = teamInfo.data.data;
          setUserOwnedTeam(result.team?.name || null);
        } catch (error) {
          console.error('Error fetching team owner:', error);
          setUserOwnedTeam(null);
        }
      }
    };
    fetchTeamOwnerFromDB();
  }, [user?.id, dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          dispatch(fetchAnnualTargets()),
          dispatch(fetchTeamPerformances(selectedAnnualTargetId)),
          dispatch(fetchFeedback()),
          checkFeedbackModule()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dispatch, selectedAnnualTargetId]);

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowDashboard(false);
    resetTables();
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value as QuarterType);
    setShowDashboard(false);
    resetTables();
  };

  const resetTables = () => {
    setShowPendingTargetsTable(false);
    setShowPendingAssessmentsTable(false);
    setShowPerformanceTable(false);
  };

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
    if (selectedFeedback?.status === 'Active' && selectedFeedback?.enableFeedback.some(ef => ef.quarter === quarter && ef.enable)) {
      if (feedbackOverallScore === '-') return overallScore; // If no feedback score, return original overall score
      const finalScore = (Number(feedbackOverallScore) * (contributionScorePercentage / 100)) + (Number(overallScore) * (1 - contributionScorePercentage / 100));
      return finalScore;
    }
    return overallScore;
  }

  const handleView = async () => {
    if (selectedAnnualTargetId && selectedQuarter && viewMode) {
      try {
        const performances = teamPerformancesByTarget[selectedAnnualTargetId];

        // Calculate agreement status counts
        let agreementComplete = 0;
        let agreementPending = 0;

        // Calculate assessment status counts
        let assessmentComplete = 0;
        let assessmentPending = 0;

        // Calculate performance rating distribution
        const ratingCounts = new Map<number, number>();
        performances.forEach(performance => {
          const quarterlyTarget = performance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter);
          let qScore = calculateQuarterScore(quarterlyTarget.objectives);
          const isFeedbackEnabled = feedbackTemplates
            ?.find((template: FeedbackType) => template._id === (quarterlyTarget.selectedFeedbackId ?? quarterlyTarget.feedbacks[0]?.feedbackId) && template.status === 'Active')
            ?.enableFeedback
            .find(ef => ef.quarter === quarterlyTarget.quarter && ef.enable)?.enable;
          if (enableFeedback && isFeedbackEnabled) { // This is the global enableFeedback flag
            qScore = calculateFinalScore(quarterlyTarget.quarter, qScore, performance)
          }
          ratingCounts.set(qScore, ratingCounts.get(qScore) || 0 + 1);
          // Check agreement status
          if (quarterlyTarget?.agreementStatus === AgreementStatus.Approved) {
            agreementComplete++;
          } else {
            agreementPending++;
          }

          // Check assessment status
          if (quarterlyTarget?.assessmentStatus === AssessmentStatus.Approved) {
            assessmentComplete++;
          } else {
            assessmentPending++;
          }
        });

        // Calculate percentages for agreements
        const agreementTotal = agreementComplete + agreementPending;
        const agreementCompletePercentage = agreementTotal > 0 ? Math.round((agreementComplete / agreementTotal) * 100) : 0;
        const agreementPendingPercentage = agreementTotal > 0 ? Math.round((agreementPending / agreementTotal) * 100) : 0;

        // Calculate percentages for assessments
        const assessmentTotal = assessmentComplete + assessmentPending;
        const assessmentCompletePercentage = assessmentTotal > 0 ? Math.round((assessmentComplete / assessmentTotal) * 100) : 0;
        const assessmentPendingPercentage = assessmentTotal > 0 ? Math.round((assessmentPending / assessmentTotal) * 100) : 0;

        // Calculate performance rating percentages
        const totalRatings = Array.from(ratingCounts.entries())
          .filter(([score]) => score !== 0) // Filter out score 0
          .reduce((sum, [_, count]) => sum + count, 0);

        const updatedPerformanceData = {
          metrics: selectedAnnualTarget?.content.ratingScales.map(scale => {
            const count = ratingCounts.get(scale.score) || 0;
            const percentage = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
            return {
              label: `${scale.score} - ${scale.name}`,
              value: `${scale.min}-${scale.max}`,
              color: scale.color,
              percentage
            };
          }) || []
        };

        // Create table data structure
        const newTableData = selectedAnnualTarget?.content.ratingScales.reduce((acc, scale) => {
          const count = ratingCounts.get(scale.score) || 0;
          const percentage = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
          acc[scale.score] = { count, percentage };
          return acc;
        }, {} as { [key: number]: { count: number; percentage: number } }) || {};

        setPendingTargetsData({
          complete: agreementComplete,
          pending: agreementPending,
          metrics: [
            { label: 'Complete', value: agreementComplete, percentage: agreementCompletePercentage },
            { label: 'Pending', value: agreementPending, percentage: agreementPendingPercentage }
          ]
        });

        setPendingAssessmentsData({
          complete: assessmentComplete,
          pending: assessmentPending,
          metrics: [
            { label: 'Complete', value: assessmentComplete, percentage: assessmentCompletePercentage },
            { label: 'Pending', value: assessmentPending, percentage: assessmentPendingPercentage }
          ]
        });

        setPerformanceData(updatedPerformanceData);
        setTableData(newTableData);
        setShowDashboard(true);
      } catch (error) {
        console.error('Error fetching team performances:', error);
      }
    }
  };

  const chartData = (data: PendingTargetsData) => ({
    labels: ['Complete', 'Pending'],
    datasets: [
      {
        data: [data.complete, data.pending],
        backgroundColor: ['#00B7C3', '#FFB900'],
        borderWidth: 0,
      },
    ],
  });

  const performanceChartData = performanceData.metrics.map(metric => ({
    name: metric.label,
    value: metric.percentage,
    color: metric.color
  }));

  return (
    <Routes>
      <Route path="/*" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={
        <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
          <Box sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <StyledFormControl fullWidth>
              <InputLabel>Annual Corporate Scorecard</InputLabel>
              <Select
                value={selectedAnnualTargetId}
                label="Annual Corporate Scorecard"
                onChange={handleScorecardChange}
              >
                {annualTargets.map((target) => (
                  <MenuItem key={target._id} value={target._id}>
                    {target.name}
                  </MenuItem>
                ))}
              </Select>
            </StyledFormControl>

            {(isSuperUser || isAppOwner || userOwnedTeam) && (
              <StyledFormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                <InputLabel>View Mode</InputLabel>
                <Select
                  value={viewMode}
                  label="View Mode"
                  onChange={(e) => {
                    setViewMode(e.target.value as 'teamPerformance' | 'completion' | 'strategyMap' | 'strategyExecution');
                    setShowDashboard(false);
                    resetTables();
                  }}
                >
                  {(isSuperUser || isAppOwner) && <MenuItem value="teamPerformance">Team Performance</MenuItem>}
                  {(isSuperUser || isAppOwner) && <MenuItem value="completion">Completions</MenuItem>}
                  <MenuItem value="strategyMap">Strategy Map</MenuItem>
                  <MenuItem value="strategyExecution">Strategy Execution</MenuItem>
                </Select>
              </StyledFormControl>
            )}

            <StyledFormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
              <InputLabel>Quarter</InputLabel>
              <Select
                value={selectedQuarter}
                label="Quarter"
                onChange={handleQuarterChange}
              >
                {selectedAnnualTarget && viewMode && enableTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
                  quarter.editable
                )).map((quarter) => (
                  quarter.quarter
                )), viewMode === 'strategyMap' || viewMode === 'strategyExecution' ? true : viewMode === 'completion' ? false : true).map((quarter) => (
                  <MenuItem key={quarter.key} value={quarter.key}>
                    {quarter.alias}
                  </MenuItem>
                ))}
              </Select>
            </StyledFormControl>

            <ViewButton
              variant="contained"
              disabled={!selectedAnnualTargetId || !selectedQuarter || !viewMode || isLoading}
              onClick={handleView}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {isLoading ? 'Loading...' : 'View'}
            </ViewButton>
          </Box>

          {showDashboard && viewMode === 'completion' && (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, sm: 3 },
            }}>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 2, sm: 3 },
                '& > *': {
                  flex: { xs: '1 1 100%', md: '1 1 0%' },
                  minWidth: { xs: '100%', md: 0 }
                },
                width: '80%',
                marginX: 'auto'
              }}>
                {(canViewManagementCharts || (viewMode === 'completion')) && (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <Box
                      onClick={() => setShowPendingTargetsTable(!showPendingTargetsTable)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <HalfDoughnutCard
                        title={"Pending Agreements - Company Wide"}
                        chartData={chartData(pendingTargetsData)}
                        metrics={pendingTargetsData.metrics}
                      />
                    </Box>
                    {showPendingTargetsTable && (
                      <Box sx={{
                        overflowX: 'auto',
                        '& .MuiTableContainer-root': {
                          maxWidth: '100%'
                        }
                      }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          {"Pending Agreements Details"}
                        </Typography>
                        <PendingTargetsTable
                          teamPerformances={teamPerformancesByTarget[selectedAnnualTargetId]}
                          selectedQuarter={selectedQuarter}
                        />
                      </Box>
                    )}
                  </Box>
                )}

                {(canViewManagementCharts || (viewMode === 'completion')) && (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <Box
                      onClick={() => setShowPendingAssessmentsTable(!showPendingAssessmentsTable)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <HalfDoughnutCard
                        title={"Pending Assessments - Company Wide"}
                        chartData={chartData(pendingAssessmentsData)}
                        metrics={pendingAssessmentsData.metrics}
                      />
                    </Box>
                    {showPendingAssessmentsTable && (
                      <Box sx={{
                        overflowX: 'auto',
                        '& .MuiTableContainer-root': {
                          maxWidth: '100%'
                        }
                      }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          {"Pending Assessments Details"}
                        </Typography>
                        <PendingAssessmentsTable
                          teamPerformances={teamPerformancesByTarget[selectedAnnualTargetId]}
                          selectedQuarter={selectedQuarter}
                        />
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              {(canViewManagementCharts || (viewMode === 'completion')) && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  width: '100%'
                }}>
                  <Box
                    onClick={() => setShowPerformanceTable(!showPerformanceTable)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <DashboardCard>
                      <CardHeader>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 500, textAlign: 'center' }}>
                          Company-wide Performance
                        </Typography>
                      </CardHeader>
                      <CardContent>
                        <Box sx={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={performanceChartData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12 }}
                                interval={0}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                              />
                              <Tooltip
                                formatter={(value) => [`${value}%`, 'Percentage']}
                                contentStyle={{
                                  backgroundColor: '#fff',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  padding: '10px'
                                }}
                              />
                              <Bar
                                dataKey="value"
                                fill="#8884d8"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                              >
                                {
                                  performanceChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))
                                }
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardContent>
                    </DashboardCard>
                  </Box>

                  {showPerformanceTable && (
                    <Box sx={{
                      overflowX: 'auto',
                      '& .MuiTableContainer-root': {
                        maxWidth: '100%'
                      }
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                        Company-wide Performance
                      </Typography>
                      <PerformanceTable
                        tableData={tableData}
                        selectedAnnualTarget={selectedAnnualTarget}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {(canViewManagementCharts) && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  width: '100%'
                }}>
                </Box>
              )}
            </Box>
          )}
          {showDashboard && (isAppOwner || isSuperUser) && (viewMode === 'teamPerformance' || viewMode === 'completion') &&
            <Box
              sx={{ cursor: 'pointer' }}
            >
              <DashboardCard>
                <CardHeader>
                  {viewMode === 'teamPerformance' ? <Typography variant="h6" sx={{ color: 'white', fontWeight: 500, textAlign: 'center' }}>
                    Team Performances
                  </Typography> : viewMode === 'completion' && <Typography variant="h6" sx={{ color: 'white', fontWeight: 500, textAlign: 'center' }}>
                    Completions by Team
                  </Typography>}
                </CardHeader>
                <CardContent>
                  <HeatmapByTeam
                    teamPerformances={teamPerformancesByTarget[selectedAnnualTargetId]}
                    selectedQuarter={selectedQuarter}
                    selectedAnnualTarget={selectedAnnualTarget}
                    viewMode={viewMode}
                  />
                </CardContent>
              </DashboardCard>
            </Box>}
          {
            showDashboard && viewMode === 'strategyMap' && (
              <Box>
                <StrategyMap annualTargetId={selectedAnnualTargetId} quarter={selectedQuarter || undefined} />
              </Box>
            )
          }

          {
            showDashboard && viewMode === 'strategyExecution' && (
              <Box>
                <StrategyExecution annualTargetId={selectedAnnualTargetId} quarter={selectedQuarter || undefined} />
              </Box>
            )
          }
        </Box >
      }
      />
    </Routes>
  );
};

export default Dashboard; 
