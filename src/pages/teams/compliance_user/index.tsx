import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Table,
    TableBody,
    TableHead,
    TableRow,
    Paper,
    TableContainer,
    IconButton,
    TextField,
    CircularProgress,
    InputAdornment,
    Tooltip,
} from '@mui/material';
import { DeleteRegular } from '@fluentui/react-icons';
import SearchIcon from '@mui/icons-material/Search';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { api } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import PeoplePickerModal, { Person } from '../../../components/PeoplePickerModal';

interface User {
    _id: string;
    email: string;
    name: string;
    isComplianceSuperUser?: boolean;
}

const ComplianceUser: React.FC = () => {
    const [complianceUsers, setComplianceUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();
    const { user } = useAuth();
    const [openPeoplePicker, setOpenPeoplePicker] = useState(false);

    useEffect(() => {
        fetchComplianceUsers();
    }, []);

    const fetchComplianceUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/compliance-users/tenant');
            if (response.status === 200) {
                setComplianceUsers(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching compliance users:', error);
            showToast('Failed to fetch compliance users', 'error');
            setComplianceUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComplianceUsers = async (selectedPeople: Person[]) => {
        try {
            for (const person of selectedPeople) {
                await api.post('/compliance-users/tenant', {
                    email: person.email,
                    firstName: person.displayName.split(' ')[0],
                    lastName: person.displayName.split(' ').slice(1).join(' ')
                });
            }
            showToast('Compliance users added successfully', 'success');
            fetchComplianceUsers();
            setOpenPeoplePicker(false);
        } catch (error) {
            console.error('Error adding compliance users:', error);
            showToast('Failed to add compliance users', 'error');
        }
    };

    const handleRemoveComplianceUser = async (email: string) => {
        try {
            if (email === user?.email) {
                showToast('You cannot remove yourself from compliance users', 'error');
                return;
            }
            const response = await api.delete(`/compliance-users/tenant/by-email/${email}`);
            if (response.status === 200) {
                showToast('Compliance user removed successfully', 'success');
                fetchComplianceUsers();
            }
        } catch (error) {
            console.error('Error removing compliance user:', error);
            showToast('Failed to remove compliance user', 'error');
        }
    };

    const filteredComplianceUsers = complianceUsers.filter(user => {
        const searchLower = searchQuery.toLowerCase();
        const fullName = `${user.name}`.toLowerCase();
        return fullName.includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower);
    });

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'white', p: 2, borderRadius: 1, boxShadow: 1 }}>
                <Button
                    variant="contained"
                    onClick={() => setOpenPeoplePicker(true)}
                    sx={{
                        backgroundColor: '#0078D4',
                        '&:hover': {
                            backgroundColor: '#106EBE'
                        },
                        textTransform: 'none'
                    }}
                >
                    Add Compliance Management Super User
                </Button>
                <TextField
                    placeholder="Search compliance users..."
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: '300px' }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <StyledHeaderCell>Name</StyledHeaderCell>
                                <StyledHeaderCell>Email</StyledHeaderCell>
                                <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <StyledTableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} sx={{ color: '#0078D4' }} />
                                    </StyledTableCell>
                                </TableRow>
                            ) : Array.isArray(filteredComplianceUsers) && filteredComplianceUsers.length > 0 ? (
                                filteredComplianceUsers.map((map_user) => (
                                    <TableRow key={map_user._id}>
                                        <StyledTableCell>{map_user.name}</StyledTableCell>
                                        <StyledTableCell>{map_user.email}</StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Tooltip title={map_user.email === user?.email ? "You cannot remove yourself" : "Remove compliance user"}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveComplianceUser(map_user.email)}
                                                        sx={{
                                                            color: '#DC2626',
                                                            '&.Mui-disabled': {
                                                                color: 'rgba(220, 38, 38, 0.5)'
                                                            }
                                                        }}
                                                        disabled={map_user.email === user?.email}
                                                    >
                                                        <DeleteRegular className="h-5 w-5" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                                            {searchQuery ? 'No matching compliance users found' : 'No compliance users found'}
                                        </Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <PeoplePickerModal
                open={openPeoplePicker}
                onClose={() => setOpenPeoplePicker(false)}
                onSelectPeople={handleAddComplianceUsers}
                tenantId={user?.tenantId || ''}
                title="Select Compliance Users"
                multiSelect={true}
                currentTeamMembers={complianceUsers.map(user => ({
                    MicrosoftId: user._id,
                    displayName: `${user.name}`,
                    email: user.email
                }))}
            />
        </Box>
    );
};

export default ComplianceUser;
