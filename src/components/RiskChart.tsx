import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Box, Typography } from '@mui/material';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    ChartData,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// Ensure width is a string
const RiskChart = ({ data, title, colors }) => {

    const allValuesZero = data.every(item => item.value === 0);

    const chartData: ChartData<'pie'> = {
        labels: data.map(item => item.name),
        datasets: [
            {
                data: data.map(item => item.value),
                backgroundColor: data.map(item => colors[item.name as keyof typeof colors]),
                borderColor: data.map(item => colors[item.name as keyof typeof colors]), // Use same color for border for now
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'center' as const,
                labels: {
                    padding: 10,
                    boxWidth: 10,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.label || '';
                        const value = context.raw;
                        const percent = data.find(item => item.name === label)?.percent || '0.0';
                        return `${label}: ${value} (${percent}%)`;
                    },
                },
            },
        },
    };

    return (
        <Box sx={{
            backgroundColor: '#fff',
            padding: 2,
            borderRadius: 1,
            marginBottom: 2,
            width: '100%'
        }}>
            {title && <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', textAlign: 'center' }}>{title}</Typography>}
            <Box sx={{ maxWidth: 300, margin: '0 auto' }}>
                {allValuesZero ? (
                    <svg width="308" height="308" style={{ display: 'block', margin: '0 auto' }}>
                        <circle
                            cx="150"
                            cy="150"
                            r="135"
                            fill="none"
                            stroke="#bbb"
                            strokeWidth="5"
                        />
                    </svg>
                ) : (
                    <Pie data={chartData} options={options} />
                )}
            </Box>
        </Box>
    );
};

export default RiskChart;
