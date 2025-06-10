import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDate } from '../../../utils/date';

interface ProgressHistoryEntry {
  progressNotes: string;
  updatedAt: string;
}

interface ProgressHistoryModalProps {
  open: boolean;
  onClose: () => void;
  progressHistory: ProgressHistoryEntry[];
  onDelete?: (index: number) => void;
}

const ProgressHistoryModal: React.FC<ProgressHistoryModalProps> = ({ open, onClose, progressHistory, onDelete }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      Risk Treatment ProgressUpdate
      <IconButton aria-label="close" onClick={onClose} size="small">
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <DialogContent>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Progress Update</TableCell>
            {onDelete && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...progressHistory].reverse().map((entry, idx) => (
            <TableRow key={idx}>
              <TableCell>{formatDate(new Date(entry.updatedAt))}</TableCell>
              <TableCell>{entry.progressNotes}</TableCell>
              {onDelete && (
                <TableCell>
                  <IconButton size="small" onClick={() => onDelete(progressHistory.length - 1 - idx)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DialogContent>
  </Dialog>
);

export default ProgressHistoryModal; 