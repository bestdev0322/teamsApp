import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TextField, ClickAwayListener, IconButton, Link } from '@mui/material';
import { ExportButton } from '../../../components/Buttons';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { api } from '../../../services/api';
import { exportPdf, exportExcel } from '../../../utils/exportUtils';

interface ComplianceArea {
  _id: string;
  areaName: string;
  description: string;
}

const ComplianceAreas: React.FC = () => {
  const [areas, setAreas] = useState<ComplianceArea[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState('');
  const tableRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  const fetchAreas = async () => {
    try {
      const response = await api.get('/compliance-areas');
      setAreas(response.data.data);
    } catch (error) {
      console.error('Error fetching compliance areas:', error);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddArea = async () => {
    if (newAreaName.trim() && newDescription.trim()) {
      try {
        const response = await api.post('/compliance-areas', {
          areaName: newAreaName.trim(),
          description: newDescription.trim()
        });
        setAreas(prev => [...prev, response.data.data]);
        setNewAreaName('');
        setNewDescription('');
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding compliance area:', error);
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewAreaName('');
    setNewDescription('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddArea();
    }
  };

  const handleEditClick = (area: ComplianceArea) => {
    setEditingAreaId(area._id);
    setEditingAreaName(area.areaName);
    setEditingDescription(area.description);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingAreaId(null);
    setEditingAreaName('');
    setEditingDescription('');
  };

  const handleEditSave = async (areaId: string) => {
    if (editingAreaName.trim() && editingDescription.trim()) {
      try {
        const response = await api.put(`/compliance-areas/${areaId}`, {
          areaName: editingAreaName.trim(),
          description: editingDescription.trim()
        });
        setAreas(prev => prev.map(area =>
          area._id === areaId ? response.data.data : area
        ));
        setEditingAreaId(null);
        setEditingAreaName('');
        setEditingDescription('');
      } catch (error) {
        console.error('Error updating compliance area:', error);
      }
    }
  };

  const handleEditKeyPress = (event: React.KeyboardEvent, areaId: string) => {
    if (event.key === 'Enter') {
      handleEditSave(areaId);
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    try {
      await api.delete(`/compliance-areas/${areaId}`);
      setAreas(prev => prev.filter(area => area._id !== areaId));
    } catch (error) {
      console.error('Error deleting compliance area:', error);
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderDescription = (area: ComplianceArea) => {
    if (isExporting) {
      // Always show full description for export
      return area.description;
    }
    if (editingAreaId === area._id) {
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

    const isExpanded = expandedDescriptions[area._id];
    const shouldTruncate = area.description.length > 100;
    const displayText = isExpanded
      ? area.description
      : shouldTruncate
        ? area.description.slice(0, 100) + '...'
        : area.description;

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
            onClick={() => toggleDescription(area._id)}
            sx={{ ml: 1, textDecoration: 'underline' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Link>
        )}
      </Box>
    );
  };

  // Filtered areas for search
  const filteredAreas = areas.filter(area =>
    area.areaName.toLowerCase().includes(search.toLowerCase()) ||
    area.description.toLowerCase().includes(search.toLowerCase())
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
            'compliance-area',
            tableRef,
            'Compliance Areas',
            '',
            '',
            [0.3, 0.7]
          );
        } else if (exportType === 'excel') {
          exportExcel(tableRef.current, 'Compliance Areas');
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
              <StyledHeaderCell sx={{ width: '0.3vw' }}>Name</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.5vw' }}>Description</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.2vw' }} align="center" className='noprint'>Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && (
              <ClickAwayListener onClickAway={handleCancelAdd}>
                <TableRow key="new-area-row">
                  <StyledTableCell sx={{ width: '30%' }}>
                    <TextField
                      inputRef={inputRef}
                      value={newAreaName}
                      onChange={e => setNewAreaName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter area name"
                      fullWidth
                      variant="standard"
                      onKeyDown={e => {
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                    />
                  </StyledTableCell>
                  <StyledTableCell sx={{ width: '50%' }}>
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
                  <StyledTableCell sx={{ width: '20%' }} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleAddArea}
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
            {filteredAreas.map(area => (
              <TableRow key={area._id} hover>
                {editingAreaId === area._id ? (
                  <ClickAwayListener onClickAway={() => handleEditSave(area._id)}>
                    <>
                      <StyledTableCell sx={{ width: '30%' }}>
                        <TextField
                          inputRef={editInputRef}
                          value={editingAreaName}
                          onChange={e => setEditingAreaName(e.target.value)}
                          fullWidth
                          variant="standard"
                          size="small"
                          autoFocus
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{ width: '50%' }}>
                        <TextField
                          value={editingDescription}
                          onChange={e => setEditingDescription(e.target.value)}
                          fullWidth
                          variant="standard"
                          size="small"
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{ width: '20%' }} align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={() => handleEditSave(area._id)}
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
                    <StyledTableCell sx={{ width: '30%' }}>{area.areaName}</StyledTableCell>
                    <StyledTableCell sx={{ width: '50%' }}>{renderDescription(area)}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" onClick={() => handleEditClick(area)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteArea(area._id)} size="small">
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

export default ComplianceAreas;
