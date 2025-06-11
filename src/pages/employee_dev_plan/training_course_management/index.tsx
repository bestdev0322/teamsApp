import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableBody,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useAuth } from '../../../contexts/AuthContext';
import { courseAPI } from '../../../services/api';
import { StyledHeaderCell, StyledTableCell } from '../../../components/StyledTableComponents';
import { Course } from '../../../types/course';
import { SelectChangeEvent } from '@mui/material/Select';
import { importExcelFile } from '../../../utils/excelImport';
import { useToast } from '../../../contexts/ToastContext';

type TrainingCourse = Omit<Course, 'createdAt' | 'updatedAt'>;

interface AddCourseFormData {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

const TrainingCoursesManagement: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [formData, setFormData] = useState<AddCourseFormData>({
    name: '',
    description: '',
    status: 'active'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Check if user has super user privileges
  const isSuperUser = user?.role === 'SuperUser';
  const isAppOwner = user?.role === 'AppOwner';

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getAll(user?.tenantId || '');
      const coursesData = response.data.data.map((course: Course) => ({
        _id: course._id,
        name: course.name,
        description: course.description,
        status: course.status,
        tenantId: course.tenantId
      }));
      setCourses(coursesData);
      setError(null);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (user?.tenantId) {
      fetchCourses();
    }
  }, [user?.tenantId, fetchCourses]);

  const handleAddCourse = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      description: '',
      status: 'active'
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = (e: SelectChangeEvent<"active" | "inactive">) => {
    setFormData(prev => ({
      ...prev,
      status: e.target.value as "active" | "inactive"
    }));
  };

  const handleSubmit = async () => {
    try {
      await courseAPI.create(formData);
      await fetchCourses();
      handleCloseAddModal();
      showToast('Courses imported successfully', 'success');
    } catch (error) {
      console.error('Error creating course:', error);
      setError('Failed to create course');
    }
  };

  const handleEditCourse = (course: TrainingCourse) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description,
      status: course.status
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCourse(null);
    setFormData({
      name: '',
      description: '',
      status: 'active'
    });
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    
    try {
      await courseAPI.update(editingCourse._id, formData);
      await fetchCourses();
      handleCloseEditModal();
      showToast('Course updated successfully', 'success');
    } catch (error) {
      console.error('Error updating course:', error);
      setError('Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await courseAPI.delete(courseId);
      await fetchCourses();
      showToast('Course deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting course:', error);
      setError('Failed to delete course');
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importExcelFile(file, {
      requiredColumns: [
        { name: 'name', aliases: ['name', 'course'] },
        { name: 'description', aliases: ['description', 'desc'] }
      ],
      onSuccess: (rows) => {
        const courses = rows.map(row => ({
          name: row.name,
          description: row.description,
          status: 'active' as const
        }));

        Promise.all(courses.map(course => courseAPI.create(course)))
          .then(() => {
            fetchCourses();
            showToast('Courses imported successfully', 'success');
          })
          .catch(error => {
            console.error('Error creating courses:', error);
            showToast('Error creating some courses', 'error');
          });
      },
      onError: (error) => {
        showToast(`Error importing file: ${error}`, 'error');
      }
    });
  };

  // Filter courses based on search query
  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Box>Loading courses...</Box>;
  }

  if (error) {
    return <Box color="error.main">{error}</Box>;
  }

  return (
    <Box>
      {/* Search and Action Buttons Section */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: '300px' }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {
            <>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: 'none' }}
              >
                Import Excel
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCourse}
                sx={{
                  textTransform: 'none',
                  backgroundColor: '#0078D4',
                  '&:hover': {
                    backgroundColor: '#106EBE',
                  }
                }}
              >
                Add Course
              </Button>
            </>
          }
        </Box>
      </Box>

      {/* Add Course Modal */}
      <Dialog open={isAddModalOpen} onClose={handleCloseAddModal} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Course</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Course Name"
              name="name"
              value={formData.name}
              onChange={handleTextChange}
              fullWidth
              required
            />
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleTextChange}
              fullWidth
              multiline
              rows={4}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleStatusChange}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddModal}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || !formData.description}
          >
            Add Course
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={isEditModalOpen} onClose={handleCloseEditModal} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Course</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Course Name"
              name="name"
              value={formData.name}
              onChange={handleTextChange}
              fullWidth
              required
            />
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleTextChange}
              fullWidth
              multiline
              rows={4}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleStatusChange}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button 
            onClick={handleUpdateCourse}
            variant="contained"
            disabled={!formData.name || !formData.description}
          >
            Update Course
          </Button>
        </DialogActions>
      </Dialog>

      {/* Courses Table */}
      <Paper sx={{ width: '100%', boxShadow: 'none', border: '1px solid #E5E7EB' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Course Name</StyledHeaderCell>
                <StyledHeaderCell>Description</StyledHeaderCell>
                <StyledHeaderCell>Status</StyledHeaderCell>
                {(isSuperUser || isAppOwner) && <StyledHeaderCell align="center">Actions</StyledHeaderCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course._id} hover>
                  <StyledTableCell>{course.name}</StyledTableCell>
                  <StyledTableCell>{course.description}</StyledTableCell>
                  <StyledTableCell>
                    {course.status === 'active' ? 'Active' : 'Inactive'}
                  </StyledTableCell>
                  {(isSuperUser || isAppOwner) && (
                    <StyledTableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Edit course">
                          <IconButton
                            color="primary"
                            onClick={() => handleEditCourse(course)}
                            size="small"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete course">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteCourse(course._id)}
                            size="small"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </StyledTableCell>
                  )}
                </TableRow>
              ))}
              {filteredCourses.length === 0 && (
                <TableRow>
                  <StyledTableCell colSpan={(isSuperUser || isAppOwner) ? 4 : 3} align="center" sx={{ py: 4 }}>
                    {courses.length === 0 ? 'No courses available' : 'No matching courses found'}
                  </StyledTableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default TrainingCoursesManagement;
