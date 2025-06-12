import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { api } from '../../../../../../services/api';
import { useAuth } from '../../../../../../contexts/AuthContext';
import RoundChart from './RoundChart';

const STATUS_COLOR_MAP = {
    'Planned': '#3498db',
    'In Progress': '#f39c12',
    'Completed': '#e74c3c'
};

interface TreatmentsDistributionProps {
    year: string;
    quarter: string;
}

const TreatmentsDistribution: React.FC<TreatmentsDistributionProps> = ({ year, quarter }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const { user } = useAuth();

    const evaluateStatus = (treatment) => {
        if (treatment.status !== 'Completed') {
            return treatment.status;
        } else {
            if (treatment.convertedToControl) {
                return 'Completed';
            } else {
                return 'In Progress';
            }
        }
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const [treatmentsRes, teamsRes] = await Promise.all([
                api.get('/risk-treatments'),
                api.get(`/teams/${user?.tenantId}`)
            ]);
            const treatments = treatmentsRes.data.data || [];
            const teams = teamsRes.data.data || [];
            setTeams(teams);
            setTreatments(treatments);
            // Group by status (assuming status field is one of the labels)
            const statusCounts = Object.keys(STATUS_COLOR_MAP).map(label => ({
                name: label,
                value: treatments.filter(t => evaluateStatus(t).toLowerCase() === label.toLowerCase().replace(/ /g, '')).length
            }));
            // If status is not exactly matching, fallback to counting by unique status values
            if (statusCounts.every(s => s.value === 0)) {
                // fallback: group by unique status values
                const uniqueStatuses = Array.from(new Set(treatments.map(t => evaluateStatus(t))));
                setData(uniqueStatuses.map((name, i) => ({ name, value: treatments.filter(t => evaluateStatus(t) === name).length })));
            } else {
                setData(statusCounts);
            }
        } catch (e) {
            setData([]);
            setTeams([]);
            setTreatments([]);
        }
        setLoading(false);
    };

    const getTeamChartData = (teamId) => {
        const teamTreatments = treatments.filter(t => t.treatmentOwner?._id === teamId);
        const total = teamTreatments.length;
        return Object.keys(STATUS_COLOR_MAP).map(label => {
            const value = teamTreatments.filter(t => evaluateStatus(t) === label).length;
            return { name: label, value, percent: total ? ((value / total) * 100).toFixed(1) : '0.0' };
        });
    };

    const getOrgChartData = () => {
        const total = treatments.length;
        return Object.keys(STATUS_COLOR_MAP).map(label => {
            const value = treatments.filter(t => evaluateStatus(t) === label).length;
            return { name: label, value, percent: total ? ((value / total) * 100).toFixed(1) : '0.0' };
        });
    }

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <Box>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {`Risk Treatment Statuses ${year}`}
            </Typography>
            {loading ? <CircularProgress /> : (
                <>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', mb: 8 }}>
                        <RoundChart
                            data={getOrgChartData()}
                            colors={STATUS_COLOR_MAP}
                            title="Organization-Wide Risk Treatment Status"
                            height={500}
                            marginTop={10}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', my: 3 }}>
                        {teams.map(team => (
                            <RoundChart
                                key={team._id}
                                data={getTeamChartData(team._id)}
                                colors={STATUS_COLOR_MAP}
                                title={`${team.name} Team Risk Treatment Status`}
                                height={500}
                                marginTop={10}
                            />
                        ))}
                    </Box>
                </>
            )}
        </Box>
    );
};

export default TreatmentsDistribution;