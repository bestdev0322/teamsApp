import React, { useEffect, useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField
} from '@mui/material';
import { TreatmentModal, AddTreatmentFormData } from '../risk_treatment_admin/tabs/treatmentModal';
import { api } from '../../../services/api';
import { formatDate } from '../../../utils/date';

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
}

const MyRiskTreatments: React.FC = () => {
  const [riskTreatments, setRiskTreatments] = useState<RiskTreatment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<RiskTreatment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRiskTreatments();
  }, []);

  const fetchRiskTreatments = async () => {
    try {
      const response = await api.get('/risk-treatments/my-treatments');
      console.log(response, 'response')
      if (response.status === 200) {
        setRiskTreatments(
          (response.data.data || []).filter((t: RiskTreatment) => t.status !== 'Completed')
        );
      }
    } catch (error) {
      console.error('Error fetching risk treatments:', error);
    }
  };

  const handleUpdateClick = (treatment: RiskTreatment) => {
    setEditingTreatment(treatment);
    setIsModalOpen(true);
  };

  const handleSaveTreatment = async (data: AddTreatmentFormData) => {
    if (!editingTreatment) return;
    try {
      await api.put(`/risk-treatments/${editingTreatment._id}`, {
        risk: data.selectedRisk,
        treatment: data.riskTreatment,
        treatmentOwner: data.owner,
        targetDate: data.targetDate,
        status: data.status,
      });
      fetchRiskTreatments();
    } catch (error) {
      console.error('Error updating risk treatment:', error);
    } finally {
      setIsModalOpen(false);
    }
  };

  const filteredTreatments = riskTreatments.filter(t =>
    Object.values(t).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <Box sx={{ p: 3 }}>
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
              <TableCell>Progress Notes</TableCell>
              <TableCell>Validation Notes</TableCell>
              <TableCell>Actions</TableCell>
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
                <TableCell>{t.progressNotes || ''}</TableCell>
                <TableCell>{/* Optionally show validation notes if needed */}</TableCell>
                <TableCell>
                  <Button variant="contained" size="small" onClick={() => handleUpdateClick(t)}>
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TreatmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTreatment}
        editingTreatment={editingTreatment}
      />
    </Box>
  );
};

export default MyRiskTreatments;
