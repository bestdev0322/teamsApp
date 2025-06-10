import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';

interface UpdateTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { status: string; progressNotes: string }) => void;
  editingTreatment?: {
    _id: string;
    status: 'Planned' | 'In Progress' | 'Completed';
    progressNotes?: string;
  } | null;
}

const statusOptions = ['Planned', 'In Progress', 'Completed'];

export const UpdateTreatmentModal: React.FC<UpdateTreatmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTreatment,
}) => {
  const [formData, setFormData] = useState({
    status: 'Planned',
    progressNotes: '',
  });

  useEffect(() => {
    if (editingTreatment) {
      setFormData({
        status: editingTreatment.status,
        progressNotes: editingTreatment.progressNotes || '',
      });
    } else {
      setFormData({
        status: 'Planned',
        progressNotes: '',
      });
    }
  }, [editingTreatment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (e: SelectChangeEvent<string>) => {
    setFormData((prev) => ({ ...prev, status: e.target.value }));
  };

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Risk Treatment</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Status</InputLabel>
          <Select
            name="status"
            value={formData.status}
            onChange={handleStatusChange}
            label="Status"
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Progress Notes"
          name="progressNotes"
          value={formData.progressNotes}
          onChange={handleChange}
          fullWidth
          margin="normal"
          multiline
          rows={4}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!formData.progressNotes.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 