import React, { useState, useEffect } from 'react';
import { Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Button, IconButton, TextField } from '@mui/material';
import { ExportButton } from '../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { riskColors } from '../../obligation/obligationModal';
import { api } from '../../../../services/api';
import ComplianceUpdateModal, { FileToUpload } from './ComplianceUpdateModal';
import ArticleIcon from '@mui/icons-material/Article'; // Icon for comments/attachments
import CommentsAttachmentsViewModal from './CommentsAttachmentsViewModal'; // Import the view modal
import { useToast } from '../../../../contexts/ToastContext';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchComplianceObligations } from '../../../../store/slices/complianceObligationsSlice';
import { Obligation, AssessmentStatus } from '../../../../types/compliance';
import { exportPdf, exportExcel } from '../../../../utils/exportUtils';

interface ApprovedObligationsDetailProps {
    year: number;
    quarter: string;
    onBack: () => void;
}

const ApprovedObligationsDetail: React.FC<ApprovedObligationsDetailProps> = ({ year, quarter, onBack }) => {
    const dispatch = useAppDispatch();
    const { obligations: allObligations } = useAppSelector(state => state.complianceObligations);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [obligationForView, setObligationForView] = useState<Obligation | null>(null); // State for data in the comments/attachments modal
    const [commentsAttachmentsModalOpen, setCommentsAttachmentsModalOpen] = useState(false); // State for comments/attachments modal
    const { showToast } = useToast();
    const [search, setSearch] = useState('');
    const tableRef = React.useRef<any>(null);
    const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);


    // Filter obligations that have an update entry for the specified year and quarter and are approved
    const obligations = allObligations.filter(ob =>
        ob.update?.some(u =>
            u.year === year.toString() &&
            u.quarter === quarter &&
            u.assessmentStatus === AssessmentStatus.Approved
        )
    );

    const filteredObligations = obligations.filter(ob =>
        ob.complianceObligation.toLowerCase().includes(search.toLowerCase()) ||
        ob.frequency.toLowerCase().includes(search.toLowerCase()) ||
        (typeof ob.owner === 'object' ? ob.owner.name : ob.owner).toLowerCase().includes(search.toLowerCase()) ||
        ob.riskLevel.toLowerCase().includes(search.toLowerCase()) ||
        (ob.complianceStatus || '').toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const loadObligations = async () => {
            try {
                await dispatch(fetchComplianceObligations()).unwrap();
                setLoading(false);
            } catch (err) {
                console.error('Error fetching obligations:', err);
                setError('Failed to load obligations.');
                setLoading(false);
            }
        };

        loadObligations();
    }, [dispatch]);

    const handleViewCommentsAttachments = (obligation: Obligation) => {
        setObligationForView(obligation);
        setCommentsAttachmentsModalOpen(true);
    };

    const handleCloseCommentsAttachmentsModal = () => {
        setCommentsAttachmentsModalOpen(false);
        setObligationForView(null);
    };

    const handleOpenUpdateModal = (obligation: Obligation) => {
        setSelectedObligation(obligation);
        setUpdateModalOpen(true);
    };

    const handleCloseUpdateModal = () => {
        setUpdateModalOpen(false);
        setSelectedObligation(null);
    };

    const handleSaveComplianceUpdate = async (obligationId: string, data: { complianceStatus: string, comments: string, filesToUpload: FileToUpload[], attachments: { filename: string, filepath: string }[] }) => {
        try {
            // 1. Upload new files first
            const uploadedFiles = await Promise.all(
                data.filesToUpload.map(async (fileData) => {
                    try {
                        const formData = new FormData();
                        formData.append('file', fileData.file); // Append the actual File object

                        // Use the backend upload endpoint
                        const response = await api.post('/compliance-obligations/upload', formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        });

                        // The backend /upload endpoint should return an object with the file path in a 'data' property
                        if (response.status === 200 && response.data && typeof response.data.data === 'string') {
                            // Use original filename and the returned filepath from response.data.data
                            return { filename: fileData.name, filepath: response.data.data };
                        } else {
                            console.error('File upload failed for:', fileData.name, response);
                            return null; // Handle upload failure
                        }
                    } catch (error) {
                        console.error('Error uploading file:', error);
                        return null;
                    }
                })
            );

            // Filter out any upload failures
            const successfulUploads = uploadedFiles.filter(fileInfo => fileInfo !== null) as { filename: string, filepath: string }[];

            // 2. Combine existing attachments and newly uploaded attachments' info
            // Filter out any attachments from the initial data that had temporary blob: URLs
            // and combine with successfully uploaded files (which have server paths).
            const existingServerAttachments = data.attachments.filter(att => !att.filepath.startsWith('blob:'));

            const finalAttachments = [...existingServerAttachments, ...successfulUploads];

            // 3. Prepare data for the main obligation update
            const updatePayload = {
                complianceStatus: data.complianceStatus,
                year,
                quarter,
                comments: data.comments,
                attachments: finalAttachments, // Send only server paths
            };

            // 4. Send the update payload
            const res = await api.put(`/compliance-obligations/${obligationId}/update`, updatePayload);

            // Update the obligation in the state with the response data from the backend
            // This response data should have the correct server paths for attachments.
            await dispatch(fetchComplianceObligations());
            handleCloseUpdateModal();

            // Revoke any temporary blob URLs after successful save and state update
            data.attachments.forEach(att => {
                if (att.filepath.startsWith('blob:')) {
                    URL.revokeObjectURL(att.filepath);
                }
            });

            showToast('Update saved successfully', 'success');

        } catch (error) {
            console.error('Error saving compliance update:', error);
            // Optionally show an error message to the user

            // Also revoke temporary blob URLs on error
            data.attachments.forEach(att => {
                if (att.filepath.startsWith('blob:')) {
                    URL.revokeObjectURL(att.filepath);
                }
            });

            showToast('Error saving update', 'error');
        }
    };

    const handleExportPdf = () => {
        setExportType('pdf');
    };
    const handleExportExcel = () => {
        setExportType('excel');
    };

    useEffect(() => {
        if (exportType) {
            const doExport = async () => {
                if (exportType === 'pdf') {
                    await exportPdf(
                        'approved-quarterly-obligation',
                        tableRef,
                        `Approved Obligations for ${quarter} ${year}`,
                        '',
                        '',
                        [0.17, 0.17, 0.17, 0.17, 0.17, 0.15]
                    );
                } else if (exportType === 'excel') {
                    exportExcel(tableRef.current, `Approved Obligations for ${quarter} ${year}`);
                }
                setExportType(null);
            };
            setTimeout(doExport, 0);
        }
    }, [exportType, quarter, year]);

    if (loading) {
        return <Typography>Loading approved obligations...</Typography>;
    } else if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    const hasData = filteredObligations.length > 0;

    return (
        <Box sx={{ mt: 2 }}>
            <Button
                variant="outlined"
                onClick={onBack}
                sx={{
                    textTransform: 'none',
                    borderColor: '#DC2626',
                    color: '#DC2626',
                    mb: 2,
                    '&:hover': {
                        borderColor: '#B91C1C',
                        backgroundColor: 'rgba(220, 38, 38, 0.04)',
                    }
                }}
            >
                Back
            </Button>
            {hasData && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <ExportButton
                            className="excel"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportExcel}
                            size="small"
                        >
                            Export to Excel
                        </ExportButton>
                        <ExportButton
                            className="pdf"
                            startIcon={<FileDownloadIcon />}
                            onClick={handleExportPdf}
                            size="small"
                        >
                            Export to PDF
                        </ExportButton>
                    </Box>
                    <TextField
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by any field"
                        size="small"
                        sx={{ width: 320 }}
                    />
                </Box>
            )}
            <Typography variant="h6" gutterBottom>Obligations for {quarter} {year}</Typography>

            {!obligations.length ? (
                <Typography>No approved obligations found for this quarter.</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <Table ref={tableRef}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Compliance Obligation</TableCell>
                                <TableCell>Frequency</TableCell>
                                <TableCell>Owner</TableCell>
                                <TableCell>Risk Level</TableCell>
                                <TableCell>Compliance Status</TableCell>
                                <TableCell align='center'>Comments/Attachments</TableCell>
                                <TableCell align='center' className="noprint">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredObligations.map(obligation => {
                                // Find the relevant update entry for the displayed quarter
                                const displayQuarterUpdate = obligation.update?.find(u => u.year === year.toString() && u.quarter === quarter);

                                // Determine if comments/attachments icon should be shown based on the specific quarter's update entry
                                const hasCommentsOrAttachmentsForQuarter = (displayQuarterUpdate?.comments && displayQuarterUpdate.comments.length > 0) || (displayQuarterUpdate?.attachments && displayQuarterUpdate.attachments.length > 0);

                                return (
                                    <TableRow key={obligation._id} hover>
                                        <TableCell>{obligation.complianceObligation}</TableCell>
                                        <TableCell>{obligation.frequency}</TableCell>
                                        <TableCell>{typeof obligation.owner === 'object' ? obligation.owner.name : obligation.owner}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Box
                                                    sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        backgroundColor: riskColors[obligation.riskLevel] || 'gray',
                                                        mr: 1,
                                                    }}
                                                />
                                                {obligation.riskLevel}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: obligation.complianceStatus === 'Compliant' ? 'green' : (obligation.complianceStatus === 'Not Compliant' ? 'red' : 'inherit') }}>
                                            {obligation.complianceStatus || 'N/A'}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {hasCommentsOrAttachmentsForQuarter ? (
                                                <IconButton size="small" onClick={() => handleViewCommentsAttachments(obligation)}>
                                                    <ArticleIcon fontSize="small" />
                                                </IconButton>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell align='center'>
                                            <Button variant="outlined" size="small" onClick={() => handleOpenUpdateModal(obligation)}>Update</Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Compliance Update Modal */}
            <ComplianceUpdateModal
                open={updateModalOpen}
                onClose={handleCloseUpdateModal}
                onSave={handleSaveComplianceUpdate}
                obligation={selectedObligation}
                year={year}
                quarter={quarter}
            />
            {/* Comments/Attachments View Modal */}
            <CommentsAttachmentsViewModal
                open={commentsAttachmentsModalOpen}
                onClose={handleCloseCommentsAttachmentsModal}
                obligation={obligationForView}
                year={year}
                quarter={quarter}
            />
        </Box>
    );
};

export default ApprovedObligationsDetail; 