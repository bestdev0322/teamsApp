import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { StyledTab, StyledTabs } from '../../../components/StyledTab';
import { TreatmentModal, AddTreatmentFormData } from './tabs/treatmentModal';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import RiskTreatmentTab from './tabs/RiskTreatmentTab';

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

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <StyledTabs value={currentTab} onChange={handleTabChange} aria-label="risk treatment tabs">
                    <StyledTab label="Risk Treatment" />
                    <StyledTab label="Pending Validation" />
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
                <Typography>Content for Pending Validation tab goes here.</Typography>
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
                <Typography>Content for Controls tab goes here.</Typography>
            </TabPanel>
        </Box>
    );
};

export default RiskTreatmentAdmin;
