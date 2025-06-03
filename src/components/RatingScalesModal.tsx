import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  styled,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AnnualTargetRatingScale } from '../types/annualCorporateScorecard';

interface RatingScalesModalProps {
  open: boolean;
  onClose: () => void;
  ratingScales: AnnualTargetRatingScale[];
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  borderBottom: '1px solid #E5E7EB',
  padding: '12px 16px',
  color: '#374151',
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  borderBottom: '1px solid #E5E7EB',
  padding: '12px 16px',
  color: '#6B7280',
  fontWeight: 500,
  backgroundColor: '#F9FAFB',
}));

const RatingScalesModal: React.FC<RatingScalesModalProps> = ({
  open,
  onClose,
  ratingScales
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Performance Rating Agreement</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <StyledHeaderCell>Score</StyledHeaderCell>
              <StyledHeaderCell>Rating</StyledHeaderCell>
              <StyledHeaderCell align="center">Min</StyledHeaderCell>
              <StyledHeaderCell align="center">Max</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ratingScales.map((scale) => (
              <TableRow key={scale.score}>
                <StyledTableCell>{scale.score}</StyledTableCell>
                <StyledTableCell sx={{ color: scale.color }}>
                  {scale.name}
                </StyledTableCell>
                <StyledTableCell align="center">{scale.min}%</StyledTableCell>
                <StyledTableCell align="center">{scale.max}%</StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Dialog>
  );
};

export default RatingScalesModal; 