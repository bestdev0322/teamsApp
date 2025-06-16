import React, { useEffect, useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, IconButton, Tabs, Tab, Dialog, DialogTitle, DialogContent, Chip, Badge
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import { UpdateTreatmentModal } from './UpdateTreatmentModal';
import { api } from '../../../services/api';
import { formatDate } from '../../../utils/date';
import ProgressHistoryModal from './ProgressHistoryModal';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import { useToast } from '../../../contexts/ToastContext';
import { useSocket } from '../../../hooks/useSocket';
import { SocketEvent } from '../../../types/socket';

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
  const { emit } = useSocket(SocketEvent.RISK_TREATMENT_UPDATED, () => { });
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

  const { subscribe: subscribeValidated } = useSocket(SocketEvent.RISK_VALIDATED, fetchRiskTreatments);

  useEffect(() => {
    fetchRiskTreatments();
  }, []);

  useEffect(() => {
    // Subscribe to RISK_VALIDATED to refetch on real-time event
    const unsubValidated = subscribeValidated(SocketEvent.RISK_VALIDATED, () => {
      fetchRiskTreatments();
    });
    return () => {
      unsubValidated();
    };
  }, []);

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
      emit({ teamId: editingTreatment.treatmentOwner?._id }); // Emit to super users
      showToast('Update submitted successfully', 'success');
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

  // Group rows by riskNameElement and categoryName
  function groupRows(data) {
    const groups = [];
    let lastKey = '';
    let rowIndex = 0;
    data.forEach((t, idx) => {
      const key = `${t.risk?.riskNameElement}||${t.risk?.riskCategory?.categoryName}`;
      if (key !== lastKey) {
        const count = data.filter(x => `${x.risk?.riskNameElement}||${x.risk?.riskCategory?.categoryName}` === key).length;
        groups.push({ ...t, rowSpan: count, show: true, idx });
        lastKey = key;
        rowIndex = 1;
      } else {
        groups.push({ ...t, rowSpan: 0, show: false, idx });
        rowIndex++;
      }
    });
    return groups;
  }

  const groupedTreatments = groupRows(filteredTreatments);

  // Validation Status logic
  const getValidationStatus = (t: RiskTreatment) => {
    if (!t.validationNotes && t.status === 'Completed') return 'Pending';
    if (t.validationNotes && t.convertedToControl === false && t.status === 'Completed') return 'Not Completed';
    return '';
  };

  return (
    <Box sx={{ p: 3 }}>
      <StyledTabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <StyledTab
          label={
            <Badge
              color="error"
              badgeContent={riskTreatments.filter(t => t.status !== 'Completed' || (t.status === 'Completed' && t.convertedToControl !== true)).length}
              invisible={riskTreatments.filter(t => t.status !== 'Completed' || (t.status === 'Completed' && t.convertedToControl !== true)).length === 0}
              sx={{ ml: 1, '& .MuiBadge-badge': { right: -10, top: -5, fontSize: '0.75rem', minWidth: 20, height: 20, padding: '0 6px' } }}
            >
              My Risk Treatments
            </Badge>
          }
          sx={{ overflow: 'visible' }}
        />
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
            {groupedTreatments.map((t, idx) => (
              <TableRow key={t._id}>
                {t.show && (
                  <TableCell rowSpan={t.rowSpan}>{idx + 1}</TableCell>
                )}
                {t.show && (
                  <TableCell rowSpan={t.rowSpan}>{t.risk?.riskNameElement || ''}</TableCell>
                )}
                {t.show && (
                  <TableCell rowSpan={t.rowSpan}>{t.risk?.riskCategory?.categoryName || ''}</TableCell>
                )}
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

