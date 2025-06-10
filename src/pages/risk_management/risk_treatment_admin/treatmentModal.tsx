import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent,
} from '@mui/material';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Risk } from '../risk_identification/identificationModal'; // Reusing Risk interface

interface Team {
  _id: string;
  name: string;
}

export interface AddTreatmentFormData {
  riskTreatment: string;
  selectedRisk: string;
  owner: string;
  targetDate: string;
  status: string;
  progressNotes: string;
}

interface TreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddTreatmentFormData) => void;
  editingTreatment?: {
    _id: string;
    risk: {
      _id: string;
      riskNameElement: string;
      riskCategory: {
        _id: string;
        categoryName: string;
      };
    };
    treatment: string;
    treatmentOwner: {
      _id: string;
      name: string;
    };
    targetDate: string;
    status: 'Planned' | 'In Progress' | 'Completed';
    progressNotes: string;
  } | null;
}

const statusOptions = [
  'Planned',
  'In Progress',
  'Completed'
];

export const TreatmentModal: React.FC<TreatmentModalProps> = ({ isOpen, onClose, onSave, editingTreatment }) => {
  const { user } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState<AddTreatmentFormData>({
    riskTreatment: '',
    selectedRisk: '',
    owner: '',
    targetDate: '',
    status: 'Planned',
    progressNotes: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddTreatmentFormData, string>>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active risks
        const risksResponse = await api.get(`/risks`); // Fetch all risks, filter in frontend
        if (risksResponse.status === 200) {
          setRisks(risksResponse.data.data.filter((r: Risk) => r.status === 'Active') || []);
        }

        // Fetch teams
        const teamsResponse = await api.get(`/teams/${user?.tenantId}`);
        if (teamsResponse.status === 200) {
          setTeams(teamsResponse.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching data for treatment modal:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, user?.tenantId]);

  useEffect(() => {
    if (editingTreatment && risks.length > 0 && teams.length > 0) {
      // Find the corresponding IDs for risk and owner
      const initialSelectedRisk = risks.find(r => r._id === editingTreatment.risk._id)?._id || '';
      const initialOwner = teams.find(t => t._id === editingTreatment.treatmentOwner._id)?._id || '';

      setFormData({
        riskTreatment: editingTreatment.treatment,
        selectedRisk: initialSelectedRisk,
        owner: initialOwner,
        targetDate: editingTreatment.targetDate,
        status: editingTreatment.status,
        progressNotes: editingTreatment.progressNotes || '',
      });
    } else if (!editingTreatment) {
      setFormData({
        riskTreatment: '',
        selectedRisk: '',
        owner: '',
        targetDate: '',
        status: 'Planned',
        progressNotes: '',
      });
    }
    setFormErrors({});
  }, [editingTreatment, risks, teams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleDropdownChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as string]: value as string }));
    setFormErrors((prev) => ({ ...prev, [name as string]: '' }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = () => {
    const errors: Partial<Record<keyof AddTreatmentFormData, string>> = {};
    let isValid = true;

    if (!formData.riskTreatment.trim()) {
      errors.riskTreatment = 'Risk Treatment is required';
      isValid = false;
    }
    if (!formData.selectedRisk) {
      errors.selectedRisk = 'Select Risk is required';
      isValid = false;
    }
    if (!formData.owner) {
      errors.owner = 'Owner is required';
      isValid = false;
    }
    if (!formData.targetDate) {
      errors.targetDate = 'Target Date is required';
      isValid = false;
    }
    if (!formData.status) {
      errors.status = 'Status is required';
      isValid = false;
    }
    // Progress Notes is optional, so no validation here unless explicitly required.

    setFormErrors(errors);

    if (isValid) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingTreatment ? 'Edit Risk Treatment' : 'Add Risk Treatment'}</DialogTitle>
      <DialogContent>
        <TextField
          label="Risk Treatment"
          name="riskTreatment"
          value={formData.riskTreatment}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.riskTreatment}
          helperText={formErrors.riskTreatment}
        />
        <FormControl fullWidth margin="normal" required error={!!formErrors.selectedRisk}>
          <InputLabel>Select Risk</InputLabel>
          <Select
            name="selectedRisk"
            value={formData.selectedRisk}
            onChange={handleDropdownChange}
            label="Select Risk"
          >
            {risks.map((risk) => (
              <MenuItem key={risk._id} value={risk._id}>
                {risk.riskNameElement}
              </MenuItem>
            ))}
          </Select>
          {formErrors.selectedRisk && <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginLeft: '14px', marginTop: '3px' }}>{formErrors.selectedRisk}</div>}
        </FormControl>
        <FormControl fullWidth margin="normal" required error={!!formErrors.owner}>
          <InputLabel>Owner</InputLabel>
          <Select
            name="owner"
            value={formData.owner}
            onChange={handleDropdownChange}
            label="Owner"
          >
            {teams.map((team) => (
              <MenuItem key={team._id} value={team._id}>
                {team.name}
              </MenuItem>
            ))}
          </Select>
          {formErrors.owner && <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginLeft: '14px', marginTop: '3px' }}>{formErrors.owner}</div>}
        </FormControl>
        <TextField
          label="Target Date"
          name="targetDate"
          type="date"
          value={formData.targetDate}
          onChange={handleDateChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.targetDate}
          helperText={formErrors.targetDate}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <FormControl fullWidth margin="normal" required error={!!formErrors.status}>
          <InputLabel>Status</InputLabel>
          <Select
            name="status"
            value={formData.status}
            onChange={handleDropdownChange}
            label="Status"
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
          {formErrors.status && <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginLeft: '14px', marginTop: '3px' }}>{formErrors.status}</div>}
        </FormControl>
        <TextField
          label="Progress Notes"
          name="progressNotes"
          value={formData.progressNotes}
          onChange={handleChange}
          fullWidth
          margin="normal"
          multiline
          rows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
}; 