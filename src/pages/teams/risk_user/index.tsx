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
    isRiskSuperUser?: boolean;
}

const RiskUser: React.FC = () => {
    const [riskUsers, setRiskUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();
    const { user } = useAuth();
    const [openPeoplePicker, setOpenPeoplePicker] = useState(false);

    useEffect(() => {
        fetchRiskUsers();
    }, []);

    const fetchRiskUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/risk-users/tenant');
            if (response.status === 200) {
                setRiskUsers(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching risk users:', error);
            showToast('Failed to fetch risk users', 'error');
            setRiskUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRiskUsers = async (selectedPeople: Person[]) => {
        try {
            for (const person of selectedPeople) {
                await api.post('/risk-users/tenant', {
                    email: person.email,
                    firstName: person.displayName.split(' ')[0],
                    lastName: person.displayName.split(' ').slice(1).join(' ')
                });
            }
            showToast('Risk users added successfully', 'success');
            fetchRiskUsers();
            setOpenPeoplePicker(false);
        } catch (error) {
            console.error('Error adding risk users:', error);
            showToast('Failed to add risk users', 'error');
        }
    };

    const handleRemoveRiskUser = async (email: string) => {
        try {
            if (email === user?.email) {
                showToast('You cannot remove yourself from risk users', 'error');
                return;
            }
            const response = await api.delete(`/risk-users/tenant/by-email/${email}`);
            if (response.status === 200) {
                showToast('Risk user removed successfully', 'success');
                fetchRiskUsers();
            }
        } catch (error) {
            console.error('Error removing risk user:', error);
            showToast('Failed to remove risk user', 'error');
        }
    };

    const filteredRiskUsers = riskUsers.filter(user => {
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
                    Add Risk Management Super User
                </Button>
                <TextField
                    placeholder="Search risk users..."
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
                            ) : Array.isArray(filteredRiskUsers) && filteredRiskUsers.length > 0 ? (
                                filteredRiskUsers.map((map_user) => (
                                    <TableRow key={map_user._id}>
                                        <StyledTableCell>{map_user.name}</StyledTableCell>
                                        <StyledTableCell>{map_user.email}</StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Tooltip title={map_user.email === user?.email ? "You cannot remove yourself" : "Remove risk user"}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveRiskUser(map_user.email)}
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
                                            {searchQuery ? 'No matching risk users found' : 'No risk users found'}
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
                onSelectPeople={handleAddRiskUsers}
                tenantId={user?.tenantId || ''}
                title="Select Risk Users"
                multiSelect={true}
                currentTeamMembers={riskUsers.map(user => ({
                    MicrosoftId: user._id,
                    displayName: `${user.name}`,
                    email: user.email
                }))}
            />
        </Box>
    );
};

export default RiskUser;
