import React, { useState, useEffect } from 'react';
import { Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Button } from '@mui/material';
import moment from 'moment';
import { api } from '../../../../services/api';
import QuarterObligationsDetail from '../components/SubmittedObligationsDetail';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { fetchComplianceObligations } from '../../../../store/slices/complianceObligationsSlice';
import { AssessmentStatus } from '../../../../types/compliance';

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

interface PendingQuarter {
    year: number;
    quarter: string;
}

const CurrentReview: React.FC = () => {
    const dispatch = useAppDispatch();
    const { obligations } = useAppSelector(state => state.complianceObligations);
    const [pendingQuarters, setPendingQuarters] = useState<PendingQuarter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch compliance settings
                const res = await api.get('/compliance-settings');
                const settings: ComplianceSetting[] = (res.data.data || []).map((s: any) => ({
                    id: s._id,
                    year: s.year,
                    firstMonth: s.firstMonth,
                    quarters: s.quarters,
                }));

                const today = moment().startOf('day');
                settings.sort((a, b) => b.year - a.year);

                let foundQuarter: Quarter | null = null;
                let foundYear: number | null = null;

                // Find current quarter
                for (const setting of settings) {
                    for (const quarter of setting.quarters) {
                        const quarterStart = moment(quarter.start).startOf('day');
                        const quarterEnd = moment(quarter.end).startOf('day');
                        
                        if (today.isBetween(quarterStart, quarterEnd, null, '[]')) {
                            foundQuarter = quarter;
                            foundYear = setting.year;
                            break;
                        }
                    }
                    if(foundQuarter) break;
                }

                // Fetch obligations
                await dispatch(fetchComplianceObligations()).unwrap();

                // Find pending quarters
                const pending: PendingQuarter[] = [];
                const processedQuarters = new Set<string>();

                // First, add quarters with non-approved updates
                obligations.forEach(obligation => {
                    obligation.update?.forEach(update => {
                        if (update.assessmentStatus !== AssessmentStatus.Approved) {
                            const year = parseInt(update.year);
                            const quarterKey = `${year}-${update.quarter}`;
                            
                            if (!processedQuarters.has(quarterKey)) {
                                pending.push({
                                    year,
                                    quarter: update.quarter
                                });
                                processedQuarters.add(quarterKey);
                            }
                        }
                    });
                });

                // Then, add quarters without updates up to current year/quarter
                if (foundYear && foundQuarter) {
                    // Get all quarters up to current year/quarter
                    const allQuarters: PendingQuarter[] = [];
                    settings.forEach(setting => {
                        if (setting.year <= foundYear) {
                            setting.quarters.forEach(q => {
                                // Only include quarters up to the current one
                                if (setting.year < foundYear || 
                                    (setting.year === foundYear && q.quarter <= foundQuarter.quarter)) {
                                    allQuarters.push({
                                        year: setting.year,
                                        quarter: q.quarter
                                    });
                                }
                            });
                        }
                    });

                    // For each obligation, check which quarters are missing updates
                    obligations.forEach(obligation => {
                        allQuarters.forEach(quarter => {
                            const quarterKey = `${quarter.year}-${quarter.quarter}`;
                            if (!processedQuarters.has(quarterKey)) {
                                // Check if this obligation has an update for this quarter
                                const hasUpdate = obligation.update?.some(
                                    u => u.year === quarter.year.toString() && u.quarter === quarter.quarter
                                );
                                
                                if (!hasUpdate) {
                                    pending.push({
                                        year: quarter.year,
                                        quarter: quarter.quarter
                                    });
                                    processedQuarters.add(quarterKey);
                                }
                            }
                        });
                    });
                }

                // Sort pending quarters by year and quarter
                pending.sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.quarter.localeCompare(a.quarter);
                });

                setPendingQuarters(pending);
                setLoading(false);

            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data.');
                setLoading(false);
            }
        };

        fetchData();
    }, [dispatch]);
    
    const handleViewClick = (year: number, quarter: string) => {
        setSelectedYear(year);
        setSelectedQuarter(quarter);
        setShowDetail(true);
    };
    
    const handleBackClick = () => {
        setShowDetail(false);
        setSelectedYear(null);
        setSelectedQuarter(null);
    };

    if (loading) {
        return <Typography>Loading...</Typography>;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    if (showDetail && selectedYear && selectedQuarter) {
        return <QuarterObligationsDetail year={selectedYear} quarter={selectedQuarter} onBack={handleBackClick} />;
    }

    return (
        <Box sx={{ mt: 2 }}>
            {pendingQuarters.length === 0 ? (
                <Typography>No pending compliance updates found.</Typography>
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
                            {pendingQuarters.map((quarter, index) => (
                                <TableRow key={`${quarter.year}-${quarter.quarter}-${index}`}>
                                    <TableCell>{quarter.year}</TableCell>
                                    <TableCell align='center'>{quarter.quarter}</TableCell>
                                    <TableCell align='center'>
                                        <Button 
                                            variant="outlined" 
                                            onClick={() => handleViewClick(quarter.year, quarter.quarter)}
                                        >
                                            VIEW
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default CurrentReview; 