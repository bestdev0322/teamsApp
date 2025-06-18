import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableHead,
    TableRow,
    Button,
    Select,
    MenuItem,
    IconButton,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    InputAdornment,
    Autocomplete,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import {
    PersonalPerformance,
    QuarterType,
    PersonalQuarterlyTargetFeedback,
} from '../../../types';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { RootState } from '../../../store';
import { ViewButton, StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { api } from '../../../services/api';
import { updatePersonalPerformance } from '../../../store/slices/personalPerformanceSlice';
import { createSelector } from '@reduxjs/toolkit';

interface Props {
    quarter: QuarterType;
    annualTargetId: string;
    personalPerformance: PersonalPerformance;
    overallScore: {
        score: number;
        name: string;
    };
}

type ProviderType = 'Internal' | 'External';

type FeedbackProvider = {
    id: string;
    name: string;
    email: string;
    category: string;
    status: string;
}

interface AddProviderForm {
    type: ProviderType;
    name: string;
    email?: string;
    category: FeedbackProvider['category'];
}

// Memoized selector for feedbacks
const selectFeedbacks = createSelector(
    [
        (state: RootState) => state.feedback.feedbacks,
        (_: RootState, annualTargetId: string) => annualTargetId,
        (_: RootState, _annualTargetId: string, quarter: QuarterType) => quarter
    ],
    (feedbacks, annualTargetId, quarter) =>
        feedbacks.filter(f =>
            f.annualTargetId === annualTargetId &&
            f.enableFeedback.some(ef => ef.quarter === quarter && ef.enable)
        )
);

const PersonalFeedback: React.FC<Props> = ({ quarter, annualTargetId, personalPerformance, overallScore }) => {
    const dispatch = useAppDispatch();
    const [selectedFeedbackId, setSelectedFeedbackId] = useState<string>('');
    const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<{
        dimension: string;
        question: string;
        responses: {
            provider: {
                name: string;
                category: string;
            };
            response: {
                score: number;
                response: string;
            };
            reason: string;
        }[];
    } | null>(null);
    const [providerForm, setProviderForm] = useState<AddProviderForm>({
        type: 'Internal',
        name: '',
        email: '',
        category: 'Peer'
    });
    const [organizationMembers, setOrganizationMembers] = useState<{ name: string, email: string }[]>([]);
    const [emailError, setEmailError] = useState<string>('');

    const feedbacks = useAppSelector(state => selectFeedbacks(state, annualTargetId, quarter));

    useEffect(() => {
        const fetchOrganizationMembers = async () => {
            try {
                const response = await api.get('/users/organization/users');
                if (response.data.status === 'success') {
                    setOrganizationMembers(response.data.data.map((user: any) => ({
                        name: user.displayName,
                        email: user.mail
                    })));
                }
            } catch (error) {
                console.error('Error fetching organization members:', error);
            }
        };
        fetchOrganizationMembers();
    }, []);

    useEffect(() => {
        if (personalPerformance && personalPerformance.quarterlyTargets) {
            const id = personalPerformance.quarterlyTargets.find(t => t.quarter === quarter)?.selectedFeedbackId || '';
            if (feedbacks.some(f => f._id === id)) {
                setSelectedFeedbackId(id);
            } else {
                setSelectedFeedbackId('');
            }
        }
    }, [personalPerformance, quarter, feedbacks]);

    useEffect(() => {
        if (feedbacks.length > 0 && !selectedFeedbackId) {
            const firstFeedback = feedbacks[0];
            setSelectedFeedbackId(firstFeedback._id);
        }
    }, [feedbacks]);

    const handleAddProviderClose = () => {
        setIsAddProviderOpen(false);
        setProviderForm({
            type: 'Internal',
            name: '',
            email: '',
            category: 'Peer'
        });
    };

    const handleProviderTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setProviderForm({
            ...providerForm,
            type: event.target.value as ProviderType,
            name: '',
            email: ''
        });
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!email) {
            setEmailError('Email is required');
            return false;
        }
        if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setProviderForm({ ...providerForm, email: newEmail });
        validateEmail(newEmail);
    };

    const handleSaveProvider = async () => {
        if (validateEmail(providerForm.email || '')) {
            const newFeedback: PersonalQuarterlyTargetFeedback = {
                feedbackId: selectedFeedbackId,
                provider: {
                    name: providerForm.name,
                    email: providerForm.email,
                    category: providerForm.category,
                    status: 'Not Shared'
                },
                feedbacks: []
            };

            const updatedPersonalPerformance = {
                ...personalPerformance,
                quarterlyTargets: personalPerformance.quarterlyTargets.map(target =>
                    target.quarter === quarter
                        ? {
                            ...target,
                            feedbacks: [...(target.feedbacks || []), newFeedback]
                        }
                        : target
                )
            };

            dispatch(updatePersonalPerformance(updatedPersonalPerformance));
            handleAddProviderClose();
        }
    };

    const calculateFeedbackOverallScore = () => {
        const target = personalPerformance.quarterlyTargets.find(t => t.quarter === quarter);
        const feedbackResponses = target?.feedbacks.filter(f => f.feedbackId === selectedFeedbackId) || [];
        const feedbackTemplate = feedbacks.find(f => f._id === selectedFeedbackId);

        if (!feedbackTemplate || feedbackResponses.length === 0) return '-';

        let totalWeightedScore = 0;
        let totalWeight = 0;

        feedbackTemplate.dimensions.forEach(dimension => {
            const dimensionScore = calculateAverageScore(dimension.name);
            if (dimensionScore !== '-') {
                const score = parseFloat(dimensionScore);
                totalWeightedScore += score * (dimension.weight / 100);
                totalWeight += dimension.weight / 100;
            }
        });

        if (totalWeight === 0) return '-';
        return totalWeightedScore.toFixed(2);
    };

    const handleViewFeedback = (dimension: string, question: string) => {
        const target = personalPerformance.quarterlyTargets.find(t => t.quarter === quarter);
        const feedbacks = target?.feedbacks.filter(f => f.feedbackId === selectedFeedbackId) || [];

        const responses = feedbacks.map(feedback => ({
            provider: {
                name: feedback.provider.name,
                category: feedback.provider.category
            },
            response: feedback.feedbacks.find(f =>
                f.dimension === dimension && f.question === question
            )?.response || { score: 0, response: '' },
            reason: feedback.feedbacks.find(f =>
                f.dimension === dimension && f.question === question
            )?.reason || ''
        }));

        setSelectedQuestion({
            dimension,
            question,
            responses
        });
        setIsViewModalOpen(true);
    };

    const calculateAverageScore = (dimension: string) => {
        const target = personalPerformance.quarterlyTargets.find(t => t.quarter === quarter);
        const feedbackResponses = target?.feedbacks.filter(f => f.feedbackId === selectedFeedbackId) || [];
        const feedbackTemplate = feedbacks.find(f => f._id === selectedFeedbackId);

        if (!feedbackTemplate || feedbackResponses.length === 0) return '-';

        let totalScore = 0;
        let totalResponses = 0;

        // Get all questions for this dimension
        const dimensionQuestions = feedbackTemplate.dimensions
            .find(d => d.name === dimension)?.questions || [];

        // For each question in the dimension
        dimensionQuestions.forEach(question => {
            feedbackResponses.forEach(feedback => {
                const response = feedback.feedbacks.find(f =>
                    f.dimension === dimension && f.question === question
                );
                if (response?.response.score) {
                    totalScore += response.response.score;
                    totalResponses++;
                }
            });
        });

        if (totalResponses === 0) return '-';
        return (totalScore / totalResponses).toFixed(1);
    };

    const calculateFinalScore = () => {
        const feedbackOverallScore = calculateFeedbackOverallScore();
        const selectedFeedback = feedbacks.find(f => f._id === selectedFeedbackId);
        const contributionScorePercentage = selectedFeedback?.contributionScorePercentage || 0;
        const finalScore = (Number(feedbackOverallScore) * (contributionScorePercentage / 100)) + (Number(overallScore.score) * (1 - contributionScorePercentage / 100));
        return finalScore.toFixed(0);
    }

    if (!personalPerformance || !personalPerformance.quarterlyTargets) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="body1" color="textSecondary">
                    Loading...
                </Typography>
            </Box>
        );
    }

    if (feedbacks.length === 0) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="body1" color="textSecondary">
                    No feedback available for this quarter.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                {feedbacks.length > 0 ? (
                    <Select
                        value={selectedFeedbackId}
                        disabled={true}
                        fullWidth
                        sx={{ backgroundColor: '#fff' }}
                    >
                        {feedbacks.map(feedback => (
                            <MenuItem key={feedback._id} value={feedback._id}>
                                {feedback.name}
                            </MenuItem>
                        ))}
                    </Select>
                ) : (
                    <Select value="" displayEmpty disabled fullWidth sx={{ backgroundColor: '#fff' }}>
                        <MenuItem value="">No feedback available</MenuItem>
                    </Select>
                )}
            </Box>

            <Paper sx={{ mb: 3, boxShadow: 'none', border: '1px solid #E5E7EB' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledHeaderCell align="center">Name</StyledHeaderCell>
                            <StyledHeaderCell align="center">Category</StyledHeaderCell>
                            <StyledHeaderCell align="center">Status</StyledHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {personalPerformance.quarterlyTargets.find(target => target.quarter === quarter)?.feedbacks?.filter(f => f.feedbackId === selectedFeedbackId).map((feedback, index) => (
                            <TableRow key={index}>
                                <StyledTableCell>{feedback.provider.name}</StyledTableCell>
                                <StyledTableCell align="center">{feedback.provider.category}</StyledTableCell>
                                <StyledTableCell align="center">{feedback.provider.status}</StyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Paper sx={{ boxShadow: 'none', border: '1px solid #E5E7EB' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledHeaderCell align="center">Feedback Dimension</StyledHeaderCell>
                            <StyledHeaderCell align="center">Weight %</StyledHeaderCell>
                            <StyledHeaderCell align="center">Average Rating Score</StyledHeaderCell>
                            <StyledHeaderCell align="center">Feedback Question</StyledHeaderCell>
                            <StyledHeaderCell align="center">Feedback Response</StyledHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {feedbacks.find(f => f._id === selectedFeedbackId)?.dimensions.map((dimension, index) => {
                            return (
                                <React.Fragment key={index}>
                                    {dimension.questions.map((question, qIndex) => {
                                        const responses = feedbacks.find(f => f._id === selectedFeedbackId)?.responses.filter(r => r.response !== undefined);

                                        return (
                                            <TableRow key={`${dimension.index}-${qIndex}`}>
                                                {qIndex === 0 && (
                                                    <>
                                                        <StyledTableCell rowSpan={dimension.questions.length} align="center">
                                                            {dimension.name}
                                                        </StyledTableCell>
                                                        <StyledTableCell rowSpan={dimension.questions.length} align="center">
                                                            {dimension.weight}
                                                        </StyledTableCell>
                                                        <StyledTableCell rowSpan={dimension.questions.length} align="center">
                                                            {calculateAverageScore(dimension.name)}
                                                        </StyledTableCell>
                                                    </>
                                                )}
                                                <StyledTableCell align="center">{question}</StyledTableCell>
                                                <StyledTableCell align="center">
                                                    <ViewButton onClick={() => handleViewFeedback(dimension.name, question)}>VIEW</ViewButton>
                                                </StyledTableCell>
                                            </TableRow>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}

                        <TableRow>
                            <StyledTableCell colSpan={2} sx={{ fontWeight: 500 }}>
                                Overall 360 Degree Feedback Score
                            </StyledTableCell>
                            <StyledTableCell colSpan={3} align="center">
                                {calculateFeedbackOverallScore()}
                            </StyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>

            </Paper>

            <Paper sx={{ boxShadow: 'none', border: '1px solid #E5E7EB' }}>
                <Box sx={{ mt: 4 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <StyledHeaderCell>Overall Rating Score</StyledHeaderCell>
                                <StyledHeaderCell>Overall 360 Degree Feedback Score</StyledHeaderCell>
                                <StyledHeaderCell>Final Score</StyledHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <StyledTableCell>
                                    {overallScore.score} {overallScore.name}
                                </StyledTableCell>
                                <StyledTableCell>
                                    {calculateFeedbackOverallScore()}
                                </StyledTableCell>
                                <StyledTableCell>
                                    {calculateFinalScore()}
                                </StyledTableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            <Dialog
                open={isAddProviderOpen}
                onClose={handleAddProviderClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Add Feedback Provider
                        <IconButton onClick={handleAddProviderClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <RadioGroup
                            row
                            value={providerForm.type}
                            onChange={handleProviderTypeChange}
                            sx={{ mb: 2 }}
                        >
                            <FormControlLabel value="Internal" control={<Radio />} label="Internal" />
                            <FormControlLabel value="External" control={<Radio />} label="External" />
                        </RadioGroup>

                        {providerForm.type === 'Internal' ? (
                            <Autocomplete
                                options={organizationMembers}
                                getOptionLabel={(option) => `${option.name} (${option.email})`}
                                onChange={(_, newValue) => {
                                    if (newValue) {
                                        setProviderForm({
                                            ...providerForm,
                                            name: newValue.name,
                                            email: newValue.email
                                        });
                                        validateEmail(newValue.email);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        placeholder="Search people"
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                                sx={{ mb: 2 }}
                            />
                        ) : (
                            <>
                                <TextField
                                    fullWidth
                                    label="Name"
                                    value={providerForm.name}
                                    onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                                    required
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={providerForm.email}
                                    onChange={handleEmailChange}
                                    error={!!emailError}
                                    helperText={emailError}
                                    required
                                    sx={{ mb: 2 }}
                                />
                            </>
                        )}

                        <FormControl fullWidth>
                            <Select
                                value={providerForm.category}
                                onChange={(e) => setProviderForm({ ...providerForm, category: e.target.value as FeedbackProvider['category'] })}
                                required
                            >
                                <MenuItem value="Supervisor">Supervisor</MenuItem>
                                <MenuItem value="Direct Report">Direct Report</MenuItem>
                                <MenuItem value="Peer">Peer</MenuItem>
                                <MenuItem value="Self">Self</MenuItem>
                                <MenuItem value="Stakeholder">Stakeholder</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAddProviderClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveProvider}
                        disabled={!providerForm.name || !providerForm.email || !!emailError}
                        sx={{
                            backgroundColor: '#0078D4',
                            '&:hover': { backgroundColor: '#106EBE' },
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Feedback Modal */}
            <Dialog
                open={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h6">
                                Feedback Responses
                            </Typography>
                            <Typography variant="subtitle2" color="text.secondary">
                                {selectedQuestion?.question}
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setIsViewModalOpen(false)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedQuestion && (
                        <Box sx={{ mt: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <StyledHeaderCell>Response</StyledHeaderCell>
                                        <StyledHeaderCell>Reason</StyledHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedQuestion.responses.map((response, index) => (
                                        response.response.score !== 0 && <TableRow key={index}>
                                            <StyledTableCell>
                                                {response.response.score} - {response.response.response}
                                            </StyledTableCell>
                                            <StyledTableCell>{response.reason}</StyledTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setIsViewModalOpen(false)}
                        sx={{
                            color: '#374151',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.04)'
                            }
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PersonalFeedback;
