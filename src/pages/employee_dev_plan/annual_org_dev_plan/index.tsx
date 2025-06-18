import React, { useState, useEffect } from 'react';
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
  Stack,
  TextField,
  CircularProgress,
  styled,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAuth } from '../../../contexts/AuthContext';
import type { RootState } from '../../../store';
import { fetchDevPlans, createDevPlan, deleteDevPlan, updateDevPlan } from '../../../store/slices/devPlanSlice';
import { useToast } from '../../../contexts/ToastContext';
import PlanView from './plan_view';

const ViewButton = styled(Button)({
  backgroundColor: '#0078D4',
  color: 'white',
  textTransform: 'none',
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: '#106EBE',
  },
});

interface NewPlan {
  name: string;
}

interface EditingPlan {
  _id: string;
  name: string;
}

const AnnualOrganizationDevelopmentPlans: React.FC = () => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPlan, setNewPlan] = useState<NewPlan>({ name: '' });
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPlanForMenu, setSelectedPlanForMenu] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { showToast } = useToast();
  
  const { plans, loading, error } = useAppSelector((state: RootState) => state.devPlan);

  useEffect(() => {
    if (tenantId) {
      dispatch(fetchDevPlans(tenantId))
        .unwrap()
        .catch((error) => {
          showToast('Failed to fetch development plans', 'error');
        });
    }
  }, [dispatch, tenantId]);

  const handleView = (id: string) => {
    setSelectedPlanId(id);
  };

  const handleBack = () => {
    setSelectedPlanId(null);
  };

  const handleEdit = (plan: { _id: string; name: string }) => {
    setEditingPlan(plan);
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
  };

  const handleSaveEdit = async () => {
    if (editingPlan && editingPlan.name.trim()) {
      try {
        await dispatch(updateDevPlan({ 
          planId: editingPlan._id, 
          name: editingPlan.name 
        })).unwrap();
        showToast('Plan updated successfully', 'success');
        setEditingPlan(null);
      } catch (error) {
        showToast('Failed to update plan', 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteDevPlan(id)).unwrap();
      showToast('Plan deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete plan', 'error');
    }
  };

  const handleNewPlan = () => {
    setIsAddingNew(true);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewPlan({ name: '' });
  };

  const handleSaveNewPlan = async () => {
    if (newPlan.name.trim() && tenantId) {
      try {
        await dispatch(createDevPlan({ name: newPlan.name, tenantId })).unwrap();
        showToast('Plan created successfully', 'success');
        setIsAddingNew(false);
        setNewPlan({ name: '' });
      } catch (error) {
        showToast('Failed to create plan', 'error');
      }
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, planId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlanForMenu(planId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlanForMenu(null);
  };

  const handleMenuAction = (action: 'open' | 'edit' | 'delete') => {
    if (!selectedPlanForMenu) return;

    const planToEdit = plans.find(p => p._id === selectedPlanForMenu);
    
    switch (action) {
      case 'open':
        handleView(selectedPlanForMenu);
        break;
      case 'edit':
        if (planToEdit) {
          handleEdit(planToEdit);
        }
        break;
      case 'delete':
        handleDelete(selectedPlanForMenu);
        break;
    }
    handleMenuClose();
  };

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Error loading development plans</Typography>
      </Box>
    );
  }

  if (selectedPlanId) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleBack}
            variant="outlined"
            sx={{
              color: '#0078D4',
              borderColor: '#0078D4',
              '&:hover': {
                borderColor: '#106EBE',
                backgroundColor: 'rgba(0, 120, 212, 0.04)',
              },
            }}
          >
            Back to Plans
          </Button>
        </Box>
        <PlanView planId={selectedPlanId} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h6">
          Annual Employees Development Plan
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewPlan}
          disabled={isAddingNew || loading}
          sx={{
            backgroundColor: '#0078D4',
            '&:hover': {
              backgroundColor: '#106EBE',
            },
            textTransform: 'none'
          }}
        >
          New Plan
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '60%' }}>Plan Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: '20%' }}></TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: '20%' }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAddingNew && (
              <TableRow>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      size="small"
                      placeholder="Enter plan name"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ name: e.target.value })}
                      autoFocus
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </TableCell>
                <TableCell></TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <ViewButton size="small" onClick={handleSaveNewPlan}>
                      Save
                    </ViewButton>
                    <Button
                      size="small"
                      onClick={handleCancelAdd}
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
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No development plans found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow
                  key={plan._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {editingPlan?._id === plan._id ? (
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          size="small"
                          value={editingPlan.name}
                          onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                          autoFocus
                          sx={{ flex: 1 }}
                        />
                      </Box>
                    ) : (
                      plan.name
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, plan._id)}
                    >
                      <MoreHorizIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">
                    {editingPlan?._id === plan._id ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <ViewButton size="small" onClick={handleSaveEdit}>
                          Save
                        </ViewButton>
                        <Button
                          size="small"
                          onClick={handleCancelEdit}
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
                      </Stack>
                    ) : (
                      <ViewButton size="small" onClick={() => handleView(plan._id)}>
                        View
                      </ViewButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleMenuAction('open')} sx={{ minWidth: 120 }}>
          <OpenInNewIcon sx={{ mr: 1, fontSize: 20 }} />
          Open
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <EditOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')} sx={{ color: '#d92d20' }}>
          <DeleteOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AnnualOrganizationDevelopmentPlans;
