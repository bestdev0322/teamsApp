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
import { format } from 'date-fns';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { ValidationModal, ValidationFormData } from './validationModal';
import { api } from '../../../../services/api';

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
            await api.put(`/risk-treatments/validate/${selectedTreatmentForValidation._id}`, {
                convertedToControl: data.convertedToControl,
                validationNotes: data.validationNotes,
                validationDate: data.validationDate,
                controlName: data.controlName,
                frequency: data.frequency,
            });
            fetchRiskTreatments();
        } catch (error) {
            console.error('Error saving validation:', error);
        } finally {
            setIsValidationModalOpen(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM dd, yyyy');
        } catch (error) {
            return dateString;
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
                                <TableCell>{formatDate(treatment.targetDate)}</TableCell>
                                <TableCell>{treatment.status}</TableCell>
                                <TableCell>{treatment.convertedToControl ? 'Yes' : 'No'}</TableCell>
                                <TableCell>
                                    {treatment.validationNotes ? (
                                        <IconButton onClick={() => handleShowNotes(treatment.validationNotes)} size="small">
                                            <DescriptionOutlinedIcon />
                                        </IconButton>
                                    ) : null}
                                </TableCell>
                                <TableCell>{treatment.validationDate ? formatDate(treatment.validationDate) : ''}</TableCell>
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
        </Box>
    );
};

export default ControlsTab; 