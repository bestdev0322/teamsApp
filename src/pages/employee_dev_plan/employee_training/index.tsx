import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  CircularProgress,
  Button,
} from '@mui/material';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { TrainingStatus } from '../annual_org_dev_plan/plan_view';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { RootState } from '../../../store';
import { ExportButton } from '../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { exportPdf } from '../../../utils/exportPdf';
import { PdfType } from '../../../types';
import { format } from 'date-fns';

interface OrgDevPlan {
  _id: string;
  name: string;
  year: number;
}

interface Employee {
  microsoftId: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  team?: string;
  trainingRequested: string;
  dateRequested: Date;
  status: TrainingStatus;
  annualTargetId: string;
  quarter: string;
}

const EmployeesTraining: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [plans, setPlans] = useState<OrgDevPlan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { annualTargets } = useAppSelector((state: RootState) => state.scorecard);
  const tableRef = useRef<any>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await api.get(`/users/org-dev-plan/${user?.tenantId}`);
      if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        setPlans(response.data.data);
      } else {
        setPlans([]);
      }
    } catch (error) {
      showToast('Failed to fetch plans', 'error');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, showToast]);

  const fetchEmployees = useCallback(async (planId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/training/${planId}/employees`);
      if (response.data.status === 'success') {
        setEmployees(response.data.data.employees);
      }
    } catch (error) {
      showToast('Failed to fetch employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlans();
    dispatch(fetchAnnualTargets());
  }, [dispatch, fetchPlans]);

  useEffect(() => {
    if (selectedPlan) {
      fetchEmployees(selectedPlan);
    } else {
      setEmployees([]);
    }
  }, [selectedPlan, fetchEmployees]);

  const handleView = () => {
    fetchEmployees(selectedPlan);
    setIsTableVisible(true);
  };

  const calculateProgress = () => {
    if (employees.length === 0) return 0;
    const completedTrainings = employees.filter(emp => emp.status === TrainingStatus.COMPLETED).length;
    return Math.round((completedTrainings / employees.length) * 100);
  };

  const getAnnualTargetName = (targetId: string) => {
    const target = annualTargets.find(t => t._id === targetId);
    return target?.name || '-';
  };

  const handleExportExcel = () => {
    if (employees.length > 0) {
      const selectedPlanName = plans.find(plan => plan._id === selectedPlan)?.name || 'Training Plan';
      const progress = calculateProgress();

      const exportData = employees.map(employee => ({
        'Employee Name': employee.displayName,
        'Position': employee.jobTitle || '-',
        'Team': employee.team || '-',
        'Training/Course': employee.trainingRequested,
        'Annual Target': getAnnualTargetName(employee.annualTargetId),
        'Quarter': employee.quarter || '-',
        'Date Requested': employee.dateRequested ? format(new Date(employee.dateRequested), 'MM/dd/yyyy') : '-',
        'Status': employee.status
      }));

      // Add a title row at the top
      const ws = XLSX.utils.aoa_to_sheet([[selectedPlanName], ['Implementation Progress: ' + progress + '%'], []]);
      XLSX.utils.sheet_add_json(ws, exportData, { origin: 'A4' });

      // Style the header
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];  // Merge cells for title
      ws['!rows'] = [{ hpt: 30 }]; // Height for title row

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Training Plan');

      // Generate buffer
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      saveAs(dataBlob, `${selectedPlanName}_Training_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const handleExportPDF = async () => {
    if (employees.length > 0) {
      const selectedPlanName = plans.find(plan => plan._id === selectedPlan)?.name || 'Training Plan';
      const title = `${selectedPlanName} - Employee Training Status`;
      exportPdf(PdfType.PerformanceEvaluation, tableRef, title, `Implementation Progress: ${calculateProgress()}%`, '', [0.2, 0.15, 0.15, 0.15, 0.15, 0.1, 0.1]);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#22C55E'; // Green
    if (progress >= 50) return '#F59E0B'; // Amber
    return '#DC2626'; // Red
  };

  const getProgressBackgroundColor = (progress: number) => {
    if (progress >= 80) return 'rgba(34, 197, 94, 0.12)'; // Light Green
    if (progress >= 50) return 'rgba(245, 158, 11, 0.12)'; // Light Amber
    return 'rgba(220, 38, 38, 0.12)'; // Light Red
  };

  if (loading && !selectedPlan) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl fullWidth>
          <Select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            displayEmpty
            sx={{ backgroundColor: '#fff' }}
          >
            {plans?.map((plan) => (
              <MenuItem key={plan._id} value={plan._id}>
                {plan.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleView}
          disabled={!selectedPlan}
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': { backgroundColor: '#106EBE' },
          }}
        >
          View
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'right', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : isTableVisible ? (
        <>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2
            }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
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
                  onClick={handleExportPDF}
                  size="small"
                >
                  Export to PDF
                </ExportButton>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1, 
                maxWidth: '300px'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre' }}>Implementation Progress </Typography>
                  <Typography variant="body2" color="textSecondary">{calculateProgress()}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateProgress()}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: getProgressBackgroundColor(calculateProgress()),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getProgressColor(calculateProgress()),
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table ref={tableRef}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee Full Name</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Training/Course</TableCell>
                  <TableCell>Annual Target</TableCell>
                  <TableCell>Quarter</TableCell>
                  <TableCell>Completed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">No employees found in this plan</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={`${employee.email}-${employee.trainingRequested}-${employee.annualTargetId}-${employee.quarter}`}>
                      <TableCell>{employee.displayName}</TableCell>
                      <TableCell>{employee.jobTitle || '-'}</TableCell>
                      <TableCell>{employee.team || '-'}</TableCell>
                      <TableCell>{employee.trainingRequested}</TableCell>
                      <TableCell>{getAnnualTargetName(employee.annualTargetId)}</TableCell>
                      <TableCell>{employee.quarter || '-'}</TableCell>
                      <TableCell>{employee.status === TrainingStatus.COMPLETED ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
    </Box>
  );
};

export default EmployeesTraining;
