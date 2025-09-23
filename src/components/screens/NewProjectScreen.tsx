import {
    Box,
    Button,
    Card,
    CardContent,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { addRecent } from '../../utils/recent';
import { addProjectToDb } from '../../utils/projects';

const NewProjectScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    type: 'translation',
    language: 'en',
    description: '',
  });

  const handleTextChange = (field: 'name' | 'description') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSelectChange = (field: 'type' | 'language') => (
    event: SelectChangeEvent<string>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value as string }));
  };

  const handleCreateProject = () => {
    if (!formData.name.trim()) return;

    const newProject = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      language: formData.language,
      progress: 0,
      lastModified: new Date(),
    };

    dispatch({ type: 'ADD_PROJECT', payload: newProject });
    // Persist to recent projects DB (best-effort)
    addRecent({ id: newProject.id, name: newProject.name, language: newProject.language, lastOpened: Date.now() }).catch(() => {});
    // Persist project to DB (best-effort)
    addProjectToDb({
      id: newProject.id,
      name: newProject.name,
      type: newProject.type,
      language: newProject.language,
      progress: newProject.progress,
      lastModified: Date.now(),
    }).catch(() => {});
    navigate('/home');
  };

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        style={{
          backgroundColor: '#00796B',
          color: 'white',
          padding: '20px 30px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <Button
          onClick={() => navigate('/home')}
          style={{ color: 'white', minWidth: 'auto' }}
        >
          <ArrowBack />
        </Button>
        <Typography variant="h5" component="h1">
          Create New Project
        </Typography>
      </Box>

      {/* Content */}
      <Box style={{ flex: 1, padding: '30px', display: 'flex', justifyContent: 'center' }}>
        <Card style={{ maxWidth: 600, width: '100%' }}>
          <CardContent style={{ padding: '30px' }}>
            <Typography variant="h6" gutterBottom style={{ marginBottom: '20px' }}>
              Project Details
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Project Name"
                  value={formData.name}
                  onChange={handleTextChange('name')}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Project Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={handleSelectChange('type')}
                    label="Project Type"
                  >
                    <MenuItem value="translation">Translation</MenuItem>
                    <MenuItem value="checking">Checking</MenuItem>
                    <MenuItem value="consulting">Consulting</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={formData.language}
                    onChange={handleSelectChange('language')}
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="pt">Portuguese</MenuItem>
                    <MenuItem value="sw">Swahili</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  value={formData.description}
                  onChange={handleTextChange('description')}
                  variant="outlined"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>

            <Box style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/home')}
                style={{ minWidth: '120px' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateProject}
                disabled={!formData.name.trim()}
                startIcon={<Save />}
                style={{
                  minWidth: '120px',
                  backgroundColor: '#00796B',
                }}
              >
                Create Project
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default NewProjectScreen;



