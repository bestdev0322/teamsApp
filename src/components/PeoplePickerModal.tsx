import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Checkbox,
  TextField,
  InputAdornment,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../services/api';

export interface Person {
  MicrosoftId: string;
  displayName: string;
  email: string;
  jobTitle?: string;
}

interface PeoplePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPeople: (people: Person[]) => void;
  tenantId: string;
  title?: string;
  multiSelect?: boolean;
  currentTeamMembers?: Person[];
  eligibleMembers?: Person[];
  isElegibleModeOn?: boolean;
}

const PeoplePickerModal: React.FC<PeoplePickerModalProps> = ({
  open,
  onClose,
  tenantId,
  onSelectPeople,
  title = 'Select People',
  multiSelect = true,
  currentTeamMembers = [],
  eligibleMembers = [],
  isElegibleModeOn = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextLink, setNextLink] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [mode, setMode] = useState<'default' | 'search'>('default');
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchPeople = useCallback(async (query?: string, reset = false) => {
    try {
      setError(null);
      setLoading(true);
      let tempUsers: Person[] = [];
      if (isElegibleModeOn) {
        tempUsers = eligibleMembers;
        if (reset) {
          setFilteredPeople(tempUsers);
        } else {
          setFilteredPeople(prev => [...prev, ...tempUsers]);
        }
        setNextLink(null); // No pagination for eligibleMembers
        setHasMore(false);
      } else {
        const response = await api.get('/users/organization/users', {
          params: {
            pageSize: 20,
            searchQuery: query
          }
        });
        tempUsers = response.data.data.map((user: any) => ({
          MicrosoftId: user.id,
          displayName: user.displayName,
          email: user.mail || user.principalName,
          jobTitle: user.jobTitle
        }));
        // Filter out all existing team members
        tempUsers = tempUsers.filter(user =>
          !currentTeamMembers.some(member => member.email === user.email)
        );
        if (reset) {
          setFilteredPeople(tempUsers);
        } else {
          setFilteredPeople(prev => [...prev, ...tempUsers]);
        }
        setNextLink(response.data.nextLink || null);
        setHasMore(!!response.data.nextLink);
      }
    } catch (error: any) {
      console.error('Error fetching people:', error);
      if (error.response?.data?.consentRequired) {
        setError('Admin consent required. Redirecting to consent page...');
        setTimeout(() => {
          window.location.href = error.response.data.consentUrl;
        }, 2000);
        return;
      }
      if (error.response?.data?.message?.includes('terms of use')) {
        setError('Terms of Use acceptance required. Please contact your administrator.');
        return;
      }
      setError('Failed to load users. Please try again later.');
      setFilteredPeople([]);
    } finally {
      setLoading(false);
    }
  }, [isElegibleModeOn, eligibleMembers, currentTeamMembers]);

  const loadMorePeople = useCallback(async () => {
    if (!nextLink || loading || !hasMore) return;
    try {
      setLoading(true);
      const response = await api.get('/users/organization/users', {
        params: {
          nextLink: nextLink,
          searchQuery: mode === 'search' ? searchQuery : undefined
        }
      });
      const newUsers = response.data.data.map((user: any) => ({
        MicrosoftId: user.id,
        displayName: user.displayName,
        email: user.mail || user.principalName,
        jobTitle: user.jobTitle
      }));
      // Filter out all existing team members
      const filteredNewUsers = newUsers.filter(user =>
        !currentTeamMembers.some(member => member.email === user.email)
      );
      setFilteredPeople(prev => [...prev, ...filteredNewUsers]);
      setNextLink(response.data.nextLink || null);
      setHasMore(!!response.data.nextLink);
    } catch (error) {
      console.error('Error loading more people:', error);
    } finally {
      setLoading(false);
    }
  }, [nextLink, loading, hasMore, mode, searchQuery, currentTeamMembers]);

  const lastPersonElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePeople();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, loadMorePeople]);

  useEffect(() => {
    if (open) {
      setMode('default');
      setSearchQuery('');
      setSearchInput('');
      fetchPeople(undefined, true);
    }
  }, [open, fetchPeople]);

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleSearchInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const trimmed = searchInput.trim();
      if (trimmed) {
        setMode('search');
        setSearchQuery(trimmed);
        fetchPeople(trimmed, true);
      } else {
        setMode('default');
        setSearchQuery('');
        fetchPeople(undefined, true);
      }
    }
  };

  const handleTogglePerson = (person: Person) => {
    if (multiSelect) {
      const isSelected = selectedPeople.some(p => p.email === person.email);
      if (isSelected) {
        setSelectedPeople(selectedPeople.filter(p => p.email !== person.email));
      } else {
        setSelectedPeople([...selectedPeople, person]);
      }
    } else {
      setSelectedPeople([person]);
    }
  };

  const handleConfirm = async () => {
    try {
      // Register selected users in our database
      await api.post('/users/bulk-create', {
        users: selectedPeople.map(person => ({
          MicrosoftId: person.MicrosoftId,
          displayName: person.displayName,
          email: person.email,
          jobTitle: person.jobTitle,
          tenantId: tenantId
        }))
      });
      // Proceed with the original selection
      onSelectPeople(selectedPeople);
      onClose();
    } catch (error) {
      console.error('Error registering users:', error);
      setError('Failed to register selected users. Please try again.');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
          boxShadow: 3,
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', padding: 2 }}>
        {title}
      </DialogTitle>
      <Box sx={{ padding: 2, borderBottom: '1px solid #e0e0e0' }}>
        <TextField
          fullWidth
          placeholder="Search people"
          value={searchInput}
          onChange={handleSearchInputChange}
          onKeyDown={handleSearchInputKeyDown}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />
      </Box>
      <DialogContent sx={{ padding: 0, minHeight: 320 }}>
        {error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320, padding: 2 }}>
            <Typography color="error" align="center">{error}</Typography>
          </Box>
        ) : filteredPeople.length === 0 && !loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
            <Typography color="textSecondary">No results found</Typography>
          </Box>
        ) : (
          <List sx={{ padding: 0 }}>
            {filteredPeople.map((person, index) => {
              const isSelected = selectedPeople.some(p => p.email === person.email);
              const isLastElement = index === filteredPeople.length - 1;

              return (
                <ListItem
                  key={person.email}
                  component="div"
                  ref={isLastElement ? lastPersonElementRef : null}
                  onClick={() => handleTogglePerson(person)}
                  sx={{
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    sx={{ color: isSelected ? '#0078d4' : undefined }}
                  />
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: isSelected ? '#0078d4' : '#6264a7' }}>
                      {getInitials(person.displayName)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight={isSelected ? 600 : 400}>
                        {person.displayName}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="textSecondary" component="span">
                          {person.email}
                        </Typography>
                        {person.jobTitle && (
                          <>
                            <br />
                            <Typography variant="body2" color="textSecondary" component="span">
                              {person.jobTitle}
                            </Typography>
                          </>
                        )}
                      </>
                    }
                  />
                </ListItem>
              );
            })}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ padding: 2, borderTop: '1px solid #e0e0e0', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="textSecondary">
          {selectedPeople.length} {selectedPeople.length === 1 ? 'person' : 'people'} selected
        </Typography>
        <Box>
          <Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="primary"
            disabled={selectedPeople.length === 0}
          >
            Add
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PeoplePickerModal; 