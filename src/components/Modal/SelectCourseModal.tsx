import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  InputAdornment,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { StyledHeaderCell, StyledTableCell } from '../StyledTableComponents';
import { courseAPI } from '../../services/api';
import { Course } from '../../types/course';

interface SelectCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedCourses: Course[]) => void;
  tenantId: string;
  validateCourse?: (course: Course) => boolean;
}

const SelectCourseModal: React.FC<SelectCourseModalProps> = ({
  open,
  onClose,
  onSelect,
  tenantId,
  validateCourse
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open, tenantId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getAll(tenantId);
      const activeCourses = response.data.data.filter((course: Course) => course.status === 'active');
      setCourses(activeCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCourse = (course: Course) => {
    if (validateCourse && !validateCourse(course)) {
      return;
    }

    setSelectedCourses(prev => {
      const isSelected = prev.some(c => c._id === course._id);
      if (isSelected) {
        return prev.filter(c => c._id !== course._id);
      } else {
        return [...prev, course];
      }
    });
  };

  const filteredCourses = courses.filter(course =>
    (course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!validateCourse || validateCourse(course))
  );

  const handleAdd = () => {
    onSelect(selectedCourses);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
          Select Course
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: '#6B7280' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, backgroundColor: '#F9FAFB' }}>
          <TextField
            fullWidth
            placeholder="Search course"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#6B7280' }} />
                </InputAdornment>
              ),
              sx: {
                backgroundColor: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#FFFFFF',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#E5E7EB',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#D1D5DB',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563EB',
                },
              }
            }}
          />
        </Box>

        <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <StyledHeaderCell 
                  padding="checkbox"
                  sx={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}
                >
                  <Checkbox
                    checked={selectedCourses.length > 0 && selectedCourses.length === filteredCourses.length}
                    indeterminate={selectedCourses.length > 0 && selectedCourses.length < filteredCourses.length}
                    onChange={() => {
                      if (selectedCourses.length === filteredCourses.length) {
                        setSelectedCourses([]);
                      } else {
                        setSelectedCourses(filteredCourses);
                      }
                    }}
                    sx={{
                      '&.Mui-checked': {
                        color: '#2563EB',
                      }
                    }}
                  />
                </StyledHeaderCell>
                <StyledHeaderCell sx={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                  Course Name
                </StyledHeaderCell>
                <StyledHeaderCell sx={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                  Description
                </StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <StyledTableCell colSpan={3} align="center" sx={{ py: 6 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={24} sx={{ color: '#2563EB' }} />
                      <Typography sx={{ color: '#6B7280' }}>Loading courses...</Typography>
                    </Box>
                  </StyledTableCell>
                </TableRow>
              ) : filteredCourses.length === 0 ? (
                <TableRow>
                  <StyledTableCell colSpan={3} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ color: '#6B7280' }}>No courses found</Typography>
                  </StyledTableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow
                    key={course._id}
                    hover
                    onClick={() => handleToggleCourse(course)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#F3F4F6'
                      }
                    }}
                  >
                    <StyledTableCell padding="checkbox">
                      <Checkbox
                        checked={selectedCourses.some(c => c._id === course._id)}
                        sx={{
                          '&.Mui-checked': {
                            color: '#2563EB',
                          }
                        }}
                      />
                    </StyledTableCell>
                    <StyledTableCell>
                      <Typography sx={{ fontWeight: 500, color: '#111827' }}>
                        {course.name}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: '#4B5563' }}>
                      {course.description}
                    </StyledTableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ p: 2, backgroundColor: '#F9FAFB' }}>
        <Button 
          onClick={onClose}
          sx={{ 
            color: '#4B5563',
            '&:hover': {
              backgroundColor: '#F3F4F6'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={selectedCourses.length === 0}
          sx={{
            backgroundColor: '#2563EB',
            '&:hover': {
              backgroundColor: '#1D4ED8'
            },
            '&.Mui-disabled': {
              backgroundColor: '#E5E7EB',
              color: '#9CA3AF'
            }
          }}
        >
          Add ({selectedCourses.length} selected)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectCourseModal; 