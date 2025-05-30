import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { TeamPerformance } from '../../../types';
interface PendingTargetsTableProps {
  teamPerformances: TeamPerformance[];
  selectedQuarter: string;
}
export const PendingTargetsTable: React.FC<PendingTargetsTableProps> = ({
  teamPerformances,
  selectedQuarter,
}) => {
  return (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Full Name</TableCell>
          <TableCell>Team</TableCell>
          <TableCell>Position</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {teamPerformances
          .map((performance: TeamPerformance) => {
            const quarterlyTarget = performance.quarterlyTargets.find(qt => qt.quarter === selectedQuarter);
            return (
              <TableRow key={performance._id}>
                <TableCell>{performance.fullName}</TableCell>
                <TableCell>{performance.team}</TableCell>
                <TableCell>{performance.jobTitle}</TableCell>
                <TableCell>{quarterlyTarget?.agreementStatus}</TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  </TableContainer>
)}; 