import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TextField, ClickAwayListener, IconButton, Link } from '@mui/material';
import { ExportButton } from '../../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { StyledHeaderCell, StyledTableCell } from '../../../../components/StyledTableComponents';
import { api } from '../../../../services/api';
import { exportPdf, exportExcel } from '../../../../utils/exportUtils';

interface LikelihoodSetting {
  _id: string;
  likelihoodName: string;
  description: string;
  score: number;
}

const LikelihoodSettings: React.FC = () => {
  const [likelihoodSettings, setLikelihoodSettings] = useState<LikelihoodSetting[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLikelihoodName, setNewLikelihoodName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newScore, setNewScore] = useState(0);
  const [editingLikelihoodId, setEditingLikelihoodId] = useState<string | null>(null);
  const [editingLikelihoodName, setEditingLikelihoodName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingScore, setEditingScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState('');
  const tableRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  const fetchLikelihoodSettings = async () => {
    try {
      const response = await api.get('/risk-likelihood-settings');
      setLikelihoodSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching risk likelihoodSettings:', error);
    }
  };

  useEffect(() => {
    fetchLikelihoodSettings();
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddLikelihoodSetting = async () => {
    if (newLikelihoodName.trim() && newDescription.trim()) {
      try {
        const response = await api.post('/risk-likelihood-settings', {
          likelihoodName: newLikelihoodName.trim(),
          description: newDescription.trim(),
          score: newScore
        });
        setLikelihoodSettings(prev => [...prev, response.data.data]);
        setNewLikelihoodName('');
        setNewDescription('');
        setNewScore(0);
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding risk likelihood:', error);
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewLikelihoodName('');
    setNewDescription('');
    setNewScore(0);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddLikelihoodSetting();
    }
  };

  const handleEditClick = (likelihood: LikelihoodSetting) => {
    setEditingLikelihoodId(likelihood._id);
    setEditingLikelihoodName(likelihood.likelihoodName);
    setEditingDescription(likelihood.description);
    setEditingScore(likelihood.score);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingLikelihoodId(null);
    setEditingLikelihoodName('');
    setEditingDescription('');
    setEditingScore(0);
  };

  const handleEditSave = async (likelihoodId: string) => {
    if (editingLikelihoodName.trim() && editingDescription.trim()) {
      try {
        const response = await api.put(`/risk-likelihood-settings/${likelihoodId}`, {
          likelihoodName: editingLikelihoodName.trim(),
          description: editingDescription.trim(),
          score: editingScore
        });
        setLikelihoodSettings(prev => prev.map(likelihood =>
          likelihood._id === likelihoodId ? response.data.data : likelihood
        ));
        setEditingLikelihoodId(null);
        setEditingLikelihoodName('');
        setEditingDescription('');
        setEditingScore(0);
      } catch (error) {
        console.error('Error updating risk likelihood:', error);
      }
    }
  };

  const handleEditKeyPress = (event: React.KeyboardEvent, likelihoodId: string) => {
    if (event.key === 'Enter') {
      handleEditSave(likelihoodId);
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDeleteArea = async (likelihoodId: string) => {
    try {
      await api.delete(`/risk-likelihood-settings/${likelihoodId}`);
      setLikelihoodSettings(prev => prev.filter(likelihood => likelihood._id !== likelihoodId));
    } catch (error) {
      console.error('Error deleting risk likelihood:', error);
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderDescription = (likelihood: LikelihoodSetting) => {
    if (isExporting) {
      // Always show full description for export
      return likelihood.description;
    }
    if (editingLikelihoodId === likelihood._id) {
      return (
        <TextField
          value={editingDescription}
          onChange={e => setEditingDescription(e.target.value)}
          fullWidth
          variant="standard"
          size="small"
        />
      );
    }

    const isExpanded = expandedDescriptions[likelihood._id];
    const shouldTruncate = likelihood.description.length > 100;
    const displayText = isExpanded
      ? likelihood.description
      : shouldTruncate
        ? likelihood.description.slice(0, 100) + '...'
        : likelihood.description;

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
            onClick={() => toggleDescription(likelihood._id)}
            sx={{ ml: 1, textDecoration: 'underline' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Link>
        )}
      </Box>
    );
  };

  // Filtered likelihoodSettings for search
  const filteredAreas = likelihoodSettings.filter(likelihood =>
    likelihood.likelihoodName.toLowerCase().includes(search.toLowerCase()) ||
    likelihood.description.toLowerCase().includes(search.toLowerCase()) ||
    likelihood.score.toString() === search.toString()
  );

  const handleExportPdf = () => {
    setExportType('pdf');
    setIsExporting(true);
  };

  const handleExportExcel = () => {
    setExportType('excel');
    setIsExporting(true);
  };

  useEffect(() => {
    if (isExporting && exportType) {
      const doExport = async () => {
        if (exportType === 'pdf') {
          await exportPdf(
            'risk-likelihood',
            tableRef,
            'Likelihood Settings',
            '',
            '',
            [0.3, 0.5, 0.2]
          );
        } else if (exportType === 'excel') {
          exportExcel(tableRef.current, 'Likelihood Settings');
        }
        setIsExporting(false);
        setExportType(null);
      };
      // Use setTimeout to ensure the DOM updates before export
      setTimeout(doExport, 0);
    }
  }, [isExporting, exportType]);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            sx={{ textTransform: 'none', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}>
            Add Likelihood Setting
          </Button>
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
          placeholder="Search by name or description"
          size="small"
          sx={{ width: 320 }}
        />
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto', mt: 2 }}>
        <Table ref={tableRef}>
          <TableHead>
            <TableRow>
              <StyledHeaderCell sx={{ width: '0.2vw' }}>Likelihood</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.4vw' }}>Description</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.2vw' }}>Score</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.2vw' }} align="center" className='noprint'>Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && (
              <ClickAwayListener onClickAway={handleCancelAdd}>
                <TableRow key="new-likelihood-row">
                  <StyledTableCell sx={{ width: '20%' }}>
                    <TextField
                      inputRef={inputRef}
                      value={newLikelihoodName}
                      onChange={e => setNewLikelihoodName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter likelihood name"
                      fullWidth
                      variant="standard"
                      onKeyDown={e => {
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                    />
                  </StyledTableCell>
                  <StyledTableCell sx={{ width: '40%' }}>
                    <TextField
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter description"
                      fullWidth
                      variant="standard"
                      onKeyDown={e => {
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                    />
                  </StyledTableCell>
                  <StyledTableCell sx={{ width: '20%' }}>
                    <TextField
                      value={newScore}
                      type='number'
                      onChange={e => setNewScore(Number(e.target.value))}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter Score"
                      fullWidth
                      variant="standard"
                      onKeyDown={e => {
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                    />
                  </StyledTableCell>
                  <StyledTableCell sx={{ width: '20%' }} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleAddLikelihoodSetting}
                        sx={{ fontSize: '0.75rem', padding: '4px 12px', minWidth: 'auto', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}
                      >
                        Add
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleCancelAdd}
                        sx={{ fontSize: '0.75rem', padding: '4px 12px', minWidth: 'auto' }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </StyledTableCell>
                </TableRow>
              </ClickAwayListener>
            )}
            {filteredAreas.map(likelihood => (
              <TableRow key={likelihood._id} hover>
                {editingLikelihoodId === likelihood._id ? (
                  <ClickAwayListener onClickAway={() => handleEditSave(likelihood._id)}>
                    <>
                      <StyledTableCell sx={{ width: '20%' }}>
                        <TextField
                          inputRef={editInputRef}
                          value={editingLikelihoodName}
                          onChange={e => setEditingLikelihoodName(e.target.value)}
                          fullWidth
                          variant="standard"
                          size="small"
                          autoFocus
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{ width: '40%' }}>
                        <TextField
                          value={editingDescription}
                          onChange={e => setEditingDescription(e.target.value)}
                          fullWidth
                          variant="standard"
                          size="small"
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{ width: '20%' }}>
                        <TextField
                          value={editingScore}
                          type='number'
                          onChange={e => setEditingScore(Number(e.target.value))}
                          fullWidth
                          variant="standard"
                          size="small"
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{ width: '20%' }} align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={() => handleEditSave(likelihood._id)}
                            sx={{ fontSize: '0.75rem', padding: '4px 12px', minWidth: 'auto', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handleEditCancel}
                            sx={{ fontSize: '0.75rem', padding: '4px 12px', minWidth: 'auto' }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </StyledTableCell>
                    </>
                  </ClickAwayListener>
                ) : (
                  <>
                    <StyledTableCell sx={{ width: '20%' }}>{likelihood.likelihoodName}</StyledTableCell>
                    <StyledTableCell sx={{ width: '40%' }}>{renderDescription(likelihood)}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }}>{likelihood.score}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" onClick={() => handleEditClick(likelihood)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteArea(likelihood._id)} size="small">
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </StyledTableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LikelihoodSettings;
