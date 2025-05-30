import React from 'react';
import { Box, Typography, Paper, Button, TableContainer, Table, TableHead, TableBody, TableRow } from '@mui/material';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { RootState } from '../../../store';
import { AnnualTarget, QuarterType } from '../../../types/annualCorporateScorecard';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EvidenceModal from '../../organization_performance/performance_evaluations/EvidenceModal';
import { api } from '../../../services/api';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';

// StrategyBlock: rounded box for each strategy
const StrategyBlock: React.FC<{ text: string; color?: string; onClick?: () => void }> = ({ text, color, onClick }) => (
    <Box
        sx={{
            border: '2px solid #1976d2',
            borderRadius: '16px',
            padding: 2,
            margin: 1,
            display: 'inline-block',
            minWidth: 220,
            textAlign: 'center',
            background: color ? color : '#fff',
            color: color ? '#fff' : undefined,
            cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
    >
        <Typography>{text}</Typography>
    </Box>
);

// PerspectiveBlock: section for each perspective
const PerspectiveBlock: React.FC<{ title: string; strategies: { id: number; text: string; color?: string; onClick?: () => void }[] }> = ({ title, strategies }) => (
    <Paper
        elevation={0}
        sx={{
            mb: 3,
            p: 2,
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: '#fafbfc',
        }}
    >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {title}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {strategies.map((s) => (
                <StrategyBlock key={s.id} text={s.text} color={s.color} onClick={s.onClick} />
            ))}
        </Box>
    </Paper>
);

interface StrategyMapProps {
    annualTargetId?: string;
    quarter?: QuarterType;
}

const StrategyMap: React.FC<StrategyMapProps> = ({ annualTargetId, quarter }) => {
    const [selectedObjective, setSelectedObjective] = React.useState<null | { name: string; kpis: any[] }>(null);
    const [evidenceModalOpen, setEvidenceModalOpen] = React.useState(false);
    const [selectedEvidence, setSelectedEvidence] = React.useState<any>(null);
    const [userInitiatives, setUserInitiatives] = React.useState<any[]>([]);
    const [loadingInitiatives, setLoadingInitiatives] = React.useState(false);

    // Get annual targets from store
    const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
    // Get all users' personal performances
    const personalPerformances = useAppSelector((state: RootState) => state.personalPerformance.personalPerformances);
    // Pick the selected annual target, or the first one if not provided
    const annualTarget: AnnualTarget | undefined =
        annualTargetId
            ? annualTargets.find((t) => t._id === annualTargetId)
            : annualTargets[0];

    // Build the strategy map data from perspectives and objectives
    const perspectives = annualTarget?.content.perspectives || [];
    const objectives = annualTarget?.content.quarterlyTarget.quarterlyTargets.find(q => q.quarter === quarter)?.objectives || [];
    const ratingScales = annualTarget?.content.ratingScales || [];

    // Helper to get color for a strategy (objective) from quarterly data, using average ratingScore
    const getObjectiveColor = (objectiveName: string): string | undefined => {
        if (!annualTarget || !quarter) return undefined;
        const quarterly = annualTarget.content.quarterlyTarget.quarterlyTargets.find(q => q.quarter === quarter);
        if (!quarterly) return undefined;
        const qObjective = quarterly.objectives.find(obj => obj.name === objectiveName);
        if (!qObjective || !qObjective.KPIs.length) return undefined;
        // Calculate average ratingScore
        const validScores = qObjective.KPIs.map(kpi => kpi.ratingScore).filter(score => typeof score === 'number' && !isNaN(score));
        if (!validScores.length) return undefined;
        const avgScore = Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
        const foundScale = ratingScales.find(scale => scale.score === avgScore);
        return foundScale?.color;
    };

    React.useEffect(() => {
        if (selectedObjective && annualTargetId && quarter) {
            setLoadingInitiatives(true);
            api.get('/personal-performance/objective-initiatives', {
                params: {
                    annualTargetId,
                    quarter,
                    objectiveName: selectedObjective.name,
                }
            })
                .then(res => {
                    setUserInitiatives(res.data.data)
                })
                .catch(() => setUserInitiatives([]))
                .finally(() => setLoadingInitiatives(false));
        } else {
            setUserInitiatives([]);
        }
    }, [selectedObjective, annualTargetId, quarter]);

    // If an objective is selected, show its KPIs and all users' initiatives
    if (selectedObjective) {
        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="outlined" onClick={() => setSelectedObjective(null)}>
                        BACK
                    </Button>
                </Box>
                <Typography variant="h6" sx={{ mb: 3, ml: 1 }}>
                    {selectedObjective.name}
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 3,
                        ml: 1,
                        justifyContent: { xs: 'center', sm: 'flex-start' },
                    }}
                >
                    {selectedObjective.kpis.map((kpi, idx) => (
                        <Paper
                            key={idx}
                            sx={{
                                p: 2,
                                mb: 2,
                                width: { xs: '100%', sm: 320, md: 340 },
                                minWidth: { xs: '100%', sm: 280 },
                                maxWidth: 400,
                                boxShadow: 'none',
                                border: '1px solid #E5E7EB',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                KPI: {kpi.indicator}
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                    Baseline <b>{kpi.baseline}</b>
                                </Typography>
                                <Typography variant="body2">
                                    Target <b>{kpi.target}</b>
                                </Typography>
                                <Typography variant="body2">
                                    Actual <b>{kpi.actualAchieved}</b>
                                </Typography>
                            </Box>
                            {typeof kpi.ratingScore === 'number' && !isNaN(kpi.ratingScore) && (
                                <Typography
                                    sx={{
                                        color: (() => {
                                            const foundScale = ratingScales.find(
                                                (scale) => scale.score === kpi.ratingScore
                                            );
                                            return foundScale?.color || 'black';
                                        })(),
                                        fontWeight: 500,
                                        mb: 1,
                                    }}
                                >
                                    {kpi.ratingScore} – {(() => {
                                        const foundScale = ratingScales.find(
                                            (scale) => scale.score === kpi.ratingScore
                                        );
                                        return foundScale
                                            ? `${foundScale.name} (Score Range: ${foundScale.min}-${foundScale.max})`
                                            : '';
                                    })()}
                                </Typography>
                            )}
                            {kpi.evidence && (
                                <Typography
                                    sx={{
                                        color: '#888',
                                        fontSize: 14,
                                        mt: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        setSelectedEvidence(kpi.evidence);
                                        setEvidenceModalOpen(true);
                                    }}
                                >
                                    <AttachFileIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                                    Evidence Attached
                                </Typography>
                            )}
                        </Paper>
                    ))}
                </Box>
                {/* All users' initiatives for this objective */}
                <Box sx={{ mt: 4 }}>
                    {loadingInitiatives ? (
                        <Typography color="text.secondary">Loading user initiatives...</Typography>
                    ) : userInitiatives.length === 0 ? (
                        <Typography color="text.secondary">No user initiatives found for this objective.</Typography>
                    ) : (
                        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <StyledHeaderCell>Initiative</StyledHeaderCell>
                                        <StyledHeaderCell align="center">Weight %</StyledHeaderCell>
                                        <StyledHeaderCell>Key Performance Indicator</StyledHeaderCell>
                                        <StyledHeaderCell align="center">Baseline</StyledHeaderCell>
                                        <StyledHeaderCell align="center">Target</StyledHeaderCell>
                                        <StyledHeaderCell align="center">Actual Achieved</StyledHeaderCell>
                                        <StyledHeaderCell align="center">Performance Rating Score</StyledHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {userInitiatives.map((initiative, iidx) =>
                                        initiative.KPIs.map((kpi, kidx) => (
                                            <TableRow key={`${initiative.initiativeName}-${kidx}`}>
                                                {kidx === 0 && (
                                                    <StyledTableCell rowSpan={initiative.KPIs.length}>
                                                        {initiative.initiativeName}
                                                    </StyledTableCell>
                                                )}
                                                <StyledTableCell align="center">{kpi.weight}</StyledTableCell>
                                                <StyledTableCell>{kpi.indicator}</StyledTableCell>
                                                <StyledTableCell align="center">{kpi.baseline}</StyledTableCell>
                                                <StyledTableCell align="center">{kpi.target}</StyledTableCell>
                                                <StyledTableCell align="center">{kpi.actualAchieved}</StyledTableCell>
                                                <StyledTableCell align="center" sx={{
                                                    color: (() => {
                                                        const foundScale = ratingScales.find(
                                                            (scale) => scale.score === kpi.ratingScore
                                                        );
                                                        return foundScale?.color || 'black';
                                                    })(), fontWeight: 500
                                                }}>
                                                    {typeof kpi.ratingScore === 'number' && !isNaN(kpi.ratingScore) ? (
                                                        `${kpi.ratingScore} ${(() => {
                                                            const foundScale = ratingScales.find(
                                                                (scale) => scale.score === kpi.ratingScore
                                                            );
                                                            return foundScale
                                                                ? `${foundScale.name} (Score Range: ${foundScale.min}-${foundScale.max})`
                                                                : '';
                                                        })()}`
                                                    ) : ''}
                                                </StyledTableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
                <EvidenceModal
                    open={evidenceModalOpen}
                    onClose={() => setEvidenceModalOpen(false)}
                    evidence={selectedEvidence}
                    attachments={selectedEvidence?.attachments || []}
                />
            </Box>
        );
    }

    // Build the strategy map data with click handlers
    const strategyMapData = perspectives.map((perspective) => ({
        perspective: perspective.name,
        strategies: objectives
            .filter((obj) => obj.perspectiveId === perspective.index)
            .map((obj, idx) => ({
                id: idx + 1,
                text: obj.name,
                color: getObjectiveColor(obj.name),
                onClick: () => setSelectedObjective({ name: obj.name, kpis: obj.KPIs }),
            })),
    }));

    return (
        <Box>
            {strategyMapData.map((perspective) => (
                <PerspectiveBlock
                    key={perspective.perspective}
                    title={perspective.perspective}
                    strategies={perspective.strategies}
                />
            ))}
        </Box>
    );
};

export default StrategyMap;