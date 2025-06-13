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

interface RiskCategory {
  _id: string;
  categoryName: string;
  description: string;
}

const RiskCategories: React.FC = () => {
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState('');
  const tableRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/risk-categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching risk categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim() && newDescription.trim()) {
      try {
        const response = await api.post('/risk-categories', {
          categoryName: newCategoryName.trim(),
          description: newDescription.trim()
        });
        setCategories(prev => [...prev, response.data.data]);
        setNewCategoryName('');
        setNewDescription('');
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding risk category:', error);
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewCategoryName('');
    setNewDescription('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddCategory();
    }
  };

  const handleEditClick = (category: RiskCategory) => {
    setEditingCategoryId(category._id);
    setEditingCategoryName(category.categoryName);
    setEditingDescription(category.description);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingDescription('');
  };

  const handleEditSave = async (categoryId: string) => {
    if (editingCategoryName.trim() && editingDescription.trim()) {
      try {
        const response = await api.put(`/risk-categories/${categoryId}`, {
          categoryName: editingCategoryName.trim(),
          description: editingDescription.trim()
        });
        setCategories(prev => prev.map(category =>
          category._id === categoryId ? response.data.data : category
        ));
        setEditingCategoryId(null);
        setEditingCategoryName('');
        setEditingDescription('');
      } catch (error) {
        console.error('Error updating risk category:', error);
      }
    }
  };

  const handleEditKeyPress = (event: React.KeyboardEvent, categoryId: string) => {
    if (event.key === 'Enter') {
      handleEditSave(categoryId);
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDeleteArea = async (categoryId: string) => {
    try {
      await api.delete(`/risk-categories/${categoryId}`);
      setCategories(prev => prev.filter(category => category._id !== categoryId));
    } catch (error) {
      console.error('Error deleting risk category:', error);
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderDescription = (category: RiskCategory) => {
    if (isExporting) {
      // Always show full description for export
      return category.description;
    }
    if (editingCategoryId === category._id) {
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

    const isExpanded = expandedDescriptions[category._id];
    const shouldTruncate = category.description.length > 100;
    const displayText = isExpanded
      ? category.description
      : shouldTruncate
        ? category.description.slice(0, 100) + '...'
        : category.description;

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
            onClick={() => toggleDescription(category._id)}
            sx={{ ml: 1, textDecoration: 'underline' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Link>
        )}
      </Box>
    );
  };

  // Filtered categories for search
  const filteredAreas = categories.filter(category =>
    category.categoryName.toLowerCase().includes(search.toLowerCase()) ||
    category.description.toLowerCase().includes(search.toLowerCase())
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
            'risk-category',
            tableRef,
            'Risk Categories',
            '',
            '',
            [0.3, 0.7]
          );
        } else if (exportType === 'excel') {
          exportExcel(tableRef.current, 'Risk Categories');
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
            Add Risk Category
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
              <StyledHeaderCell sx={{ width: '10%' }}>No.</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '30%' }}>Category</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '40%' }}>Description</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '20%' }} align="center" className='noprint'>Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && (
              <ClickAwayListener onClickAway={handleCancelAdd}>
                <TableRow key="new-category-row">
                  <StyledTableCell sx={{ width: '10%' }}>{categories.length + 1}</StyledTableCell>
                  <StyledTableCell sx={{ width: '30%' }}>
                    <TextField
                      inputRef={inputRef}
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter category name"
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
                        onClick={handleAddCategory}
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
            {filteredAreas.map((category, index) => (
              <TableRow key={category._id} hover>
                {editingCategoryId === category._id ? (
                  <ClickAwayListener onClickAway={() => handleEditSave(category._id)}>
                    <>
                      <StyledTableCell sx={{ width: '10%' }}>{index + 1}</StyledTableCell>
                      <StyledTableCell sx={{ width: '30%' }}>
                        <TextField
                          inputRef={editInputRef}
                          value={editingCategoryName}
                          onChange={e => setEditingCategoryName(e.target.value)}
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
                      <StyledTableCell sx={{ width: '20%' }} align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={() => handleEditSave(category._id)}
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
                    <StyledTableCell sx={{ width: '10%' }}>{index + 1}</StyledTableCell>
                    <StyledTableCell sx={{ width: '30%' }}>{category.categoryName}</StyledTableCell>
                    <StyledTableCell sx={{ width: '40%' }}>{renderDescription(category)}</StyledTableCell>
                    <StyledTableCell sx={{ width: '20%' }} align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" onClick={() => handleEditClick(category)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteArea(category._id)} size="small">
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

export default RiskCategories;
