import React, { useState, useEffect } from 'react';
import { Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Button } from '@mui/material';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchComplianceSettings } from '../../../../store/slices/complianceSettingsSlice';
import { getCurrentQuarterYear } from '../../../../store/slices/complianceObligationsSlice';
import QuarterObligationsDetail from '../components/QuarterObligationsDetail';

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

const CurrentQuarterUpdates: React.FC = () => {
    const dispatch = useAppDispatch();
    const { year: currentYear, quarter: currentQuarter } = useAppSelector(getCurrentQuarterYear);
    const settingsStatus = useAppSelector((state: any) => state.complianceSettings.status);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    useEffect(() => {
        if (settingsStatus === 'idle') {
            dispatch(fetchComplianceSettings());
        } else if (settingsStatus === 'succeeded' || settingsStatus === 'failed') {
            setLoading(false);
        }
    }, [dispatch, settingsStatus]);
    
    const handleViewClick = () => {
        setShowDetail(true);
    };
    
    const handleBackClick = () => {
        setShowDetail(false);
    };

    if (loading) {
        return <Typography>Loading...</Typography>;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    if (showDetail && currentQuarter && currentYear) {
        return <QuarterObligationsDetail year={currentYear} quarter={currentQuarter} onBack={handleBackClick} />;
    }

    return (
        <Box sx={{ mt: 2 }}>
             <Typography variant="h6" gutterBottom>Current Quarterly Compliance Update</Typography>
            {!currentQuarter ? (
                <Typography>No active compliance quarter found for today's date.</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Year</TableCell>
                                <TableCell align='center'>Quarter</TableCell>
                                <TableCell align='center'>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell>{currentYear}</TableCell>
                                <TableCell align='center'>{currentQuarter}</TableCell>
                                <TableCell align='center'>
                                    <Button variant="outlined" onClick={handleViewClick}>
                                        VIEW
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default CurrentQuarterUpdates; 