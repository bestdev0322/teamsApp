import React, { useState, useEffect } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TextField, IconButton, TableCell } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ExportButton } from '../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ObligationModal from './obligationModal';
import { api } from '../../../services/api';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { fetchTeams } from '../../../store/slices/teamsSlice';
import { useAuth } from '../../../contexts/AuthContext';
import { exportPdf, exportExcel } from '../../../utils/exportUtils';
import { fetchComplianceObligations, updateBadgeCounts, getCurrentQuarterYear } from '../../../store/slices/complianceObligationsSlice';

const riskColors: Record<string, string> = {
  High: '#FF4D4F',    // Red
  Medium: '#FFC53D',  // Amber
  Low: '#52C41A'      // Green
};

interface ComplianceArea {
  _id: string;
  areaName: string;
}

interface Team {
  _id: string;
  name: string;
}

type Update = { year: string; quarter: string; assessmentStatus: string; };

interface Obligation {
  _id: string;
  complianceObligation: string;
  complianceArea: ComplianceArea | string;
  frequency: string;
  lastDueDate: string;
  owner: Team | string;
  riskLevel: string;
  status: string;
  update?: Update[];
}

const getRiskLevelColor = (status) => {
  switch (status) {
    case 'High':
      return '#FF4D4F';  // Green
    case 'Medium':
      return '#FFC53D';  // Red
    case 'Low':
      return '#52C41A';  // Red
    default:
      return 'inherit';
  }
}

const ComplianceObligationPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [complianceAreas, setComplianceAreas] = useState<ComplianceArea[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [editObligation, setEditObligation] = useState<Obligation | null>(null);
  const teams = useAppSelector((state: RootState) => state.teams.teams);
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const tableRef = React.useRef<any>(null);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);
  const { year: currentYear, quarter: currentQuarter } = useAppSelector(getCurrentQuarterYear);
  const dispatch = useAppDispatch();

  useEffect(() => {
    api.get('/compliance-areas').then(res => setComplianceAreas(res.data.data || []));
    api.get('/compliance-obligations').then(res => setObligations(res.data.data || []));
    if (!teams || teams.length === 0) {
      dispatch(fetchTeams(user?.tenantId));
    }
  }, [dispatch]);

  const handleSaveObligation = async (data: any) => {
    if (editObligation) {
      // Update
      const res = await api.put(`/compliance-obligations/${editObligation._id}`, {
        ...data,
      });
      setObligations(prev => prev.map(ob =>
        ob._id === editObligation._id ? res.data.data : ob
      ));
      setEditObligation(null);
    } else {
      // Create
      const res = await api.post('/compliance-obligations', {
        ...data,
      });
      setObligations(prev => [...prev, res.data.data]);
    }
    setModalOpen(false);
    dispatch(fetchComplianceObligations());
    let newQuarterlyBadge = 0, newReviewBadge = 0;
    if (user?.isComplianceChampion && currentYear && currentQuarter) {
      newQuarterlyBadge = obligations.filter((ob) => {
        if (ob.status !== 'Active') return false;
        const update = ob.update?.find((u) => u.year === currentYear.toString() && u.quarter === currentQuarter);
        return !update || (update.assessmentStatus !== 'Submitted' && update.assessmentStatus !== 'Approved');
      }).length;
    }
    if (user?.isComplianceSuperUser && currentYear && currentQuarter) {
      newReviewBadge = obligations.filter((ob) => {
        if (ob.status !== 'Active') return false;
        const update = ob.update?.find((u) => u.year === currentYear.toString() && u.quarter === currentQuarter);
        return update && update.assessmentStatus === 'Submitted';
      }).length;
    }
    dispatch(updateBadgeCounts({ quarterlyBadge: newQuarterlyBadge, reviewBadge: newReviewBadge }));
  };

  const handleEditClick = (ob: Obligation) => {
    setEditObligation(ob);
    setModalOpen(true);
  };

  const handleDeleteObligation = async (id: string) => {
    await api.delete(`/compliance-obligations/${id}`);
    setObligations(prev => prev.filter(ob => ob._id !== id));
    dispatch(fetchComplianceObligations());
    let newQuarterlyBadge = 0, newReviewBadge = 0;
    if (user?.isComplianceChampion && currentYear && currentQuarter) {
      newQuarterlyBadge = obligations.filter((ob) => {
        if (ob.status !== 'Active') return false;
        const update = ob.update?.find((u) => u.year === currentYear.toString() && u.quarter === currentQuarter);
        return !update || (update.assessmentStatus !== 'Submitted' && update.assessmentStatus !== 'Approved');
      }).length;
    }
    if (user?.isComplianceSuperUser && currentYear && currentQuarter) {
      newReviewBadge = obligations.filter((ob) => {
        if (ob.status !== 'Active') return false;
        const update = ob.update?.find((u) => u.year === currentYear.toString() && u.quarter === currentQuarter);
        return update && update.assessmentStatus === 'Submitted';
      }).length;
    }
    dispatch(updateBadgeCounts({ quarterlyBadge: newQuarterlyBadge, reviewBadge: newReviewBadge }));
  };

  const getAreaName = (area: ComplianceArea | string) => {
    if (typeof area === 'string') return complianceAreas.find(a => a._id === area)?.areaName || '';
    return area?.areaName || '';
  };
  const getTeamName = (owner: Team | string) => {
    if (typeof owner === 'string') return teams.find(t => t._id === owner)?.name || '';
    return owner?.name || '';
  };

  // Filtered obligations for search
  const filteredObligations = obligations.filter(ob =>
    ob.complianceObligation.toLowerCase().includes(search.toLowerCase()) ||
    getAreaName(ob.complianceArea).toLowerCase().includes(search.toLowerCase()) ||
    ob.frequency.toLowerCase().includes(search.toLowerCase()) ||
    ob.lastDueDate.toLowerCase().includes(search.toLowerCase()) ||
    getTeamName(ob.owner).toLowerCase().includes(search.toLowerCase()) ||
    ob.riskLevel.toLowerCase().includes(search.toLowerCase()) ||
    ob.status.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportPdf = () => {
    setExportType('pdf');
  };
  const handleExportExcel = () => {
    setExportType('excel');
  };

  React.useEffect(() => {
    if (exportType) {
      const doExport = async () => {
        if (exportType === 'pdf') {
          await exportPdf(
            'compliance-obligation',
            tableRef,
            'Compliance Obligations',
            '',
            '',
            [0.2, 0.15, 0.1, 0.18, 0.18, 0.1, 0.09]
          );
        } else if (exportType === 'excel') {
          exportExcel(tableRef.current, 'Compliance Obligations');
        }
        setExportType(null);
      };
      setTimeout(doExport, 0);
    }
  }, [exportType]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setModalOpen(true); setEditObligation(null); }}
            sx={{ textTransform: 'none', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}
          >
            Add Compliance Obligation
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton
              className="excel"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              size="small"
            >
              Export to Excel
            </ExportButton>
            <ExportButton
              className="pdf"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportPdf}
              size="small"
            >
              Export to PDF
            </ExportButton>
          </Box>
        </Box>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by any field"
          size="small"
          sx={{ width: 320 }}
        />
      </Box>
      <ObligationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditObligation(null); }}
        onSave={handleSaveObligation}
        complianceAreas={complianceAreas}
        teams={teams}
        initialData={editObligation}
      />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto', mt: 2 }}>
        <Table ref={tableRef}>
          <TableHead>
            <TableRow>
              <TableCell>Compliance Obligation</TableCell>
              <TableCell>Compliance Area</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Last Due Date</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Risk Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center" className="noprint">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredObligations.map(ob => (
              <TableRow key={ob._id} hover>
                <TableCell>{ob.complianceObligation}</TableCell>
                <TableCell>{getAreaName(ob.complianceArea)}</TableCell>
                <TableCell>{ob.frequency}</TableCell>
                <TableCell>{ob.lastDueDate}</TableCell>
                <TableCell>{getTeamName(ob.owner)}</TableCell>
                <TableCell
                  data-color={getRiskLevelColor(ob.riskLevel || '')}
                  sx={{ color: getRiskLevelColor(ob.riskLevel || '') }}
                >
                  <Box component="span" sx={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: riskColors[ob.riskLevel],
                    marginRight: 1,
                    verticalAlign: 'middle'
                  }} />
                  {ob.riskLevel}
                </TableCell>
                <TableCell>{ob.status}</TableCell>
                <TableCell align="center" className="noprint">
                  <IconButton color="primary" size="small" onClick={() => handleEditClick(ob)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton color="error" size="small" onClick={() => handleDeleteObligation(ob._id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ComplianceObligationPage;
