import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  styled,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Company } from '../../types';
import { companyAPI } from '../../services/api';
import { api } from '../../services/api';
import { StyledTableCell, StyledHeaderCell } from '../../components/StyledTableComponents';

const ViewButton = styled(Button)({
  textTransform: 'none',
  backgroundColor: '#fff',
  color: '#0078D4',
  border: '1px solid #0078D4',
  '&:hover': {
    backgroundColor: '#f8f9fa',
  },
});

interface ModuleRow {
  id: string;
  name: string;
  isExpanded: boolean;
  companies: Company[];
}

const Modules: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [feedbackCompanyIds, setFeedbackCompanyIds] = useState<string[]>([]);
  const [pmCommitteeCompanyIds, setPmCommitteeCompanyIds] = useState<string[]>([]);
  const [complianceCompanyIds, setComplianceCompanyIds] = useState<string[]>([]);
  const [riskCompanyIds, setRiskCompanyIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCompanies();
    fetchFeedbackCompanies();
    fetchPmCommitteeCompanies();
    fetchComplianceCompanies();
    fetchRiskCompanies();
    const fetchModules = async () => {
      const response = await api.get('/module');
      setModules(
        response.data.data.map((mod: any, index: number) => ({
          id: (index + 1).toString(),
          name: mod.description,
          isExpanded: false,
          companies: [],
        }))
      );
    };
    fetchModules();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await companyAPI.getAll();
      setCompanies(response.data.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchFeedbackCompanies = async () => {
    try {
      const response = await api.get('/module/Feedback/companies');
      if (response.status === 200) {
        setFeedbackCompanyIds(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching feedback companies:', error);
    }
  };

  const fetchPmCommitteeCompanies = async () => {
    try {
      const response = await api.get('/module/PerformanceCalibration/companies');
      if (response.status === 200) {
        setPmCommitteeCompanyIds(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Performance Calibration companies:', error);
    }
  };

  const fetchComplianceCompanies = async () => {
    try {
      const response = await api.get('/module/Compliance/companies');
      if (response.status === 200) {
        setComplianceCompanyIds(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Compliance companies:', error);
    }
  };

  const fetchRiskCompanies = async () => {
    try {
      const response = await api.get('/module/Risk/companies');
      if (response.status === 200) {
        setRiskCompanyIds(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Risk companies:', error);
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setModules(modules.map(module =>
      module.id === moduleId
        ? { ...module, isExpanded: !module.isExpanded }
        : module
    ));
  };

  const handleCompanySelection = async (companyId: string, moduleId: string) => {
    if (moduleId === '1') {
      const isChecked = feedbackCompanyIds.some(fc => fc === companyId);
      const newFeedbackCompanyIds = isChecked ? feedbackCompanyIds.filter(fc => fc !== companyId) : [...feedbackCompanyIds, companyId];
      try {
        console.log(newFeedbackCompanyIds, 'newFeedbackCompanyIds');
        const response = await api.post(`/module/Feedback/companies`, { companies: newFeedbackCompanyIds });
        if (response.status === 200) {
          setFeedbackCompanyIds(newFeedbackCompanyIds);
        }
      } catch (error) {
        console.error('Error updating feedback companies:', error);
      }
    } else if (moduleId === '2') {
      const isChecked = pmCommitteeCompanyIds.some(fc => fc === companyId);
      const newPmCommitteeCompanyIds = isChecked ? pmCommitteeCompanyIds.filter(fc => fc !== companyId) : [...pmCommitteeCompanyIds, companyId];
      try {
        const response = await api.post(`/module/PerformanceCalibration/companies`, { companies: newPmCommitteeCompanyIds });
        if (response.status === 200) {
          setPmCommitteeCompanyIds(newPmCommitteeCompanyIds);
        }
      } catch (error) {
        console.error('Error updating Performance Calibration companies:', error);
      }
    } else if (moduleId === '3') {
      const isChecked = complianceCompanyIds.some(fc => fc === companyId);
      const newComplianceCompanyIds = isChecked ? complianceCompanyIds.filter(fc => fc !== companyId) : [...complianceCompanyIds, companyId];
      try {
        const response = await api.post(`/module/Compliance/companies`, { companies: newComplianceCompanyIds });
        if (response.status === 200) {
          setComplianceCompanyIds(newComplianceCompanyIds);
        }
      } catch (error) {
        console.error('Error updating Compliance companies:', error);
      }
    } else if (moduleId === '4') {
      const isChecked = riskCompanyIds.some(fc => fc === companyId);
      const newRiskCompanyIds = isChecked ? riskCompanyIds.filter(fc => fc !== companyId) : [...riskCompanyIds, companyId];
      try {
        const response = await api.post(`/module/Risk/companies`, { companies: newRiskCompanyIds });
        if (response.status === 200) {
          setRiskCompanyIds(newRiskCompanyIds);
        }
      } catch (error) {
        console.error('Error updating Risk companies:', error);
      }
    }
  };

  const CheckCompanies = (moduleId, companyId) => {
    switch (moduleId) {
      case '1': {
        return feedbackCompanyIds.some(fc => fc === companyId)
      }
      case '2': {
        return pmCommitteeCompanyIds.some(pc => pc === companyId)
      }
      case '3': {
        return complianceCompanyIds.some(cc => cc === companyId)
      }
      case '4': {
        return riskCompanyIds.some(cc => cc === companyId)
      }
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search module..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            backgroundColor: '#fff',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#E5E7EB',
              },
              '&:hover fieldset': {
                borderColor: '#D1D5DB',
              },
            },
          }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #E5E7EB' }}>
        <Table>
          <TableHead>
            <TableRow>
              <StyledHeaderCell>MODULE</StyledHeaderCell>
              <StyledHeaderCell align="right">Add Company</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((module) => (
              <React.Fragment key={module.id}>
                <TableRow>
                  <StyledTableCell
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleModuleExpansion(module.id)}
                  >
                    {module.isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    {module.name}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    <ViewButton
                      variant="outlined"
                      size="small"
                      onClick={() => toggleModuleExpansion(module.id)}
                    >
                      VIEW
                    </ViewButton>
                  </StyledTableCell>
                </TableRow>
                {module.isExpanded && companies.map((company) => (
                  <TableRow key={company._id}>
                    <StyledTableCell sx={{ pl: 8 }}>{company.name}</StyledTableCell>
                    <StyledTableCell align="right">
                      <Checkbox
                        checked={CheckCompanies(module.id, company._id)}
                        onChange={() => handleCompanySelection(company._id, module.id)}
                      />
                    </StyledTableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Modules; 