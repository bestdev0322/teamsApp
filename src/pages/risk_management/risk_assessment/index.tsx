import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Chip,
    Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { Risk } from '../risk_identification/identificationModal'; // Reusing Risk interface
import { exportPdf } from '../../../utils/exportPdf';
import { exportExcel } from '../../../utils/exportExcel';
import { ExportButton } from '../../../components/Buttons';
import { ReviewModal } from './reviewModal'; // New modal for review

interface RiskCategory {
    _id: string;
    categoryName: string;
    description: string;
}

interface RiskRating {
    _id: string;
    rating: string;
    minScore: number;
    maxScore: number;
    color: string;
}

const RiskAssessment: React.FC = () => {
    const { user } = useAuth();
    const [risks, setRisks] = useState<Risk[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedRiskForReview, setSelectedRiskForReview] = useState<Risk | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([]);
    const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
    const [isExporting, setIsExporting] = useState(false);
    const tableRef = useRef<any>(null);
    const [riskRatings, setRiskRatings] = useState<RiskRating[]>([]);

    useEffect(() => {
        fetchRisks();
        fetchRiskCategories();
        fetchRiskRatings();
    }, [user?.tenantId]);

    const fetchRisks = async () => {
        try {
            const response = await api.get(`/risks`);
            if (response.status === 200) {
                setRisks(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching risks:', error);
        }
    };

    const fetchRiskCategories = async () => {
        try {
            const response = await api.get('/risk-categories');
            if (response.status === 200) {
                setRiskCategories(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching risk categories:', error);
        }
    };

    const fetchRiskRatings = async () => {
        try {
            const response = await api.get('/risk-ratings');
            if (response.status === 200) {
                setRiskRatings(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching risk ratings:', error);
        }
    };

    const handleReviewClick = (risk: Risk) => {
        setSelectedRiskForReview(risk);
        setIsReviewModalOpen(true);
    };

    const handleSaveAssessment = async (riskId: string, impact: string, likelihood: string, riskResponse: string) => {
        try {
            // Make API call to update the risk with assessment data
            const response = await api.put(`/risks/assessment/${riskId}`, { impact, likelihood, riskResponse });
            if (response.status === 200) {
                fetchRisks(); // Refresh risks after saving assessment
            }
        } catch (error) {
            console.error('Error saving risk assessment:', error);
        }
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleCategoryChange = (event: SelectChangeEvent<string>) => {
        setSelectedCategory(event.target.value);
    };

    const toggleDescription = (id: string) => {
        setExpandedDescriptions(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const renderDescription = (description: string, id: string) => {
        if (isExporting) {
            return description;
        }

        const isExpanded = expandedDescriptions[id];
        const shouldTruncate = description.length > 100;
        const displayText = isExpanded
            ? description
            : shouldTruncate
                ? description.slice(0, 100) + '...'
                : description;

        return (
            <Box sx={{
                width: '100%',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
            }}>
                {displayText}
                {shouldTruncate && (
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => toggleDescription(id)}
                        sx={{ ml: 1, textDecoration: 'underline' }}
                    >
                        {isExpanded ? 'Show less' : 'Show more'}
                    </Link>
                )}
            </Box>
        );
    };

    const calculateInherentRisk = (impactScore: number, likelihoodScore: number): { name: string; color: string } | null => {
        const score = impactScore * likelihoodScore;
        const rating = riskRatings.find(r => score >= r.minScore && score <= r.maxScore);
        return rating ? { name: rating.rating, color: rating.color } : null;
    };

    const filteredRisks = risks.filter(risk => {
        const inherentRisk = risk.impact?.score && risk.likelihood?.score 
            ? calculateInherentRisk(risk.impact.score, risk.likelihood.score)
            : null;
        const inherentRiskText = inherentRisk ? `${risk.impact.score * risk.likelihood.score}-${inherentRisk.name}` : '';

        const matchesSearch = risk?.riskNameElement.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.strategicObjective.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.riskCategory?.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.riskDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.cause.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.effectImpact.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.riskOwner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.impact?.impactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.likelihood?.likelihoodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            risk?.riskResponse?.responseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inherentRiskText.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === 'all' || (risk.riskCategory && risk.riskCategory._id === selectedCategory);
        return matchesSearch && matchesCategory;
    }).filter(risk => risk.status === 'Active'); // Simple sort by no for now

    const handleExportPdf = async () => {
        if (!tableRef.current || filteredRisks.length === 0) {
            console.error('No data to export');
            return;
        }
        setIsExporting(true);
        const pdfColumnWidths = [0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05, 0.05, 0.05]; // Match the number of visible columns
        try {
            // Delay export to allow re-rendering with full descriptions
            setTimeout(() => {
                exportPdf(
                    'risk-assessment',
                    tableRef,
                    'Risk Assessment',
                    '',
                    '',
                    pdfColumnWidths
                );
                setIsExporting(false); // Reset after export
            }, 100); // Increased timeout to ensure data is loaded
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setIsExporting(false);
        }
    };

    const handleExportExcel = async () => {
        if (!tableRef.current || filteredRisks.length === 0) {
            console.error('No data to export');
            return;
        }
        setIsExporting(true);
        try {
            // Delay export to allow re-rendering with full descriptions
            setTimeout(() => {
                exportExcel(tableRef.current, 'Risk Assessment');
                setIsExporting(false); // Reset after export
            }, 100); // Increased timeout to ensure data is loaded
        } catch (error) {
            console.error('Error exporting Excel:', error);
            setIsExporting(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <FormControl size="small" sx={{ width: 200 }}>
                        <InputLabel>Risk Category</InputLabel>
                        <Select
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                            label="Risk Category"
                        >
                            <MenuItem value="all">All</MenuItem>
                            {riskCategories.map((category) => (
                                <MenuItem key={category._id} value={category._id}>
                                    {category.categoryName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <ExportButton
                        className="excel"
                        onClick={handleExportExcel}
                        size="small"
                        disabled={isExporting}
                    >
                        Export to Excel
                    </ExportButton>
                    <ExportButton
                        className="pdf"
                        onClick={handleExportPdf}
                        size="small"
                        disabled={isExporting}
                    >
                        Export to PDF
                    </ExportButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                    <TextField
                        label="Search"
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        sx={{ width: 300 }}
                    />
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table ref={tableRef}>
                    <TableHead>
                        <TableRow>
                            <TableCell>No.</TableCell>
                            <TableCell>Risk Name/Element</TableCell>
                            <TableCell>Strategic/Operational Objective</TableCell>
                            <TableCell>Risk Category</TableCell>
                            <TableCell>Risk Description</TableCell>
                            <TableCell>Cause</TableCell>
                            <TableCell>Effect/Impact</TableCell>
                            <TableCell>Risk Owner</TableCell>
                            <TableCell>Impact</TableCell>
                            <TableCell>Likelihood</TableCell>
                            <TableCell>Inherent Risk</TableCell>
                            <TableCell>Risk Response</TableCell>
                            <TableCell className='noprint'>Review</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredRisks.map((risk, index) => (
                            <TableRow key={risk._id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{risk.riskNameElement}</TableCell>
                                <TableCell>{risk.strategicObjective}</TableCell>
                                <TableCell>{risk.riskCategory?.categoryName || ''}</TableCell>
                                <TableCell>
                                    {isExporting ? risk.riskDescription : renderDescription(risk.riskDescription, risk._id)}
                                </TableCell>
                                <TableCell>{risk.cause}</TableCell>
                                <TableCell>{risk.effectImpact}</TableCell>
                                <TableCell>{risk.riskOwner?.name || ''}</TableCell>
                                <TableCell>{risk.impact?.impactName || ''}</TableCell>
                                <TableCell>{risk.likelihood?.likelihoodName || ''}</TableCell>
                                <TableCell>
                                    {risk.impact?.score && risk.likelihood?.score ? (
                                        <Box>
                                            {(() => {
                                                const inherentRisk = calculateInherentRisk(risk.impact.score, risk.likelihood.score);
                                                return inherentRisk ? (
                                                    <Typography
                                                        sx={{
                                                            color: inherentRisk.color,
                                                            fontWeight: 'bold',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        {risk.impact.score * risk.likelihood.score}-{inherentRisk.name}
                                                    </Typography>
                                                ) : (
                                                    <Typography color="error">Invalid Score</Typography>
                                                );
                                            })()}
                                        </Box>
                                    ) : (
                                        <Typography color="text.secondary">N/A</Typography>
                                    )}
                                </TableCell>
                                <TableCell>{risk.riskResponse?.responseName || ''}</TableCell>
                                <TableCell className='noprint'>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => handleReviewClick(risk)}
                                    >
                                        Review
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSave={handleSaveAssessment}
                risk={selectedRiskForReview}
            />
        </Box>
    );
};

export default RiskAssessment;
