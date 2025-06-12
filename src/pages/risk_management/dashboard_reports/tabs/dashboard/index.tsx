import React, { useState, useMemo } from 'react';
import { Box, InputLabel, Select, MenuItem, FormControl, Button } from '@mui/material';
import { useAuth } from '../../../../../contexts/AuthContext';
import Heatmap from './components/Heatmap';
import TreatmentsDistribution from './components/TreatmentsDistribution';

const StyledFormControl = FormControl;
const ViewButton = Button;

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    // Get available years from obligations and current year
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        // Create an array from currentYear - 5 to currentYear + 1
        return Array.from({ length: 7 }, (_, i) => (currentYear - 5 + i).toString()).reverse();
    }, []);

    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [viewMode, setViewMode] = useState<'heatmap' | 'risk-treatments-distribution'>('heatmap');
    const [selectedQuarter, setSelectedQuarter] = useState('Q1');
    const [isLoading, setIsLoading] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);

    const isRiskSuperUser = user?.isRiskSuperUser;
    const isRiskChampion = user?.isRiskChampion;

    const handleView = () => {
        setIsLoading(true);
        setTimeout(() => {
            setShowDashboard(true);
            setIsLoading(false);
        }, 500);
    };

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

    // Determine if the view button should be disabled
    const isViewButtonDisabled = isLoading || !year || !selectedQuarter || !viewMode;

    return (
        <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <Box sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' }
            }}>
                <StyledFormControl sx={{ flex: 2 }}>
                    <InputLabel>Year</InputLabel>
                    <Select
                        value={year}
                        label="Year"
                        onChange={(e) => { setYear(e.target.value); setShowDashboard(false); }}
                    >
                        {years.map((y) => (
                            <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>

                {(isRiskSuperUser || isRiskChampion) && (
                    <StyledFormControl sx={{ flex: 1, width: { xs: '100%' } }}>
                        <InputLabel>View Mode</InputLabel>
                        <Select
                            value={viewMode}
                            label="View Mode"
                            onChange={(e) => {
                                setViewMode(e.target.value as 'heatmap' | 'risk-treatments-distribution');
                                setShowDashboard(false);
                            }}
                        >
                            <MenuItem value="heatmap">Heatmap</MenuItem>
                            <MenuItem value="risk-treatments-distribution">Risk Treatments Distribution</MenuItem>
                        </Select>
                    </StyledFormControl>
                )}

                <StyledFormControl sx={{ flex: 1, width: { xs: '100%' } }}>
                    <InputLabel>Quarter</InputLabel>
                    <Select
                        value={selectedQuarter}
                        label="Quarter"
                        onChange={(e) => { setSelectedQuarter(e.target.value); setShowDashboard(false); }}
                    >
                        {quarters.map((q) => (
                            <MenuItem key={q} value={q}>{q}</MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>

                <ViewButton
                    variant="contained"
                    disabled={isViewButtonDisabled}
                    onClick={handleView}
                >
                    {isLoading ? 'Loading...' : 'View'}
                </ViewButton>
            </Box>

            {showDashboard && (
                viewMode === 'heatmap' ? (
                    <Heatmap />
                ) : (
                    <TreatmentsDistribution />
                )
            )}
        </Box>
    );
};

export default Dashboard;
