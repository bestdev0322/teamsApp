import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent,
} from '@mui/material';
import { format } from 'date-fns';

const frequencyOptions = [
  'Daily',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Bi-Annual',
  'Annually',
  'Every 2 Years',
  'Every 3 Years',
  'Every 4 Years',
  'Every 5 Years',
];

export interface ValidationFormData {
  convertedToControl: string; // Changed to string for Yes/No dropdown
  controlType: string;
  controlName: string;
  frequency: string;
  validationNotes: string;
  validationDate: string;
}

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ValidationFormData) => void;
  editingTreatment?: {
    _id: string;
    convertedToControl?: boolean;
    controlType?: string;
    validationNotes?: string;
    validationDate?: string;
    controlName?: string; // New field
    frequency?: string;   // New field
  } | null;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({ isOpen, onClose, onSave, editingTreatment }) => {
  const [formData, setFormData] = useState<ValidationFormData>({
    convertedToControl: 'No',
    controlType: '',
    controlName: '',
    frequency: '',
    validationNotes: '',
    validationDate: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ValidationFormData, string>>>({});

  useEffect(() => {
    if (isOpen && editingTreatment) {
      setFormData({
        convertedToControl: editingTreatment.convertedToControl ? 'Yes' : 'No',
        controlType: editingTreatment.controlType || '',
        controlName: editingTreatment.controlName || '',
        frequency: editingTreatment.frequency || '',
        validationNotes: editingTreatment.validationNotes || '',
        validationDate: editingTreatment.validationDate ? format(new Date(editingTreatment.validationDate), 'yyyy-MM-dd') : '',
      });
    } else if (isOpen && !editingTreatment) {
      // Set default date to today for new validation
      setFormData({
        convertedToControl: 'No',
        controlType: '',
        controlName: '',
        frequency: '',
        validationNotes: '',
        validationDate: format(new Date(), 'yyyy-MM-dd'),
      });
    }
    setFormErrors({});
  }, [isOpen, editingTreatment]);

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
    const errors: Partial<Record<keyof ValidationFormData, string>> = {};
    let isValid = true;

    if (!formData.validationNotes.trim()) {
      errors.validationNotes = 'Validation Notes are required';
      isValid = false;
    } else if (formData.validationNotes.length > 1000) {
      errors.validationNotes = 'Validation Notes must not exceed 1000 characters';
      isValid = false;
    }

    if (formData.convertedToControl === 'Yes') {
      if (!formData.controlType.trim()) {
        errors.controlType = 'Frequency is required when converting to control';
        isValid = false;
      }

      if (!formData.controlName.trim()) {
        errors.controlName = 'Control Name is required when converting to control';
        isValid = false;
      } else if (formData.controlName.length > 255) {
        errors.controlName = 'Control Name must not exceed 255 characters';
        isValid = false;
      }

      if (!formData.frequency.trim()) {
        errors.frequency = 'Frequency is required when converting to control';
        isValid = false;
      } else if (formData.frequency.length > 255) {
        errors.frequency = 'Frequency must not exceed 255 characters';
        isValid = false;
      }
    }

    if (!formData.validationDate) {
      errors.validationDate = 'Validation Date is required';
      isValid = false;
    }

    setFormErrors(errors);

    if (isValid) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingTreatment ? 'Edit Validation' : 'Validate Risk Treatment'}</DialogTitle>
      <DialogContent>
        <TextField
          label="Validation Notes"
          name="validationNotes"
          value={formData.validationNotes}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          multiline
          rows={3}
          error={!!formErrors.validationNotes}
          helperText={formErrors.validationNotes}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Convert to Control</InputLabel>
          <Select
            name="convertedToControl"
            value={formData.convertedToControl}
            onChange={handleDropdownChange}
            label="Convert to Control"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </Select>
        </FormControl>
        {formData.convertedToControl === 'Yes' && (
          <>
            <FormControl fullWidth margin="normal">
              <InputLabel>Control Type</InputLabel>
              <Select
                name="controlType"
                value={formData.controlType}
                onChange={handleDropdownChange}
                label="Control Type"
              >
                <MenuItem value="Preventive">Preventive</MenuItem>
                <MenuItem value="Detective">Detective</MenuItem>
                <MenuItem value="Corrective">Corrective</MenuItem>
                <MenuItem value="Mitigating">Mitigating</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Control Name"
              name="controlName"
              value={formData.controlName}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              error={!!formErrors.controlName}
              helperText={formErrors.controlName}
            />
            <FormControl fullWidth margin="normal" required error={!!formErrors.frequency}>
              <InputLabel>Frequency</InputLabel>
              <Select
                name="frequency"
                value={formData.frequency}
                onChange={handleDropdownChange}
                label="Frequency"
              >
                {frequencyOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
              {formErrors.frequency && <div style={{ color: '#d32f2f', fontSize: '0.75rem', marginLeft: '14px', marginTop: '3px' }}>{formErrors.frequency}</div>}
            </FormControl>
          </>
        )}
        <TextField
          label="Date"
          name="validationDate"
          type="date"
          value={formData.validationDate}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          error={!!formErrors.validationDate}
          helperText={formErrors.validationDate}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
}; 