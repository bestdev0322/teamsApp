import React from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  styled,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';


interface EvidenceModalProps {
  open: boolean;
  onClose: () => void;
  evidence: string;
  attachments: Array<{ name: string; url: string }>;
}

const FileLink = styled('a')({
  color: '#2563EB',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  '&:hover': {
    textDecoration: 'underline',
    color: '#1D4ED8',
  },
});

const EvidenceModal: React.FC<EvidenceModalProps> = ({
  open,
  onClose,
  evidence,
  attachments
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Portfolio of evidences</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography 
            sx={{ 
              color: '#374151',
              whiteSpace: 'pre-wrap'
            }}
          >
            {evidence}
          </Typography>
        </Box>

        {attachments.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#374151', mb: 2 }}>Attachments</Typography>
            {attachments.map((attachment, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  mb: 1,
                  border: '1px solid #E5E7EB',
                  borderRadius: 1,
                  backgroundColor: '#F9FAFB',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#F3F4F6',
                  }
                }}
              >
                <InsertDriveFileIcon sx={{ color: '#6B7280' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#111827', mb: 0.5 }}>
                    {attachment.name}
                  </Typography>
                  <FileLink 
                    href={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${attachment.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View attachment
                  </FileLink>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default EvidenceModal; 