import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Link,
} from '@mui/material';
import { StatusBadge } from '../../../components/StatusBadge';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { IdentificationModal, Risk, AddRiskFormData } from './identificationModal';
import { ExportButton } from '../../../components/Buttons';
import { exportPdf } from '../../../utils/exportPdf';
import { exportExcel } from '../../../utils/exportExcel';
import { Status } from '../../../types';

interface RiskCategory {
  _id: string;
  categoryName: string;
  description: string;
}

const RiskIdentification: React.FC = () => {
  const { user } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = React.useRef<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const statusOptions = [
    'Active',
    'Inactive'
  ];

  useEffect(() => {
    fetchRisks();
    fetchRiskCategories();
  }, [user?.tenantId]);

  const fetchRisks = async () => {
    try {
      const response = await api.get(`/risks`);
      if (response.status === 200) {
        setRisks(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
    }
  };

  const fetchRiskCategories = async () => {
    try {
      const response = await api.get('/risk-categories');
      if (response.status === 200) {
        setRiskCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching risk categories:', error);
    }
  };

  const handleAddRisk = () => {
    setEditingRisk(null);
    setIsModalOpen(true);
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk);
    setIsModalOpen(true);
  };

  const handleDeleteRisk = async (id: string) => {
    try {
      const response = await api.delete(`/risks/${id}`);
      if (response.status === 200) {
        fetchRisks();
      }
    } catch (error) {
      console.error('Error deleting risk:', error);
    }
  };

  const handleSaveRisk = async (data: AddRiskFormData) => {
    try {
      if (editingRisk) {
        const response = await api.put(`/risks/${editingRisk._id}`, data);
        if (response.status === 200) {
          fetchRisks();
        }
      } else {
        const response = await api.post('/risks', { ...data, tenantId: user?.tenantId });
        if (response.status === 201) {
          fetchRisks();
        }
      }
    } catch (error) {
      console.error('Error saving risk:', error);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setSelectedCategory(event.target.value);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setFilterStatus(event.target.value);
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderDescription = (description: string, id: string) => {
    if (isExporting) {
      return description;
    }

    const isExpanded = expandedDescriptions[id];
    const shouldTruncate = description.length > 100;
    const displayText = isExpanded
      ? description
      : shouldTruncate
        ? description.slice(0, 100) + '...'
        : description;

    return (
      <Box sx={{
        width: '100%',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap'
      }}>
        {displayText}
        {shouldTruncate && (
          <Link
            component="button"
            variant="body2"
            onClick={() => toggleDescription(id)}
            sx={{ ml: 1, textDecoration: 'underline' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Link>
        )}
      </Box>
    );
  };

  const filteredRisks = risks.filter(risk => {
    const matchesSearch = risk.riskNameElement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.strategicObjective.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.riskDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (risk.riskCategory && risk.riskCategory._id === selectedCategory);
    const matchesStatus = filterStatus === 'all' || risk.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    // Sort by status: 'Active' first, 'Inactive' second
    if (a.status === 'Active' && b.status === 'Inactive') {
      return -1;
    }
    if (a.status === 'Inactive' && b.status === 'Active') {
      return 1;
    }
  });

  const handleExportPdf = () => {
    if (tableRef.current) {
      setIsExporting(true);
      const pdfColumnWidths = [0.05, 0.15, 0.15, 0.15, 0.10, 0.10, 0.10, 0.10, 0.05, 0.05]; // Added width for actions column, which will be removed by .noprint
      // Delay export to allow re-rendering with full descriptions
      setTimeout(() => {
        exportPdf(
          'risk-identification',
          tableRef,
          'Risk Identification',
          '',
          '',
          pdfColumnWidths
        );
        setIsExporting(false); // Reset after export
      }, 0);
    }
  };

  const handleExportExcel = () => {
    if (tableRef.current) {
      setIsExporting(true);
      // Delay export to allow re-rendering with full descriptions
      setTimeout(() => {
        exportExcel(tableRef.current, 'Risk Identification');
        setIsExporting(false); // Reset after export
      }, 0);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRisk}
            sx={{ textTransform: 'none', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}
          >
            Add Risk
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton
              className="excel"
              onClick={handleExportExcel}
              size="small"
              disabled={isExporting}
            >
              Export to Excel
            </ExportButton>
            <ExportButton
              className="pdf"
              onClick={handleExportPdf}
              size="small"
              disabled={isExporting}
            >
              Export to PDF
            </ExportButton>
          </Box>
        </Box>
        <TextField
          label="Search by any field"
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          size="small"
          sx={{ width: 320 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Risk Category</InputLabel>
          <Select
            value={selectedCategory}
            onChange={handleCategoryChange}
            label="Risk Category"
          >
            <MenuItem value="all">All</MenuItem>
            {riskCategories.map((category) => (
              <MenuItem key={category._id} value={category._id}>
                {category.categoryName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={handleStatusChange}
            label="Status"
          >
            <MenuItem value="all">All</MenuItem>
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto', mt: 2 }}>
        <Table ref={tableRef}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '5%' }}>No.</TableCell>
              <TableCell sx={{ width: '15%' }}>Risk Name/Element</TableCell>
              <TableCell sx={{ width: '15%' }}>Strategic/Operational Objective</TableCell>
              <TableCell sx={{ width: '15%' }}>Risk Description</TableCell>
              <TableCell sx={{ width: '10%' }}>Cause</TableCell>
              <TableCell sx={{ width: '10%' }}>Effect/Impact</TableCell>
              <TableCell sx={{ width: '10%' }}>Risk Category</TableCell>
              <TableCell sx={{ width: '10%' }}>Risk Owner</TableCell>
              <TableCell sx={{ width: '5%' }}>Status</TableCell>
              <TableCell align="center" sx={{ width: '5%' }} className="noprint">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRisks.map((risk, index) => (
              <TableRow key={risk._id} hover>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{risk.riskNameElement}</TableCell>
                <TableCell>{risk.strategicObjective}</TableCell>
                <TableCell>{isExporting ? risk.riskDescription : renderDescription(risk.riskDescription, risk._id)}</TableCell>
                <TableCell>{risk.cause}</TableCell>
                <TableCell>{risk.effectImpact}</TableCell>
                <TableCell>{risk.riskCategory?.categoryName || ''}</TableCell>
                <TableCell>{risk.riskOwner?.name || ''}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={risk.status === 'Active' ? 'active' : 'inactive' as Status}
                  />
                </TableCell>
                <TableCell align="center" className="noprint">
                  <IconButton color="primary" size="small" onClick={() => handleEditRisk(risk)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDeleteRisk(risk._id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <IdentificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRisk}
        editingRisk={editingRisk}
      />
    </Box>
  );
};

export default RiskIdentification;
