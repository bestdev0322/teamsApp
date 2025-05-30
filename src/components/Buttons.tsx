import {
    Button,
    styled
  } from '@mui/material';

export const ExportButton = styled(Button)({
    backgroundColor: '#fff',
    color: '#374151',
    textTransform: 'none',
    padding: '6px 16px',
    border: '1px solid #E5E7EB',
    '&:hover': {
      backgroundColor: '#F9FAFB',
      borderColor: '#D1D5DB',
    },
    '&.excel': {
      '&:hover': {
        color: '#059669',
        borderColor: '#059669',
      },
    },
    '&.pdf': {
      '&:hover': {
        color: '#DC2626',
        borderColor: '#DC2626',
      },
    },
    '&.word': {
      '&:hover': {
        color: '#2563eb',
        borderColor: '#2563eb',
      },
    },
  });