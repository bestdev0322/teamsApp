import React, { useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Select,
    MenuItem,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { StyledTableCell } from '../../../../components/StyledTableComponents';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { RootState } from '../../../../store';
import { updateFeedback } from '../../../../store/slices/feedbackSlice';
import { EnableFeedback } from '../../../../types/feedback';
import { AnnualTarget } from '../../../../types/annualCorporateScorecard';

interface EnableFeedbackTabProps {
    feedbackId: string;
}

const EnableFeedbackTab: React.FC<EnableFeedbackTabProps> = ({ feedbackId }) => {
    const dispatch = useAppDispatch();
    const [open, setOpen] = useState(false);
    const [editingQuarter, setEditingQuarter] = useState<EnableFeedback | null>(null);
    
    const feedback = useAppSelector((state: RootState) => 
        state.feedback.feedbacks.find((feedback) => feedback._id === feedbackId)
    );

    const selectedAnnualTarget: AnnualTarget | undefined = useAppSelector((state: RootState) =>
        state.scorecard.annualTargets.find(target => target._id === feedback?.annualTargetId)
    );
    const handleEdit = (quarter: EnableFeedback) => {
        setEditingQuarter(quarter);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingQuarter(null);
    };

    const handleSave = (newValue: boolean) => {
        if (!feedback || !editingQuarter) return;

        const updatedEnableFeedback = feedback.enableFeedback.map(quarter => {
            if (quarter.quarter === editingQuarter.quarter) {
                return {
                    ...quarter,
                    enable: newValue
                };
            }
            return quarter;
        });

        const newFeedback = {
            ...feedback,
            enableFeedback: updatedEnableFeedback
        };

        dispatch(updateFeedback(newFeedback));
        handleClose();
    };

    return (
        <Box sx={{ p: 2 }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledTableCell>Quarter</StyledTableCell>
                            <StyledTableCell>Enable</StyledTableCell>
                            <StyledTableCell align="right" sx={{ width: '100px' }}>Actions</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {feedback?.enableFeedback.map((quarter) => (
                            <TableRow key={quarter.quarter}>
                                <StyledTableCell>{quarter.quarter}</StyledTableCell>
                                <StyledTableCell>
                                    {quarter.enable ? 'Yes' : 'No'}
                                </StyledTableCell>
                                <StyledTableCell align="right">
                                    <Tooltip title="Edit">
                                        <IconButton 
                                            size="small" 
                                            onClick={() => handleEdit(quarter)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </StyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog 
                open={open} 
                onClose={handleClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>Edit Quarter {editingQuarter?.quarter}</Box>
                        <IconButton onClick={handleClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <Select
                            value={editingQuarter?.enable ? 'Yes' : 'No'}
                            onChange={(e) => handleSave(e.target.value === 'Yes')}
                            sx={{ 
                                backgroundColor: '#f5f5f5',
                                '& .MuiSelect-select': { py: 1.5 }
                            }}
                        >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                        </Select>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default EnableFeedbackTab;
