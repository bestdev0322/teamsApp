import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  SelectChangeEvent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AnnualTarget, AnnualTargetPerspective, QuarterlyTargetKPI } from '@/types/annualCorporateScorecard';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { PersonalQuarterlyTargetObjective } from '@/types';
import { useToast } from '../../../contexts/ToastContext';

interface AddInitiativeModalProps {
  open: boolean;
  onClose: () => void;
  annualTarget: AnnualTarget;
  onSave: (data: {
    perspectiveId: number;
    objectiveName: string;
    initiative: string;
    kpis: QuarterlyTargetKPI[];
  }) => Promise<void>;
  editingObjective?: PersonalQuarterlyTargetObjective | null;
  personalQuarterlyObjectives: PersonalQuarterlyTargetObjective[];
}

const AddInitiativeModal: React.FC<AddInitiativeModalProps> = ({
  open,
  onClose,
  annualTarget,
  onSave,
  editingObjective,
  personalQuarterlyObjectives,
}) => {
  const [selectedPerspective, setSelectedPerspective] = useState<AnnualTargetPerspective | null>(null);
  const [selectedObjective, setSelectedObjective] = useState("");
  const [expandedKPI, setExpandedKPI] = useState<number>(0);
  const [kpis, setKpis] = useState<QuarterlyTargetKPI[]>([{
    indicator: '',
    weight: 0,
    baseline: '',
    target: '',
    ratingScales: annualTarget.content.ratingScales || [],
    ratingScore: 0,
    actualAchieved: '',
    evidence: '',
    attachments: []
  }]);
  const [initiative, setInitiative] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (editingObjective) {
      setSelectedPerspective(annualTarget.content.perspectives.find(p => p.index === editingObjective.perspectiveId) || null);
      setSelectedObjective(editingObjective.name);
      setInitiative(editingObjective.initiativeName);
      setKpis(editingObjective.KPIs);
    }
  }, [editingObjective, annualTarget.content.perspectives]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, showToast]);

  const handlePerspectiveChange = (event: SelectChangeEvent) => {
    setSelectedPerspective(annualTarget.content.perspectives.find(p => p.name === event.target.value) || null);
    setSelectedObjective('');
  };

  const handleObjectiveChange = (event: SelectChangeEvent) => {
    setSelectedObjective(event.target.value);
  };

  const handleAddKPI = () => {
    setKpis([...kpis, { indicator: '', weight: 0, baseline: '', target: '', ratingScales: annualTarget.content.ratingScales || [], ratingScore: 0, actualAchieved: '', evidence: '', attachments: [] }]);
    setExpandedKPI(kpis.length);
  };

  const handleToggleRatingScale = (index: number) => {
    setExpandedKPI(expandedKPI === index ? 0 : index);
  };

  const handleDeleteKPI = (indexToDelete: number) => {
    setKpis(kpis.filter((_, index) => index !== indexToDelete));
  };

  const validateForm = () => {
    if (!selectedPerspective) return false;
    if (!selectedObjective) return false;
    if (!initiative) return false;
    if (kpis.length === 0) return false;

    return kpis.every(kpi =>
      kpi.indicator &&
      kpi.weight > 0 &&
      kpi.baseline &&
      kpi.target
    );
  };

  const validateDuplicate = (perspectiveId: number, objectiveName: string, initiativeName: string) => {
    const exists = personalQuarterlyObjectives.some(obj =>
      obj.perspectiveId === perspectiveId &&
      obj.name === objectiveName &&
      obj.initiativeName === initiativeName
    );
    return exists;
  };

  const validateTotalWeight = (newWeight: number): boolean => {
    const currentTotalWeight = personalQuarterlyObjectives.reduce((total, obj) => {
      if (editingObjective &&
        obj.name === editingObjective.name &&
        obj.initiativeName === editingObjective.initiativeName &&
        obj.perspectiveId === editingObjective.perspectiveId) {
        return total;
      }
      const totalWeight = obj.KPIs.reduce((sum, kpi) => sum + kpi.weight, 0);
      return total + totalWeight;
    }, 0);

    const potentialTotalWeight = currentTotalWeight + newWeight;
    // Round potential total weight to 3 decimal places for validation display
    const roundedPotentialTotalWeight = Math.round(potentialTotalWeight * 1000) / 1000;

    return roundedPotentialTotalWeight <= 100;
  };

  const handleSave = async () => {
    setError(null);

    if (!validateForm()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!selectedPerspective) {
      setError('Please select a perspective');
      return;
    }

    if (!editingObjective && validateDuplicate(selectedPerspective.index, selectedObjective, initiative)) {
      setError('This combination of Perspective, Strategic Objective and Initiative already exists');
      return;
    }

    const newWeight = kpis[0].weight;
    if (!validateTotalWeight(newWeight)) {
      setError(`Total weight cannot exceed 100%. Current total weight would be ${personalQuarterlyObjectives.reduce((total, obj) => total + obj.KPIs.reduce((sum, kpi) => sum + kpi.weight, 0), 0) + newWeight
        }%`);
      return;
    }

    await onSave({
      perspectiveId: selectedPerspective.index,
      objectiveName: selectedObjective,
      initiative,
      kpis
    });

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">
            {editingObjective ? 'Edit Initiative / KPA' : 'Add Initiative / KPA'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1 }}>Perspective</Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedPerspective?.name || ''}
              onChange={handlePerspectiveChange}
              sx={{ bgcolor: '#F9FAFB' }}
            >
              {annualTarget.content.perspectives.map((perspective: AnnualTargetPerspective) => (
                <MenuItem key={perspective.index} value={perspective.name}>
                  {perspective.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1 }}>Strategic Objective</Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedObjective}
              onChange={handleObjectiveChange}
              sx={{ bgcolor: '#F9FAFB' }}
            >
              {annualTarget.content.objectives
                .filter(obj => obj.perspectiveId === Number(selectedPerspective?.index))
                .map((objective) => (
                  <MenuItem key={objective.name} value={objective.name}>
                    {objective.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1 }}>Initiative/KPA</Typography>
          <TextField
            fullWidth
            size="small"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
            sx={{ bgcolor: '#F9FAFB' }}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={handleAddKPI}
            startIcon={<AddIcon />}
            sx={{
              mb: 2,
              backgroundColor: '#6264A7',
              '&:hover': { backgroundColor: '#4F46E5' },
            }}
          >
            Add KPI
          </Button>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '40px' }} />
                <TableCell align="center">Key Performance Indicator</TableCell>
                <TableCell align="center">Weight %</TableCell>
                <TableCell align="center">Baseline</TableCell>
                <TableCell align="center">Target</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kpis.map((kpi, index) => (
                <React.Fragment key={index}>
                  <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleRatingScale(index)}
                      >
                        {expandedKPI === index ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        value={kpi.indicator}
                        onChange={(e) => {
                          const newKpis = [...kpis];
                          newKpis[index] = {
                            ...newKpis[index],
                            indicator: e.target.value
                          };
                          setKpis(newKpis);
                        }}
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        value={kpi.weight === 0 ? '' : kpi.weight}
                        type='number'
                        inputProps={{
                          step: "0.001", // Allow 3 decimal places
                        }}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          // Allow typing numbers with up to 3 decimal places
                          if (newValue === "" || /^[0-9]*\.?[0-9]{0,3}$/.test(newValue)) {
                            const numericValue = Number(newValue);
                            const newKpis = [...kpis];
                            newKpis[index] = {
                              ...newKpis[index],
                              // If conversion results in NaN or value is outside 0-100, default to 0, otherwise use the numeric value
                              weight: isNaN(numericValue) || numericValue < 0 || numericValue > 100 ? 0 : numericValue
                            };
                            setKpis(newKpis);
                          }
                        }}
                        sx={{
                          width: '80px',
                          'input[type=number]': {
                            '-moz-appearance': 'textfield', // Firefox
                            '::-webkit-outer-spin-button': { '-webkit-appearance': 'none', margin: 0 }, // Chrome, Safari, Edge, Opera
                            '::-webkit-inner-spin-button': { '-webkit-appearance': 'none', margin: 0 }, // Chrome, Safari, Edge, Opera
                          },
                        }}
                        variant="standard"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        value={kpi.baseline}
                        onChange={(e) => {
                          const newKpis = [...kpis];
                          newKpis[index] = {
                            ...newKpis[index],
                            baseline: e.target.value
                          };
                          setKpis(newKpis);
                        }}
                        variant="standard"
                        sx={{ width: '80px' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        value={kpi.target}
                        onChange={(e) => {
                          const newKpis = [...kpis];
                          newKpis[index] = {
                            ...newKpis[index],
                            target: e.target.value
                          };
                          setKpis(newKpis);
                        }}
                        variant="standard"
                        sx={{ width: '80px' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteKPI(index)}
                        sx={{
                          color: '#6B7280',
                          '&:hover': {
                            color: '#DC2626',
                            backgroundColor: '#FEE2E2',
                          },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                      <Collapse in={expandedKPI === index} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            Set Key Performance Indicator Rating Agreement
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell width="40px">No</TableCell>
                                <TableCell>Rating</TableCell>
                                <TableCell align="center">Min</TableCell>
                                <TableCell align="center">Max</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {kpi.ratingScales.map((scale, scaleIndex) => (
                                <TableRow key={scaleIndex}>
                                  <TableCell>{scale.score}</TableCell>
                                  <TableCell>{scale.name}</TableCell>
                                  <TableCell align="center">
                                    <TextField
                                      value={scale.min}
                                      variant="standard"
                                      sx={{ width: '80px' }}
                                      onChange={(e) => {
                                        const newKpis = [...kpis];
                                        newKpis[index] = {
                                          ...newKpis[index],
                                          ratingScales: newKpis[index].ratingScales.map((scale, idx) =>
                                            idx === scaleIndex
                                              ? { ...scale, min: e.target.value }
                                              : scale
                                          )
                                        };
                                        setKpis(newKpis);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <TextField
                                      value={scale.max}
                                      variant="standard"
                                      sx={{ width: '80px' }}
                                      onChange={(e) => {
                                        const newKpis = [...kpis];
                                        newKpis[index] = {
                                          ...newKpis[index],
                                          ratingScales: newKpis[index].ratingScales.map((scale, idx) =>
                                            idx === scaleIndex
                                              ? { ...scale, max: e.target.value }
                                              : scale
                                          )
                                        };
                                        setKpis(newKpis);
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: '#6366F1',
              '&:hover': { bgcolor: '#4F46E5' },
            }}
          >
            Save
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AddInitiativeModal; 