import React, { useState, useEffect } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Menu,
    MenuItem,
    Button,
    styled,
    ListItemIcon,
    ListItemText,
    Collapse,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { AnnualTarget, AnnualTargetStatus } from '../../../types/annualCorporateScorecard';
import { deleteAnnualTarget, fetchAnnualTargets } from '../../../store/slices/scorecardSlice';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { RootState } from '../../../store';
import StrategicObjectiveTab from './tabs/strategic_objective';
import PerspectiveTab from './tabs/perspective';
import RatingScaleTab from './tabs/rating_scale';
import ContractingPeriodTab from './tabs/contracting_period';
import AssessmentsPeriodTab from './tabs/assessments_period';
import AddIcon from '@mui/icons-material/Add';
import AddAnnualTargetModal from './AddAnnualTargetModal';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { StyledTabs, StyledTab } from '../../../components/StyledTab';
import SetAssessmentPeriodTab from './tabs/enable_period';
const ViewButton = styled(Button)({
    textTransform: 'none',
    backgroundColor: '#0078D4',
    color: 'white',
    padding: '6px 16px',
    borderRadius: '4px',
    '&:hover': {
        backgroundColor: '#106EBE',
    },
});

const StyledMenuItem = styled(MenuItem)({
    padding: '8px 16px',
    minHeight: '40px',
    '&:hover': {
        backgroundColor: '#F9FAFB',
    },
});

const StyledListItemIcon = styled(ListItemIcon)({
    minWidth: '32px',
    color: '#6B7280',
});

const CreateButton = styled(Button)(({ theme }) => ({
    textTransform: 'none',
    borderColor: '#E5E7EB',
    color: '#374151',
    '&:hover': {
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
    },
}));

interface RowProps {
    target: AnnualTarget;
    onMenuClick: (event: React.MouseEvent<HTMLElement>, name: string) => void;
    open: boolean;
    onToggle: () => void;
}

const Row: React.FC<RowProps> = ({ target, onMenuClick, open, onToggle }) => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const renderTab = () => {
        switch (tabValue) {
            case 0:
                return <ContractingPeriodTab targetName={target.name} />;
            case 1:
                return <AssessmentsPeriodTab targetName={target.name} />;
            case 2:
                return <SetAssessmentPeriodTab targetName={target.name} />;
            case 3:
                return <StrategicObjectiveTab targetName={target.name} />;
            case 4:
                return <RatingScaleTab targetName={target.name} />;
            case 5:
                return <PerspectiveTab targetName={target.name} />;
            default:
                return null;
        }
    }

    return (
        <>
            <TableRow>
                <StyledTableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={onToggle}
                        sx={{ mr: 1 }}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                    {target.name}
                </StyledTableCell>
                <StyledTableCell>
                    <IconButton
                        size="small"
                        onClick={(e) => onMenuClick(e, target.name)}
                    >
                        <MoreHorizIcon />
                    </IconButton>
                </StyledTableCell>
                <StyledTableCell>{target.startDate}</StyledTableCell>
                <StyledTableCell>{target.endDate}</StyledTableCell>
                <StyledTableCell>{target.status}</StyledTableCell>
                <StyledTableCell align="right">
                    <ViewButton onClick={onToggle}>
                        View
                    </ViewButton>
                </StyledTableCell>
            </TableRow>
            <TableRow>
                <StyledTableCell
                    style={{ paddingBottom: 0, paddingTop: 0 }}
                    colSpan={6}
                >
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2 }}>
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                mb: 2
                            }}>
                                <StyledTabs
                                    value={tabValue}
                                    onChange={handleTabChange}
                                    aria-label="annual target tabs"
                                >
                                    <StyledTab
                                        label="Performance Contracting Period"
                                        disableRipple
                                        aria-label="View performance contracting period"
                                    />
                                    <StyledTab
                                        label="Performance Assessments Period"
                                        disableRipple
                                        aria-label="View performance assessments period"
                                    />
                                    <StyledTab
                                        label="Set Assessment Period"
                                        disableRipple
                                        aria-label="View set assessment period"
                                    />
                                    <StyledTab
                                        label="Strategic Objectives"
                                        disableRipple
                                        aria-label="View strategic objectives"
                                    />
                                    <StyledTab
                                        label="Performance Rating Scale"
                                        disableRipple
                                        aria-label="View performance rating scale"
                                    />
                                    <StyledTab
                                        label="Perspectives"
                                        disableRipple
                                        aria-label="View perspectives"
                                    />
                                </StyledTabs>
                            </Box>
                            <Box>
                                {renderTab()}
                            </Box>
                        </Box>
                    </Collapse>
                </StyledTableCell>
            </TableRow>
        </>
    );
};

interface CreateFromExistingForm {
    name: string;
    sourceScorecard: string;
    startDate: string;
    endDate: string;
    status: AnnualTargetStatus;
}

