import React from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { StyledHeaderCell, StyledTableCell } from '../../../../components/StyledTableComponents';

interface Member {
    name: string;
    jobTitle: string;
    email: string;
    MicrosoftId?: string;
}

interface RiskChampion {
    _id: string;
    name: string;
    members: Member[];
}

interface RiskMembersProps {
    champion: RiskChampion;
    onBack: () => void;
    onAddChampion: () => void;
    onRemoveMember: (memberId: string) => void;
}

const RiskMembers: React.FC<RiskMembersProps> = ({ champion, onBack, onAddChampion, onRemoveMember }) => {
    return (
        <Box>
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={onAddChampion} sx={{ textTransform: 'none', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}>
                    + Add Risk Champion
                </Button>
                <Button variant="outlined" onClick={onBack} sx={{
                    textTransform: 'none',
                    borderColor: '#DC2626',
                    color: '#DC2626',
                    '&:hover': {
                        borderColor: '#B91C1C',
                        backgroundColor: 'rgba(220, 38, 38, 0.04)',
                    }
                }}>
                    Back
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledHeaderCell>Name</StyledHeaderCell>
                            <StyledHeaderCell>Job Role</StyledHeaderCell>
                            <StyledHeaderCell>Email</StyledHeaderCell>
                            <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {champion.members.map((member, idx) => (
                            <TableRow key={idx} hover>
                                <StyledTableCell>{member.name}</StyledTableCell>
                                <StyledTableCell>{member.jobTitle}</StyledTableCell>
                                <StyledTableCell>{member.email}</StyledTableCell>
                                <StyledTableCell align="center">
                                    <IconButton color="error" onClick={() => onRemoveMember(member.email)} size="small">
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </StyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default RiskMembers;
