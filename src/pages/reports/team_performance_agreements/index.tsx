import React, { useState } from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    styled,
    SelectChangeEvent,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
} from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { RootState } from '../../../store';
import { QuarterType, AnnualTarget } from '../../../types/annualCorporateScorecard';
import PersonalQuarterlyTargetContent from './PersonalQuarterlyTarget';
import { api } from '../../../services/api';
import { enableTwoQuarterMode, isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
import { useAuth } from '../../../contexts/AuthContext';
const StyledFormControl = styled(FormControl)({
    backgroundColor: '#fff',
    borderRadius: '8px',
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: '#E5E7EB',
        },
        '&:hover fieldset': {
            borderColor: '#D1D5DB',
        },
    },
});

const ViewButton = styled(Button)({
    backgroundColor: '#0078D4',
    color: 'white',
    textTransform: 'none',
    padding: '6px 16px',
    '&:hover': {
        backgroundColor: '#106EBE',
    },
});

const AccessButton = styled(Button)({
    backgroundColor: '#0078D4',
    color: 'white',
    textTransform: 'none',
    padding: '6px 16px',
    minWidth: 'unset',
    '&:hover': {
        backgroundColor: '#106EBE',
    },
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderBottom: '1px solid #E5E7EB',
    padding: '16px',
    color: '#374151',
    '&:first-of-type': {
        width: '25%', // Full Name column
    },
    '&:nth-of-type(2)': {
        width: '20%', // Job Title column
    },
    '&:nth-of-type(3)': {
        width: '20%', // Team column
    },
    '&:nth-of-type(4)': {
        width: '15%', // Status column
    },
    '&:last-of-type': {
        width: '20%', // Actions column
    }
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
    borderBottom: '1px solid #E5E7EB',
    padding: '16px',
    color: '#6B7280',
    fontWeight: 500,
    '&:first-of-type': {
        width: '25%', // Full Name column
    },
    '&:nth-of-type(2)': {
        width: '20%', // Job Title column
    },
    '&:nth-of-type(3)': {
        width: '20%', // Team column
    },
    '&:nth-of-type(4)': {
        width: '15%', // Status column
    },
    '&:last-of-type': {
        width: '20%', // Actions column
    }
}));

const TeamPerformanceAgreements: React.FC = () => {
    const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('');
    const [showTable, setShowTable] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [showPersonalQuarterlyTarget, setShowPersonalQuarterlyTarget] = useState(false);
    const [teamPerformances, setTeamPerformances] = useState([]);
    const { user } = useAuth();
    const annualTargets = useAppSelector((state: RootState) =>
        state.scorecard.annualTargets
    );

    const selectedAnnualTarget = useAppSelector((state: RootState) =>
        state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
    );

    const fetchTeamPerformances = async () => {
        try {
            const response = await api.get(`/report/team-performances?annualTargetId=${selectedAnnualTargetId}`);
            if (response.status === 200) {
                setTeamPerformances(response.data.data);
            } else {
                setTeamPerformances([]);
            }
        } catch (error) {
            console.error('Error fetching team performances:', error);
            setTeamPerformances([]);
        }
    }

    const handleScorecardChange = (event: SelectChangeEvent) => {
        setSelectedAnnualTargetId(event.target.value);
        setShowTable(false);
        setShowPersonalQuarterlyTarget(false);
    };

    const handleQuarterChange = (event: SelectChangeEvent) => {
        setSelectedQuarter(event.target.value);
        setShowTable(false);
        setShowPersonalQuarterlyTarget(false);
    };

    const handleView = () => {
        if (selectedAnnualTargetId && selectedQuarter) {
            fetchTeamPerformances();
            setShowTable(true);
            setSelectedUserId('');
            setSelectedTeamId('');
            setShowPersonalQuarterlyTarget(false);
        }
    };

    return (
        <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <StyledFormControl fullWidth>
                    <InputLabel>Annual Corporate Scorecard</InputLabel>
                    <Select
                        value={selectedAnnualTargetId}
                        label="Annual Corporate Scorecard"
                        onChange={handleScorecardChange}
                    >
                        {annualTargets.map((target) => (
                            <MenuItem key={target._id} value={target._id}>
                                {target.name}
                            </MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>

                <StyledFormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Quarter</InputLabel>
                    <Select
                        value={selectedQuarter}
                        label="Quarter"
                        onChange={handleQuarterChange}
                    >
                        {selectedAnnualTarget && enableTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
                            quarter.editable
                        )).map((quarter) => (
                            quarter.quarter
                        )), user?.isTeamOwner || user?.role === 'SuperUser').map((quarter) => (
                            <MenuItem key={quarter.key} value={quarter.key}>
                                {quarter.alias}
                            </MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>

                <ViewButton
                    variant="contained"
                    disabled={!selectedAnnualTargetId || !selectedQuarter}
                    onClick={handleView}
                >
                    View
                </ViewButton>
            </Box>

            {showTable && (
                <Paper sx={{ mt: 3, boxShadow: 'none', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <StyledHeaderCell>Full Name</StyledHeaderCell>
                                <StyledHeaderCell>Job Title</StyledHeaderCell>
                                <StyledHeaderCell>Team</StyledHeaderCell>
                                <StyledHeaderCell>Status</StyledHeaderCell>
                                <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {teamPerformances.map((teamPerformance, index) => (
                                <TableRow key={index}>
                                    <StyledTableCell>{teamPerformance.fullName}</StyledTableCell>
                                    <StyledTableCell>{teamPerformance.jobTitle}</StyledTableCell>
                                    <StyledTableCell>{teamPerformance.team}</StyledTableCell>
                                    <StyledTableCell>{teamPerformance.quarterlyTargets.find(target => target.quarter === selectedQuarter)?.agreementStatus}</StyledTableCell>
                                    <StyledTableCell align="center">
                                        <AccessButton
                                            size="small"
                                            onClick={() => {
                                                setShowPersonalQuarterlyTarget(true);
                                                setShowTable(false);
                                                setSelectedUserId(typeof teamPerformance.userId === 'string' ? teamPerformance.userId : teamPerformance.userId?._id);
                                                setSelectedTeamId(teamPerformance.teamId);
                                            }}
                                        >
                                            View
                                        </AccessButton>
                                    </StyledTableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}
            {showPersonalQuarterlyTarget && (
                <PersonalQuarterlyTargetContent
                    annualTarget={selectedAnnualTarget as AnnualTarget}
                    quarter={selectedQuarter as QuarterType}
                    isEnabledTwoQuarterMode={isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
                        quarter.editable
                    )).map((quarter) => (
                        quarter.quarter
                    )), user?.isTeamOwner || user?.role === 'SuperUser')}
                    onBack={() => {
                        setShowPersonalQuarterlyTarget(false);
                        setShowTable(true);
                    }}
                    userId={selectedUserId}
                    teamId={selectedTeamId}
                    userName={teamPerformances.find(performance => performance.userId._id === selectedUserId)?.fullName}
                />
            )}
        </Box>
    );
};

export default TeamPerformanceAgreements;
