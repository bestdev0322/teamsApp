import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useToast } from '../../../../contexts/ToastContext';
import { format } from 'date-fns';
import { api } from '../../../../services/api';
import EmployeeTrainingSelectionModal from '../EmployeeTrainingSelectionModal';
import { RootState } from '@/store';
import { exportPdf } from '../../../../utils/exportPdf';
import { ExportButton } from '../../../../components/Buttons';
import { PdfType } from '../../../../types';
import * as XLSX from 'xlsx';
import { 
  fetchEmployees, 
  addEmployees, 
  updateEmployeeStatus, 
  removeEmployee 
} from '../../../../store/slices/trainingEmployeesSlice';
import { fetchAnnualTargets } from '../../../../store/slices/scorecardSlice';

export enum TrainingStatus {
  PLANNED = 'Planned',
  COMPLETED = 'Completed',
  NOT_COMPLETED = 'Not Completed'
}

interface Employee {
  userId: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  team?: string;
  trainingRequested?: string;
  dateRequested?: Date;
  status: TrainingStatus;
  description?: string;
  annualTargetId: string;
  quarter: string;
}

interface PlanViewProps {
  planId: string;
}

const PlanView: React.FC<PlanViewProps> = ({ planId }) => {
  const [isAddingEmployees, setIsAddingEmployees] = useState(false);
  const [planName, setPlanName] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const { showToast } = useToast();
  const tableRef = useRef<any>(null);
  const dispatch = useAppDispatch();

  
  const { employees, loading, error } = useAppSelector((state: RootState) => state.trainingEmployees);
  const { annualTargets } = useAppSelector((state: RootState) => state.scorecard);
  const [isFinalizingPlan, setIsFinalizingPlan] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  useEffect(() => {
    dispatch(fetchEmployees(planId));
    dispatch(fetchAnnualTargets());
    fetchPlanDetails();
    // Fetch all employees
    const fetchAllEmployees = async () => {
      try {
        const response = await api.get('/training/all-employees');
        setAllEmployees(response.data.data.employees || []);
      } catch (error) {
        console.error('Error fetching all employees:', error);
      }
    };
    fetchAllEmployees();
  }, [planId, dispatch]);

  const fetchPlanDetails = async () => {
    try {
      const response = await api.get(`/users/org-dev-plan/plan/${planId}`);
      if (response.data) {
        setPlanName(response.data.data.name || 'Training Plan');
        setIsFinalized(response.data.data.isFinalized || false);
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
      setPlanName('Training Plan');
    }
  };

  const handleAddEmployees = () => {
    setIsAddingEmployees(true);
  };

  const handleCloseModal = () => {
    setIsAddingEmployees(false);
  };

  const handleStatusChange = async (email: string, trainingRequested: string, annualTargetId: string, quarter: string, newStatus: TrainingStatus) => {
    try {
      if (isFinalized) {
        showToast('Cannot modify status in a finalized plan', 'error');
        return;
      }

      if(!isTrainingRegistered(email, trainingRequested, annualTargetId, quarter)) {
        await dispatch(updateEmployeeStatus({ 
          planId, 
          email, 
          trainingRequested, 
          annualTargetId,
          quarter,
          status: newStatus 
        })).unwrap();
        showToast('Status updated successfully', 'success');
      } else {
        showToast('Training already registered in other plan', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const handlePeopleSelected = async (selectedPeople: Employee[]) => {
    try {
      // Filter out trainings that are already planned or completed in this or other plans
      // const validEmployees = selectedPeople.filter(emp => 
      //   isTrainingRegistered(emp.email, emp.trainingRequested || '', emp.annualTargetId, emp.quarter)
      // );
      const validEmployees = selectedPeople;
      if (validEmployees.length < selectedPeople.length) {
        showToast('Some trainings could not be added as they are already planned or completed in another plan', 'warning');
      }

      if (validEmployees.length > 0) {
        await dispatch(addEmployees({ planId, employees: validEmployees })).unwrap();
        showToast('Employees added successfully', 'success');
      }
    } catch (error) {
      console.error('Error adding employees:', error);
      showToast('Failed to add employees', 'error');
    }
    setIsAddingEmployees(false);
  };

  const handleRemoveEmployee = async (email: string, trainingRequested: string, annualTargetId: string, quarter: string) => {
    try {
      await dispatch(removeEmployee({ 
        planId, 
        email, 
        trainingRequested,
        annualTargetId,
        quarter 
      })).unwrap();
      showToast('Employee removed successfully', 'success');
    } catch (error) {
      console.error('Error removing employee:', error);
      showToast('Failed to remove employee', 'error');
    }
  };

  const calculateProgress = () => {
    if (employees.length === 0) return 0;
    const completedTrainings = employees.filter(emp => emp.status === TrainingStatus.COMPLETED).length;
    return Math.round((completedTrainings / employees.length) * 100);
  };

  const handleExportPDF = () => {
    if (tableRef.current && employees.length > 0) {
      const subtitle = `Implementation Progress: ${progress}%`;
      exportPdf(
        PdfType.Reports,
        tableRef,
        '',
        subtitle,
        '',
        [0.12, 0.12, 0.12, 0.12, 0.12, 0.08, 0.12, 0.12, 0.08]
      );
    }
  };

  const handleExportExcel = () => {
    if (employees.length > 0) {
      const exportData = employees.map(emp => ({
        'Employee Name': emp.displayName,
        'Position': emp.jobTitle || '-',
        'Team': emp.team || '-',
        'Training Requested': emp.trainingRequested || '-',
        'Annual Target': getAnnualTargetName(emp.annualTargetId),
        'Quarter': emp.quarter || '-',
        'Date Requested': emp.dateRequested ? format(new Date(emp.dateRequested), 'MM/dd/yyyy') : '-',
        'Status': emp.status
      }));

      // Add a title row at the top
      const ws = XLSX.utils.aoa_to_sheet([[planName], ['Implementation Progress: ' + progress + '%'], []]);
      XLSX.utils.sheet_add_json(ws, exportData, { origin: 'A4' });

      // Style the header
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];  // Merge cells for title
      ws['!rows'] = [{ hpt: 30 }]; // Height for title row

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Training Plan');
      XLSX.writeFile(wb, `${planName}.xlsx`);
    }
  };

  const getAnnualTargetName = (targetId: string) => {
    const target = annualTargets.find(t => t._id === targetId);
    return target?.name || '-';
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

  const handleFinalizePlan = async () => {
    try {
      setIsFinalizingPlan(true);
      const updatedEmployees = employees.map(emp => ({
        ...emp,
        status: emp.status === TrainingStatus.PLANNED ? TrainingStatus.NOT_COMPLETED : emp.status
      }));

      // Update all employees statuses
      for (const emp of updatedEmployees) {
        await dispatch(updateEmployeeStatus({
          planId,
          email: emp.email,
          trainingRequested: emp.trainingRequested || '',
          annualTargetId: emp.annualTargetId,
          quarter: emp.quarter,
          status: emp.status
        })).unwrap();
      }

      // Call the finalize endpoint
      await api.post(`/users/org-dev-plan/${planId}/finalize`);
      setIsFinalized(true);
      showToast('Plan finalized successfully', 'success');
      dispatch(fetchEmployees(planId));
    } catch (error) {
      console.error('Error finalizing plan:', error);
      showToast('Failed to finalize plan', 'error');
    } finally {
      setIsFinalizingPlan(false);
    }
  };

  const handleUnfinalizePlan = async () => {
    try {
      setIsFinalizingPlan(true);
      // Call the unfinalize endpoint
      await api.post(`/users/org-dev-plan/${planId}/unfinalize`);
      setIsFinalized(false);
      showToast('Plan unfinalized successfully', 'success');
      dispatch(fetchEmployees(planId));
    } catch (error) {
      console.error('Error unfinalizing plan:', error);
      showToast('Failed to unfinalize plan', 'error');
    } finally {
      setIsFinalizingPlan(false);
    }
  };

  const isTrainingRegistered = useCallback((email: string, courseName: string, annualTargetId: string, quarter: string) => {
    return allEmployees.some(emp => 
      emp.email === email && 
      emp.trainingRequested === courseName &&
      emp.annualTargetId === annualTargetId &&
      emp.quarter === quarter &&
      (emp.planId !== planId && emp.status !== TrainingStatus.NOT_COMPLETED)
    );
  }, [allEmployees]);

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', mt: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const progress = calculateProgress();

  return (
    <Box>
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3,
          color: '#101828'
        }}
        className="noprint"
      >
        {planName}
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleAddEmployees}
            sx={{
              backgroundColor: '#0078D4',
              '&:hover': {
                backgroundColor: '#106EBE',
              },
            }}
          >
            Add employees to plan
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButton
              className="excel"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              size="medium"
            >
              Export to Excel
            </ExportButton>
            <ExportButton
              className="pdf"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportPDF}
              size="medium"
            >
              Export to PDF
            </ExportButton>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={isFinalized ? handleUnfinalizePlan : handleFinalizePlan}
            disabled={isFinalizingPlan || (!isFinalized && (employees.length === 0))}
            sx={{
              backgroundColor: isFinalized ? '#DC2626' : '#059669',
              '&:hover': {
                backgroundColor: isFinalized ? '#B91C1C' : '#047857',
              },
              '&.Mui-disabled': {
                backgroundColor: '#E5E7EB',
                color: '#9CA3AF'
              }
            }}
          >
            {isFinalizingPlan 
              ? (isFinalized ? 'Unfinalizing...' : 'Finalizing...') 
              : (isFinalized ? 'Unfinalize Plan' : 'Finalize Plan')
            }
          </Button>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: '200px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="textSecondary">Implementation Progress</Typography>
              <Typography variant="body2" color="textSecondary">{progress}%</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: getProgressBackgroundColor(progress),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getProgressColor(progress),
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
              <TableCell>Training Requested</TableCell>
              <TableCell>Annual Target</TableCell>
              <TableCell>Quarter</TableCell>
              <TableCell>Date Requested</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center" className="noprint">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="textSecondary">No employees added to this plan</Typography>
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={`${employee.email}-${employee.trainingRequested}-${employee.annualTargetId}-${employee.quarter}`}>
                  <TableCell>{employee.displayName}</TableCell>
                  <TableCell>{employee.jobTitle || '-'}</TableCell>
                  <TableCell>{employee.team || '-'}</TableCell>
                  <TableCell>{employee.trainingRequested || '-'}</TableCell>
                  <TableCell>{getAnnualTargetName(employee.annualTargetId)}</TableCell>
                  <TableCell>{employee.quarter || '-'}</TableCell>
                  <TableCell>
                    {employee.dateRequested 
                      ? format(new Date(employee.dateRequested), 'MM/dd/yyyy')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={employee.status || TrainingStatus.PLANNED}
                        onChange={(e) => handleStatusChange(
                          employee.email,
                          employee.trainingRequested || '',
                          employee.annualTargetId,
                          employee.quarter,
                          e.target.value as TrainingStatus
                        )}
                        disabled={isFinalized}
                        sx={{ minWidth: 120 }}
                      >
                        {Object.values(TrainingStatus).map((status) => (
                          <MenuItem 
                            key={status} 
                            value={status}
                            sx={{
                              color: status === TrainingStatus.NOT_COMPLETED ? '#DC2626' : 'inherit'
                            }}
                          >
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveEmployee(
                        employee.email, 
                        employee.trainingRequested || '',
                        employee.annualTargetId,
                        employee.quarter
                      )}
                      disabled={isFinalized}
                      sx={{ color: '#d92d20' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <EmployeeTrainingSelectionModal
        open={isAddingEmployees}
        onClose={handleCloseModal}
        onSelectEmployees={handlePeopleSelected}
        planId={planId}
      />
    </Box>
  );
};

export default PlanView; 