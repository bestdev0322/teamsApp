import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent,
} from '@mui/material';
import { api } from '../../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { Risk } from '../../risk_identification/identificationModal'; // Reusing Risk interface

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
    status: 'Planned'
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
      });
    } else if (!editingTreatment) {
      setFormData({
        riskTreatment: '',
        selectedRisk: '',
        owner: '',
        targetDate: '',
        status: 'Planned',
      });
    }
    setFormErrors({});
  }, [editingTreatment, risks, teams]);

  const handleSubmit = () => {
    const errors: Partial<Record<keyof AddTreatmentFormData, string>> = {};
    let isValid = true;

    // Risk Treatment validation
    if (!formData.riskTreatment.trim()) {
      errors.riskTreatment = 'Risk Treatment is required';
      isValid = false;
    } else if (formData.riskTreatment.length < 10) {
      errors.riskTreatment = 'Risk Treatment must be at least 10 characters long';
      isValid = false;
    } else if (formData.riskTreatment.length > 500) {
      errors.riskTreatment = 'Risk Treatment must not exceed 500 characters';
      isValid = false;
    }

    // Selected Risk validation
    if (!formData.selectedRisk) {
      errors.selectedRisk = 'Select Risk is required';
      isValid = false;
    }

    // Owner validation
    if (!formData.owner) {
      errors.owner = 'Owner is required';
      isValid = false;
    }

    // Target Date validation
    if (!formData.targetDate) {
      errors.targetDate = 'Target Date is required';
      isValid = false;
    } else {
      const selectedDate = new Date(formData.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        errors.targetDate = 'Target Date cannot be in the past';
        isValid = false;
      }
    }

    // Status validation
    if (!formData.status) {
      errors.status = 'Status is required';
      isValid = false;
    }

    setFormErrors(errors);

    if (isValid) {
      onSave(formData);
      onClose();
    }
  };

  const validateField = (name: keyof AddTreatmentFormData, value: string) => {
    let error = '';

    switch (name) {
      case 'riskTreatment':
        if (!value.trim()) {
          error = 'Risk Treatment is required';
        } else if (value.length < 10) {
          error = 'Risk Treatment must be at least 10 characters long';
        } else if (value.length > 500) {
          error = 'Risk Treatment must not exceed 500 characters';
        }
        break;

      case 'selectedRisk':
        if (!value) {
          error = 'Select Risk is required';
        }
        break;

      case 'owner':
        if (!value) {
          error = 'Owner is required';
        }
        break;

      case 'targetDate':
        if (!value) {
          error = 'Target Date is required';
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (selectedDate < today) {
            error = 'Target Date cannot be in the past';
          }
        }
        break;

      case 'status':
        if (!value) {
          error = 'Status is required';
        }
        break;

    }

    return error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name as keyof AddTreatmentFormData, value);
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleDropdownChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as string]: value as string }));
    const error = validateField(name as keyof AddTreatmentFormData, value as string);
    setFormErrors((prev) => ({ ...prev, [name as string]: error }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name as keyof AddTreatmentFormData, value);
    setFormErrors((prev) => ({ ...prev, [name]: error }));
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
        
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
}; 