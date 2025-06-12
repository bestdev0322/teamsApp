import React, { useState, useEffect } from 'react';
import { Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Button } from '@mui/material';
import { api } from '../../../../services/api';
import ResidualDetailView from './ResidualDetailView';

interface Quarter {
    quarter: string;
    start: string;
    end: string;
}
interface ResidualAssessmentCycle {
    id: string;
    year: number;
    quarters: Quarter[];
}

const ResidualAssessment: React.FC = () => {
    const [currentQuarter, setCurrentQuarter] = useState<{ year: number; quarter: string } | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get('/residual-risk-assessment-cycle').then(res => {
            const cycles: ResidualAssessmentCycle[] = (res.data.data || []).map((s: any) => ({
                id: s._id,
                year: s.year,
                quarters: s.quarters,
            }));
            const today = new Date();
            let found = null;
            for (const cycle of cycles) {
                for (const q of cycle.quarters) {
                    const start = new Date(q.start);
                    const end = new Date(q.end);
                    if (today >= start && today <= end) {
                        found = { year: cycle.year, quarter: q.quarter };
                        break;
                    }
                }
                if (found) break;
            }
            setCurrentQuarter(found);
            setLoading(false);
        });
    }, []);

    const handleViewClick = () => {
        setShowDetail(true);
    };

    const handleBackClick = () => {
        setShowDetail(false);
    };

    if (loading) {
        return <Typography>Loading...</Typography>;
    }

    if (showDetail && currentQuarter) {
        return <ResidualDetailView currentQuarter={currentQuarter} handleBackClick={handleBackClick} />;
    }

    if (!currentQuarter) {
        return <Typography>No active residual risk assessment quarter found for today's date.</Typography>;
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto', mt: 2 }}>
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
                        <TableCell>{currentQuarter.year}</TableCell>
                        <TableCell align='center'>{currentQuarter.quarter}</TableCell>
                        <TableCell align='center'>
                            <Button variant="outlined" onClick={handleViewClick}>
                                VIEW
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ResidualAssessment;