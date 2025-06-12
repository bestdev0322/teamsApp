import React, { useState, useEffect } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { api } from '../../../../services/api';
import AnnualResidualAssessmentDetailView from './AnnualResidualAssessmentDetailView';

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 1 - i);

interface Quarter {
    quarter: string;
    start: string;
    end: string;
}
interface ResidualAssessmentCycle {
    id: string;
    year: number;
    quarters: Quarter[];
}

const initialQuarters = (year: number): Quarter[] => [
    { quarter: 'Q1', start: `${year}-01-01`, end: `${year}-03-31` },
    { quarter: 'Q2', start: `${year}-04-01`, end: `${year}-06-30` },
    { quarter: 'Q3', start: `${year}-07-01`, end: `${year}-09-30` },
    { quarter: 'Q4', start: `${year}-10-01`, end: `${year}-12-31` },
];

const ResidualAssessmentCyclePage: React.FC = () => {
    const [cycles, setCycles] = useState<ResidualAssessmentCycle[]>([]);
    const [viewId, setViewId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [newYear, setNewYear] = useState<number>(years[0]);
    const [editCycle, setEditCycle] = useState<ResidualAssessmentCycle | null>(null);

    useEffect(() => {
        api.get('/residual-risk-assessment-cycle').then(res => {
            setCycles((res.data.data || []).map((s: any) => ({
                id: s._id,
                year: s.year,
                quarters: s.quarters,
            })));
        });
    }, []);

    const handleAddOrEdit = async () => {
        if (editCycle) {
            // Update
            try {
                const res = await api.put(`/residual-risk-assessment-cycle/${editCycle.id}`, {
                    year: newYear,
                    quarters: editCycle.quarters,
                });
                setCycles(prev => prev.map(s =>
                    s.id === editCycle.id ? {
                        id: res.data.data._id,
                        year: res.data.data.year,
                        quarters: res.data.data.quarters,
                    } : s
                ));
                setEditCycle(null);
            } catch (error) {
                console.error('Error updating cycle:', error);
            }
        } else {
            // Create
            try {
                const quarters = initialQuarters(newYear);
                const res = await api.post('/residual-risk-assessment-cycle', {
                    year: newYear,
                    quarters: quarters,
                });
                setCycles(prev => [
                    {
                        id: res.data.data._id,
                        year: res.data.data.year,
                        quarters: res.data.data.quarters,
                    },
                    ...prev,
                ]);
            } catch (error) {
                console.error('Error creating cycle:', error);
            }
        }
        setModalOpen(false);
    };

    const handleOpenAdd = () => {
        setEditCycle(null);
        setNewYear(years[0]);
        setModalOpen(true);
    };

    const handleOpenEdit = (row: ResidualAssessmentCycle) => {
        setEditCycle(row);
        setNewYear(row.year);
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/residual-risk-assessment-cycle/${id}`);
            setCycles(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting cycle:', error);
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditCycle(null);
    };

    const handleSaveQuarter = async (quarter: Quarter, start: string, end: string) => {
        if (!viewId) return;
        const cycle = cycles.find(s => s.id === viewId);
        if (!cycle) return;
        const updatedQuarters = cycle.quarters.map(q =>
            q.quarter === quarter.quarter ? { ...q, start, end } : q
        );
        try {
            const res = await api.put(`/residual-risk-assessment-cycle/${cycle.id}`, {
                year: cycle.year,
                quarters: updatedQuarters,
            });
            setCycles(prev => prev.map(s =>
                s.id === cycle.id ? {
                    id: res.data.data._id,
                    year: res.data.data.year,
                    quarters: res.data.data.quarters,
                } : s
            ));
        } catch (error) {
            console.error('Error updating quarter dates:', error);
        }
    };

    const handleBackFromDetail = () => {
        setViewId(null);
    };

    const selectedCycle = cycles.find(s => s.id === viewId);
    const quarters = selectedCycle?.quarters || [];

    if (viewId && selectedCycle) {
        return (
            <AnnualResidualAssessmentDetailView
                quarters={quarters}
                onBack={handleBackFromDetail}
                onEditQuarter={handleSaveQuarter}
            />
        );
    }

    return (
        <Box>
            {!viewId && (
                <>
                    <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleOpenAdd}
                            sx={{ textTransform: 'none', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}
                        >
                            + Add Residual Risk Assessment Cycle
                        </Button>
                    </Box>
                    <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
                        <DialogTitle>{editCycle ? 'Edit Residual Risk Assessment Cycle' : 'Add Residual Risk Assessment Cycle'}</DialogTitle>
                        <DialogContent>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Year</InputLabel>
                                <Select
                                    value={newYear}
                                    label="Year"
                                    onChange={e => setNewYear(Number(e.target.value))}
                                >
                                    {years.map(y => (
                                        <MenuItem key={y} value={y}>{y}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseModal}>Cancel</Button>
                            <Button onClick={handleAddOrEdit} variant="contained">Save</Button>
                        </DialogActions>
                    </Dialog>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto', mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Year</TableCell>
                                    <TableCell align='center'>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[...cycles]
                                    .sort((a, b) => b.year - a.year)
                                    .map(row => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{row.year}</TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                    <Button variant="outlined" onClick={() => setViewId(row.id)}>
                                                        VIEW
                                                    </Button>
                                                    <Button variant="outlined" onClick={() => handleOpenEdit(row)}>
                                                        EDIT
                                                    </Button>
                                                    <Button variant="outlined" color="error" onClick={() => handleDelete(row.id)}>
                                                        DELETE
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
        </Box>
    );
};

export default ResidualAssessmentCyclePage;
