import React, { useRef, useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Typography,
    Button,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { ValidationModal, ValidationFormData } from '../components/validationModal';
import { api } from '../../../../services/api';
import { formatDate } from '../../../../utils/date';
import { useToast } from '../../../../contexts/ToastContext';
import ProgressHistoryModal from '../../my_risk_treatment/ProgressHistoryModal';
import { RiskTreatment } from '../index';

interface ControlsTabProps {
    riskTreatments: RiskTreatment[];
    fetchRiskTreatments: () => void;
}

const ControlsTab: React.FC<ControlsTabProps> = ({ riskTreatments, fetchRiskTreatments }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const tableRef = useRef<any>(null);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedNotes, setSelectedNotes] = useState<string>('');
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [selectedTreatmentForValidation, setSelectedTreatmentForValidation] = useState<RiskTreatment | null>(null);
    const { showToast } = useToast();
    const [progressModalOpen, setProgressModalOpen] = useState(false);
    const [selectedProgressHistory, setSelectedProgressHistory] = useState([]);
    const [selectedTreatmentForProgressHistory, setSelectedTreatmentForProgressHistory] = useState<RiskTreatment | null>(null);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleShowNotes = (notes: string) => {
        setSelectedNotes(notes);
        setIsNotesModalOpen(true);
    };

    const handleCloseNotesModal = () => {
        setIsNotesModalOpen(false);
        setSelectedNotes('');
    };

    const handleValidateClick = (treatment: RiskTreatment) => {
        setSelectedTreatmentForValidation(treatment);
        setIsValidationModalOpen(true);
    };

    const handleSaveValidation = async (data: ValidationFormData) => {
        if (!selectedTreatmentForValidation) return;
        try {
            showToast('Validating now...', 'info');
            await api.put(`/risk-treatments/validate/${selectedTreatmentForValidation._id}`, {
                convertedToControl: data.convertedToControl,
                validationNotes: data.validationNotes,
                validationDate: data.validationDate,
                controlType: data.controlType,
                controlName: data.controlName,
                frequency: data.frequency,
            });
            fetchRiskTreatments();
            showToast('Email sent successfully', 'success');
        } catch (error) {
            console.error('Error saving validation:', error);
            showToast('Error during validation', 'error');
        } finally {
            setIsValidationModalOpen(false);
        }
    };

    const handleOpenProgressModal = (treatment: RiskTreatment) => {
        setSelectedProgressHistory(treatment.progressHistory || []);
        setSelectedTreatmentForProgressHistory(treatment);
        setProgressModalOpen(true);
    };

    const handleDeleteProgressNote = async (index: number) => {
        if (!selectedTreatmentForProgressHistory) return;
        try {
            await api.delete(`/risk-treatments/${selectedTreatmentForProgressHistory._id}/progress-history/${index}`);
            fetchRiskTreatments();
            setSelectedProgressHistory(prev => {
                const arr = [...prev];
                arr.splice(index, 1);
                return arr;
            });
        } catch (error) {
            showToast('Error deleting progress note', 'error');
        }
    };

    const filteredRiskTreatments = riskTreatments.filter(treatment =>
        treatment.convertedToControl === true &&
        Object.values(treatment).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    // Group rows by riskNameElement and categoryName
    function groupRows(data) {
        const groups = [];
        let lastKey = '';
        let rowIndex = 0;
        data.forEach((t, idx) => {
            const key = `${t.risk?.riskNameElement}||${t.risk?.riskCategory?.categoryName}`;
            if (key !== lastKey) {
                const count = data.filter(x => `${x.risk?.riskNameElement}||${x.risk?.riskCategory?.categoryName}` === key).length;
                groups.push({ ...t, rowSpan: count, show: true, idx });
                lastKey = key;
                rowIndex = 1;
            } else {
                groups.push({ ...t, rowSpan: 0, show: false, idx });
                rowIndex++;
            }
        });
        return groups;
    }

    const groupedTreatments = groupRows(filteredRiskTreatments);

    return (
        <Box sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <TextField
                    label="Search by any field"
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    sx={{ width: 300 }}
                />
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB' }}>
                <Table ref={tableRef}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '5%' }}>No.</TableCell>
                            <TableCell sx={{ width: '10%' }}>Risk Name</TableCell>
                            <TableCell sx={{ width: '10%' }}>Risk Category</TableCell>
                            <TableCell sx={{ width: '12%' }}>Control Name</TableCell>
                            <TableCell sx={{ width: '8%' }}>Control Type</TableCell>
                            <TableCell sx={{ width: '8%' }}>Frequency</TableCell>
                            <TableCell sx={{ width: '12%' }}>Owner</TableCell>
                            <TableCell sx={{ width: '8%' }}>Target Date</TableCell>
                            <TableCell sx={{ width: '5%' }}>Status</TableCell>
                            <TableCell sx={{ width: '8%' }}>Convert to Control</TableCell>
                            <TableCell sx={{ width: '7%' }}>Validation Notes</TableCell>
                            <TableCell sx={{ width: '7%' }}>Validation Date</TableCell>
                            <TableCell align="center" sx={{ width: '5%' }}>Progress Notes</TableCell>
                            <TableCell align="center" sx={{ width: '5%' }} className='noprint'>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groupedTreatments.map((treatment, index) => (
                            <TableRow key={treatment._id}>
                                {treatment.show && (
                                    <TableCell rowSpan={treatment.rowSpan}>{index + 1}</TableCell>
                                )}
                                {treatment.show && (
                                    <TableCell rowSpan={treatment.rowSpan}>{treatment.risk?.riskNameElement || ''}</TableCell>
                                )}
                                {treatment.show && (
                                    <TableCell rowSpan={treatment.rowSpan}>{treatment.risk?.riskCategory?.categoryName || ''}</TableCell>
                                )}
                                <TableCell>{treatment.treatment}</TableCell>
                                <TableCell>{treatment.controlType}</TableCell>
                                <TableCell>{treatment.frequency || ''}</TableCell>
                                <TableCell>{treatment.treatmentOwner?.name || ''}</TableCell>
                                <TableCell>{formatDate(new Date(treatment.targetDate))}</TableCell>
                                <TableCell>{treatment.status}</TableCell>
                                <TableCell>{treatment.convertedToControl ? 'Yes' : 'No'}</TableCell>
                                <TableCell>
                                    {treatment.validationNotes ? (
                                        <IconButton onClick={() => handleShowNotes(treatment.validationNotes)} size="small">
                                            <DescriptionOutlinedIcon />
                                        </IconButton>
                                    ) : null}
                                </TableCell>
                                <TableCell>{treatment.validationDate ? formatDate(new Date(treatment.validationDate)) : ''}</TableCell>
                                <TableCell align="center">
                                    {treatment.progressHistory && treatment.progressHistory.length > 0 ? (
                                        <IconButton size="small" onClick={() => handleOpenProgressModal(treatment)}>
                                            <DescriptionOutlinedIcon />
                                        </IconButton>
                                    ) : (
                                        treatment.progressNotes || ''
                                    )}
                                </TableCell>
                                <TableCell align="center" className='noprint'>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => handleValidateClick(treatment)}
                                    >
                                        Validate
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Dialog open={isNotesModalOpen} onClose={handleCloseNotesModal} maxWidth="sm" fullWidth>
                <DialogTitle>Validation Notes</DialogTitle>
                <DialogContent>
                    <Typography sx={{ whiteSpace: 'pre-wrap', minHeight: 20 }}>{selectedNotes}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNotesModal}>Close</Button>
                </DialogActions>
            </Dialog>
            <ValidationModal
                isOpen={isValidationModalOpen}
                onClose={() => setIsValidationModalOpen(false)}
                onSave={handleSaveValidation}
                editingTreatment={selectedTreatmentForValidation}
            />
            <ProgressHistoryModal
                open={progressModalOpen}
                onClose={() => setProgressModalOpen(false)}
                progressHistory={selectedProgressHistory}
                onDelete={handleDeleteProgressNote}
            />
        </Box>
    );
};

export default ControlsTab; 