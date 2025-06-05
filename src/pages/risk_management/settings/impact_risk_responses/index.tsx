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

interface ImpactResponse {
  _id: string;
  responseName: string;
  description: string;
}

const ImpactResponses: React.FC = () => {
  const [responses, setResponses] = useState<ImpactResponse[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newResponseName, setNewResponseName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingResponseName, setEditingResponseName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState('');
  const tableRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  const fetchResponses = async () => {
    try {
      const response = await api.get('/risk-impact-responses');
      setResponses(response.data.data);
    } catch (error) {
      console.error('Error fetching impact responses:', error);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddResponse = async () => {
    if (newResponseName.trim() && newDescription.trim()) {
      try {
        const response = await api.post('/risk-impact-responses', {
          responseName: newResponseName.trim(),
          description: newDescription.trim()
        });
        setResponses(prev => [...prev, response.data.data]);
        setNewResponseName('');
        setNewDescription('');
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding impact response:', error);
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewResponseName('');
    setNewDescription('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddResponse();
    }
  };

  const handleEditClick = (response: ImpactResponse) => {
    setEditingResponseId(response._id);
    setEditingResponseName(response.responseName);
    setEditingDescription(response.description);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingResponseId(null);
    setEditingResponseName('');
    setEditingDescription('');
  };

  const handleEditSave = async (responseId: string) => {
    if (editingResponseName.trim() && editingDescription.trim()) {
      try {
        const response = await api.put(`/risk-impact-responses/${responseId}`, {
          responseName: editingResponseName.trim(),
          description: editingDescription.trim()
        });
        setResponses(prev => prev.map(resp =>
          resp._id === responseId ? response.data.data : resp
        ));
        setEditingResponseId(null);
        setEditingResponseName('');
        setEditingDescription('');
      } catch (error) {
        console.error('Error updating impact response:', error);
      }
    }
  };

  const handleEditKeyPress = (event: React.KeyboardEvent, responseId: string) => {
    if (event.key === 'Enter') {
      handleEditSave(responseId);
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    try {
      await api.delete(`/risk-impact-responses/${responseId}`);
      setResponses(prev => prev.filter(response => response._id !== responseId));
    } catch (error) {
      console.error('Error deleting impact response:', error);
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderDescription = (response: ImpactResponse) => {
    if (isExporting) {
      // Always show full description for export
      return response.description;
    }
    if (editingResponseId === response._id) {
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

    const isExpanded = expandedDescriptions[response._id];
    const shouldTruncate = response.description.length > 100;
    const displayText = isExpanded
      ? response.description
      : shouldTruncate
        ? response.description.slice(0, 100) + '...'
        : response.description;

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
            onClick={() => toggleDescription(response._id)}
            sx={{ ml: 1, textDecoration: 'underline' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Link>
        )}
      </Box>
    );
  };

  // Filtered responses for search
  const filteredResponses = responses.filter(response =>
    response.responseName.toLowerCase().includes(search.toLowerCase()) ||
    response.description.toLowerCase().includes(search.toLowerCase())
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
            'impact-response',
            tableRef,
            'Impact Responses',
            '',
            '',
            [0.3, 0.7]
          );
        } else if (exportType === 'excel') {
          exportExcel(tableRef.current, 'Impact Responses');
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
            Add Impact Response
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
              <StyledHeaderCell sx={{ width: '0.3vw' }}>Risk Response</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.5vw' }}>Description</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '0.2vw' }} align="center" className='noprint'>Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && (
              <ClickAwayListener onClickAway={handleCancelAdd}>
                <TableRow key="new-response-row">
                  <StyledTableCell sx={{ width: '30%' }}>
                    <TextField
                      inputRef={inputRef}
                      value={newResponseName}
                      onChange={e => setNewResponseName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter response name"
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
                        onClick={handleAddResponse}
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
            {filteredResponses.map(response => (
              <TableRow key={response._id} hover>
                {editingResponseId === response._id ? (
                  <ClickAwayListener onClickAway={() => handleEditSave(response._id)}>
                    <>
                      <StyledTableCell sx={{ width: '30%' }}>
                        <TextField
                          inputRef={editInputRef}
                          value={editingResponseName}
                          onChange={e => setEditingResponseName(e.target.value)}
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
                            onClick={() => handleEditSave(response._id)}
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
                    <StyledTableCell sx={{ width: '30%' }}>{response.responseName}</StyledTableCell>
                    <StyledTableCell sx={{ width: '50%' }}>{renderDescription(response)}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" onClick={() => handleEditClick(response)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteResponse(response._id)} size="small">
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

export default ImpactResponses;
