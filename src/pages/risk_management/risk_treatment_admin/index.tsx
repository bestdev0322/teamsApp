import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import { TreatmentModal, AddTreatmentFormData } from './components/treatmentModal';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import RiskTreatmentTab from './tabs/RiskTreatmentTab';
import PendingValidationTab from './tabs/PendingValidationTab';
import ControlsTab from './tabs/ControlsTab';
import Badge from '@mui/material/Badge';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

// TabPanel component
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

export interface RiskTreatment {
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
    controlType: string;
    treatmentOwner: {
        _id: string;
        name: string;
    };
    targetDate: string;
    status: 'Planned' | 'In Progress' | 'Completed';
    progressNotes: string;
    convertedToControl?: boolean;
    validationNotes?: string;
    validationDate?: string;
    progressHistory?: string[];
}

const RiskTreatmentAdmin: React.FC = () => {
    const { user } = useAuth();
    const [currentTab, setCurrentTab] = useState(0);
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
                let updatePayload: any = {
                    risk: data.selectedRisk,
                    treatment: data.riskTreatment,
                    treatmentOwner: data.owner,
                    targetDate: data.targetDate,
                    status: data.status
                };
                // If status changed from Completed to Planned/In Progress, clear validation fields
                if (
                    editingTreatment.status === 'Completed' &&
                    (data.status === 'Planned' || data.status === 'In Progress')
                ) {
                    updatePayload = {
                        ...updatePayload,
                        convertedToControl: false,
                        validationNotes: '',
                        validationDate: null,
                        frequency: '',
                        controlName: '',
                    };
                }
                const response = await api.put(`/risk-treatments/${editingTreatment._id}`, updatePayload);
                if (response.status === 200) {
                    fetchRiskTreatments();
                }
            } else {
                const newTreatmentData = {
                    risk: data.selectedRisk,
                    treatment: data.riskTreatment,
                    treatmentOwner: data.owner,
                    targetDate: data.targetDate,
                    status: data.status,
                    tenantId: user?.tenantId
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

    // Calculate pending validation count (risks with validationNotes in pending table)
    const pendingValidationCount = riskTreatments.filter(t => t.status === 'Completed' && t.convertedToControl === false && !t.validationNotes).length;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={currentTab} onChange={handleTabChange} aria-label="risk treatment tabs">
                    <StyledTab label="Risk Treatment" />
                    <StyledTab
                        label={
                            <Badge
                                color="error"
                                badgeContent={pendingValidationCount}
                                invisible={pendingValidationCount === 0}
                                sx={{ ml: 1, '& .MuiBadge-badge': { right: -10, top: -5, fontSize: '0.75rem', minWidth: 20, height: 20, padding: '0 6px' } }}
                            >
                                Pending Validation
                            </Badge>
                        }
                        sx={{ overflow: 'visible' }}
                    />
                    <StyledTab label="Controls" />
                </StyledTabs>
            </Box>

            <TabPanel value={currentTab} index={0}>
                <RiskTreatmentTab
                    riskTreatments={riskTreatments}
                    onAddTreatment={handleAddRiskTreatment}
                    onEditTreatment={handleEditRiskTreatment}
                    onDeleteTreatment={handleDeleteRiskTreatment}
                    onSaveTreatment={handleSaveTreatment}
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    editingTreatment={editingTreatment}
                />
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
                <PendingValidationTab
                    riskTreatments={riskTreatments}
                    fetchRiskTreatments={fetchRiskTreatments}
                    pendingCount={pendingValidationCount}
                />
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
                <ControlsTab riskTreatments={riskTreatments} fetchRiskTreatments={fetchRiskTreatments} />
            </TabPanel>
        </Box>
    );
};

export default RiskTreatmentAdmin;