const AnnualTargets: React.FC = () => {
    const dispatch = useAppDispatch();
    const { annualTargets, status } = useAppSelector((state: RootState) => state.scorecard);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRow, setSelectedRow] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTarget, setEditingTarget] = useState<AnnualTarget | null>(null);
    const [isCreateFromExistingOpen, setIsCreateFromExistingOpen] = useState(false);
    const [createFromExistingForm, setCreateFromExistingForm] = useState<CreateFromExistingForm>({
        name: '',
        sourceScorecard: '',
        startDate: '',
        endDate: '',
        status: AnnualTargetStatus.Inactive,
    });
    const { user } = useAuth();

    useEffect(() => {
        // if (status === 'idle') {
        //     dispatch(fetchAnnualTargets());
        // }
    }, [status, dispatch]);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, rowName: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedRow(rowName);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedRow(null);
    };

    const handleOpen = () => {
        handleMenuClose();
        if (selectedRow) {
            setExpandedRow(selectedRow);
        }
    };

    const handleEdit = () => {
        if (selectedRow) {
            const target = annualTargets.find(t => t.name === selectedRow);
            if (target) {
                setEditingTarget(target);
                setIsModalOpen(true);
                handleMenuClose();
            }
        }
    };

    const handleDelete = () => {
        if (selectedRow) {
            const target = annualTargets.find(t => t.name === selectedRow);
            if (target) {
                dispatch(deleteAnnualTarget(target._id));
                handleMenuClose();
            }
        }
    };

    const handleCreateFromExisting = async () => {
        try {
            const response = await api.post('/score-card/annual-targets/create-from-existing', {
                ...createFromExistingForm,
                tenantId: user.tenantId
            });
            if (response.data) {
                dispatch(fetchAnnualTargets()); // Refresh annual targets instead of teams
                setIsCreateFromExistingOpen(false);
                setCreateFromExistingForm({
                    name: '',
                    sourceScorecard: '',
                    startDate: '',
                    endDate: '',
                    status: AnnualTargetStatus.Inactive,
                });
            }
        } catch (error) {
            console.error('Error creating from existing scorecard:', error);
        }
    };

    return (
        <div>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <CreateButton
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setIsModalOpen(true)}
                    >
                        New
                    </CreateButton>
                    <CreateButton
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setIsCreateFromExistingOpen(true)}
                    >
                        Create from another annual corporate scorecard
                    </CreateButton>
                </Box>
            </Box>
            <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <StyledHeaderCell>Annual Target</StyledHeaderCell>
                                <StyledHeaderCell></StyledHeaderCell>
                                <StyledHeaderCell>Start Date</StyledHeaderCell>
                                <StyledHeaderCell>End Date</StyledHeaderCell>
                                <StyledHeaderCell>Status</StyledHeaderCell>
                                <StyledHeaderCell></StyledHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {annualTargets.map((target, index) => (
                                <Row
                                    key={index}
                                    target={target}
                                    onMenuClick={handleMenuClick}
                                    open={target.name === expandedRow}
                                    onToggle={() => setExpandedRow(expandedRow === target.name ? null : target.name)}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    PaperProps={{
                        elevation: 1,
                        sx: {
                            width: '180px',
                            padding: '4px 0',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                        },
                    }}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                >
                    <StyledMenuItem onClick={handleOpen}>
                        <StyledListItemIcon>
                            <OpenInNewIcon fontSize="small" />
                        </StyledListItemIcon>
                        <ListItemText>Open</ListItemText>
                    </StyledMenuItem>
                    <StyledMenuItem onClick={handleEdit}>
                        <StyledListItemIcon>
                            <EditIcon fontSize="small" />
                        </StyledListItemIcon>
                        <ListItemText>Edit</ListItemText>
                    </StyledMenuItem>
                    <StyledMenuItem onClick={handleDelete}>
                        <StyledListItemIcon>
                            <DeleteIcon fontSize="small" />
                        </StyledListItemIcon>
                        <ListItemText>Delete</ListItemText>
                    </StyledMenuItem>
                </Menu>
            </Paper>
            <AddAnnualTargetModal
                open={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTarget(null);
                }}
                editingAnnualTarget={editingTarget}
            />
            <Dialog 
                open={isCreateFromExistingOpen} 
                onClose={() => setIsCreateFromExistingOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create from another annual corporate scorecard</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Name"
                            required
                            fullWidth
                            value={createFromExistingForm.name}
                            onChange={(e) => setCreateFromExistingForm({
                                ...createFromExistingForm,
                                name: e.target.value
                            })}
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Select annual corporate scorecard to create from</InputLabel>
                            <Select
                                value={createFromExistingForm.sourceScorecard}
                                label="Select annual corporate scorecard to create from"
                                onChange={(e) => setCreateFromExistingForm({
                                    ...createFromExistingForm,
                                    sourceScorecard: e.target.value
                                })}
                            >
                                {annualTargets.map((target) => (
                                    <MenuItem key={target._id} value={target._id}>
                                        {target.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Start date"
                                type="date"
                                required
                                InputLabelProps={{ shrink: true }}
                                value={createFromExistingForm.startDate}
                                onChange={(e) => setCreateFromExistingForm({
                                    ...createFromExistingForm,
                                    startDate: e.target.value
                                })}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="End date"
                                type="date"
                                required
                                InputLabelProps={{ shrink: true }}
                                value={createFromExistingForm.endDate}
                                onChange={(e) => setCreateFromExistingForm({
                                    ...createFromExistingForm,
                                    endDate: e.target.value
                                })}
                                sx={{ flex: 1 }}
                            />
                        </Box>
                        <FormControl fullWidth required>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={createFromExistingForm.status}
                                label="Status"
                                onChange={(e) => setCreateFromExistingForm({
                                    ...createFromExistingForm,
                                    status: e.target.value as AnnualTargetStatus
                                })}
                            >
                                <MenuItem value={AnnualTargetStatus.Active}>Active</MenuItem>
                                <MenuItem value={AnnualTargetStatus.Inactive}>Inactive</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsCreateFromExistingOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained"
                        onClick={handleCreateFromExisting}
                        disabled={!createFromExistingForm.name || !createFromExistingForm.sourceScorecard || !createFromExistingForm.startDate || !createFromExistingForm.endDate}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default AnnualTargets;
