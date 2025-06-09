import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent, FormHelperText
} from '@mui/material';
import { api } from '../../../services/api';
import { Risk } from '../risk_identification/identificationModal';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (riskId: string, impact: string, likelihood: string, inherentRisk: string, riskResponse: string) => void;
  risk?: Risk | null;
}

// New interfaces for Impact, Likelihood, RiskResponse settings
interface RiskImpact {
  _id: string;
  impactName: string;
}

interface RiskLikelihood {
  _id: string;
  likelihoodName: string;
}

interface RiskResponse {
  _id: string;
  responseName: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onSave, risk }) => {
  const [impacts, setImpacts] = useState<RiskImpact[]>([]);
  const [likelihoods, setLikelihoods] = useState<RiskLikelihood[]>([]);
  const [riskResponses, setRiskResponses] = useState<RiskResponse[]>([]);

  const [selectedImpact, setSelectedImpact] = useState<string>('');
  const [selectedLikelihood, setSelectedLikelihood] = useState<string>('');
  const [inherentRisk, setInherentRisk] = useState<string>('');
  const [selectedRiskResponse, setSelectedRiskResponse] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [impactsRes, likelihoodsRes, riskResponsesRes] = await Promise.all([
          api.get('/risk-impact-settings'),
          api.get('/risk-likelihood-settings'),
          api.get('/risk-impact-responses'),
        ]);
        if (impactsRes.status === 200) setImpacts(impactsRes.data.data || []);
        if (likelihoodsRes.status === 200) setLikelihoods(likelihoodsRes.data.data || []);
        if (riskResponsesRes.status === 200) setRiskResponses(riskResponsesRes.data.data || []);

        // Set values only after data is loaded
        if (risk) {
          const impactExists = impactsRes.data.data?.some((i: RiskImpact) => i._id === risk.impact?._id);
          const likelihoodExists = likelihoodsRes.data.data?.some((l: RiskLikelihood) => l._id === risk.likelihood?._id);
          const responseExists = riskResponsesRes.data.data?.some((r: RiskResponse) => r._id === risk.riskResponse?._id);

          setSelectedImpact(impactExists ? risk.impact?._id || '' : '');
          setSelectedLikelihood(likelihoodExists ? risk.likelihood?._id || '' : '');
          setInherentRisk(risk.inherentRisk || '');
          setSelectedRiskResponse(responseExists ? risk.riskResponse?._id || '' : '');
        }
      } catch (error) {
        console.error('Error fetching review modal data:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, risk]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedImpact) newErrors.impact = 'Impact is required';
    if (!selectedLikelihood) newErrors.likelihood = 'Likelihood is required';
    if (!inherentRisk) newErrors.inherentRisk = 'Inherent Risk is required';
    if (!selectedRiskResponse) newErrors.riskResponse = 'Risk Response is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (risk?._id) {
      onSave(risk._id, selectedImpact, selectedLikelihood, inherentRisk, selectedRiskResponse);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Review Risk: {risk?.riskNameElement}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal" error={!!errors.impact}>
          <InputLabel>Impact</InputLabel>
          <Select
            value={selectedImpact}
            onChange={(e: SelectChangeEvent<string>) => {
              setSelectedImpact(e.target.value as string);
              setErrors(prev => ({ ...prev, impact: '' }));
            }}
            label="Impact"
          >
            {impacts.map((impact) => (
              <MenuItem key={impact._id} value={impact._id}>
                {impact.impactName}
              </MenuItem>
            ))}
          </Select>
          {errors.impact && <FormHelperText>{errors.impact}</FormHelperText>}
        </FormControl>
        <FormControl fullWidth margin="normal" error={!!errors.likelihood}>
          <InputLabel>Likelihood</InputLabel>
          <Select
            value={selectedLikelihood}
            onChange={(e: SelectChangeEvent<string>) => {
              setSelectedLikelihood(e.target.value as string);
              setErrors(prev => ({ ...prev, likelihood: '' }));
            }}
            label="Likelihood"
          >
            {likelihoods.map((likelihood) => (
              <MenuItem key={likelihood._id} value={likelihood._id}>
                {likelihood.likelihoodName}
              </MenuItem>
            ))}
          </Select>
          {errors.likelihood && <FormHelperText>{errors.likelihood}</FormHelperText>}
        </FormControl>
        <TextField
          label="Inherent Risk"
          name="inherentRisk"
          value={inherentRisk}
          onChange={(e) => {
            setInherentRisk(e.target.value);
            setErrors(prev => ({ ...prev, inherentRisk: '' }));
          }}
          fullWidth
          margin="normal"
          error={!!errors.inherentRisk}
          helperText={errors.inherentRisk}
        />
        <FormControl fullWidth margin="normal" error={!!errors.riskResponse}>
          <InputLabel>Risk Response</InputLabel>
          <Select
            value={selectedRiskResponse}
            onChange={(e: SelectChangeEvent<string>) => {
              setSelectedRiskResponse(e.target.value as string);
              setErrors(prev => ({ ...prev, riskResponse: '' }));
            }}
            label="Risk Response"
          >
            {riskResponses.map((response) => (
              <MenuItem key={response._id} value={response._id}>
                {response.responseName}
              </MenuItem>
            ))}
          </Select>
          {errors.riskResponse && <FormHelperText>{errors.riskResponse}</FormHelperText>}
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">Save Assessment</Button>
      </DialogActions>
    </Dialog>
  );
}; 