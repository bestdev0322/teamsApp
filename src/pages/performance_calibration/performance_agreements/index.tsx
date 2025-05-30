import { useAppSelector } from '../../../hooks/useAppSelector';
import { RootState } from '../../../store';
import { AnnualTarget, QuarterType } from '../../../types/annualCorporateScorecard';
import { Box, Button, InputLabel, MenuItem, Select, styled, FormControl, SelectChangeEvent } from '@mui/material';
import React, { useState } from 'react';
import AgreementsTable from './agreements_table';
import { api } from '../../../services/api';
import PersonalQuarterlyTarget from './PersonalQuarterlyTarget';
import { enableTwoQuarterMode, isEnabledTwoQuarterMode } from '../../../utils/quarterMode';
import { useAuth } from '../../../contexts/AuthContext';
const StyledFormControl = styled(FormControl)({
    backgroundColor: '#fff',
    borderRadius: '8px',
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: '#E5E7EB',
        },
        '&:hover fieldset': {
            borderColor: '#D1D5DB',
        },
    },
});

const ViewButton = styled(Button)({
    backgroundColor: '#0078D4',
    color: 'white',
    textTransform: 'none',
    padding: '6px 16px',
    '&:hover': {
        backgroundColor: '#106EBE',
    },
});

export interface AgreementRow {
    userId: string;
    fullName: string;
    jobTitle: string;
    team: string;
    status: string;
    pmCommitteeStatus: string;
}

const PerformanceAgreements: React.FC = () => {
    const [selectedAnnualTargetId, setSelectedAnnualTargetId] = useState<string>('');
    const [selectedQuarter, setSelectedQuarter] = useState<QuarterType | ''>('');
    const [showTable, setShowTable] = useState(false);
    const [agreements, setAgreements] = useState<AgreementRow[]>([]);
    const [viewingUser, setViewingUser] = useState<AgreementRow | null>(null);
    const { user } = useAuth();
    const annualTargets = useAppSelector((state: RootState) => state.scorecard.annualTargets);
    const selectedAnnualTarget: AnnualTarget | undefined = useAppSelector((state: RootState) =>
        state.scorecard.annualTargets.find(target => target._id === selectedAnnualTargetId)
    );

    const handleView = async () => {
        try {
            const response = await api.get('/personal-performance/manage-performance-agreement/company-users', {
                params: {
                    annualTargetId: selectedAnnualTargetId,
                    quarter: selectedQuarter,
                },
            });

            if (!response.data?.data || response.data.data.length === 0) {
                setAgreements([]);
                setShowTable(true);
                return;
            }

            const mapped: AgreementRow[] = response.data.data
                .map((user: any) => ({
                    userId: user.id,
                    fullName: user.name,
                    jobTitle: user.position,
                    team: user.team,
                    status: user.agreementStatus,
                    pmCommitteeStatus: user.agreementReviewStatus || 'Not Reviewed',
                }));

            setAgreements(mapped);
            setShowTable(true);
        } catch (e) {
            setAgreements([]);
            setShowTable(true);
        }
    };

    const handleTableView = (row: AgreementRow) => {
        setViewingUser(row);
    };

    const handleBack = () => {
        setViewingUser(null);
        handleView();
    };

    const handleQuarterChange = (event: SelectChangeEvent) => {
        setSelectedQuarter(event.target.value as QuarterType);
        setShowTable(false);
        setViewingUser(null);
    }

    const handleScorecardChange = (event: SelectChangeEvent) => {
        setSelectedAnnualTargetId(event.target.value as string);
        setShowTable(false);
        setViewingUser(null);
      };

    return (
        <Box sx={{ p: 2, backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
            <Box sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' }
            }}>
                <StyledFormControl fullWidth>
                    <InputLabel>Annual Corporate Scorecard</InputLabel>
                    <Select
                        value={selectedAnnualTargetId}
                        label="Annual Corporate Scorecard"
                        onChange={handleScorecardChange}
                    >
                        {annualTargets.map((target) => (
                            <MenuItem key={target._id} value={target._id}>
                                {target.name}
                            </MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>

                <StyledFormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                    <InputLabel>Quarter</InputLabel>
                    <Select
                        value={selectedQuarter}
                        label="Quarter"
                        onChange={handleQuarterChange}
                    >
                        {selectedAnnualTarget && enableTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
                            quarter.editable
                        )).map((quarter) => (
                            quarter.quarter
                        )), user?.isTeamOwner || user?.role === 'SuperUser').map((quarter) => (
                            <MenuItem key={quarter.key} value={quarter.key}>
                                {quarter.alias}
                            </MenuItem>
                        ))}
                    </Select>
                </StyledFormControl>

                <ViewButton
                    variant="contained"
                    disabled={!selectedAnnualTargetId || !selectedQuarter}
                    onClick={handleView}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                    View
                </ViewButton>
            </Box>
            {showTable && !viewingUser && (
                agreements.length > 0 ? (
                    <AgreementsTable data={agreements} onView={handleTableView} />
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        No approved agreements found for the selected criteria.
                    </Box>
                )
            )}
            {viewingUser && (
                <PersonalQuarterlyTarget
                    annualTarget={selectedAnnualTarget!}
                    quarter={selectedQuarter as QuarterType}
                    userId={viewingUser.userId}
                    userName={viewingUser.fullName}
                    onBack={handleBack}
                    initialPmCommitteeStatus={viewingUser.pmCommitteeStatus as 'Not Reviewed' | 'Reviewed' | 'Send Back'}
                    isEnabledTwoQuarterMode={isEnabledTwoQuarterMode(selectedAnnualTarget?.content.quarterlyTarget.quarterlyTargets.filter((quarter) => (
                        quarter.editable
                    )).map((quarter) => (
                        quarter.quarter
                    )), user?.isTeamOwner || user?.role === 'SuperUser')}
                />
            )}
        </Box>
    );
};

export default PerformanceAgreements;
