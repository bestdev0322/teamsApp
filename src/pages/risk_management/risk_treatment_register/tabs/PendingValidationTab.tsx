import React, { useRef, useState, useEffect } from 'react';
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
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Typography,
} from '@mui/material';
import { ValidationModal, ValidationFormData } from '../components/validationModal';
import { api } from '../../../../services/api';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { formatDate } from '../../../../utils/date';
import { useToast } from '../../../../contexts/ToastContext';
import ProgressHistoryModal from '../../my_risk_treatment/ProgressHistoryModal';
import { useSocket } from '../../../../hooks/useSocket';
import { SocketEvent } from '../../../../types/socket';

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
    controlType?: string;
    validationNotes?: string;
    validationDate?: string;
    progressHistory?: any[];
    progressNotes?: string;
}

interface PendingValidationTabProps {
    riskTreatments: RiskTreatment[];
    fetchRiskTreatments: () => void;
}

const PendingValidationTab: React.FC<PendingValidationTabProps & { pendingCount: number }> = ({ riskTreatments, fetchRiskTreatments, pendingCount }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const tableRef = useRef<any>(null);
    const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
    const [selectedTreatmentForValidation, setSelectedTreatmentForValidation] = useState<RiskTreatment | null>(null);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedNotes, setSelectedNotes] = useState<string>('');
    const { showToast } = useToast();
    const [progressModalOpen, setProgressModalOpen] = useState(false);
    const [selectedProgressHistory, setSelectedProgressHistory] = useState([]);
    const [selectedTreatmentForProgressHistory, setSelectedTreatmentForProgressHistory] = useState<RiskTreatment | null>(null);
    const { emit } = useSocket(SocketEvent.RISK_VALIDATED, () => {});

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleValidateClick = (treatment: RiskTreatment) => {
        setSelectedTreatmentForValidation(treatment);
        setIsValidationModalOpen(true);
    };

    const handleSaveValidation = async (data: ValidationFormData) => {
        if (!selectedTreatmentForValidation) return;
        try {
            showToast('Validating now...', 'info');
            const response = await api.put(`/risk-treatments/validate/${selectedTreatmentForValidation._id}`, {
                convertedToControl: data.convertedToControl,
                validationNotes: data.validationNotes,
                validationDate: data.validationDate,
                controlName: data.controlName,
                controlType: data.controlType,
                frequency: data.frequency,
            });
            if (response.status === 200) {
                fetchRiskTreatments();
                emit({ teamId: selectedTreatmentForValidation.treatmentOwner?._id });
                showToast('Update validated successfully', 'success');
            }
        } catch (error) {
            console.error('Error saving validation:', error);
            showToast('Error during validation', 'error');
        } finally {
            setIsValidationModalOpen(false);
        }
    };

    const handleShowNotes = (notes: string) => {
        setSelectedNotes(notes);
        setIsNotesModalOpen(true);
    };

    const handleCloseNotesModal = () => {
        setIsNotesModalOpen(false);
        setSelectedNotes('');
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
        treatment.status === 'Completed' &&
        treatment.convertedToControl === false &&
        Object.values(treatment).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).sort((a, b) => {
        const nameA = a.risk?.riskNameElement ? a.risk.riskNameElement.trim() : '';
        const nameB = b.risk?.riskNameElement ? b.risk.riskNameElement.trim() : '';
        const categoryA = a.risk?.riskCategory?.categoryName ? a.risk.riskCategory.categoryName.trim() : '';
        const categoryB = b.risk?.riskCategory?.categoryName ? b.risk.riskCategory.categoryName.trim() : '';

        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        if (categoryA < categoryB) return -1;
        if (categoryA > categoryB) return 1;
        return 0;
    });

    // Group rows by riskNameElement and categoryName for rowSpan
    function groupRows(data) {
        const groups = [];
        if (data.length === 0) return groups;

        let currentGroup = [];
        let currentKey = '';
        let displayIndex = 0;

        data.forEach((t, index) => {
            const riskName = t.risk?.riskNameElement ? t.risk.riskNameElement.trim() : '';
            const riskCategory = t.risk?.riskCategory?.categoryName ? t.risk.riskCategory.categoryName.trim() : '';
            const key = `${riskName}||${riskCategory}`;

            if (key !== currentKey) {
                if (currentGroup.length > 0) {
                    const groupSize = currentGroup.length;
                    groups.push({ ...currentGroup[0], rowSpan: groupSize, show: true, displayIndex: displayIndex });
                    for (let i = 1; i < groupSize; i++) {
                        groups.push({ ...currentGroup[i], rowSpan: 0, show: false, displayIndex: displayIndex });
                    }
                }

                currentGroup = [t];
                currentKey = key;
                displayIndex++;
            } else {
                currentGroup.push(t);
            }

            if (index === data.length - 1) {
                const groupSize = currentGroup.length;
                groups.push({ ...currentGroup[0], rowSpan: groupSize, show: true, displayIndex: displayIndex });
                for (let i = 1; i < groupSize; i++) {
                    groups.push({ ...currentGroup[i], rowSpan: 0, show: false, displayIndex: displayIndex });
                }
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
                            <TableCell sx={{ width: '15%' }}>Risk Treatment</TableCell>
                            <TableCell sx={{ width: '15%' }}>Treatment Owner</TableCell>
                            <TableCell sx={{ width: '10%' }}>Target Date</TableCell>
                            <TableCell sx={{ width: '10%' }}>Status</TableCell>
                            <TableCell sx={{ width: '5%' }}>Convert to Control</TableCell>
                            <TableCell sx={{ width: '5%' }}>Control Type</TableCell>
                            <TableCell sx={{ width: '5%' }}>Validation Notes</TableCell>
                            <TableCell sx={{ width: '15%' }}>Date</TableCell>
                            <TableCell align="center">Progress Notes</TableCell>
                            <TableCell align="center" sx={{ width: '5%' }} className='noprint'>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groupedTreatments.map((treatment, index) => (
                            <TableRow key={treatment._id}>
                                {treatment.show && (
                                    <TableCell rowSpan={treatment.rowSpan}>R{index + 1}</TableCell>
                                )}
                                {treatment.show && (
                                    <TableCell rowSpan={treatment.rowSpan}>{treatment.risk?.riskNameElement || ''}</TableCell>
                                )}
                                {treatment.show && (
                                    <TableCell rowSpan={treatment.rowSpan}>{treatment.risk?.riskCategory?.categoryName || ''}</TableCell>
                                )}
                                <TableCell>{treatment.treatment}</TableCell>
                                <TableCell>{treatment.treatmentOwner?.name || ''}</TableCell>
                                <TableCell>{formatDate(new Date(treatment.targetDate))}</TableCell>
                                <TableCell>{treatment.status}</TableCell>
                                <TableCell>{treatment.convertedToControl ? 'Yes' : 'No'}</TableCell>
                                <TableCell>{treatment.controlType}</TableCell>
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
            <ValidationModal
                isOpen={isValidationModalOpen}
                onClose={() => setIsValidationModalOpen(false)}
                onSave={handleSaveValidation}
                editingTreatment={selectedTreatmentForValidation}
            />
            <Dialog open={isNotesModalOpen} onClose={handleCloseNotesModal} maxWidth="sm" fullWidth>
                <DialogTitle>Validation Notes</DialogTitle>
                <DialogContent>
                    <Typography sx={{ whiteSpace: 'pre-wrap', minHeight: 20 }}>{selectedNotes}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNotesModal}>Close</Button>
                </DialogActions>
            </Dialog>
            <ProgressHistoryModal
                open={progressModalOpen}
                onClose={() => setProgressModalOpen(false)}
                progressHistory={selectedProgressHistory}
                onDelete={handleDeleteProgressNote}
            />
        </Box>
    );
};

export default PendingValidationTab; 