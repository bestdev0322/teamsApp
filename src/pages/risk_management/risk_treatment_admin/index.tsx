import React, { useState, useEffect, useRef } from 'react';
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
    Typography,
    TextField,
    Tabs,
    Tab,
    IconButton,
} from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { ExportButton } from '../../../components/Buttons';
import { exportExcel, exportPdf } from '../../../utils/exportUtils';
import { TreatmentModal, AddTreatmentFormData } from './treatmentModal';
import { Risk } from '../risk_identification/identificationModal';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`risk-treatment-tabpanel-${index}`}
            aria-labelledby={`risk-treatment-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 0 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

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
    progressNotes: string;
}

interface Team {
    _id: string;
    name: string;
}

const RiskTreatmentAdmin: React.FC = () => {
    const { user } = useAuth();
    const [currentTab, setCurrentTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const tableRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTreatment, setEditingTreatment] = useState<RiskTreatment | null>(null);
    const [riskTreatments, setRiskTreatments] = useState<RiskTreatment[]>([]);

    useEffect(() => {
        fetchRiskTreatments();
    }, [user?.tenantId]);


    const fetchRiskTreatments = async () => {
        try {
            const response = await api.get(`/risk-treatments`);
            if (response.status === 200) {
                setRiskTreatments(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching risk treatments:', error);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleAddRiskTreatment = () => {
        setEditingTreatment(null);
        setIsModalOpen(true);
    };

    const handleEditRiskTreatment = (treatment: RiskTreatment) => {
        setEditingTreatment(treatment);
        setIsModalOpen(true);
    };

    const handleDeleteRiskTreatment = async (id: string) => {
        try {
            const response = await api.delete(`/risk-treatments/${id}`);
            if (response.status === 200) {
                fetchRiskTreatments();
            }
        } catch (error) {
            console.error('Error deleting risk treatment:', error);
        }
    };

    const handleSaveTreatment = async (data: AddTreatmentFormData) => {
        try {
            if (editingTreatment) {
                const response = await api.put(`/risk-treatments/${editingTreatment._id}`, {
                    risk: data.selectedRisk,
                    treatment: data.riskTreatment,
                    treatmentOwner: data.owner,
                    targetDate: data.targetDate,
                    status: data.status,
                    progressNotes: data.progressNotes,
                });
                if (response.status === 200) {
                    fetchRiskTreatments();
                }
            } else {
                const newTreatmentData = {
                    no: riskTreatments.length + 1,
                    risk: data.selectedRisk,
                    treatment: data.riskTreatment,
                    treatmentOwner: data.owner,
                    targetDate: data.targetDate,
                    status: data.status,
                    progressNotes: data.progressNotes,
                    tenantId: user?.tenantId,
                };
                const response = await api.post(`/risk-treatments`, newTreatmentData);
                if (response.status === 201) {
                    fetchRiskTreatments();
                }
            }
        } catch (error) {
            console.error('Error saving risk treatment:', error);
        } finally {
            setIsModalOpen(false);
        }
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleExportPdf = async () => {
        if (!tableRef.current) {
            console.error('Table reference is not available for PDF export.');
            return;
        }
        setIsExporting(true);
        const pdfColumnWidths = [0.05, 0.15, 0.1, 0.15, 0.15, 0.1, 0.1, 0.2];
        try {
            await exportPdf('risk-treatment', tableRef, 'Risk Treatment Admin', '', '', pdfColumnWidths);
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
            await exportExcel(tableRef.current, 'Risk Treatment Admin');
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

    const filteredRiskTreatments = riskTreatments.filter(treatment =>
        Object.values(treatment).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
                Risk Treatment Admin
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={currentTab} onChange={handleTabChange} aria-label="risk treatment tabs">
                    <StyledTab label="Risk Treatment" />
                    <StyledTab label="Pending Validation" />
                    <StyledTab label="Controls" />
                </StyledTabs>
            </Box>

            <TabPanel value={currentTab} index={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddRiskTreatment}
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
                                <TableCell sx={{ width: '5%' }}>No.</TableCell>
                                <TableCell sx={{ width: '10%' }}>Risk Name</TableCell>
                                <TableCell sx={{ width: '10%' }}>Risk Category</TableCell>
                                <TableCell sx={{ width: '15%' }}>Risk Treatment</TableCell>
                                <TableCell sx={{ width: '15%' }}>Treatment Owner</TableCell>
                                <TableCell sx={{ width: '10%' }}>Target Date</TableCell>
                                <TableCell sx={{ width: '10%' }}>Status</TableCell>
                                <TableCell sx={{ width: '15%' }}>Progress Notes</TableCell>
                                <TableCell align="center" sx={{ width: '10%' }} className='noprint'>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRiskTreatments.map((treatment, index) => (
                                <TableRow key={treatment._id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{treatment.risk?.riskNameElement || ''}</TableCell>
                                    <TableCell>{treatment.risk?.riskCategory?.categoryName || ''}</TableCell>
                                    <TableCell>{treatment.treatment}</TableCell>
                                    <TableCell>{treatment.treatmentOwner?.name || ''}</TableCell>
                                    <TableCell>{formatDate(treatment.targetDate)}</TableCell>
                                    <TableCell>{treatment.status}</TableCell>
                                    <TableCell>{treatment.progressNotes}</TableCell>
                                    <TableCell align="center" className='noprint'>
                                        <IconButton color="primary" size="small" onClick={() => handleEditRiskTreatment(treatment)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton color="error" size="small" onClick={() => handleDeleteRiskTreatment(treatment._id)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
                <Typography>Content for Pending Validation tab goes here.</Typography>
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
                <Typography>Content for Controls tab goes here.</Typography>
            </TabPanel>

            <TreatmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTreatment}
                editingTreatment={editingTreatment}
            />
        </Box>
    );
};

export default RiskTreatmentAdmin;
