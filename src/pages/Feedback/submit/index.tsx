import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Table,
    TableHead,
    TableBody,
    TableRow,
    Button,
    IconButton,
    Paper,
    TextField,
    Container,
    Select,
    MenuItem,
    FormControl,
    Alert,
    Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useSearchParams } from 'react-router-dom';
import { publicApi } from '../../../services/api';
import { StyledTableCell, StyledHeaderCell } from '../../../components/StyledTableComponents';
import { PersonalQuarterlyTargetFeedback, PersonalQuarterlyTargetFeedbackProvider } from '../../../types';

interface FeedbackResponse {
    dimension: string;
    question: string;
    response: {
        score: number;
        response: string;
    };
    reason: string;
}

interface FeedbackDimension {
    name: string;
    weight: number;
    questions: string[];
}

interface FeedbackTemplate {
    name: string;
    dimensions: FeedbackDimension[];
    responses: {
        score: number;
        response: string;
    }[];
}

interface FeedbackData {
    feedbackTemplate: FeedbackTemplate;
    feedback: PersonalQuarterlyTargetFeedback[];
    provider: PersonalQuarterlyTargetFeedbackProvider;
}

const FeedbackSubmission = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');

    const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
    const [responses, setResponses] = useState<FeedbackResponse[]>([]);
    const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({});
    const [previousResponses, setPreviousResponses] = useState<FeedbackResponse[]>([]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showValidationAlert, setShowValidationAlert] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        if (id) {
            fetchFeedbackData();
        }
    }, [id]);

    const fetchFeedbackData = async () => {
        try {
            const response = await publicApi.get(`/submit-feedback/${id}`);
            if (response.data.status === 200) {
                setFeedbackData(response.data.data);
                // Initialize responses based on feedback dimensions
                const feedbackTemplate = response.data.data.feedbackTemplate.dimensions.flatMap(dimension =>
                    dimension.questions.map(question => ({
                        dimension: dimension.name,
                        question,
                        response: {
                            score: 0,
                            response: ''
                        },
                        reason: ''
                    }))
                ) as FeedbackResponse[];
                
                const initialResponses = response.data.data.feedback;
                initialResponses.forEach(response => {
                    const feedbackTemplateResponse = feedbackTemplate.find(template => template.dimension === response.dimension && template.question === response.question);
                    if (feedbackTemplateResponse) {
                        feedbackTemplateResponse.response.score = response.response.score;
                        feedbackTemplateResponse.response.response = response.response.response;
                        feedbackTemplateResponse.reason = response.reason;
                    }
                });
                setResponses(feedbackTemplate);
                setPreviousResponses(feedbackTemplate);
                setIsCompleted(response.data.data.provider.status === 'Completed');
            }
        } catch (error) {
            console.error('Error fetching feedback data:', error);
        }
    };

    const handleEdit = (dimensionName: string, questionIndex: number) => {
        const key = `${dimensionName}-${questionIndex}`;
        setPreviousResponses([...responses]);
        setIsEditing(prev => ({ ...prev, [key]: true }));
    };

    const handleCancel = (dimensionName: string, questionIndex: number) => {
        const key = `${dimensionName}-${questionIndex}`;
        setResponses(previousResponses);
        setIsEditing(prev => ({ ...prev, [key]: false }));
    };

    const handleSave = async (dimensionName: string, questionIndex: number) => {
        const key = `${dimensionName}-${questionIndex}`;
        setIsEditing(prev => ({ ...prev, [key]: false }));
    };

    const validateResponses = () => {
        const newErrors: { [key: string]: string } = {};
        let isValid = true;

        responses.forEach((response, index) => {
            const key = `${response.dimension}-${index}`;
            
            if (!response.response.score) {
                newErrors[`${key}-score`] = 'Response is required';
                isValid = false;
            }
            
            if (!response.reason.trim()) {
                newErrors[`${key}-reason`] = 'Reason is required';
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const isFormValid = () => {
        return responses.every(response =>
            response.response.score && response.reason.trim()
        );
    };

    const handleSubmit = async () => {
        if (!validateResponses()) {
            setShowValidationAlert(true);
            return;
        }

        try {
            const submissionData = {
                feedbackId: id,
                responses
            };

            const response = await publicApi.post('/submit-feedback', submissionData);
            
            if (response.data.status === 200) {
                // Show success message and close the window
                alert('Feedback submitted successfully!');
                window.close();
            } else {
                throw new Error(response.data.message || 'Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        }
    };

    if (!feedbackData) {
        return (
            <Box sx={{
                p: 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh'
            }}>
                <Typography variant="h6" color="text.secondary">Loading...</Typography>
            </Box>
        );
    }

    return (
        <Container maxWidth="xl">
            <Box sx={{
                p: 4,
                backgroundColor: '#fff',
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <Typography
                    variant="h5"
                    sx={{
                        mb: 4,
                        fontWeight: 600,
                        color: '#1F2937'
                    }}
                >
                    {feedbackData.feedbackTemplate.name}
                </Typography>

                {isCompleted && (
                    <Alert 
                        severity="info" 
                        sx={{ 
                            mb: 3,
                            '& .MuiAlert-message': {
                                fontSize: '0.875rem'
                            }
                        }}
                    >
                        This feedback has already been submitted and cannot be modified.
                    </Alert>
                )}

                <Collapse in={showValidationAlert}>
                    <Alert 
                        severity="error" 
                        onClose={() => setShowValidationAlert(false)}
                        sx={{ 
                            mb: 3,
                            '& .MuiAlert-message': {
                                fontSize: '0.875rem'
                            }
                        }}
                    >
                        Please complete all required fields before submitting. Required fields are marked with an error message.
                    </Alert>
                </Collapse>

                <Paper sx={{
                    mb: 4,
                    boxShadow: 'none',
                    border: '1px solid #E5E7EB',
                    borderRadius: 1,
                    overflow: 'hidden'
                }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                                <StyledHeaderCell width="20%">Feedback Dimension</StyledHeaderCell>
                                <StyledHeaderCell width="10%" align="center">Weight %</StyledHeaderCell>
                                <StyledHeaderCell width="20%">Feedback Question</StyledHeaderCell>
                                <StyledHeaderCell width="25%">Feedback Response</StyledHeaderCell>
                                <StyledHeaderCell width="15%">Feedback Reason</StyledHeaderCell>
                                <StyledHeaderCell width="10%" align="center">Action</StyledHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {feedbackData.feedbackTemplate.dimensions.map((dimension, dimIndex) => (
                                dimension.questions.map((question, qIndex) => {
                                    const key = `${dimension.name}-${qIndex}`;
                                    const response = responses.find(
                                        r => r.dimension === dimension.name && r.question === question
                                    );

                                    return (
                                        <TableRow
                                            key={key}
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: '#F9FAFB'
                                                }
                                            }}
                                        >
                                            {qIndex === 0 && (
                                                <>
                                                    <StyledTableCell
                                                        rowSpan={dimension.questions.length}
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#1F2937'
                                                        }}
                                                    >
                                                        {dimension.name}
                                                    </StyledTableCell>
                                                    <StyledTableCell
                                                        align="center"
                                                        rowSpan={dimension.questions.length}
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#1F2937'
                                                        }}
                                                    >
                                                        {dimension.weight}
                                                    </StyledTableCell>
                                                </>
                                            )}
                                            <StyledTableCell>{question}</StyledTableCell>
                                            <StyledTableCell>
                                                {isEditing[key] ? (
                                                    <FormControl 
                                                        fullWidth 
                                                        size="small"
                                                        error={!!errors[`${key}-score`]}
                                                    >
                                                        <Select
                                                            value={response?.response.score || 0}
                                                            onChange={(e) => {
                                                                const updatedResponses = responses.map(r =>
                                                                    r.dimension === dimension.name && r.question === question
                                                                        ? { 
                                                                            ...r, 
                                                                            response: { 
                                                                                response: feedbackData.feedbackTemplate.responses.find(resp => resp.score === e.target.value)?.response || '', 
                                                                                score: e.target.value as number 
                                                                            } 
                                                                        }
                                                                        : r
                                                                );
                                                                setResponses(updatedResponses);
                                                                // Clear error when value is selected
                                                                if (errors[`${key}-score`]) {
                                                                    setErrors(prev => {
                                                                        const newErrors = { ...prev };
                                                                        delete newErrors[`${key}-score`];
                                                                        return newErrors;
                                                                    });
                                                                }
                                                            }}
                                                            sx={{
                                                                '& .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: '#E5E7EB'
                                                                },
                                                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: '#D1D5DB'
                                                                },
                                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: '#0078D4'
                                                                },
                                                                height: '32px',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            <MenuItem value={0} sx={{ fontSize: '0.875rem' }}>
                                                                Select a response
                                                            </MenuItem>
                                                            {feedbackData.feedbackTemplate.responses.map((resp, index) => (
                                                                <MenuItem 
                                                                    key={index} 
                                                                    value={resp.score}
                                                                    sx={{ fontSize: '0.875rem' }}
                                                                >
                                                                    {resp.score} - {resp.response}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                        {errors[`${key}-score`] && (
                                                            <Typography 
                                                                variant="caption" 
                                                                color="error"
                                                                sx={{ 
                                                                    mt: 0.5,
                                                                    display: 'block'
                                                                }}
                                                            >
                                                                {errors[`${key}-score`]}
                                                            </Typography>
                                                        )}
                                                    </FormControl>
                                                ) : (
                                                    <Typography 
                                                        variant="body2" 
                                                        color={response?.response.score ? "text.primary" : "text.secondary"}
                                                        sx={{ 
                                                            minHeight: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        {feedbackData.feedbackTemplate.responses.find(
                                                            resp => resp.score === response?.response.score
                                                        )?.response || 'Not selected'}
                                                    </Typography>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                {isEditing[key] ? (
                                                    <TextField
                                                        fullWidth
                                                        multiline
                                                        rows={1}
                                                        size="small"
                                                        value={response?.reason || ''}
                                                        onChange={(e) => {
                                                            const updatedResponses = responses.map(r =>
                                                                r.dimension === dimension.name && r.question === question
                                                                    ? { ...r, reason: e.target.value }
                                                                    : r
                                                            );
                                                            setResponses(updatedResponses);
                                                            // Clear error when value is entered
                                                            if (errors[`${key}-reason`]) {
                                                                setErrors(prev => {
                                                                    const newErrors = { ...prev };
                                                                    delete newErrors[`${key}-reason`];
                                                                    return newErrors;
                                                                });
                                                            }
                                                        }}
                                                        error={!!errors[`${key}-reason`]}
                                                        helperText={errors[`${key}-reason`]}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                backgroundColor: '#fff',
                                                                fontSize: '0.875rem',
                                                                minHeight: '32px',
                                                                height: '32px'
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography 
                                                        variant="body2" 
                                                        color={response?.reason ? "text.primary" : "text.secondary"}
                                                        sx={{ 
                                                            minHeight: '32px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        {response?.reason || 'Not provided'}
                                                    </Typography>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell align="center">
                                                {isEditing[key] ? (
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleSave(dimension.name, qIndex)}
                                                            sx={{
                                                                color: '#4CAF50',
                                                                '&:hover': {
                                                                    backgroundColor: 'rgba(76, 175, 80, 0.08)'
                                                                }
                                                            }}
                                                        >
                                                            <CheckIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleCancel(dimension.name, qIndex)}
                                                            sx={{
                                                                color: '#F44336',
                                                                '&:hover': {
                                                                    backgroundColor: 'rgba(244, 67, 54, 0.08)'
                                                                }
                                                            }}
                                                        >
                                                            <CloseIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                ) : (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit(dimension.name, qIndex)}
                                                        sx={{
                                                            color: '#6B7280',
                                                            '&:hover': {
                                                                color: '#1F2937',
                                                                backgroundColor: 'rgba(0,0,0,0.04)'
                                                            }
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </StyledTableCell>
                                        </TableRow>
                                    );
                                })
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                <Box sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    mt: 4
                }}>
                    <Button
                        variant="outlined"
                        onClick={() => window.close()}
                        sx={{
                            borderColor: '#D1D5DB',
                            color: '#374151',
                            '&:hover': {
                                borderColor: '#9CA3AF',
                                backgroundColor: 'rgba(0,0,0,0.04)'
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isCompleted || !isFormValid()}
                        sx={{
                            backgroundColor: '#0078D4',
                            '&:hover': { 
                                backgroundColor: '#106EBE' 
                            },
                            boxShadow: 'none',
                            fontWeight: 600
                        }}
                    >
                        Submit
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default FeedbackSubmission; 