import React, { useState, useEffect } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { api } from '../../../services/api';
import AnnualComplianceDetailView from './AnnualComplianceDetailView';
import { useToast } from '../../../contexts/ToastContext';

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 1 - i);
const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

interface Quarter {
    quarter: string;
    start: string;
    end: string;
}
interface ComplianceSetting {
    id: string;
    year: number;
    firstMonth: string;
    quarters: Quarter[];
}

const initialQuarters = (year: number): Quarter[] => [
    { quarter: 'Q1', start: `${year}-01-01`, end: `${year}-03-31` },
    { quarter: 'Q2', start: `${year}-04-01`, end: `${year}-06-30` },
    { quarter: 'Q3', start: `${year}-07-01`, end: `${year}-09-30` },
    { quarter: 'Q4', start: `${year}-10-01`, end: `${year}-12-31` },
];

const ComplianceSettingPage: React.FC = () => {
    const [settings, setSettings] = useState<ComplianceSetting[]>([]);
    const [viewId, setViewId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [newYear, setNewYear] = useState<number>(years[0]);
    const [newMonth, setNewMonth] = useState<string>(months[0]);
    const [editSetting, setEditSetting] = useState<ComplianceSetting | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        api.get('/compliance-settings').then(res => {
            setSettings((res.data.data || []).map((s: any) => ({
                id: s._id,
                year: s.year,
                firstMonth: s.firstMonth,
                quarters: s.quarters,
            })));
        });
    }, []);

    const checkAndSendQuarterNotification = async (year: number, quarters: Quarter[]) => {
        const today = new Date();
        const currentQuarter = quarters.find(q => {
            const start = new Date(q.start);
            const end = new Date(q.end);
            return today >= start && today <= end;
        });

        if (currentQuarter) {
            try {
                const res = await api.post('/compliance-obligations/send-reminders', {
                    year: year.toString(),
                    quarter: currentQuarter.quarter,
                    endDate: currentQuarter.end,
                });
                if (res.data.data && res.data.data.success) {
                    showToast(res.data.message || 'Reminder emails sent to all champions.', 'success');
                } else {
                    showToast('Failed to send reminder emails.', 'error');
                }
            } catch (error) {
                showToast('Error sending quarter notifications.', 'error');
                console.error('Error sending quarter notifications:', error);
            }
        }
    };

    const handleAddOrEdit = async () => {
        if (editSetting) {
            // Update
            try {
                const res = await api.put(`/compliance-settings/${editSetting.id}`, {
                    year: newYear,
                    firstMonth: newMonth,
                    quarters: editSetting.quarters,
                });
                setSettings(prev => prev.map(s =>
                    s.id === editSetting.id ? {
                        id: res.data.data._id,
                        year: res.data.data.year,
                        firstMonth: res.data.data.firstMonth,
                        quarters: res.data.data.quarters,
                    } : s
                ));
                // Check and send notification after update
                checkAndSendQuarterNotification(newYear, editSetting.quarters);
                setEditSetting(null);
            } catch (error) {
                console.error('Error updating compliance setting:', error);
            }
        } else {
            // Create
            try {
                const quarters = initialQuarters(newYear);
                const res = await api.post('/compliance-settings', {
                    year: newYear,
                    firstMonth: newMonth,
                    quarters: quarters,
                });
                setSettings(prev => [
                    {
                        id: res.data.data._id,
                        year: res.data.data.year,
                        firstMonth: res.data.data.firstMonth,
                        quarters: res.data.data.quarters,
                    },
                    ...prev,
                ]);
                // Check and send notification after creation
                checkAndSendQuarterNotification(newYear, quarters);
            } catch (error) {
                console.error('Error creating compliance setting:', error);
            }
        }
        setModalOpen(false);
    };

    const handleOpenAdd = () => {
        setEditSetting(null);
        setNewYear(years[0]);
        setNewMonth(months[0]);
        setModalOpen(true);
    };

    const handleOpenEdit = (row: ComplianceSetting) => {
        setEditSetting(row);
        setNewYear(row.year);
        setNewMonth(row.firstMonth);
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/compliance-settings/${id}`);
            setSettings(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting compliance setting:', error);
            // Optionally show an error message to the user
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditSetting(null);
    };


    const handleSaveQuarter = async (quarter: Quarter, start: string, end: string) => {
        if (!viewId) return;
        const setting = settings.find(s => s.id === viewId);
        if (!setting) return;
        const updatedQuarters = setting.quarters.map(q =>
            q.quarter === quarter.quarter ? { ...q, start, end } : q
        );
        try {
            const res = await api.put(`/compliance-settings/${setting.id}`, {
                year: setting.year,
                firstMonth: setting.firstMonth,
                quarters: updatedQuarters,
            });
            setSettings(prev => prev.map(s =>
                s.id === setting.id ? {
                    id: res.data.data._id,
                    year: res.data.data.year,
                    firstMonth: res.data.data.firstMonth,
                    quarters: res.data.data.quarters,
                } : s
            ));
            // Check and send notification after quarter update
            await checkAndSendQuarterNotification(setting.year, updatedQuarters);
        } catch (error) {
            console.error('Error updating quarter dates:', error);
        }
    };

    const handleBackFromDetail = () => {
        setViewId(null);

    };

    const selectedSetting = settings.find(s => s.id === viewId);
    const quarters = selectedSetting?.quarters || [];

    if (viewId && selectedSetting) {
        return (
            <AnnualComplianceDetailView
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
                            + Add Annual Compliance Setting
                        </Button>
                    </Box>
                    <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
                        <DialogTitle>{editSetting ? 'Edit Annual Compliance Setting' : 'Add Annual Compliance Setting'}</DialogTitle>
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
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Financial Year 1st Month</InputLabel>
                                <Select
                                    value={newMonth}
                                    label="Financial Year 1st Month"
                                    onChange={e => setNewMonth(e.target.value)}
                                >
                                    {months.map(m => (
                                        <MenuItem key={m} value={m}>{m}</MenuItem>
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
                                    <TableCell align='center'>Financial Year 1st Month</TableCell>
                                    <TableCell align='center'>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {[...settings]
                                    .sort((a, b) => b.year - a.year)
                                    .map(row => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{row.year}</TableCell>
                                            <TableCell align='center'>{row.firstMonth}</TableCell>
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

export default ComplianceSettingPage;
