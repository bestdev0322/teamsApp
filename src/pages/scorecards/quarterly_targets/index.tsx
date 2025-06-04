import React, { useRef, useState } from 'react';
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
  Stack,
  IconButton,
  TableContainer,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { QuarterType, AnnualTargetObjective, QuarterlyTargetObjective, AnnualTargetRatingScale, PdfType } from '../../../types';
import QuarterlyObjectiveModal from './QuarterlyObjectiveModal';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { updateAnnualTarget } from '../../../store/slices/scorecardSlice';
import RatingScalesModal from '../../../components/RatingScalesModal';
import { ExportButton } from '../../../components/Buttons';
import { exportPdf } from '../../../utils/exportPdf';
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

const ViewButton = styled(Button)({
  backgroundColor: '#0078D4',
  color: 'white',
  textTransform: 'none',
  padding: '6px 16px',
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

const QuarterlyTargetTable: React.FC = () => {
  const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<QuarterlyTargetObjective | null>(null);
  const [selectedKPIRatingScales, setSelectedKPIRatingScales] = useState<AnnualTargetRatingScale[] | null>(null);
  const tableRef = useRef();
  const { user } = useAuth();

  const annualTargets = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets
  );

  const selectedAnnualTarget = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
  );


  const dispatch = useAppDispatch();


  const handleScorecardChange = (event: SelectChangeEvent) => {
    setSelectedAnnualTargetId(event.target.value);
    setShowTable(false);
  };

  const handleQuarterChange = (event: SelectChangeEvent) => {
    setSelectedQuarter(event.target.value);
    setShowTable(false);
  };

  const handleView = () => {
    if (selectedAnnualTarget) {
      if (selectedAnnualTarget.content.totalWeight >= 100) {
        dispatch(updateAnnualTarget({
          ...selectedAnnualTarget,
          content: {
            ...selectedAnnualTarget.content,
            quarterlyTarget: {
              ...selectedAnnualTarget.content.quarterlyTarget,
              editable: true,
            }
          }
        }));
      }
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

  const handleEdit = (objective: QuarterlyTargetObjective) => {
    setEditingObjective(objective);
    setIsModalOpen(true);
  };

  const handleDelete = (objectiveName: string) => {
    if (selectedAnnualTarget && selectedQuarter) {
      const updatedQuarterlyTargets = selectedAnnualTarget.content.quarterlyTarget.quarterlyTargets.map(qt => {
        if (qt.quarter === selectedQuarter) {
          return {
            ...qt,
            objectives: qt.objectives.filter(obj => obj.name !== objectiveName)
          };
        }
        return qt;
      });

      dispatch(updateAnnualTarget({
        ...selectedAnnualTarget,
        content: {
          ...selectedAnnualTarget.content,
          quarterlyTarget: {
            ...selectedAnnualTarget.content.quarterlyTarget,
            quarterlyTargets: updatedQuarterlyTargets
          }
        }
      }));
    }
  };

  const calculateTotalWeight = (objectives: AnnualTargetObjective[]) => {
    let total = 0;
    objectives.forEach(objective => {
      objective.KPIs.forEach(kpi => {
        total = Math.round((total + Number(kpi.weight) || 0) * 1000) / 1000;
      });
    });
    return total;
  };

  const handleExportPDF = () => {
    if (getQuarterlyObjectives().length > 0) {
      const title = `${user.organizationName} ${selectedAnnualTarget?.name} ${selectedQuarter}`;
      exportPdf(PdfType.AnnualTargets, tableRef, title.trim(), `Total Weight: ${calculateTotalWeight(getQuarterlyObjectives())}%`, '', [0.2, 0.2, 0.1, 0.2, 0.1, 0.2]);
    }
  }

  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 2 },
        mb: 3,
        '& .MuiFormControl-root': {
          minWidth: { xs: '100%', sm: 200 }
        }
      }}>
        <StyledFormControl
          sx={{
            flex: { xs: 1, sm: 2 }
          }}
        >
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

        <StyledFormControl
          sx={{
            flex: { xs: 1, sm: 1 }
          }}
        >
          <InputLabel>Quarter</InputLabel>
          <Select
            value={selectedQuarter}
            label="Quarter"
            onChange={handleQuarterChange}
          >
            {selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets
              .map((quarter) => (
                <MenuItem key={quarter.quarter} value={quarter.quarter}>
                  {quarter.quarter}
                </MenuItem>
              ))}
          </Select>
        </StyledFormControl>

        <ViewButton
          variant="contained"
          disabled={!selectedAnnualTargetId || !selectedQuarter}
          onClick={handleView}
          sx={{
            height: { xs: '40px', sm: '56px' },
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            whiteSpace: 'nowrap'
          }}
        >
          View
        </ViewButton>
      </Box>

      {showTable && selectedAnnualTarget && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quarterly Corporate Scorecard - {selectedQuarter}
          </Typography>

          <Box sx={{ mb: 4 }}>
            <TableContainer>
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
                    <StyledTableCell>{selectedAnnualTarget.startDate}</StyledTableCell>
                    <StyledTableCell>{selectedAnnualTarget.endDate}</StyledTableCell>
                    <StyledTableCell>{selectedAnnualTarget.status}</StyledTableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              mb: 2
            }}
          >
            <ExportButton
              className="pdf"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportPDF}
              size="small"
            >
              Export to PDF
            </ExportButton>
            <Typography
              variant="body2"
              sx={{
                color: calculateTotalWeight(getQuarterlyObjectives()) === 100 ? '#059669' : '#DC2626',
                fontWeight: 600
              }}
            >
              Total Weight: {calculateTotalWeight(getQuarterlyObjectives())}%
            </Typography>
          </Box>

          <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
            <TableContainer>
              <Table size="small" ref={tableRef}>
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell>Perspective</StyledHeaderCell>
                    <StyledHeaderCell>Strategic Objective</StyledHeaderCell>
                    <StyledHeaderCell align="center">Weight %</StyledHeaderCell>
                    <StyledHeaderCell>Key Performance Indicator</StyledHeaderCell>
                    <StyledHeaderCell align="center">Baseline</StyledHeaderCell>
                    <StyledHeaderCell align="center">Target</StyledHeaderCell>
                    <StyledHeaderCell align="center" className='noprint'>Rating Scale</StyledHeaderCell>
                    <StyledHeaderCell align="center" className='noprint'>Actions</StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    // Group objectives by perspectiveId
                    const groupedObjectives = getQuarterlyObjectives().reduce((acc, objective) => {
                      const perspectiveId = objective.perspectiveId;
                      if (!acc[perspectiveId]) {
                        acc[perspectiveId] = [];
                      }
                      acc[perspectiveId].push(objective);
                      return acc;
                    }, {} as Record<number, QuarterlyTargetObjective[]>);

                    // Render grouped objectives
                    return Object.entries(groupedObjectives).map(([perspectiveId, objectives]) => {
                      const totalKPIs = objectives.reduce((total, obj) => total + obj.KPIs.length, 0);
                      const perspectiveName = selectedAnnualTarget?.content.perspectives.find(p => p.index === Number(perspectiveId))?.name;

                      return objectives.map((objective, objIndex) =>
                        objective.KPIs.map((kpi, kpiIndex) => (
                          <TableRow key={`${objective.name}-${kpiIndex}`}>
                            {objIndex === 0 && kpiIndex === 0 && (
                              <StyledTableCell rowSpan={totalKPIs}>
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
                            <StyledTableCell align="center" className='noprint'>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setSelectedKPIRatingScales(kpi.ratingScales)}
                                sx={{
                                  borderColor: '#E5E7EB',
                                  color: '#374151',
                                  '&:hover': {
                                    borderColor: '#D1D5DB',
                                    backgroundColor: '#F9FAFB',
                                  },
                                }}
                              >
                                View
                              </Button>
                            </StyledTableCell>
                            {kpiIndex === 0 && (
                              <StyledTableCell align="center" rowSpan={objective.KPIs.length} className='noprint'>
                                {selectedAnnualTarget.content.quarterlyTarget.editable && (
                                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <IconButton
                                      size="small"
                                      sx={{ color: '#6B7280' }}
                                      onClick={() => handleEdit(objective)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      sx={{ color: '#6B7280' }}
                                      onClick={() => handleDelete(objective.name)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                )}
                              </StyledTableCell>
                            )}
                          </TableRow>
                        ))
                      ).flat();
                    });
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {selectedAnnualTarget.content.quarterlyTarget.editable && (
            <Button
              startIcon={<AddIcon />}
              onClick={() => setIsModalOpen(true)}
              sx={{
                alignSelf: 'flex-start',
                p: 2,
                border: '1px dashed #E5E7EB',
                borderRadius: '8px',
                width: '100%',
                '&:hover': {
                  backgroundColor: '#F9FAFB',
                  borderColor: '#6264A7',
                  color: '#6264A7',
                },
              }}
            >
              Add new
            </Button>
          )}

          <QuarterlyObjectiveModal
            open={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingObjective(null);
            }}
            annualTarget={selectedAnnualTarget}
            quarter={selectedQuarter as QuarterType}
            editingObjective={editingObjective}
          />

          {selectedKPIRatingScales && (
            <RatingScalesModal
              open={!!selectedKPIRatingScales}
              onClose={() => setSelectedKPIRatingScales(null)}
              ratingScales={selectedKPIRatingScales}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default QuarterlyTargetTable;
