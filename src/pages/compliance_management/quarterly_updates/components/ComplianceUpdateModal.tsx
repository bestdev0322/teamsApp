import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Box,
    Typography,
    IconButton,
    Grid,
    FormHelperText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { UpdateEntry } from './CommentsAttachmentsViewModal';

interface Attachment {
    filename: string;
    filepath: string;
}

interface Obligation {
    _id: string;
    complianceObligation: string;
    complianceArea: { areaName: string; };
    frequency: string;
    lastDueDate: string;
    owner: { name: string; };
    riskLevel: string;
    status: string;
    complianceStatus?: 'Compliant' | 'Not Compliant';
    update?: UpdateEntry[];
}

interface ComplianceUpdateModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (obligationId: string, data: { complianceStatus: string, comments: string, filesToUpload: FileToUpload[], attachments: { filename: string, filepath: string }[], year: number, quarter: string }) => void;
    obligation: Obligation | null;
    year: number;
    quarter: string;
}

export interface FileToUpload {
    file: File;
    name: string;
}

const ComplianceUpdateModal: React.FC<ComplianceUpdateModalProps> = ({ open, onClose, onSave, obligation, year, quarter }) => {
    const [complianceStatus, setComplianceStatus] = useState('Not Compliant');
    const [comments, setComments] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [filesToUpload, setFilesToUpload] = useState<FileToUpload[]>([]);
    const [errors, setErrors] = useState<{
        complianceStatus?: string;
        comments?: string;
        files?: string;
    }>({});

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

    useEffect(() => {
        if (open && obligation) {
            // If there's a current quarter update, use its data
            if (currentQuarterUpdate) {
                setComplianceStatus(currentQuarterUpdate.complianceStatus || 'Not Compliant');
                setComments(currentQuarterUpdate.comments || '');
                setAttachments(currentQuarterUpdate.attachments || []);
            } else {
                // If no current quarter update, try to find the latest previous update
                const latestPreviousUpdate = findLatestUpdate(obligation, year, quarter);
                setComplianceStatus(latestPreviousUpdate?.complianceStatus || 'Not Compliant');
                setComments(latestPreviousUpdate?.comments || '');
                setAttachments(latestPreviousUpdate?.attachments || []);
            }
            setFilesToUpload([]);
            setErrors({}); // Reset errors when modal opens
        }
    }, [open, obligation, currentQuarterUpdate, year, quarter]);

    const validateForm = () => {
        const newErrors: {
            complianceStatus?: string;
            comments?: string;
        } = {};

        if (!complianceStatus) {
            newErrors.complianceStatus = 'Compliance status is required';
        }

        if (!comments.trim()) {
            newErrors.comments = 'Comments are required';
        } else if (comments.length > 1000) {
            newErrors.comments = 'Comments cannot exceed 1000 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newFiles: FileToUpload[] = [];
            const newAttachments = [...attachments];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Check file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    setErrors(prev => ({
                        ...prev,
                        files: 'File size should not exceed 10MB'
                    }));
                    continue;
                }
                newFiles.push({
                    file,
                    name: file.name
                });
                newAttachments.push({
                    filename: file.name,
                    filepath: URL.createObjectURL(file)
                });
            }

            setFilesToUpload(prev => [...prev, ...newFiles]);
            setAttachments(newAttachments);
        }
    };

    const handleDeleteAttachment = (filepathToDelete: string) => {
        const updatedAttachments = attachments.filter(att => att.filepath !== filepathToDelete);
        setAttachments(updatedAttachments);

        if (filepathToDelete.startsWith('blob:')) {
            URL.revokeObjectURL(filepathToDelete);
        }
    };

    const handleSave = () => {
        if (validateForm() && obligation) {
            onSave(obligation._id, { complianceStatus, comments, filesToUpload, attachments, year, quarter });
        }
    };

    useEffect(() => {
        if (!open) {
            filesToUpload.forEach(fileData => {
                const attachment = attachments.find(att => att.filename === fileData.name && att.filepath.startsWith('blob:'));
                if (attachment) {
                    URL.revokeObjectURL(attachment.filepath);
                }
            });
            attachments.forEach(att => {
                if (att.filepath.startsWith('blob:')) {
                    URL.revokeObjectURL(att.filepath);
                }
            });
        }
    }, [open, filesToUpload, attachments]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#111827' }}>Compliance Update</Typography>
                    <IconButton onClick={onClose} size="small" sx={{ color: '#6B7280' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: '#4B5563' }}>Obligation: {obligation?.complianceObligation}</Typography>
                </Box>

                <FormControl
                    fullWidth
                    margin="normal"
                    error={!!errors.complianceStatus}
                    sx={{
                        backgroundColor: '#F9FAFB',
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: errors.complianceStatus ? '#DC2626' : '#E5E7EB' },
                        }
                    }}
                >
                    <InputLabel>Compliance Status</InputLabel>
                    <Select
                        value={complianceStatus}
                        onChange={e => {
                            setComplianceStatus(e.target.value as 'Compliant' | 'Not Compliant');
                            setErrors(prev => ({ ...prev, complianceStatus: undefined }));
                        }}
                        label="Compliance Status"
                        size="small"
                    >
                        {['Compliant', 'Not Compliant'].map(statusOption => (
                            <MenuItem key={statusOption} value={statusOption}>{statusOption}</MenuItem>
                        ))}
                    </Select>
                    {errors.complianceStatus && (
                        <FormHelperText>{errors.complianceStatus}</FormHelperText>
                    )}
                </FormControl>

                <TextField
                    label="Comments"
                    value={comments}
                    onChange={e => {
                        setComments(e.target.value);
                        setErrors(prev => ({ ...prev, comments: undefined }));
                    }}
                    fullWidth
                    margin="normal"
                    multiline
                    rows={4}
                    variant="outlined"
                    error={!!errors.comments}
                    helperText={errors.comments}
                    sx={{
                        backgroundColor: '#F9FAFB',
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: errors.comments ? '#DC2626' : '#E5E7EB' },
                        }
                    }}
                />

                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#374151', mb: 2 }}>Attachments</Typography>
                    {errors.files && (
                        <Typography color="error" variant="caption" sx={{ mb: 1, display: 'block' }}>
                            {errors.files}
                        </Typography>
                    )}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {attachments.map((attachment, index) => (
                            <Grid key={index} component="div" sx={{ mb: 1 }} >
                                <Box
                                    sx={{
                                        border: '1px solid #E5E7EB',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        height: '150px',
                                        position: 'relative',
                                        '&:hover .delete-button': {
                                            opacity: 1,
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            height: '100px',
                                            backgroundColor: '#F3F4F6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <InsertDriveFileIcon sx={{ fontSize: 48, color: '#6B7280' }} />
                                    </Box>
                                    <Box sx={{ p: 1, textAlign: 'center' }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: '#374151',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {attachment.filename}
                                        </Typography>
                                        {!attachment.filepath.startsWith('blob:') && (
                                            <a
                                                href={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${attachment.filepath}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: '#2563EB',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                Download
                                            </a>
                                        )}
                                    </Box>
                                    <IconButton
                                        className="delete-button"
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            color: '#DC2626',
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                            '&:hover': {
                                                backgroundColor: '#FEE2E2',
                                            }
                                        }}
                                        onClick={() => handleDeleteAttachment(attachment.filepath)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                    <input
                        type="file"
                        id="file-upload"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        onClick={(event) => { (event.target as HTMLInputElement).value = ''; }}
                    />
                    <label htmlFor="file-upload">
                        <Button
                            variant="outlined"
                            component="span"
                            startIcon={<AddIcon />}
                            sx={{
                                color: '#6B7280',
                                borderColor: '#E5E7EB',
                                textTransform: 'none',
                                '&:hover': {
                                    borderColor: '#D1D5DB',
                                    backgroundColor: '#F9FAFB',
                                }
                            }}
                        >
                            Add attachment
                        </Button>
                    </label>
                </Box>

            </Box>
            <DialogActions sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, p: 3 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                        color: '#374151',
                        borderColor: '#E5E7EB',
                        textTransform: 'none',
                        '&:hover': {
                            borderColor: '#D1D5DB',
                            backgroundColor: '#F9FAFB',
                        }
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    sx={{
                        backgroundColor: '#6264A7',
                        textTransform: 'none',
                        '&:hover': {
                            backgroundColor: '#4F46E5',
                        }
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ComplianceUpdateModal; 