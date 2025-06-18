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
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { updateAnnualTarget } from '../../../store/slices/scorecardSlice';
import { AnnualTarget, AnnualTargetPerspective, QuarterlyTargetObjective, QuarterlyTargetKPI, QuarterType } from '../../../types/annualCorporateScorecard';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface QuarterlyObjectiveModalProps {
  open: boolean;
  onClose: () => void;
  annualTarget: AnnualTarget;
  quarter: QuarterType;
  editingObjective?: QuarterlyTargetObjective | null;
}

const QuarterlyObjectiveModal: React.FC<QuarterlyObjectiveModalProps> = ({
  open,
  onClose,
  annualTarget,
  quarter,
  editingObjective
}) => {
  const dispatch = useAppDispatch();
  const perspectives = useMemo(() => annualTarget?.content.perspectives || [], [annualTarget?.content.perspectives]);
  const [perspective, setPerspective] = useState<AnnualTargetPerspective | null>(null);
  const [objective, setObjective] = useState('');
  const [kpis, setKpis] = useState<QuarterlyTargetKPI[]>([{
    indicator: '',
    weight: 0,
    baseline: '',
    target: '',
    ratingScales: annualTarget?.content.ratingScales || [],
    ratingScore: annualTarget?.content.ratingScales[0].score || -1,
    actualAchieved: '',
    evidence: '',
    attachments: []
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

    if (!perspective) {
      newErrors.perspective = 'Perspective is required';
      isValid = false;
    }

    if (!objective) {
      newErrors.objective = 'Strategic objective is required';
      isValid = false;
    }

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

      if (!kpi.baseline) {
        errors.baseline = 'Baseline is required';
        isValid = false;
      }

      if (!kpi.target) {
        errors.target = 'Target is required';
        isValid = false;
      }

      return errors;
    });

    if (kpiErrors.some(error => Object.keys(error).length > 0)) {
      newErrors.kpis = kpiErrors;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && perspective) {
      const newObjective: QuarterlyTargetObjective = {
        perspectiveId: perspective.index,
        name: objective,
        KPIs: kpis,
      };

      const updatedQuarterlyTargets = annualTarget.content.quarterlyTarget.quarterlyTargets.map(qt => {
        if (qt.quarter === quarter) {
          const objectives = editingObjective
            ? qt.objectives.map(obj => obj.name === editingObjective.name ? newObjective : obj)
            : [...qt.objectives, newObjective];
          return { ...qt, objectives };
        }
        return qt;
      });

      let totalWeight = 0;
      updatedQuarterlyTargets.forEach(qt => {
        if (qt.quarter === quarter) {
          qt.objectives.forEach(obj => {
            obj.KPIs.forEach(kpi => {
              totalWeight += Number(kpi.weight) || 0;
            });
          });
        }
      });

      // Round total weight to 3 decimal places to avoid floating point issues
      totalWeight = Math.round(totalWeight * 1000) / 1000;

      if (totalWeight > 100) {
        setErrors({ general: 'Total weight must be 100%' });
        return;
      }

      dispatch(updateAnnualTarget({
        ...annualTarget,
        content: {
          ...annualTarget.content,
          quarterlyTarget: {
            ...annualTarget.content.quarterlyTarget,
            quarterlyTargets: updatedQuarterlyTargets
          }
        }
      }));
      handleClose();
    }
  };

  const handleClose = () => {
    setPerspective(null);
    setObjective('');
    setErrors({});
    setKpis([{
      indicator: '',
      weight: 0,
      baseline: '',
      target: '',
      ratingScales: annualTarget?.content.ratingScales || [],
      ratingScore: -1,
      actualAchieved: '',
      evidence: '',
      attachments: []
    }]);
    onClose();
  };

  const handleAddKPI = () => {
    setKpis([...kpis, {
      indicator: '',
      weight: 0,
      baseline: '',
      target: '',
      ratingScales: annualTarget?.content.ratingScales || [],
      ratingScore: -1,
      actualAchieved: '',
      evidence: '',
      attachments: []
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
      PaperProps={{ sx: { borderRadius: '8px' } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack spacing={3} sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {editingObjective ? 'Edit' : 'Add'} Quarterly Objective
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <FormControl error={!!errors.perspective}>
                <InputLabel>Perspective</InputLabel>
                <Select
                  value={perspective?.index}
                  label="Perspective"
                  onChange={(e) => setPerspective(perspectives.find(p => p.index === e.target.value) || null)}
                >
                  {perspectives.map((p, index) => (
                    <MenuItem key={index} value={p.index}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.perspective && (
                  <Typography color="error" variant="caption">
                    {errors.perspective}
                  </Typography>
                )}
              </FormControl>

              <TextField
                label="Strategic Objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                error={!!errors.objective}
                helperText={errors.objective}
              />

              <Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '40px' }} />
                      <TableCell>Key Performance Indicator</TableCell>
                      <TableCell align="center">Weight %</TableCell>
                      <TableCell align="center">Baseline</TableCell>
                      <TableCell align="center">Target</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kpis.map((kpi, index) => (
                      <React.Fragment key={index}>
                        <TableRow>
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
                                  '::-webkit-outer-spin-button': { '-webkit-appearance': 'none', margin: 0 },
                                  '::-webkit-inner-spin-button': { '-webkit-appearance': 'none', margin: 0 },
                                  '-moz-appearance': 'textfield',
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
                                            value={scale.min}
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
                                            value={scale.max}
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

                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddKPI}
                  sx={{
                    mt: 2,
                    color: '#6B7280',
                    '&:hover': {
                      backgroundColor: '#F9FAFB',
                    },
                  }}
                >
                  Add KPI
                </Button>
              </Box>

              {errors.general && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.general}
                </Alert>
              )}

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

export default QuarterlyObjectiveModal; 