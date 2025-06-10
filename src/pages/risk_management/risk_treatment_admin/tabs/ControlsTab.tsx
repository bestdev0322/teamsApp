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

interface RiskTreatment {
    _id: string;
    risk: {
        _id: string;
        riskNameElement: string;
        riskCategory: {
            _id: string;
            categoryName: string;
        };
    };
    treatment: string;
    treatmentOwner: {
        _id: string;
        name: string;
    };
    targetDate: string;
    status: 'Planned' | 'In Progress' | 'Completed';
    convertedToControl?: boolean;
    validationNotes?: string;
    validationDate?: string;
    frequency?: string;
    progressHistory?: string[];
    progressNotes?: string;
}

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
                            <TableCell sx={{ width: '15%' }}>Control Name</TableCell>
                            <TableCell sx={{ width: '10%' }}>Frequency</TableCell>
                            <TableCell sx={{ width: '15%' }}>Owner</TableCell>
                            <TableCell sx={{ width: '10%' }}>Target Date</TableCell>
                            <TableCell sx={{ width: '10%' }}>Status</TableCell>
                            <TableCell sx={{ width: '10%' }}>Convert to Control</TableCell>
                            <TableCell sx={{ width: '15%' }}>Validation Notes</TableCell>
                            <TableCell sx={{ width: '10%' }}>Validation Date</TableCell>
                            <TableCell align="center">Progress Notes</TableCell>
                            <TableCell align="center" sx={{ width: '5%' }} className='noprint'>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredRiskTreatments.map((treatment, index) => (
                            <TableRow key={treatment._id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{treatment.risk?.riskNameElement || ''}</TableCell>
                                <TableCell>{treatment.risk?.riskCategory?.categoryName || ''}</TableCell>
                                <TableCell>{treatment.treatment}</TableCell>
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