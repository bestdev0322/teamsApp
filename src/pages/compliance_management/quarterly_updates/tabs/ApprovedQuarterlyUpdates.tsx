import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Button, IconButton } from '@mui/material';
import ApprovedObligationsDetail from '../components/ApprovedObligationsDetail'; // Import the new detail component
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchComplianceObligations } from '../../../../store/slices/complianceObligationsSlice';
import { Obligation, AssessmentStatus } from '../../../../types/compliance';

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

const ApprovedQuarterlyUpdates: React.FC = () => {
    const dispatch = useAppDispatch();
    const { obligations: allObligations, status: obligationsStatus } = useAppSelector(state => state.complianceObligations);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetail, setShowDetail] = useState(false); // State to control showing detail view
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

    useEffect(() => {
        if (obligationsStatus === 'idle') {
            dispatch(fetchComplianceObligations());
        }
    }, [obligationsStatus, dispatch]);

    useEffect(() => {
        if (obligationsStatus === 'succeeded') {
            setLoading(false);
        } else if (obligationsStatus === 'failed') {
            setError('Failed to load obligations.');
            setLoading(false);
        }
    }, [obligationsStatus]);

    const approvedQuarters = useMemo(() => {
        const uniqueQuarters = new Set<string>(); // Stores "YEAR-QUARTER" strings
        allObligations.forEach(ob => {
            ob.update?.forEach(u => {
                if (u.assessmentStatus === AssessmentStatus.Approved) {
                    uniqueQuarters.add(`${u.year}-${u.quarter}`);
                }
            });
        });

        // Convert to array of { year: number, quarter: string } objects and sort
        return Array.from(uniqueQuarters)
            .map(q => {
                const [yearStr, quarterStr] = q.split('-');
                return { year: parseInt(yearStr), quarter: quarterStr };
            })
            .sort((a, b) => {
                // Sort by year descending, then quarter descending
                if (b.year !== a.year) {
                    return b.year - a.year;
                }
                const quarterOrder = { 'Q4': 4, 'Q3': 3, 'Q2': 2, 'Q1': 1 };
                return quarterOrder[b.quarter as keyof typeof quarterOrder] - quarterOrder[a.quarter as keyof typeof quarterOrder];
            });
    }, [allObligations]);

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

    if (showDetail && selectedQuarter && selectedYear) {
        return <ApprovedObligationsDetail year={selectedYear} quarter={selectedQuarter} onBack={handleBackClick} />;
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Approved Quarterly Compliance Updates</Typography>

            {approvedQuarters.length === 0 ? (
                <Typography>No approved compliance updates found.</Typography>
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
                            {approvedQuarters.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.year}</TableCell>
                                    <TableCell align='center'>{item.quarter}</TableCell>
                                    <TableCell align='center'>
                                        <Button variant="outlined" onClick={() => handleViewClick(item.year, item.quarter)}>
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

export default ApprovedQuarterlyUpdates;
