import React, { useState } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { formatDate } from '../../../utils/date';

interface Quarter {
    quarter: string;
    start: string;
    end: string;
}

interface AnnualComplianceDetailViewProps {
    quarters: Quarter[];
    onBack: () => void;
    onEditQuarter: (quarter: Quarter, start: string, end: string) => void;
}

const AnnualComplianceDetailView: React.FC<AnnualComplianceDetailViewProps> = ({ quarters, onBack, onEditQuarter }) => {
  const [quarterModalOpen, setQuarterModalOpen] = useState(false);
  const [editQuarter, setEditQuarter] = useState<Quarter | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [error, setError] = useState('');

  const handleEditQuarter = (q: Quarter) => {
    setEditQuarter(q);
    setEditStart(q.start);
    setEditEnd(q.end);
    setQuarterModalOpen(true);
    setError('');
  };

  const handleSaveQuarter = () => {
    if (!editQuarter) return;
    const newStart = new Date(editStart);
    const newEnd = new Date(editEnd);

    if (newEnd <= newStart) {
      setError('End date must be after start date');
      return;
    }

    const hasOverlap = quarters.some(q => {
      if (q.quarter === editQuarter.quarter) {
        return false;
      }

      const existingStart = new Date(q.start);
      const existingEnd = new Date(q.end);

      return (newStart < existingEnd) && (newEnd > existingStart);
    });

    if (hasOverlap) {
      setError('This quarter\'s dates overlap with another quarter.');
      return;
    }

    onEditQuarter(editQuarter, editStart, editEnd);
    setQuarterModalOpen(false);
    setEditQuarter(null);
    setError('');
  };

  const handleCancelQuarter = () => {
    setQuarterModalOpen(false);
    setEditQuarter(null);
    setError('');
  };

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={onBack}
        sx={{
          textTransform: 'none',
          borderColor: '#DC2626',
          color: '#DC2626',
          mb: 2,
          '&:hover': {
            borderColor: '#B91C1C',
            backgroundColor: 'rgba(220, 38, 38, 0.04)',
          }
        }}
      >
        Back
      </Button>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Quarter</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quarters.map(q => (
              <TableRow key={q.quarter} hover>
                <TableCell>{q.quarter}</TableCell>
                <TableCell>{formatDate(new Date(q.start))}</TableCell>
                <TableCell>{formatDate(new Date(q.end))}</TableCell>
                <TableCell>
                  <IconButton color="primary" size="small" onClick={() => handleEditQuarter(q)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={quarterModalOpen} onClose={handleCancelQuarter} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Quarter Dates</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Start Date"
              type="date"
              value={formatDate(new Date(editStart))}
              onChange={e => setEditStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={formatDate(new Date(editEnd))}
              onChange={e => setEditEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!error}
              helperText={error}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelQuarter}>Cancel</Button>
          <Button onClick={handleSaveQuarter} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnualComplianceDetailView; 