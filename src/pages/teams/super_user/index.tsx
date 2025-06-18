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
    firstName: string;
    lastName: string;
    isSuperUser?: boolean;
}

const SuperUser: React.FC = () => {
    const [superUsers, setSuperUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast } = useToast();
    const { user } = useAuth();
    const [openPeoplePicker, setOpenPeoplePicker] = useState(false);

    useEffect(() => {
        fetchSuperUsers();
    }, []);

    const fetchSuperUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/super-users/tenant');
            if (response.status === 200) {
                setSuperUsers(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching super users:', error);
            showToast('Failed to fetch super users', 'error');
            setSuperUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSuperUsers = async (selectedPeople: Person[]) => {
        try {
            for (const person of selectedPeople) {
                await api.post('/super-users/tenant', {
                    email: person.email,
                    firstName: person.displayName.split(' ')[0],
                    lastName: person.displayName.split(' ').slice(1).join(' ')
                });
            }
            showToast('Super users added successfully', 'success');
            fetchSuperUsers();
            setOpenPeoplePicker(false);
        } catch (error) {
            console.error('Error adding super users:', error);
            showToast('Failed to add super users', 'error');
        }
    };

    const handleRemoveSuperUser = async (email: string) => {
        try {
            if (email === user?.email) {
                showToast('You cannot remove yourself from super users', 'error');
                return;
            }
            const response = await api.delete(`/super-users/by-email/${email}`);
            if (response.status === 200) {
                showToast('Super user removed successfully', 'success');
                fetchSuperUsers();
            }
        } catch (error) {
            console.error('Error removing super user:', error);
            showToast('Failed to remove super user', 'error');
        }
    };

    const filteredSuperUsers = superUsers.filter(user => {
        const searchLower = searchQuery.toLowerCase();
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
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
                    Add Super User
                </Button>
                <TextField
                    placeholder="Search super users..."
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
                            ) : Array.isArray(filteredSuperUsers) && filteredSuperUsers.length > 0 ? (
                                filteredSuperUsers.map((map_user) => (
                                    <TableRow key={map_user._id}>
                                        <StyledTableCell>{map_user.firstName} {map_user.lastName}</StyledTableCell>
                                        <StyledTableCell>{map_user.email}</StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Tooltip title={map_user.email === user?.email ? "You cannot remove yourself" : "Remove super user"}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveSuperUser(map_user.email)}
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
                                            {searchQuery ? 'No matching super users found' : 'No super users found'}
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
                onSelectPeople={handleAddSuperUsers}
                tenantId={user?.tenantId || ''}
                title="Select Super Users"
                multiSelect={true}
                currentTeamMembers={superUsers.map(user => ({
                    MicrosoftId: user._id,
                    displayName: `${user.firstName} ${user.lastName}`,
                    email: user.email
                }))}
            />
        </Box>
    );
};

export default SuperUser;
