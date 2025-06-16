import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableRow, Paper, TableHead, TableContainer } from '@mui/material';

// Types
interface RiskRating {
  _id: string;
  rating: string;
  minScore: number;
  maxScore: number;
  color: string;
}
interface Risk {
  _id: string;
  no: string; // Risk number, e.g. "R1"
  riskNameElement: string;
  impact: { score: number };
  likelihood: { score: number };
}

interface HeatmapProps {
  risks: Risk[];
  riskRatings: RiskRating[];
  xLabels: number[];
  yLabels: number[];
  title: string;
  year: string;
  showLegend?: boolean;
}

// Helper to get color for a cell
const getBlockColor = (
  impact: number,
  likelihood: number,
  riskRatings: RiskRating[]
) => {
  const score = impact * likelihood;
  const rating = riskRatings.find(
    (r) => score >= r.minScore && score <= r.maxScore
  );
  return rating ? rating.color : '#fff';
};

// Main Heatmap component
const Heatmap: React.FC<HeatmapProps> = ({ risks, riskRatings, xLabels, yLabels, title, year, showLegend = true }) => (
  <Box sx={{ mb: 4, position: 'relative' }}>
    <Typography variant="h6" align="center" sx={{ mb: 2 }}>
      {title}
    </Typography>

    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <Typography
        variant="body2"
        sx={{
          position: 'absolute',
          left: -60,
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          transformOrigin: 'center center',
          whiteSpace: 'nowrap'
        }}
      >
        Likelihood →
      </Typography>

      <TableContainer component={Paper} sx={{ borderCollapse: 'collapse', width: 'auto', margin: '0 auto', padding: '8 8', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ border: 'none', background: 'transparent' }} />
              {xLabels.map((impact) => (
                <TableCell
                  key={`x-label-${impact}`}
                  sx={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    border: 'none',
                    background: 'transparent'
                  }}
                >
                  {impact}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Y-axis and data */}
            {yLabels.slice().reverse().map((likelihood) => (
              <TableRow key={likelihood}>
                {/* Y-axis label */}
                <TableCell
                  sx={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    border: 'none',
                    background: 'transparent'
                  }}
                >
                  {likelihood}
                </TableCell>
                {xLabels.map((impact) => {
                  const color = getBlockColor(impact, likelihood, riskRatings);
                  // Find risks for this cell
                  const risksInCell = risks.filter(
                    (r) =>
                      r.impact?.score === impact && r.likelihood?.score === likelihood
                  );
                  return (
                    <TableCell
                      key={impact}
                      sx={{
                        background: color,
                        width: 60,
                        height: 60,
                        border: '1px solid #ccc',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 500,
                      }}
                    >
                      {risksInCell.map((r) => (
                        <span key={r._id}>{r.no} </span>
                      ))}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>

    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
      <Typography variant="body2" sx={{ mr: 2 }}>Impact →</Typography>
    </Box>

    {/* Legend */}
    {showLegend && (
      <Box sx={{ mt: 3 }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>No.</TableCell>
              <TableCell>Risk Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {risks.map((r) => (
              <TableRow key={r._id}>
                <TableCell sx={{ width: 40 }}>{r.no}</TableCell>
                <TableCell>{r.riskNameElement}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    )}
  </Box>
);

export default Heatmap;