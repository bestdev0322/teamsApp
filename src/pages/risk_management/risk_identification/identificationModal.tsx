import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent
} from '@mui/material';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

// Define the shape of a Risk item
export interface Risk {
  _id: string;
  riskNameElement: string;
  strategicObjective: string;
  riskCategory: {
    _id: string;
    categoryName: string;
  };
  riskDescription: string;
  cause: string;
  effectImpact: string;
  riskOwner: {
    _id: string;
    name: string;
  };
  status: 'Active' | 'Inactive';
}

// Define the shape of the form data for adding/editing a risk
export interface AddRiskFormData {
  riskNameElement: string;
  strategicObjective: string;
  riskCategory: string;
  riskDescription: string;
  cause: string;
  effectImpact: string;
  riskOwner: string;
  status: 'Active' | 'Inactive';
}

interface IdentificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddRiskFormData) => void;
  editingRisk?: Risk | null;
}

interface Team {
  _id: string;
  name: string;
}

interface RiskCategory {
  _id: string;
  categoryName: string;
  description: string;
}

const statusOptions = [
  'Active',
  'Inactive',
];

export const IdentificationModal: React.FC<IdentificationModalProps> = ({ isOpen, onClose, onSave, editingRisk }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([]);
  const [formData, setFormData] = useState<AddRiskFormData>({
    riskNameElement: '',
    strategicObjective: '',
    riskCategory: '',
    riskDescription: '',
    cause: '',
    effectImpact: '',
    riskOwner: '',
    status: 'Active',
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddRiskFormData, string>>>({});

  // Fetch teams and risk categories when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teams
        const teamsResponse = await api.get(`/teams/${user?.tenantId}`);
        if (teamsResponse.status === 200) {
          setTeams(teamsResponse.data.data || []);
        }

        // Fetch risk categories
        const categoriesResponse = await api.get('/risk-categories');
        if (categoriesResponse.status === 200) {
          setRiskCategories(categoriesResponse.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, user?.tenantId]);

  useEffect(() => {
    if (editingRisk && riskCategories.length > 0 && teams.length > 0) {
      setFormData({
        riskNameElement: editingRisk.riskNameElement,
        strategicObjective: editingRisk.strategicObjective,
        riskCategory: editingRisk.riskCategory?._id || '',
        riskDescription: editingRisk.riskDescription,
        cause: editingRisk.cause,
        effectImpact: editingRisk.effectImpact,
        riskOwner: editingRisk.riskOwner?._id || '',
        status: editingRisk.status,
      });
    } else {
      setFormData({
        riskNameElement: '',
        strategicObjective: '',
        riskCategory: '',
        riskDescription: '',
        cause: '',
        effectImpact: '',
        riskOwner: '',
        status: 'Active',
      });
    }
    setFormErrors({});
  }, [editingRisk, riskCategories, teams]);

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

  const handleSubmit = () => {
    const errors: Partial<Record<keyof AddRiskFormData, string>> = {};
    let isValid = true;

    for (const key in formData) {
      if (Object.prototype.hasOwnProperty.call(formData, key)) {
        const value = formData[key as keyof AddRiskFormData];
        if (typeof value === 'string' && value.trim() === '') {
          errors[key as keyof AddRiskFormData] = 'This field is required';
          isValid = false;
        }
      }
    }

    setFormErrors(errors);

    if (isValid) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
      <DialogContent>
        <TextField
          label="Risk Name/Element"
          name="riskNameElement"
          value={formData.riskNameElement}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.riskNameElement}
          helperText={formErrors.riskNameElement}
        />
        <TextField
          label="Strategic/Operational Objective"
          name="strategicObjective"
          multiline
          rows={3}
          value={formData.strategicObjective}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.strategicObjective}
          helperText={formErrors.strategicObjective}
        />
        <FormControl fullWidth margin="normal" required error={!!formErrors.riskCategory}>
          <InputLabel>Risk Category</InputLabel>
          <Select
            name="riskCategory"
            value={formData.riskCategory}
            onChange={handleDropdownChange}
            label="Risk Category"
          >
            {riskCategories.map((category) => (
              <MenuItem key={category._id} value={category._id}>
                {category.categoryName}
              </MenuItem>
            ))}
          </Select>
          {formErrors.riskCategory && <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginLeft: '14px', marginTop: '3px' }}>{formErrors.riskCategory}</div>}
        </FormControl>
        <TextField
          label="Risk Description"
          name="riskDescription"
          multiline
          rows={3}
          value={formData.riskDescription}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.riskDescription}
          helperText={formErrors.riskDescription}
        />
        <TextField
          label="Cause"
          name="cause"
          multiline
          rows={3}
          value={formData.cause}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.cause}
          helperText={formErrors.cause}
        />
        <TextField
          label="Effect/Impact"
          name="effectImpact"
          multiline
          rows={3}
          value={formData.effectImpact}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.effectImpact}
          helperText={formErrors.effectImpact}
        />
        <FormControl fullWidth margin="normal" required error={!!formErrors.riskOwner}>
          <InputLabel>Risk Owner</InputLabel>
          <Select
            name="riskOwner"
            value={formData.riskOwner}
            onChange={handleDropdownChange}
            label="Risk Owner"
          >
            {teams.map((team) => (
              <MenuItem key={team._id} value={team._id}>
                {team.name}
              </MenuItem>
            ))}
          </Select>
          {formErrors.riskOwner && <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginLeft: '14px', marginTop: '3px' }}>{formErrors.riskOwner}</div>}
        </FormControl>
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
