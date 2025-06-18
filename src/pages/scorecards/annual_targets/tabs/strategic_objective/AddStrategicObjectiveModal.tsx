import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Stack,
  IconButton,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Collapse,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { updateAnnualTarget } from '../../../../../store/slices/scorecardSlice';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../../hooks/useAppSelector';
import { AnnualTargetObjective, AnnualTargetKPI, AnnualTargetPerspective } from '../../../../../types/annualCorporateScorecard';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface AddStrategicObjectiveModalProps {
  open: boolean;
  onClose: () => void;
  targetName: string;
  editingObjective?: AnnualTargetObjective | null;
}

const AddStrategicObjectiveModal: React.FC<AddStrategicObjectiveModalProps> = ({
  open,
  onClose,
  targetName,
  editingObjective
}) => {
  const dispatch = useAppDispatch();
  const annualTarget = useAppSelector((state: RootState) =>
    state.scorecard.annualTargets.find(target => target.name === targetName)
  );
  const perspectives = useMemo(() => annualTarget?.content.perspectives || [], [annualTarget?.content.perspectives]);
  const [perspective, setPerspective] = useState<AnnualTargetPerspective | null>(null);
  const [objective, setObjective] = useState('');
  const [kpis, setKpis] = useState<AnnualTargetKPI[]>([{
    indicator: '',
    weight: 0,
    baseline: '',
    target: '',
    ratingScales: annualTarget?.content.ratingScales || []
  }]);
  const [expandedKPI, setExpandedKPI] = useState<number>(0);
  const [errors, setErrors] = useState<{
    perspective?: string;
    objective?: string;
    kpis?: {
      indicator?: string;
      weight?: string;
      baseline?: string;
      target?: string;
    }[];
    general?: string;
  }>({});

  useEffect(() => {
    if (editingObjective) {
      setPerspective(perspectives.find(p => p.index === editingObjective.perspectiveId) || null);
      setObjective(editingObjective.name);
      setKpis([...editingObjective.KPIs]);
    }
  }, [editingObjective, perspectives]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    let isValid = true;

    // Validate perspective
    if (!perspective) {
      newErrors.perspective = 'Perspective is required';
      isValid = false;
    }

    // Validate objective
    if (!objective) {
      newErrors.objective = 'Strategic objective is required';
      isValid = false;
    }

    // Validate KPIs
    const kpiErrors = kpis.map(kpi => {
      const errors: { [key: string]: string } = {};

      if (!kpi.indicator.trim()) {
        errors.indicator = 'KPI is required';
        isValid = false;
      }

      if (!kpi.weight) {
        errors.weight = 'Weight is required';
        isValid = false;
      } else if (kpi.weight < 0 || kpi.weight > 100) {
        errors.weight = 'Weight must be between 0 and 100';
        isValid = false;
      }

      if (kpi.baseline === null || kpi.baseline === undefined) {
        errors.baseline = 'Baseline is required';
        isValid = false;
      }

      if (kpi.target === null || kpi.target === undefined) {
        errors.target = 'Target is required';
        isValid = false;
      }

      return errors;
    });

    // Validate total weight equals 100
    // let totalWeight = 0;
    // perspectives.forEach(perspective => {
    //   totalWeight += calculateTotalWeight(annualTarget);
    // });
    // if (totalWeight > 100) {
    //   newErrors.general = 'Total weight must equal 100%';
    //   isValid = false;
    // }

    if (kpiErrors.some(error => Object.keys(error).length > 0)) {
      newErrors.kpis = kpiErrors;
    }

    setErrors(newErrors);
    return isValid;
  };

  const calculateTotalWeight = (objectives: AnnualTargetObjective[]) => {
    let total = 0;
    objectives.forEach(objective => {
      objective.KPIs.forEach((kpi: AnnualTargetKPI) => {
        total += Number(kpi.weight) || 0;
      });
    });
    return total;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && annualTarget && perspective) {
      const newObjective: AnnualTargetObjective = {
        perspectiveId: perspective.index,
        name: objective,
        KPIs: kpis,
      };

      const updatedObjectives = editingObjective
        ? annualTarget.content.objectives.map(obj =>
          obj.name === editingObjective.name ? newObjective : obj
        )
        : [...annualTarget.content.objectives, newObjective];

      const newTotalWeight = calculateTotalWeight(updatedObjectives);

      // Round total weight to 3 decimal places to avoid floating point issues
      const roundedTotalWeight = Math.round(newTotalWeight * 1000) / 1000;

      if (roundedTotalWeight > 100) {
        const newErrors: typeof errors = {};
        newErrors.general = 'The current total weight is ' + roundedTotalWeight + '%, please adjust the weight of the KPIs to make it equal to 100%';
        setErrors(newErrors);
        return;
      }

      dispatch(updateAnnualTarget({
        ...annualTarget,
        content: {
          ...annualTarget.content,
          objectives: updatedObjectives,
          totalWeight: roundedTotalWeight
        },
      }));
      handleClose();
    }
  };

  const handleClose = () => {
    setPerspective(null);
    setObjective('');
    setKpis([{ indicator: '', weight: 0, baseline: '', target: '', ratingScales: annualTarget?.content.ratingScales || [] }]);
    onClose();
  };

  const handleAddKPI = () => {
    setKpis([...kpis, {
      indicator: '',
      weight: 0,
      baseline: '',
      target: '',
      ratingScales: annualTarget?.content.ratingScales || []
    }]);
    setExpandedKPI(kpis.length);
  };

  const handleToggleRatingScale = (index: number) => {
    setExpandedKPI(expandedKPI === index ? 0 : index);
  };

  const handleRatingScaleChange = (kpiIndex: number, scaleIndex: number, field: 'min' | 'max', value: string) => {
    const newKpis = [...kpis];
    newKpis[kpiIndex] = {
      ...newKpis[kpiIndex],
      ratingScales: newKpis[kpiIndex].ratingScales.map((scale, idx) =>
        idx === scaleIndex
          ? { ...scale, [field]: value }
          : scale
      )
    };
    setKpis(newKpis);
  };

  const handleDeleteKPI = (indexToDelete: number) => {
    setKpis(kpis.filter((_, index) => index !== indexToDelete));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '8px' }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack spacing={3} sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Add Strategic Objective
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {errors.general && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.general}
                </Alert>
              )}

              <FormControl fullWidth error={!!errors.perspective}>
                <InputLabel>Perspective</InputLabel>
                <Select
                  value={perspective?.index}
                  label="Perspective"
                  onChange={(e) => setPerspective(perspectives.find(p => p.index === e.target.value) || null)}
                  sx={{ backgroundColor: '#F9FAFB' }}
                >
                  {perspectives.map((p, index) => (
                    <MenuItem key={index} value={p.index}>{p.name}</MenuItem>
                  ))}
                </Select>
                {errors.perspective && (
                  <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                    {errors.perspective}
                  </Typography>
                )}
              </FormControl>

              <TextField
                label="Strategic Objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                fullWidth
                error={!!errors.objective}
                helperText={errors.objective}
                sx={{ backgroundColor: '#F9FAFB' }}
              />

              {/* KPI Section */}
              <Box>
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
                      <TableCell sx={{ width: '40px' }} /> {/* For expand button */}
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
                              error={!!errors.kpis?.[index]?.indicator}
                              helperText={errors.kpis?.[index]?.indicator}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              value={kpi.weight === 0 ? '' : kpi.weight}
                              type='number'
                              inputProps={{
                                step: "0.001"
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
                                  '-moz-appearance': 'textfield',
                                  '::-webkit-outer-spin-button': { '-webkit-appearance': 'none', margin: 0 },
                                  '::-webkit-inner-spin-button': { '-webkit-appearance': 'none', margin: 0 },
                                },
                              }}
                              variant="standard"
                              error={!!errors.kpis?.[index]?.weight}
                              helperText={errors.kpis?.[index]?.weight}
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
                              error={!!errors.kpis?.[index]?.baseline}
                              helperText={errors.kpis?.[index]?.baseline}
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
                              error={!!errors.kpis?.[index]?.target}
                              helperText={errors.kpis?.[index]?.target}
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
                                        <TableCell>{scaleIndex + 1}</TableCell>
                                        <TableCell>{scale.name}</TableCell>
                                        <TableCell align="center">
                                          <TextField
                                            value={kpi.ratingScales[scaleIndex].min}
                                            onChange={(e) => {
                                              const value = e.target.value === '' ? '0' : e.target.value;
                                              handleRatingScaleChange(index, scaleIndex, 'min', value);
                                            }}
                                            variant="standard"
                                            sx={{ width: '80px' }}
                                          />
                                        </TableCell>
                                        <TableCell align="center">
                                          <TextField
                                            value={kpi.ratingScales[scaleIndex].max}
                                            onChange={(e) => {
                                              const value = e.target.value === '' ? '0' : e.target.value;
                                              handleRatingScaleChange(index, scaleIndex, 'max', value);
                                            }}
                                            variant="standard"
                                            sx={{ width: '80px' }}
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

              {/* Save Button */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  type="submit"
                  sx={{
                    backgroundColor: '#6264A7',
                    '&:hover': { backgroundColor: '#4F46E5' },
                  }}
                >
                  Save
                </Button>
              </Box>
            </Stack>
          </form>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default AddStrategicObjectiveModal; 