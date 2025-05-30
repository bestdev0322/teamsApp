import React, { useState, useEffect } from 'react';
import { ExportButton } from '../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Button, IconButton, Checkbox, TextField, CircularProgress } from '@mui/material';
import { api } from '../../../../services/api';
import { riskColors } from '../../obligation/obligationModal';
import ArticleIcon from '@mui/icons-material/Article'; // Icon for comments/attachments
import ComplianceUpdateModal, { FileToUpload } from './ComplianceUpdateModal';
import CommentsAttachmentsViewModal from './CommentsAttachmentsViewModal'; // Import the new modal
import { Toast } from '../../../../components/Toast';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchComplianceObligations, submitQuarterlyUpdates } from '../../../../store/slices/complianceObligationsSlice';
import { Obligation, AssessmentStatus } from '../../../../types/compliance';
import { exportPdf, exportExcel } from '../../../../utils/exportUtils';

interface Attachment {
    filename: string;
    filepath: string;
}

interface UpdateEntry {
    year: string;
    quarter: string;
    comments?: string;
    attachments?: Attachment[];
    assessmentStatus?: AssessmentStatus;
}

interface QuarterObligationsDetailProps {
    year: number;
    quarter: string;
    onBack: () => void;
}

const QuarterObligationsDetail: React.FC<QuarterObligationsDetailProps> = ({ year, quarter, onBack }) => {
    const dispatch = useAppDispatch();
    const { obligations: allObligations } = useAppSelector(state => state.complianceObligations);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
    const [commentsAttachmentsModalOpen, setCommentsAttachmentsModalOpen] = useState(false); // State for the new modal
    const [obligationForView, setObligationForView] = useState<Obligation | null>(null); // State for data in the new modal, might only need update data structure
    const [selectedObligations, setSelectedObligations] = useState<string[]>([]); // State for selected obligations
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [search, setSearch] = useState('');
    const tableRef = React.useRef<any>(null);
    const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter obligations that have submitted updates for the current quarter
    const obligations = allObligations.filter(ob =>
        ob.status === 'Active' &&
        ob.update?.some(u =>
            u.year === year.toString() &&
            u.quarter === quarter &&
            u.assessmentStatus === AssessmentStatus.Submitted
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

            setToast({
                message: 'Update saved successfully',
                type: 'success'
            });

        } catch (error) {
            console.error('Error saving compliance update:', error);
            // Optionally show an error message to the user

            // Also revoke temporary blob URLs on error
            data.attachments.forEach(att => {
                if (att.filepath.startsWith('blob:')) {
                    URL.revokeObjectURL(att.filepath);
                }
            });

            setToast({
                message: 'Error saving update',
                type: 'error'
            });
        }
    };

    const handleViewCommentsAttachments = (obligation: Obligation) => {
        // Find the most recent update for the current quarter to display
        const latestQuarterUpdate = obligation.update?.find(u => u.year === year.toString() && u.quarter === quarter); // Assuming year is passed as number and stored as string
        if (latestQuarterUpdate) {
            // Pass the specific update entry and obligation ID to the modal
            setObligationForView(obligation); // Pass the full obligation
            // The CommentsAttachmentsViewModal will need to find the correct update entry internally
            setCommentsAttachmentsModalOpen(true);
        } else {
            // Handle case where no update exists for the current quarter (e.g., show empty modal or alert)
            console.log('No update found for this quarter for obligation', obligation._id);
            // Pass the full obligation, modal should handle empty state if update is not found
            setObligationForView(obligation);
            setCommentsAttachmentsModalOpen(true);
        }
    };

    const handleCloseCommentsAttachmentsModal = () => {
        setCommentsAttachmentsModalOpen(false);
        setObligationForView(null);
    };

    const handleCheckboxChange = (obligationId: string) => {
        setSelectedObligations(prev =>
            prev.includes(obligationId)
                ? prev.filter(id => id !== obligationId)
                : [...prev, obligationId]
        );
    };

    const handleApproveSelected = async () => {
        try {
            setIsSubmitting(true);
            await dispatch(submitQuarterlyUpdates({
                obligationIds: selectedObligations,
                year: year.toString(),
                quarter: quarter,
                status: AssessmentStatus.Approved
            })).unwrap();

            setSelectedObligations([]);
            setToast({
                message: 'Obligations approved successfully',
                type: 'success'
            });

            await dispatch(fetchComplianceObligations());
        } catch (error) {
            console.error('Error approving obligations:', error);
            setToast({
                message: 'Error approving obligations',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            // Select all obligations that have an update for the current quarter with comments or attachments AND a compliance status
            const allSelectableObligationIds = obligations.filter(ob => {
                const quarterUpdate = ob.update?.find(u => u.year === year.toString() && u.quarter === quarter);
                // Check condition based on the quarter's update
                const hasCommentsOrAttachmentsForQuarter = quarterUpdate && ((quarterUpdate.comments && quarterUpdate.comments.length > 0) || (quarterUpdate.attachments && quarterUpdate.attachments.length > 0));
                return hasCommentsOrAttachmentsForQuarter && ob.complianceStatus !== undefined;
            }).map(ob => ob._id);
            setSelectedObligations(allSelectableObligationIds);
        } else {
            setSelectedObligations([]);
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
                        'submitted-quarterly-obligation',
                        tableRef,
                        `Submitted Obligations for ${quarter} ${year}`,
                        '',
                        '',
                        [0.17, 0.17, 0.17, 0.17, 0.17, 0.15] // Adjust as needed for your columns
                    );
                } else if (exportType === 'excel') {
                    exportExcel(tableRef.current, `Submitted Obligations for ${quarter} ${year}`);
                }
                setExportType(null);
            };
            setTimeout(doExport, 0);
        }
    }, [exportType, quarter, year]);

    if (loading) {
        return <Typography>Loading obligations...</Typography>;
    } else if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    const canApprove = selectedObligations.length > 0;
    // Filter selectable obligations based on having an update for the current quarter with comments/attachments AND compliance status
    const selectableObligations = obligations.filter(ob => {
        const quarterUpdate = ob.update?.find(u => u.year === year.toString() && u.quarter === quarter);
        const hasCommentsOrAttachmentsForQuarter = quarterUpdate && ((quarterUpdate.comments && quarterUpdate.comments.length > 0) || (quarterUpdate.attachments && quarterUpdate.attachments.length > 0));
        return hasCommentsOrAttachmentsForQuarter && ob.complianceStatus !== undefined;
    });
    const isAllSelected = selectableObligations.length > 0 && selectedObligations.length === selectableObligations.length;

    const hasData = filteredObligations.length > 0;

    return (
        <Box sx={{ mt: 2 }}>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Button
                    variant="outlined"
                    onClick={onBack}
                    sx={{
                        textTransform: 'none',
                        borderColor: '#DC2626',
                        color: '#DC2626',
                        '&:hover': {
                            borderColor: '#B91C1C',
                            backgroundColor: 'rgba(220, 38, 38, 0.04)',
                        }
                    }}
                >
                    Back
                </Button>
                <Button
                    variant="contained"
                    onClick={handleApproveSelected}
                    disabled={!canApprove || isSubmitting}
                    sx={{
                        textTransform: 'none',
                        backgroundColor: '#10B981',
                        minWidth: '120px',
                        height: '36px',
                        position: 'relative',
                        '&:hover': {
                            backgroundColor: '#059669',
                        },
                        '&:disabled': {
                            backgroundColor: '#9CA3AF',
                            color: '#E5E7EB',
                        },
                    }}
                >
                    <Box sx={{
                        visibility: isSubmitting ? 'hidden' : 'visible',
                        minWidth: '60px'
                    }}>
                        Submit
                    </Box>
                    {isSubmitting && (
                        <CircularProgress
                            size={24}
                            sx={{
                                color: '#fff',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-12px',
                                marginLeft: '-12px',
                            }}
                        />
                    )}
                </Button>
            </Box>
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
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Obligations for {quarter} {year}</Typography>

            {!obligations.length ? (
                <Typography>No submitted obligations found for this quarter.</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto' }}>
                    <Table ref={tableRef}>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" className="noprint">
                                    <Checkbox
                                        indeterminate={selectedObligations.length > 0 && selectedObligations.length < selectableObligations.length}
                                        checked={isAllSelected}
                                        onChange={handleSelectAllClick}
                                        disabled={selectableObligations.length === 0} // Disable select all if no rows are selectable
                                    />
                                </TableCell>
                                <TableCell>Compliance Obligation</TableCell>
                                <TableCell>Frequency</TableCell>
                                <TableCell>Owner</TableCell>
                                <TableCell>Risk Level</TableCell>
                                <TableCell>Compliance Status</TableCell>
                                <TableCell align='center'>Comments</TableCell>
                                <TableCell align='center' className="noprint">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredObligations.map(obligation => {
                                // Find the update entry for the current quarter
                                const quarterUpdate = obligation.update?.find(u => u.year === year.toString() && u.quarter === quarter);

                                // Checkbox appears if an update exists for the current quarter with comments or attachments AND complianceStatus is set
                                const hasCommentsOrAttachmentsForQuarter = quarterUpdate && ((quarterUpdate.comments && quarterUpdate.comments.length > 0) || (quarterUpdate.attachments && quarterUpdate.attachments.length > 0));
                                const canSelect = hasCommentsOrAttachmentsForQuarter && obligation.complianceStatus !== undefined;

                                // Determine if comments/attachments icon should be shown (based on *any* update entry)
                                const hasAnyCommentsOrAttachments = obligation.update?.some(u => (u.comments && u.comments.length > 0) || (u.attachments && u.attachments.length > 0));

                                return (
                                    <TableRow key={obligation._id} hover>
                                        <TableCell padding="checkbox" className='noprint'>
                                            {canSelect && (
                                                <Checkbox
                                                    checked={selectedObligations.includes(obligation._id)}
                                                    onChange={() => handleCheckboxChange(obligation._id)}
                                                />
                                            )}
                                        </TableCell>
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
                                                        backgroundColor: riskColors[obligation.riskLevel] || 'gray', // Default to gray if risk level is not mapped
                                                        mr: 1, // Margin right for spacing
                                                    }}
                                                />
                                                {obligation.riskLevel}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: obligation.complianceStatus === 'Compliant' ? 'green' : (obligation.complianceStatus === 'Not Compliant' ? 'red' : 'inherit') }}>
                                            {obligation.complianceStatus || 'N/A'}
                                        </TableCell>
                                        <TableCell align='center'>
                                            {hasAnyCommentsOrAttachments ? (
                                                <IconButton size="small" onClick={() => handleViewCommentsAttachments(obligation)}>
                                                    <ArticleIcon fontSize="small" />
                                                </IconButton>
                                            ) : (
                                                '-' // Show a dash if no comments/attachments
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

export default QuarterObligationsDetail;