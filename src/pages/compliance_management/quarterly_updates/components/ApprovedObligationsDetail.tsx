import React, { useState, useEffect } from 'react';
import { Box, Typography, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TableCell, Button, IconButton, TextField } from '@mui/material';
import { api } from '../../../../services/api';
import { riskColors } from '../../obligation/obligationModal';
import ArticleIcon from '@mui/icons-material/Article'; // Icon for comments/attachments
import CommentsAttachmentsViewModal from './CommentsAttachmentsViewModal'; // Import the view modal
import { Toast } from '../../../../components/Toast';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchComplianceObligations } from '../../../../store/slices/complianceObligationsSlice';
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
    assessmentStatus: AssessmentStatus;
    attachments?: Attachment[];
}

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
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [search, setSearch] = useState('');
    const tableRef = React.useRef<any>(null);
    const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

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
                        [0.17, 0.17, 0.17, 0.17, 0.17, 0.15] // Adjust as needed for your columns
                    );
                } else if (exportType === 'excel') {
                    exportExcel(tableRef.current, `Approved Obligations for ${quarter} ${year}`);
                }
                setExportType(null);
            };
            setTimeout(doExport, 0);
        }
    }, [exportType, quarter, year]);

    const hasData = filteredObligations.length > 0;

    if (loading) {
        return <Typography>Loading approved obligations...</Typography>;
    } else if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <Box sx={{ mt: 2 }}>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
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
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            onClick={handleExportPdf}
                            sx={{ textTransform: 'none' }}
                        >
                            Export PDF
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleExportExcel}
                            sx={{ textTransform: 'none' }}
                        >
                            Export Excel
                        </Button>
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
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
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