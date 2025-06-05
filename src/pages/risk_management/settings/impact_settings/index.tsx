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

interface ImpactSetting {
  _id: string;
  impactName: string;
  description: string;
  score: number;
}

const ImpactSettings: React.FC = () => {
  const [impactSettings, setImpackSettings] = useState<ImpactSetting[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newImpactName, setNewImpactName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newScore, setNewScore] = useState(0);
  const [editingImpactId, setEditingImpactId] = useState<string | null>(null);
  const [editingImpactName, setEditingImpactName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingScore, setEditingScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState('');
  const tableRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  const fetchImpactSettings = async () => {
    try {
      const response = await api.get('/risk-impact-settings');
      setImpackSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching risk impactSettings:', error);
    }
  };

  useEffect(() => {
    fetchImpactSettings();
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddImpactSetting = async () => {
    if (newImpactName.trim() && newDescription.trim()) {
      try {
        const response = await api.post('/risk-impact-settings', {
          impactName: newImpactName.trim(),
          description: newDescription.trim(),
          score: newScore
        });
        setImpackSettings(prev => [...prev, response.data.data]);
        setNewImpactName('');
        setNewDescription('');
        setNewScore(0);
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding risk impact:', error);
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewImpactName('');
    setNewDescription('');
    setNewScore(0);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddImpactSetting();
    }
  };

  const handleEditClick = (impact: ImpactSetting) => {
    setEditingImpactId(impact._id);
    setEditingImpactName(impact.impactName);
    setEditingDescription(impact.description);
    setEditingScore(impact.score);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingImpactId(null);
    setEditingImpactName('');
    setEditingDescription('');
    setEditingScore(0);
  };

  const handleEditSave = async (impactId: string) => {
    if (editingImpactName.trim() && editingDescription.trim()) {
      try {
        const response = await api.put(`/risk-impact-settings/${impactId}`, {
          impactName: editingImpactName.trim(),
          description: editingDescription.trim(),
          score: editingScore
        });
        setImpackSettings(prev => prev.map(impact =>
          impact._id === impactId ? response.data.data : impact
        ));
        setEditingImpactId(null);
        setEditingImpactName('');
        setEditingDescription('');
        setEditingScore(0);
      } catch (error) {
        console.error('Error updating risk impact:', error);
      }
    }
  };

  const handleEditKeyPress = (event: React.KeyboardEvent, impactId: string) => {
    if (event.key === 'Enter') {
      handleEditSave(impactId);
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDeleteArea = async (impactId: string) => {
    try {
      await api.delete(`/risk-impact-settings/${impactId}`);
      setImpackSettings(prev => prev.filter(impact => impact._id !== impactId));
    } catch (error) {
      console.error('Error deleting risk impact:', error);
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderDescription = (impact: ImpactSetting) => {
    if (isExporting) {
      // Always show full description for export
      return impact.description;
    }
    if (editingImpactId === impact._id) {
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

    const isExpanded = expandedDescriptions[impact._id];
    const shouldTruncate = impact.description.length > 100;
    const displayText = isExpanded
      ? impact.description
      : shouldTruncate
        ? impact.description.slice(0, 100) + '...'
        : impact.description;

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
            onClick={() => toggleDescription(impact._id)}
            sx={{ ml: 1, textDecoration: 'underline' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Link>
        )}
      </Box>
    );
  };

  // Filtered impactSettings for search
  const filteredAreas = impactSettings.filter(impact =>
    impact.impactName.toLowerCase().includes(search.toLowerCase()) ||
    impact.description.toLowerCase().includes(search.toLowerCase()) ||
    impact.score.toString() === search.toString()
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
            'risk-impact',
            tableRef,
            'Impact Settings',
            '',
            '',
            [0.3, 0.5, 0.2]
          );
        } else if (exportType === 'excel') {
          exportExcel(tableRef.current, 'Impact Settings');
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
            Add Impact Setting
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
              <StyledHeaderCell sx={{ width: '0.2vw' }}>Impact</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.4vw' }}>Description</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.2vw' }}>Score</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.2vw' }} align="center" className='noprint'>Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && (
              <ClickAwayListener onClickAway={handleCancelAdd}>
                <TableRow key="new-impact-row">
                  <StyledTableCell sx={{ width: '20%' }}>
                    <TextField
                      inputRef={inputRef}
                      value={newImpactName}
                      onChange={e => setNewImpactName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter impact name"
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
                        onClick={handleAddImpactSetting}
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
            {filteredAreas.map(impact => (
              <TableRow key={impact._id} hover>
                {editingImpactId === impact._id ? (
                  <ClickAwayListener onClickAway={() => handleEditSave(impact._id)}>
                    <>
                      <StyledTableCell sx={{ width: '20%' }}>
                        <TextField
                          inputRef={editInputRef}
                          value={editingImpactName}
                          onChange={e => setEditingImpactName(e.target.value)}
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
                            onClick={() => handleEditSave(impact._id)}
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
                    <StyledTableCell sx={{ width: '20%' }}>{impact.impactName}</StyledTableCell>
                    <StyledTableCell sx={{ width: '40%' }}>{renderDescription(impact)}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }}>{impact.score}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" onClick={() => handleEditClick(impact)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteArea(impact._id)} size="small">
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

export default ImpactSettings;
