import React, { useRef, useState } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { ExportButton } from '../../../../components/Buttons';
import { exportExcel, exportPdf } from '../../../../utils/exportUtils';
import { TreatmentModal, AddTreatmentFormData } from '../components/treatmentModal';
import { format } from 'date-fns';

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
}

interface RiskTreatmentTabProps {
    riskTreatments: RiskTreatment[];
    onAddTreatment: () => void;
    onEditTreatment: (treatment: RiskTreatment) => void;
    onDeleteTreatment: (id: string) => void;
    onSaveTreatment: (data: AddTreatmentFormData) => Promise<void>;
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    editingTreatment: RiskTreatment | null;
}

const RiskTreatmentTab: React.FC<RiskTreatmentTabProps> = ({
    riskTreatments,
    onAddTreatment,
    onEditTreatment,
    onDeleteTreatment,
    onSaveTreatment,
    isModalOpen,
    setIsModalOpen,
    editingTreatment,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const tableRef = useRef<any>(null);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleExportPdf = async () => {
        if (!tableRef.current) {
            console.error('Table reference is not available for PDF export.');
            return;
        }
        setIsExporting(true);
        const pdfColumnWidths = [0.1, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15];
        try {
            await exportPdf('risk-treatment-register', tableRef, 'Risk Treatment Register', '', '', pdfColumnWidths);
        } catch (error) {
            console.error('Error exporting PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = async () => {
        if (!tableRef.current) {
            console.error('Table reference is not available for Excel export.');
            return;
        }
        setIsExporting(true);
        try {
            await exportExcel(tableRef.current, 'Risk Treatment Register');
        } catch (error) {
            console.error('Error exporting Excel:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM dd, yyyy');
        } catch (error) {
            return dateString;
        }
    };

    const formatDateForInput = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy-MM-dd');
        } catch (error) {
            return dateString;
        }
    };

    const filteredRiskTreatments = riskTreatments.filter(treatment =>
        treatment.status !== 'Completed' &&
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
                // Count how many rows share this key
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
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onAddTreatment}
                        sx={{ textTransform: 'none', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}
                    >
                        Add Risk Treatment
                    </Button>
                    <ExportButton
                        className="excel"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportExcel}
                        size="small"
                        disabled={isExporting}
                    >
                        Export to Excel
                    </ExportButton>
                    <ExportButton
                        className="pdf"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportPdf}
                        size="small"
                        disabled={isExporting}
                    >
                        Export to PDF
                    </ExportButton>
                </Box>
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
                            <TableCell sx={{ width: '10%' }}>No.</TableCell>
                            <TableCell sx={{ width: '15%' }}>Risk Name</TableCell>
                            <TableCell sx={{ width: '15%' }}>Risk Category</TableCell>
                            <TableCell sx={{ width: '15%' }}>Risk Treatment</TableCell>
                            <TableCell sx={{ width: '15%' }}>Treatment Owner</TableCell>
                            <TableCell sx={{ width: '10%' }}>Target Date</TableCell>
                            <TableCell sx={{ width: '10%' }}>Status</TableCell>
                            <TableCell align="center" sx={{ width: '10%' }} className='noprint'>Actions</TableCell>
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
                                <TableCell>{treatment.treatmentOwner?.name || ''}</TableCell>
                                <TableCell>{formatDate(treatment.targetDate)}</TableCell>
                                <TableCell>{treatment.status}</TableCell>
                                <TableCell align="center" className='noprint'>
                                    <IconButton color="primary" size="small" onClick={() => onEditTreatment(treatment)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton color="error" size="small" onClick={() => onDeleteTreatment(treatment._id)}>
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <TreatmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onSaveTreatment}
                editingTreatment={editingTreatment ? {
                    ...editingTreatment,
                    targetDate: formatDateForInput(editingTreatment.targetDate)
                } : null}
            />
        </Box>
    );
};

export default RiskTreatmentTab; 