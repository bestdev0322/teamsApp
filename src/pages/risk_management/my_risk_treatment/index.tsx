import React, { useEffect, useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, IconButton, Tabs, Tab, Dialog, DialogTitle, DialogContent, Chip
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import { UpdateTreatmentModal } from './UpdateTreatmentModal';
import { api } from '../../../services/api';
import { formatDate } from '../../../utils/date';
import ProgressHistoryModal from './ProgressHistoryModal';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import { useToast } from '../../../contexts/ToastContext';

interface ProgressHistoryEntry {
  progressNotes: string;
  updatedAt: string;
}

interface RiskTreatment {
  _id: string;
  risk: {
    _id: string;
    riskNameElement: string;
    riskCategory: { _id: string; categoryName: string; };
  };
  treatment: string;
  treatmentOwner: { _id: string; name: string; };
  targetDate: string;
  status: 'Planned' | 'In Progress' | 'Completed';
  progressNotes?: string;
  progressHistory?: ProgressHistoryEntry[];
  convertedToControl?: boolean;
  validationNotes?: string;
  validationDate?: string;
}

const MyRiskTreatments: React.FC = () => {
  const [riskTreatments, setRiskTreatments] = useState<RiskTreatment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<RiskTreatment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedProgressHistory, setSelectedProgressHistory] = useState<ProgressHistoryEntry[]>([]);
  const [tab, setTab] = useState(0); // 0: My Risk Treatments, 1: My Controls
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedValidationNotes, setSelectedValidationNotes] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchRiskTreatments();
  }, []);

  const fetchRiskTreatments = async () => {
    try {
      const response = await api.get('/risk-treatments/my-treatments');
      if (response.status === 200) {
        setRiskTreatments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching risk treatments:', error);
    }
  };

  const handleUpdateClick = (treatment: RiskTreatment) => {
    setEditingTreatment(treatment);
    setIsModalOpen(true);
  };

  const handleSaveTreatment = async (data: { status: string; progressNotes: string }) => {
    if (!editingTreatment) return;
    try {
      showToast('Submitting update...', 'info');
      const updatePayload: any = {
        status: data.status,
        progressNotes: data.progressNotes,
      };

      updatePayload.convertedToControl = false;
      updatePayload.validationNotes = '';
      updatePayload.validationDate = null;
      updatePayload.frequency = '';
      updatePayload.controlName = '';

      await api.put(`/risk-treatments/my-treatments/${editingTreatment._id}`, updatePayload);
      fetchRiskTreatments();
      showToast('Email sent successfully', 'success');
    } catch (error) {
      console.error('Error updating risk treatment:', error);
      showToast('Error updating risk treatment', 'error');
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleOpenProgressModal = (treatment: RiskTreatment) => {
    setSelectedProgressHistory(treatment.progressHistory || []);
    setProgressModalOpen(true);
  };

  // Filtering logic for tabs
  const filteredTreatments = riskTreatments.filter(t =>
    tab === 0
      ? // My Risk Treatments: show all except those completed and convertedToControl is true
      (t.status !== 'Completed' || (t.status === 'Completed' && t.convertedToControl !== true)) &&
      Object.values(t).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
      : // My Controls: show only convertedToControl === true
      t.convertedToControl === true &&
      Object.values(t).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Validation Status logic
  const getValidationStatus = (t: RiskTreatment) => {
    if (t.status !== 'Completed') return 'Completed';
    if (!t.validationNotes) return 'Pending';
    if (t.validationNotes && t.convertedToControl === false) return 'Not Completed';
    return '';
  };

  return (
    <Box sx={{ p: 3 }}>
      <StyledTabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <StyledTab label="My Risk Treatments" />
        <StyledTab label="My Controls" />
      </StyledTabs>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <TextField
          label="Search by any field"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No.</TableCell>
              <TableCell>Risk Name</TableCell>
              <TableCell>Risk Category</TableCell>
              <TableCell>Risk Treatment</TableCell>
              <TableCell>Treatment Owner</TableCell>
              <TableCell>Target Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Progress Notes</TableCell>
              <TableCell align="center">Validation Notes</TableCell>
              {tab === 0 ? (
                <TableCell align="center">Validation Status</TableCell>
              ) : (
                <TableCell>Validation Date</TableCell>
              )}
              {tab === 0 && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTreatments.map((t, idx) => (
              <TableRow key={t._id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{t.risk?.riskNameElement || ''}</TableCell>
                <TableCell>{t.risk?.riskCategory?.categoryName || ''}</TableCell>
                <TableCell>{t.treatment}</TableCell>
                <TableCell>{t.treatmentOwner?.name || ''}</TableCell>
                <TableCell>{formatDate(new Date(t.targetDate))}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell align="center">
                  {t.progressHistory && t.progressHistory.length > 0 ? (
                    <IconButton size="small" onClick={() => handleOpenProgressModal(t)}>
                      <DescriptionIcon />
                    </IconButton>
                  ) : (
                    t.progressNotes || ''
                  )}
                </TableCell>
                <TableCell align="center">
                  {t.validationNotes ? (
                    <IconButton size="small" onClick={() => { setSelectedValidationNotes(t.validationNotes || ''); setValidationModalOpen(true); }}>
                      <DescriptionIcon />
                    </IconButton>
                  ) : ''}
                </TableCell>
                {tab === 0 ? (
                  <TableCell align="center">
                    {(() => {
                      const status = getValidationStatus(t);
                      if (status === 'Pending') return <Chip label="Pending" color="warning" size="small" />;
                      if (status === 'Not Completed') return <Chip label="Not Completed" color="error" size="small" />;
                      if (status === 'Completed') return <Chip label="Completed" color="success" size="small" />;
                      return null;
                    })()}
                  </TableCell>
                ) : (
                  <TableCell>{t.validationDate ? formatDate(new Date(t.validationDate)) : ''}</TableCell>
                )}
                {tab === 0 && (
                  <TableCell align="center">
                    {getValidationStatus(t) !== 'Pending' && (
                      <Button variant="contained" size="small" onClick={() => handleUpdateClick(t)}>
                        Update
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <UpdateTreatmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTreatment}
        editingTreatment={editingTreatment}
      />
      <ProgressHistoryModal
        open={progressModalOpen}
        onClose={() => setProgressModalOpen(false)}
        progressHistory={selectedProgressHistory}
      />
      {/* Validation Notes Modal */}
      <Dialog open={validationModalOpen} onClose={() => setValidationModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Validation Notes
          <IconButton aria-label="close" onClick={() => setValidationModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ whiteSpace: 'pre-wrap', minHeight: 20 }}>{selectedValidationNotes}</Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MyRiskTreatments;
