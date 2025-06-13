import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, TableContainer, Paper, Table, TableHead, TableRow, TableBody, TextField, ClickAwayListener, IconButton, Link, Typography, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { StyledHeaderCell, StyledTableCell } from '../../../../components/StyledTableComponents';
import { api } from '../../../../services/api';

interface RiskRating {
  _id: string;
  rating: string;
  minScore: number;
  maxScore: number;
  color: string;
}

interface ValidationErrors {
  rating?: string;
  minScore?: string;
  maxScore?: string;
  color?: string;
  general?: string;
}

const RiskRatingSettings: React.FC = () => {
  const [ratings, setRatings] = useState<RiskRating[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRating, setNewRating] = useState<Omit<RiskRating, '_id'>>({
    rating: '',
    minScore: 0,
    maxScore: 0,
    color: '#000000',
  });
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [editingRating, setEditingRating] = useState<RiskRating | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const fetchRatings = async () => {
    try {
      const response = await api.get('/risk-ratings');
      setRatings(response.data.data);
    } catch (error) {
      console.error('Error fetching risk ratings:', error);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const validateForm = (rating: Omit<RiskRating, '_id'> | RiskRating, isEdit = false): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    if (!rating.rating.trim()) {
      newErrors.rating = 'Risk Rating is required';
      isValid = false;
    }

    if (rating.minScore === undefined || rating.minScore === null || isNaN(Number(rating.minScore))) {
         newErrors.minScore = 'Min Score is required and must be a number';
         isValid = false;
    } else if (Number(rating.minScore) < 0) {
         newErrors.minScore = 'Min Score must be non-negative';
         isValid = false;
    }

     if (rating.maxScore === undefined || rating.maxScore === null || isNaN(Number(rating.maxScore))) {
         newErrors.maxScore = 'Max Score is required and must be a number';
         isValid = false;
    } else if (Number(rating.maxScore) < 0) {
         newErrors.maxScore = 'Max Score must be non-negative';
         isValid = false;
    }

    if (isValid && Number(rating.maxScore) <= Number(rating.minScore)) {
      newErrors.maxScore = 'Max Score must be greater than Min Score';
      isValid = false;
    }

    if (!rating.color) {
        newErrors.color = 'Color is required';
        isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setNewRating({
        rating: '',
        minScore: 0,
        maxScore: 0,
        color: '#000000',
    });
    setErrors({}); // Clear previous errors
    setTimeout(() => {
      addInputRef.current?.focus();
    }, 0);
  };

  const handleAddRating = async () => {
    if (validateForm(newRating)) {
      try {
        const response = await api.post('/risk-ratings', newRating);
        setRatings(prev => [...prev, response.data.data]);
        setNewRating({
            rating: '',
            minScore: 0,
            maxScore: 0,
            color: '#000000',
        });
        setIsAdding(false);
        setErrors({});
      } catch (error: any) {
          console.error('Error adding risk rating:', error);
           if (error.response && error.response.data && error.response.data.error) {
                setErrors({ ...errors, general: error.response.data.error });
            } else {
                setErrors({ ...errors, general: 'Failed to add risk rating' });
            }
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewRating({
        rating: '',
        minScore: 0,
        maxScore: 0,
        color: '#000000',
    });
    setErrors({});
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddRating();
    }
  };

  const handleEditClick = (rating: RiskRating) => {
    setEditingRatingId(rating._id);
    setEditingRating({...rating});
    setErrors({}); // Clear previous errors
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditCancel = () => {
    setEditingRatingId(null);
    setEditingRating(null);
    setErrors({});
  };

  const handleEditSave = async () => {
      if (!editingRatingId || !editingRating) return;
    if (validateForm(editingRating, true)) {
      try {
        const response = await api.put(`/risk-ratings/${editingRatingId}`, editingRating);
        setRatings(prev => prev.map(rating =>
          rating._id === editingRatingId ? response.data.data : rating
        ));
        setEditingRatingId(null);
        setEditingRating(null);
        setErrors({});
      } catch (error: any) {
        console.error('Error updating risk rating:', error);
         if (error.response && error.response.data && error.response.data.error) {
                setErrors({ ...errors, general: error.response.data.error });
            } else {
                setErrors({ ...errors, general: 'Failed to update risk rating' });
            }
      }
    }
  };

  const handleEditKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleEditSave();
    } else if (event.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    try {
      await api.delete(`/risk-ratings/${ratingId}`);
      setRatings(prev => prev.filter(rating => rating._id !== ratingId));
    } catch (error) {
      console.error('Error deleting risk rating:', error);
    }
  };

  // Filtered ratings for search
  const filteredRatings = ratings.filter(rating =>
    rating.rating.toLowerCase().includes(search.toLowerCase()) ||
    rating.minScore.toString().includes(search) ||
    rating.maxScore.toString().includes(search)
  );

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            sx={{ textTransform: 'none', backgroundColor: '#0078D4', '&:hover': { backgroundColor: '#106EBE' } }}>
            Add Risk Score
          </Button>
        </Box>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by rating or score"
          size="small"
          sx={{ width: 320 }}
        />
      </Box>
       {errors.general && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                    {errors.general}
                </Typography>
            )}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, border: '1px solid #E5E7EB', overflowX: 'auto', mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <StyledHeaderCell sx={{ width: '10%' }} className='noprint'>No.</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '25%' }}>Risk Rating</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '20%' }}>Risk Score Min</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '20%' }}>Risk Score Max</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '15%' }} align='center'>Risk Rating Colour</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: '10%' }} align="center" className='noprint'>Actions</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isAdding && ( editingRatingId === null) && (
              <ClickAwayListener onClickAway={handleCancelAdd}>
                <TableRow key="new-rating-row">
                  <StyledTableCell className='noprint'>{ratings.length + 1}</StyledTableCell>
                  <StyledTableCell>
                    <TextField
                      inputRef={addInputRef}
                      value={newRating.rating}
                      onChange={e => setNewRating({ ...newRating, rating: e.target.value })}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter rating name"
                      fullWidth
                      variant="standard"
                      onBlur={() => validateForm(newRating)} // Validate on blur
                      error={!!errors.rating}
                      helperText={errors.rating}
                    />
                  </StyledTableCell>
                  <StyledTableCell>
                    <TextField
                      type="number"
                      value={newRating.minScore}
                      onChange={e => setNewRating({ ...newRating, minScore: Number(e.target.value) })}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter min score"
                      fullWidth
                      variant="standard"
                      onBlur={() => validateForm(newRating)} // Validate on blur
                      error={!!errors.minScore}
                      helperText={errors.minScore}
                    />
                  </StyledTableCell>
                   <StyledTableCell>
                    <TextField
                      type="number"
                      value={newRating.maxScore}
                      onChange={e => setNewRating({ ...newRating, maxScore: Number(e.target.value) })}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter max score"
                      fullWidth
                      variant="standard"
                       onBlur={() => validateForm(newRating)} // Validate on blur
                       error={!!errors.maxScore}
                       helperText={errors.maxScore}
                    />
                  </StyledTableCell>
                  <StyledTableCell sx={{display: 'flex', justifyContent: 'center'}}>
                       <Box sx={{ display: 'inline-block' }}>
                            <TextField
                                type="color"
                                value={newRating.color}
                                onChange={e => setNewRating({ ...newRating, color: e.target.value })}
                                variant="standard"
                                size="small"
                                sx={{ width: 70 }}
                                onBlur={() => validateForm(newRating)} // Validate on blur
                            />
                        </Box>
                         {errors.color && (
                            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                                {errors.color}
                            </Typography>
                        )}
                  </StyledTableCell>
                  <StyledTableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleAddRating}
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
            {filteredRatings.map((rating, index) => (
              <TableRow key={rating._id} hover>
                {editingRatingId === rating._id ? (
                  <ClickAwayListener onClickAway={handleEditSave}>
                    <>
                      <StyledTableCell className='noprint'>{index + 1}</StyledTableCell>
                      <StyledTableCell>
                        <TextField
                          inputRef={editInputRef}
                          value={editingRating?.rating || ''}
                          onChange={e => setEditingRating({ ...editingRating!, rating: e.target.value })}
                          fullWidth
                          variant="standard"
                          size="small"
                          autoFocus
                           onBlur={() => editingRating && validateForm(editingRating, true)} // Validate on blur
                           error={!!errors.rating}
                           helperText={errors.rating}
                        />
                      </StyledTableCell>
                      <StyledTableCell>
                        <TextField
                          type="number"
                          value={editingRating?.minScore || 0}
                          onChange={e => setEditingRating({ ...editingRating!, minScore: Number(e.target.value) })}
                          fullWidth
                          variant="standard"
                          size="small"
                           onBlur={() => editingRating && validateForm(editingRating, true)} // Validate on blur
                           error={!!errors.minScore}
                           helperText={errors.minScore}
                        />
                      </StyledTableCell>
                       <StyledTableCell>
                        <TextField
                          type="number"
                          value={editingRating?.maxScore || 0}
                          onChange={e => setEditingRating({ ...editingRating!, maxScore: Number(e.target.value) })}
                          fullWidth
                          variant="standard"
                          size="small"
                           onBlur={() => editingRating && validateForm(editingRating, true)} // Validate on blur
                           error={!!errors.maxScore}
                           helperText={errors.maxScore}
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{display: 'flex', justifyContent: 'center'}}>
                           <Box sx={{ display: 'inline-block' }}>
                                <TextField
                                    type="color"
                                    value={editingRating?.color || '#000000'}
                                    onChange={e => setEditingRating({ ...editingRating!, color: e.target.value })}
                                    variant="standard"
                                    size="small"
                                    sx={{
                                        width: 70,
                                    }}
                                     onBlur={() => editingRating && validateForm(editingRating, true)} // Validate on blur
                                />
                            </Box>
                             {errors.color && (
                                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                                    {errors.color}
                                </Typography>
                            )}
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={handleEditSave}
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
                    <StyledTableCell className='noprint'>{index + 1}</StyledTableCell>
                    <StyledTableCell>{rating.rating}</StyledTableCell>
                    <StyledTableCell>{rating.minScore}</StyledTableCell>
                    <StyledTableCell>{rating.maxScore}</StyledTableCell>
                    <StyledTableCell sx={{display: 'flex', justifyContent: 'center'}}>
                        <Box sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '4px',
                            backgroundColor: rating.color,
                            border: '1px solid #ccc'
                        }} />
                    </StyledTableCell>
                    <StyledTableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton color="primary" onClick={() => handleEditClick(rating)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteRating(rating._id)} size="small">
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

export default RiskRatingSettings;
