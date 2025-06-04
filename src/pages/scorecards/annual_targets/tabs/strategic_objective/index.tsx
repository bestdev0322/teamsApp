import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  styled,
  IconButton,
  Typography,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddStrategicObjectiveModal from './AddStrategicObjectiveModal';
import { useAppSelector } from '../../../../../hooks/useAppSelector';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../hooks/useAppDispatch';
import { updateAnnualTarget } from '../../../../../store/slices/scorecardSlice';
import { AnnualTargetObjective, AnnualTargetKPI, AnnualTargetRatingScale, AnnualTargetPerspective } from '../../../../../types/annualCorporateScorecard';
import RatingScalesModal from '../../../../../components/RatingScalesModal';
import { useAuth } from '../../../../../contexts/AuthContext'

import { ExportButton } from '../../../../../components/Buttons';

import { exportPdf } from '../../../../../utils/exportPdf';
import { PdfType } from '../../../../../types';


const StyledTableCell = styled(TableCell)(({ theme }) => ({
  borderBottom: '1px solid #E5E7EB',
  padding: '12px 16px',
  color: '#374151',
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  borderBottom: '1px solid #E5E7EB',
  padding: '12px 16px',
  color: '#6B7280',
  fontWeight: 500,
}));

interface StrategicObjectiveTabProps {
  targetName: string;
}

const StrategicObjectiveTab: React.FC<StrategicObjectiveTabProps> = ({ targetName }) => {
  const dispatch = useAppDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<AnnualTargetObjective | null>(null);
  const [selectedKPIRatingScales, setSelectedKPIRatingScales] = useState<AnnualTargetRatingScale[] | null>(null);
  const tableRef = useRef();
  const { user } = useAuth();

  const annualTarget = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target.name === targetName)
  );

  const objectives = annualTarget?.content.objectives || [];
  const totalWeight = annualTarget?.content.totalWeight || 0;
  const perspectives = annualTarget?.content.perspectives || [];

  const calculateTotalWeight = (objectives: AnnualTargetObjective[]) => {
    let total = 0;
    objectives.forEach(objective => {
      objective.KPIs.forEach((kpi: AnnualTargetKPI) => {
        total += Number(kpi.weight) || 0;
      });
    });
    return total;
  };

  const handleEdit = (objective: AnnualTargetObjective) => {
    setEditingObjective(objective);
    setIsModalOpen(true);
  };

  const handleDelete = (objectiveName: string) => {
    if (annualTarget) {
      const updatedObjectives = annualTarget.content.objectives.filter(
        obj => obj.name !== objectiveName
      );
      const newTotalWeight = calculateTotalWeight(updatedObjectives);

      dispatch(updateAnnualTarget({
        ...annualTarget,
        content: {
          ...annualTarget.content,
          objectives: updatedObjectives,
          totalWeight: newTotalWeight
        }
      }));
    }
  };

  const sortedObjectives = () => {
    if (!objectives || objectives.length === 0) return [];
    return [...objectives].sort((a, b) => a.perspectiveId - b.perspectiveId);
  }

  const handleExportPDF = () => {
    if (objectives.length > 0) {
      const title = `${user.organizationName} ${annualTarget.name}`;
      exportPdf(PdfType.AnnualTargets, tableRef, title, `Total Weight: ${totalWeight}%`, '', [0.2, 0.2, 0.1, 0.2, 0.1, 0.2]);
    }
  }


  return (
    <Box p={2}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1
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
              color: totalWeight === 100 ? '#059669' : '#DC2626',
              fontWeight: 600
            }}
          >
            Total Weight: {Math.round(totalWeight * 1000) / 1000}%
          </Typography>
        </Box>

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
              const groupedObjectives = sortedObjectives().reduce((acc, objective) => {
                const perspectiveId = objective.perspectiveId;
                if (!acc[perspectiveId]) {
                  acc[perspectiveId] = [];
                }
                acc[perspectiveId].push(objective);
                return acc;
              }, {} as Record<number, AnnualTargetObjective[]>);

              // Render grouped objectives
              return Object.entries(groupedObjectives).map(([perspectiveId, objectives]) => {
                const totalKPIs = objectives.reduce((total, obj) => total + obj.KPIs.length, 0);
                const perspectiveName = perspectives.find(p => p.index === Number(perspectiveId))?.name;

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
                        </StyledTableCell>
                      )}
                    </TableRow>
                  ))
                ).flat();
              });
            })()}
          </TableBody>
        </Table>

        <Button
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
          sx={{
            color: '#6B7280',
            justifyContent: 'flex-start',
            textTransform: 'none',
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
      </Stack>

      <AddStrategicObjectiveModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingObjective(null);
        }}
        targetName={targetName}
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
  );
};

export default StrategicObjectiveTab; 
