import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { fetchTeamPerformances, clearTeamPerformances } from '../../../store/slices/personalPerformanceSlice';
import { fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { useAuth } from '../../../contexts/AuthContext';
import { AssessmentStatus, PersonalPerformance } from '../../../types/personalPerformance';
import { fetchDevPlans } from '../../../store/slices/devPlanSlice';
import { RootState } from '../../../store';
import { TrainingStatus } from './plan_view';
import { api } from '../../../services/api';

interface UserData {
  _id: string;
  email: string;
  name: string;
}

interface TeamPerformance extends PersonalPerformance {
  fullName: string;
  jobTitle: string;
  team: string;
  email: string;
  userId: string | UserData;
  updatedAt: string;
}

interface Employee {
  userId: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  team?: string;
  trainingRequested: string;
  status: TrainingStatus;
  dateRequested: Date;
  description?: string;
  annualTargetId: string;
  quarter: string;
}

interface SelectedEmployee {
  userId: string;
  displayName: string;
  email: string;
  jobTitle: string;
  team: string;
  trainingRequested: string;
  status: TrainingStatus;
  dateRequested: Date;
  description: string;
  annualTargetId: string;
  quarter: string;
}

interface Course {
  name: string;
  description?: string;
}

interface EmployeeTrainingSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectEmployees: (employees: SelectedEmployee[]) => void;
  planId: string;
}

