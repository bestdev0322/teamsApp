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

interface Attachment {
    filename: string;
    filepath: string;
}

export interface UpdateEntry {
    year: string;
    quarter: string;
    comments?: string;
    attachments?: Attachment[];
    complianceStatus?: string;
}

export interface Obligation {
    _id: string;
    complianceObligation: string;
    update?: UpdateEntry[]; // Obligation now has an update array
}

interface CommentsAttachmentsViewModalProps {
    open: boolean;
    onClose: () => void;
    obligation: Obligation | null; // Still pass the full obligation
    year: number; // Add year and quarter props to find the correct update
    quarter: string;
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

const CommentsAttachmentsViewModal: React.FC<CommentsAttachmentsViewModalProps> = ({ open, onClose, obligation, year, quarter }) => {
    // Helper to find the latest update before the current year/quarter
    const findLatestUpdate = (ob: Obligation, currentYear: number, currentQuarter: string) => {
        if (!ob.update || ob.update.length === 0) return null;

        const sortedUpdates = [...ob.update].sort((a, b) => {
            const aYear = parseInt(a.year);
            const bYear = parseInt(b.year);
            if (aYear !== bYear) return bYear - aYear;
            return b.quarter.localeCompare(a.quarter);
        });

        return sortedUpdates.find(u => {
            const updateYear = parseInt(u.year);
            if (updateYear < currentYear) return true;
            if (updateYear === currentYear) return u.quarter < currentQuarter;
            return false;
        }) || null;
    };

    // Find the relevant update entry for the current year and quarter
    const currentQuarterUpdate = obligation?.update?.find(u => u.year === year.toString() && u.quarter === quarter);
    
    // If no update for the current quarter, find the latest available one
    const displayUpdate = currentQuarterUpdate || (obligation ? findLatestUpdate(obligation, year, quarter) : null);
    
    const comments = displayUpdate?.comments;
    const attachments = displayUpdate?.attachments;
    const isFromPreviousQuarter = !currentQuarterUpdate && displayUpdate;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">Comments and Attachments for {obligation?.complianceObligation}</Typography>
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
                        {comments || 'No comments provided.'} {/* Use comments from the update entry */}
                    </Typography>
                    {isFromPreviousQuarter && displayUpdate && (
                        <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 1 }}>
                            (Showing comments from {displayUpdate.quarter} {displayUpdate.year})
                        </Typography>
                    )}
                </Box>

                {attachments && attachments.length > 0 && (
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
                                        {attachment.filename}
                                    </Typography>
                                    <FileLink
                                        href={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/${attachment.filepath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download // Add download attribute
                                    >
                                        Download attachment
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

export default CommentsAttachmentsViewModal; 