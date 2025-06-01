import React, { useState, useRef } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  styled,
  SelectChangeEvent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TableContainer,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { RootState } from '../../../store';
import { QuarterType, AnnualTargetObjective, QuarterlyTargetKPI, AnnualTargetPerspective, AnnualTargetRatingScale, QuarterlyTargetObjective, PdfType } from '../../../types';
import KPIModal from './KPIModal';
import DescriptionIcon from '@mui/icons-material/Description';
import EvidenceModal from './EvidenceModal';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { exportPdf } from '../../../utils/exportPdf';
import { useAuth } from '../../../contexts/AuthContext';
import { enableTwoQuarterMode, isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
import { QUARTER_ALIAS } from '../../../constants/quarterAlias';

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

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  borderBottom: '1px solid #E5E7EB',
  padding: '16px',
  color: '#374151',
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  borderBottom: '1px solid #E5E7EB',
  padding: '16px',
  color: '#6B7280',
  fontWeight: 500,
}));

const ExportButton = styled(Button)({
  backgroundColor: '#fff',
  color: '#374151',
  textTransform: 'none',
  padding: '6px 16px',
  border: '1px solid #E5E7EB',
  '&:hover': {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
  '&.excel': {
    '&:hover': {
      color: '#059669',
      borderColor: '#059669',
    },
  },
  '&.pdf': {
    '&:hover': {
      color: '#DC2626',
      borderColor: '#DC2626',
    },
  }
});

const PerformanceEvaluations: React.FC = () => {
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<QuarterlyTargetKPI | null>(null);
  const [evidenceModalData, setEvidenceModalData] = useState<{
    evidence: string;
    attachments: Array<{ name: string; url: string }>;
  } | null>(null);
  const tableRef = useRef();
  const { user } = useAuth();

  const [editable, setEditable] = useState(false);


  const annualTargets = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets
  );

  const selectedAnnualTarget = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );

  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowTable(false);
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value);
    setShowTable(false);
  };

  const handleView = () => {
    const quarterlyTargetEditable = selectedAnnualTarget?.content.quarterlyTarget.editable || false;
    const currentDate = new Date();
    const assessmentPeriod = selectedAnnualTarget?.content.assessmentPeriod[selectedQuarter as QuarterType];
    if (assessmentPeriod) {
      const startDate = new Date(assessmentPeriod.startDate);
      const endDate = new Date(assessmentPeriod.endDate);
      if (startDate <= currentDate && endDate >= currentDate) {
        setEditable(true && quarterlyTargetEditable);
      } else {
        setEditable(false);
      }
    } else {
      setEditable(false);
    }

    setShowTable(true);
  };

  const getQuarterlyObjectives = () => {
    if (!selectedAnnualTarget || !selectedQuarter) return [];

    const quarterData = selectedAnnualTarget.content.quarterlyTarget.quarterlyTargets
      .find(q => q.quarter === selectedQuarter);

    if (!quarterData?.objectives) return [];

    return [...quarterData.objectives].sort((a, b) => a.perspectiveId - b.perspectiveId);
  };

  const calculateTotalWeight = (objectives: AnnualTargetObjective[]) => {
    let total = 0;
    objectives.forEach(objective => {
      objective.KPIs.forEach(kpi => {
        total += Number(kpi.weight) || 0;
      });
    });
    return total;
  };

  const handleAccess = (kpi: QuarterlyTargetKPI) => {
    setSelectedKPI(kpi);
  };

  const exportToExcel = (objectives: any[], annualTarget: any, quarter: string) => {
    // Add header rows for dates
    const headerRows = [
      {
        'Start Date': annualTarget?.content.assessmentPeriod[quarter as QuarterType].startDate,
        'End Date': annualTarget?.content.assessmentPeriod[quarter as QuarterType].endDate,
      },
      {}, // Empty row for spacing
    ];

    const data = objectives.flatMap(objective =>
      objective.KPIs.map((kpi: QuarterlyTargetKPI) => ({
        'Perspective': annualTarget?.content.perspectives.find((p: AnnualTargetPerspective) => p.index === objective.perspectiveId)?.name,
        'Strategic Objective': objective.name,
        'Weight %': kpi.weight,
        'Key Performance Indicator': kpi.indicator,
        'Baseline': kpi.baseline,
        'Target': kpi.target,
        'Actual Achieved': kpi.actualAchieved,
        'Performance Rating Score': kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))
          ? `${kpi.ratingScore} ${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.name} (${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.min}-${kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.max})`
          : '',
        'Evidence': kpi.evidence
      }))
    );

    const ws = XLSX.utils.json_to_sheet([...headerRows, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performance Evaluation');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveAs(dataBlob, `Performance_Evaluation_${quarter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Add function to calculate overall rating score
  const calculateOverallRating = (objectives: QuarterlyTargetObjective[]) => {
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
    if (!score || !selectedAnnualTarget) return null;

    return selectedAnnualTarget.content.ratingScales.find(
      scale => scale.score === score
    );
  };

  const handleExportPDF = async () => {
    if (getQuarterlyObjectives().length > 0) {
      const score = calculateOverallRating(getQuarterlyObjectives());
      const ratingScore = getRatingScoreInfo(score);
      const title = `${user.organizationName ? user.organizationName : ''} ${selectedAnnualTarget?.name} ${isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
        quarter.editable
      )).map((quarter) => (
        quarter.quarter
      )), user?.isTeamOwner || user?.role === 'SuperUser') ? QUARTER_ALIAS[selectedQuarter as keyof typeof QUARTER_ALIAS] : selectedQuarter} Performance Evaluation`;
      exportPdf(PdfType.PerformanceEvaluation, tableRef, title, 'Total Weight: ' + String(calculateTotalWeight(getQuarterlyObjectives())), '', [0.1, 0.15, 0.1, 0.25, 0.1, 0.1, 0.1, 0.1],
        { score: `${score} ${ratingScore.name} (${ratingScore.min}-${ratingScore.max})`, color: ratingScore.color });
    }
  }

  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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

        <StyledFormControl sx={{ minWidth: 200 }}>
          <InputLabel>Quarter</InputLabel>
          <Select
            value={selectedQuarter}
            label="Quarter"
            onChange={handleQuarterChange}
          >
            {selectedAnnualTarget && enableTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
              (user?.isTeamOwner || user?.role === 'SuperUser') ? quarter.editable : quarter
            )).map((quarter) => (
              quarter.quarter
            )), user?.isTeamOwner || user?.role === 'SuperUser').map((quarter) => (
              <MenuItem key={quarter.key} value={quarter.key}>
                {quarter.alias}
              </MenuItem>
            ))}
          </Select>
        </StyledFormControl>

        <ViewButton
          variant="contained"
          disabled={!selectedAnnualTargetId || !selectedQuarter}
          onClick={handleView}
        >
          View
        </ViewButton>
      </Box>

      {showTable && selectedAnnualTarget && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3
          }}>
            <Typography variant="h6">
              Quarterly Corporate Scorecard - {isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
                quarter.editable
              )).map((quarter) => (
                quarter.quarter
              )), user?.isTeamOwner || user?.role === 'SuperUser') ? QUARTER_ALIAS[selectedQuarter as keyof typeof QUARTER_ALIAS] : selectedQuarter}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <ExportButton
                className="excel"
                startIcon={<FileDownloadIcon />}
                onClick={() => exportToExcel(getQuarterlyObjectives(), selectedAnnualTarget, selectedQuarter)}
                size="small"
              >
                Export to Excel
              </ExportButton>

              <ExportButton
                className="pdf"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportPDF}
                size="small"
              >
                Export to PDF
              </ExportButton>
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <StyledHeaderCell>Annual Corporate Scorecard</StyledHeaderCell>
                  <StyledHeaderCell>Start Date</StyledHeaderCell>
                  <StyledHeaderCell>End Date</StyledHeaderCell>
                  <StyledHeaderCell>Status</StyledHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <StyledTableCell>{selectedAnnualTarget.name}</StyledTableCell>
                  <StyledTableCell>{selectedAnnualTarget.content.assessmentPeriod[selectedQuarter as QuarterType].startDate}</StyledTableCell>
                  <StyledTableCell>{selectedAnnualTarget.content.assessmentPeriod[selectedQuarter as QuarterType].endDate}</StyledTableCell>
                  <StyledTableCell>{selectedAnnualTarget.status}</StyledTableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              p: 2,
              border: '1px solid #E5E7EB',
              borderRadius: 1,
              backgroundColor: '#F9FAFB'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                Total Weight:
              </Typography>
              <Typography variant="body2" sx={{
                color: calculateTotalWeight(getQuarterlyObjectives()) === 100 ? '#059669' : '#DC2626',
                fontWeight: 600
              }}>
                {calculateTotalWeight(getQuarterlyObjectives())}%
              </Typography>
            </Box>


          </Box>

          <Paper
            className="performance-table"
            sx={{
              width: '100%',
              boxShadow: 'none',
              border: '1px solid #E5E7EB',
              overflow: 'hidden'
            }}
          >
            <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflowX: 'auto' }}>
              <Table size="small" stickyHeader ref={tableRef} >
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell>Perspective</StyledHeaderCell>
                    <StyledHeaderCell>Strategic Objective</StyledHeaderCell>
                    <StyledHeaderCell align="center">Weight %</StyledHeaderCell>
                    <StyledHeaderCell>Key Performance Indicator</StyledHeaderCell>
                    <StyledHeaderCell align="center">Baseline</StyledHeaderCell>
                    <StyledHeaderCell align="center">Target</StyledHeaderCell>
                    <StyledHeaderCell align="center">Actual Achieved</StyledHeaderCell>
                    <StyledHeaderCell align="center">Performance Rating Score</StyledHeaderCell>
                    <StyledHeaderCell align="center" className='noprint'>Evidence</StyledHeaderCell>
                    <StyledHeaderCell align="center" className='noprint'>Evaluate</StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    let currentPerspective = '';
                    // First pass to calculate rowspans
                    const perspectiveSpans = getQuarterlyObjectives().reduce((acc, objective) => {
                      const perspectiveName = selectedAnnualTarget?.content.perspectives.find(p => p.index === objective.perspectiveId)?.name || '';
                      acc[perspectiveName] = (acc[perspectiveName] || 0) + objective.KPIs.length;
                      return acc;
                    }, {} as Record<string, number>);

                    return getQuarterlyObjectives().map((objective) => (
                      objective.KPIs.map((kpi, kpiIndex) => {
                        const perspectiveName = selectedAnnualTarget?.content.perspectives.find(p => p.index === objective.perspectiveId)?.name || '';
                        const row = (
                          <TableRow key={`${objective.name}-${kpiIndex}`}>
                            {/* Show perspective only for first KPI in the perspective */}
                            {perspectiveName !== currentPerspective && (
                              <StyledTableCell rowSpan={perspectiveSpans[perspectiveName]}>
                                {perspectiveName}
                              </StyledTableCell>
                            )}
                            {kpiIndex === 0 && (
                              <StyledTableCell rowSpan={objective.KPIs.length}>
                                {objective.name}
                              </StyledTableCell>
                            )}
                            <StyledTableCell align="center">{kpi.weight}</StyledTableCell>
                            <StyledTableCell>{kpi.indicator}</StyledTableCell>
                            <StyledTableCell align="center">{kpi.baseline}</StyledTableCell>
                            <StyledTableCell align="center">{kpi.target}</StyledTableCell>
                            <StyledTableCell align="center">{kpi.actualAchieved}</StyledTableCell>
                            <StyledTableCell
                              align="center"
                              sx={{ color: kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.color }}
                              data-color={kpi.ratingScales.find(scale => scale.score === Number(kpi.ratingScore))?.color}
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
                            {editable && (
                              <StyledTableCell align="center" className='noprint'>
                                <AccessButton
                                  size="small"
                                  onClick={() => handleAccess(kpi)}
                                >
                                  Review
                                </AccessButton>
                              </StyledTableCell>
                            )}
                          </TableRow>
                        );

                        if (perspectiveName !== currentPerspective) {
                          currentPerspective = perspectiveName;
                        }

                        return row;
                      })
                    )).flat();
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Box
            className="overall-rating"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
              mt: 2,
              backgroundColor: '#ffffff',
              padding: 2,
              borderRadius: 1
            }}
          >
            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
              Overall Rating Score =
            </Typography>
            {(() => {
              const score = calculateOverallRating(getQuarterlyObjectives());
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

        </Box>
      )}

      {selectedKPI && (
        <KPIModal
          open={!!selectedKPI}
          onClose={() => setSelectedKPI(null)}
          selectedKPI={selectedKPI}
          annualTargetId={selectedAnnualTargetId}
          quarter={selectedQuarter as QuarterType}
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
    </Box>
  );
};

export default PerformanceEvaluations;