const EmployeeTrainingSelectionModal: React.FC<EmployeeTrainingSelectionModalProps> = ({
  open,
  onClose,
  onSelectEmployees,
  planId
}) => {
  const [selectedEmployees, setSelectedEmployees] = useState<{ [key: string]: SelectedEmployee }>({});
  const [loadedTargetIds, setLoadedTargetIds] = useState<Set<string>>(new Set());
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { teamPerformances = [], teamPerformancesByTarget = {}, status: teamPerformancesStatus } = useAppSelector((state: RootState) => state.personalPerformance);
  const { annualTargets, status: annualTargetsStatus } = useAppSelector((state: RootState) => state.scorecard);
  // const { employees: existingEmployees } = useAppSelector((state: RootState) => state.trainingEmployees);

  const getAnnualTargetName = (targetId: string) => {
    const target = annualTargets.find(t => t._id === targetId);
    return target?.name || '-';
  };

  // Reset states and fetch data when modal opens
  useEffect(() => {
    if (open) {
      setSelectedEmployees({});
      setLoadedTargetIds(new Set());
      dispatch(fetchDevPlans(user?.tenantId || ''));
      dispatch(clearTeamPerformances());
      dispatch(fetchAnnualTargets());

      // Fetch all employees
      const fetchAllEmployees = async () => {
        setIsLoadingEmployees(true);
        try {
          const response = await api.get('/training/all-employees');
          setAllEmployees(response.data.data.employees || []);
        } catch (error) {
          console.error('Error fetching all employees:', error);
        } finally {
          setIsLoadingEmployees(false);
        }
      };
      fetchAllEmployees();
    }
  }, [open, dispatch, user?.tenantId]);

  // Fetch team performances when annual targets are loaded
  useEffect(() => {
    if (annualTargets.length > 0) {
      annualTargets.forEach(target => {
        if (target._id && !loadedTargetIds.has(target._id)) {
          setLoadedTargetIds(prev => {
            const newSet = new Set(prev);
            newSet.add(target._id);
            return newSet;
          });
          dispatch(fetchTeamPerformances(target._id));
        }
      });
    }
  }, [annualTargets, dispatch, loadedTargetIds]);


  const isTrainingRegistered = useCallback((email: string, courseName: string, annualTargetId: string, quarter: string) => {
    return allEmployees.some(emp => 
      emp.email === email && 
      emp.trainingRequested === courseName &&
      emp.annualTargetId === annualTargetId &&
      emp.quarter === quarter &&
      (emp.planId !== planId && emp.status !== TrainingStatus.NOT_COMPLETED || emp.planId === planId)
    );
  }, [allEmployees, planId]);

  const approvedEmployees = useMemo(() => {
    if (!Array.isArray(teamPerformances)) return [];
    
    return (teamPerformances as TeamPerformance[])
      .filter((performance) => {
        const hasApprovedCourses = performance.quarterlyTargets?.some(target => 
          target.assessmentStatus === AssessmentStatus.Approved &&
          target.personalDevelopment &&
          target.personalDevelopment.length > 0
        );
        return hasApprovedCourses;
      })
      .map(performance => {
        const coursesWithQuarters = performance.quarterlyTargets
          ?.filter(target => 
            target.assessmentStatus === AssessmentStatus.Approved &&
            target.personalDevelopment &&
            target.personalDevelopment.length > 0
          )
          .map(target => ({
            quarter: target.quarter,
            courses: target.personalDevelopment || []
          })) || [];

        return {
          ...performance,
          coursesWithQuarters
        };
      })
      .filter(employee => {
        const annualTargetId = Object.entries(teamPerformancesByTarget)
          .find(([_, performances]) => performances.some(p => p._id === employee._id))?.[0];

        if (!annualTargetId) return false;

        // Check if there are any unregistered and valid courses
        return employee.coursesWithQuarters.some(({ quarter, courses }) =>
          courses.some(course => 
            !isTrainingRegistered(employee.email, course.name, annualTargetId, quarter)
          )
        );
      });
  }, [teamPerformances, teamPerformancesByTarget, isTrainingRegistered]);

  const handleToggleEmployee = (performance: TeamPerformance, course: Course, quarter: string) => {
    // Find the annual target ID for this performance
    const annualTargetId = Object.entries(teamPerformancesByTarget).find(
      ([_, performances]) => performances.some(p => p._id === performance._id)
    )?.[0];

    if (!annualTargetId) {
      console.error('Could not find annual target ID for performance:', performance);
      return;
    }

    // Skip if the training is already registered or not valid
    if (isTrainingRegistered(performance.email, course.name, annualTargetId, quarter)) {
      return;
    }

    const key = `${performance._id}-${course.name}-${quarter}`;
    
    if (selectedEmployees[key]) {
      const { [key]: removed, ...rest } = selectedEmployees;
      setSelectedEmployees(rest);
    } else {
      const email = performance.email || 
        (typeof performance.userId === 'object' ? performance.userId.email : undefined);

      if (!email) {
        return;
      }

      const newEmployee: SelectedEmployee = {
        userId: typeof performance.userId === 'object' ? performance.userId._id : performance.userId,
        displayName: performance.fullName,
        email: email,
        jobTitle: performance.jobTitle || '',
        team: performance.team || '',
        trainingRequested: course.name,
        status: TrainingStatus.PLANNED,
        dateRequested: new Date(performance.updatedAt),
        description: course.description || course.name || '',
        annualTargetId: annualTargetId,
        quarter: quarter
      };

      setSelectedEmployees(prev => ({
        ...prev,
        [key]: newEmployee
      }));
    }
  };

  const handleConfirm = () => {
    const formattedEmployees = Object.values(selectedEmployees)
      .filter(employee => employee.email);
    
    if (formattedEmployees.length === 0) {
      return;
    }

    onSelectEmployees(formattedEmployees);
    onClose();
  };

  const isLoading = teamPerformancesStatus === 'loading' || 
                   annualTargetsStatus === 'loading' || 
                   isLoadingEmployees;
  const hasAvailableEmployees = approvedEmployees.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Select Employees with Approved Training Courses
        {isLoading && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading employee data...</Typography>
          </Box>
        ) : !hasAvailableEmployees ? (
          <Typography color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
            No employees found with approved and unregistered training courses.
            {teamPerformances.length === 0 && ' (No team performances loaded)'}
            {teamPerformances.length > 0 && !teamPerformances.some(p => p.quarterlyTargets?.length > 0) && 
              ' (No quarterly targets found)'}
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Select</TableCell>
                  <TableCell>Employee Name</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Training Requested</TableCell>
                  <TableCell>Annual Target</TableCell>
                  <TableCell>Quarter</TableCell>
                  <TableCell>Date Requested</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {approvedEmployees.map((employee) => (
                  employee.coursesWithQuarters.map(({ quarter, courses }) => (
                    courses
                      .filter(course => !isTrainingRegistered(
                        employee.email, 
                        course.name,
                        Object.entries(teamPerformancesByTarget).find(
                          ([_, performances]) => performances.some(p => p._id === employee._id)
                        )?.[0] || '',
                        quarter
                      ))
                      .map((course: any, courseIndex: number) => (
                        <TableRow
                          key={`${employee._id}-${quarter}-${courseIndex}`}
                          hover
                          onClick={() => handleToggleEmployee(employee, course, quarter)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: selectedEmployees[`${employee._id}-${course.name}-${quarter}`] ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={Boolean(selectedEmployees[`${employee._id}-${course.name}-${quarter}`])}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleEmployee(employee, course, quarter);
                              }}
                            />
                          </TableCell>
                          <TableCell>{employee.fullName}</TableCell>
                          <TableCell>{employee.jobTitle}</TableCell>
                          <TableCell>{employee.team}</TableCell>
                          <TableCell>{course.name}</TableCell>
                          <TableCell>{getAnnualTargetName(Object.entries(teamPerformancesByTarget).find(
                            ([_, performances]) => performances.some(p => p._id === employee._id)
                          )?.[0] || '')}</TableCell>
                          <TableCell>{quarter}</TableCell>
                          <TableCell>
                            {new Date(employee.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                  ))
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              color: '#d92d20',
              borderColor: '#d92d20',
              '&:hover': {
                borderColor: '#b42318',
                backgroundColor: 'rgba(217, 45, 32, 0.04)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={!hasAvailableEmployees || Object.keys(selectedEmployees).length === 0}
            sx={{
              backgroundColor: '#0078D4',
              '&:hover': {
                backgroundColor: '#106EBE',
              },
            }}
          >
            Add Selected
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeTrainingSelectionModal; 
