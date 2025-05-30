import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { AnnualTarget } from '../../../types';
interface PerformanceDistributionChartProps {
  title: string;
  annualTarget: AnnualTarget;
  chartData: {
    rating: number;
    count: number;
  }[];
}

const PerformanceDistributionChart: React.FC<PerformanceDistributionChartProps> = ({ title, annualTarget, chartData }) => {
  const scaledChartData = chartData.map((item) => ({
    rating: item.rating,
    count: item.count,
    percentage: Number(((item.count / (chartData.reduce((prev, current) => prev + current.count, 0) || 1))).toFixed(2))
  }));

  return (
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Paper sx={{ flex: 1, boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <Table size="small" id="performance-distribution-table">
            <TableHead>
              <TableRow>
                <StyledHeaderCell align="center">Performance Rating Score</StyledHeaderCell>
                <StyledHeaderCell align="center">Description</StyledHeaderCell>
                <StyledHeaderCell align="center">No of Employees</StyledHeaderCell>
                <StyledHeaderCell align="center">%</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {annualTarget.content.ratingScales.map((ratingScale) => (
                <TableRow key={ratingScale.score}>
                  <StyledTableCell align="center">{ratingScale.score}</StyledTableCell>
                  <StyledTableCell>{ratingScale.name}</StyledTableCell>
                  <StyledTableCell align="center">{chartData.find(data => data.rating === ratingScale.score)?.count}</StyledTableCell>
                  <StyledTableCell align="center">{((chartData.find(data => data.rating === ratingScale.score)?.count / (chartData.reduce((prev, current) => prev + current.count, 0) || 1)) * 100).toFixed(2)}</StyledTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ flex: 1, p: 2, boxShadow: 'none', border: '1px solid #E5E7EB' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            {title}
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scaledChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="rating" />
                <YAxis domain={[0, 1]} />
                <Bar
                  dataKey="percentage"
                  fill="#FDB022"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default PerformanceDistributionChart; 