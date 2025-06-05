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

interface ControlEffectiveness {
  _id: string;
  controlEffectiveness: string;
  description: string;
  factor: number;
}

const ControlEffectivenessSettings: React.FC = () => {
  const [settings, setSettings] = useState<ControlEffectiveness[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newControlEffectiveness, setNewControlEffectiveness] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFactor, setNewFactor] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingControlEffectiveness, setEditingControlEffectiveness] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingFactor, setEditingFactor] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState('');
  const tableRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/risk-control-effectiveness');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching control effectiveness settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddSetting = async () => {
    if (newControlEffectiveness.trim() && newDescription.trim() && newFactor >= 0) {
      try {
        const response = await api.post('/risk-control-effectiveness', {
          controlEffectiveness: newControlEffectiveness.trim(),
          description: newDescription.trim(),
          factor: newFactor
        });
        setSettings(prev => [...prev, response.data.data]);
        setNewControlEffectiveness('');
        setNewDescription('');
        setNewFactor(0);
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding control effectiveness setting:', error);
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewControlEffectiveness('');
    setNewDescription('');
    setNewFactor(0);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddSetting();
    }
  };

  const handleEditClick = (setting: ControlEffectiveness) => {
    setEditingId(setting._id);
    setEditingControlEffectiveness(setting.controlEffectiveness);
    setEditingDescription(setting.description);
    setEditingFactor(setting.factor);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingControlEffectiveness('');
    setEditingDescription('');
    setEditingFactor(0);
  };

  const handleEditSave = async (id: string) => {
    if (editingControlEffectiveness.trim() && editingDescription.trim() && editingFactor >= 0) {
      try {
        const response = await api.put(`/risk-control-effectiveness/${id}`, {
          controlEffectiveness: editingControlEffectiveness.trim(),
          description: editingDescription.trim(),
          factor: editingFactor
        });
        setSettings(prev => prev.map(setting =>
          setting._id === id ? response.data.data : setting
        ));
        setEditingId(null);
        setEditingControlEffectiveness('');
        setEditingDescription('');
        setEditingFactor(0);
      } catch (error) {
        console.error('Error updating control effectiveness setting:', error);
      }
    }
  };

  const handleEditKeyPress = (event: React.KeyboardEvent, id: string) => {
    if (event.key === 'Enter') {
      handleEditSave(id);
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDeleteSetting = async (id: string) => {
    try {
      await api.delete(`/risk-control-effectiveness/${id}`);
      setSettings(prev => prev.filter(setting => setting._id !== id));
    } catch (error) {
      console.error('Error deleting control effectiveness setting:', error);
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderDescription = (setting: ControlEffectiveness) => {
    if (isExporting) {
      return setting.description;
    }
    if (editingId === setting._id) {
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

    const isExpanded = expandedDescriptions[setting._id];
    const shouldTruncate = setting.description.length > 100;
    const displayText = isExpanded
      ? setting.description
      : shouldTruncate
        ? setting.description.slice(0, 100) + '...'
        : setting.description;

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
            onClick={() => toggleDescription(setting._id)}
            sx={{ ml: 1, textDecoration: 'underline' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Link>
        )}
      </Box>
    );
  };

  const filteredSettings = settings.filter(setting =>
    setting.controlEffectiveness.toLowerCase().includes(search.toLowerCase()) ||
    setting.description.toLowerCase().includes(search.toLowerCase())
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
            'control-effectiveness',
            tableRef,
            'Control Effectiveness Settings',
            '',
            '',
            [0.3, 0.4, 0.3]
          );
        } else if (exportType === 'excel') {
          exportExcel(tableRef.current, 'Control Effectiveness Settings');
        }
        setIsExporting(false);
        setExportType(null);
      };
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
            Add Control Effectiveness
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
              <StyledHeaderCell sx={{ width: '0.3vw' }}>Control Effectiveness</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.4vw' }}>Description</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.2vw' }} align='center'>Effectiveness</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.1vw' }} align="center" className='noprint'>Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && (
              <ClickAwayListener onClickAway={handleCancelAdd}>
                <TableRow key="new-setting-row">
                  <StyledTableCell sx={{ width: '30%' }}>
                    <TextField
                      inputRef={inputRef}
                      value={newControlEffectiveness}
                      onChange={e => setNewControlEffectiveness(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter control effectiveness"
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
                      type="number"
                      value={newFactor}
                      onChange={e => setNewFactor(Number(e.target.value))}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter effectiveness"
                      fullWidth
                      variant="standard"
                      inputProps={{ min: 0 }}
                      onKeyDown={e => {
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                    />
                  </StyledTableCell>
                  <StyledTableCell sx={{ width: '10%' }} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleAddSetting}
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
            {filteredSettings.map(setting => (
              <TableRow key={setting._id} hover>
                {editingId === setting._id ? (
                  <ClickAwayListener onClickAway={() => handleEditSave(setting._id)}>
                    <>
                      <StyledTableCell sx={{ width: '30%' }}>
                        <TextField
                          inputRef={editInputRef}
                          value={editingControlEffectiveness}
                          onChange={e => setEditingControlEffectiveness(e.target.value)}
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
                          type="number"
                          value={editingFactor}
                          onChange={e => setEditingFactor(Number(e.target.value))}
                          fullWidth
                          variant="standard"
                          size="small"
                          inputProps={{ min: 0 }}
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{ width: '10%' }} align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={() => handleEditSave(setting._id)}
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
                    <StyledTableCell sx={{ width: '30%' }}>{setting.controlEffectiveness}</StyledTableCell>
                    <StyledTableCell sx={{ width: '40%' }}>{renderDescription(setting)}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }} align='center'>{setting.factor}</StyledTableCell>
                    <StyledTableCell sx={{ width: '10%' }} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" onClick={() => handleEditClick(setting)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteSetting(setting._id)} size="small">
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

export default ControlEffectivenessSettings;
