/**
 * New Project Screen
 * Create new translation projects with resource and book selection
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, ArrowForward, Check, CloudDownload, MenuBook, Save } from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { projectRepository } from '../../services/projectRepository';
import { resourceDownloader, CachedResource } from '../../services/dcs/downloader';

// ============================================================================
// Types
// ============================================================================

interface BookInfo {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
}

// ============================================================================
// Constants
// ============================================================================

const STEPS = ['Select Resource', 'Choose Book', 'Project Details'];

const BIBLE_BOOKS: BookInfo[] = [
  // Old Testament
  { id: 'gen', name: 'Genesis', testament: 'OT' },
  { id: 'exo', name: 'Exodus', testament: 'OT' },
  { id: 'lev', name: 'Leviticus', testament: 'OT' },
  { id: 'num', name: 'Numbers', testament: 'OT' },
  { id: 'deu', name: 'Deuteronomy', testament: 'OT' },
  { id: 'jos', name: 'Joshua', testament: 'OT' },
  { id: 'jdg', name: 'Judges', testament: 'OT' },
  { id: 'rut', name: 'Ruth', testament: 'OT' },
  { id: '1sa', name: '1 Samuel', testament: 'OT' },
  { id: '2sa', name: '2 Samuel', testament: 'OT' },
  { id: '1ki', name: '1 Kings', testament: 'OT' },
  { id: '2ki', name: '2 Kings', testament: 'OT' },
  { id: '1ch', name: '1 Chronicles', testament: 'OT' },
  { id: '2ch', name: '2 Chronicles', testament: 'OT' },
  { id: 'ezr', name: 'Ezra', testament: 'OT' },
  { id: 'neh', name: 'Nehemiah', testament: 'OT' },
  { id: 'est', name: 'Esther', testament: 'OT' },
  { id: 'job', name: 'Job', testament: 'OT' },
  { id: 'psa', name: 'Psalms', testament: 'OT' },
  { id: 'pro', name: 'Proverbs', testament: 'OT' },
  { id: 'ecc', name: 'Ecclesiastes', testament: 'OT' },
  { id: 'sng', name: 'Song of Solomon', testament: 'OT' },
  { id: 'isa', name: 'Isaiah', testament: 'OT' },
  { id: 'jer', name: 'Jeremiah', testament: 'OT' },
  { id: 'lam', name: 'Lamentations', testament: 'OT' },
  { id: 'ezk', name: 'Ezekiel', testament: 'OT' },
  { id: 'dan', name: 'Daniel', testament: 'OT' },
  { id: 'hos', name: 'Hosea', testament: 'OT' },
  { id: 'jol', name: 'Joel', testament: 'OT' },
  { id: 'amo', name: 'Amos', testament: 'OT' },
  { id: 'oba', name: 'Obadiah', testament: 'OT' },
  { id: 'jon', name: 'Jonah', testament: 'OT' },
  { id: 'mic', name: 'Micah', testament: 'OT' },
  { id: 'nam', name: 'Nahum', testament: 'OT' },
  { id: 'hab', name: 'Habakkuk', testament: 'OT' },
  { id: 'zep', name: 'Zephaniah', testament: 'OT' },
  { id: 'hag', name: 'Haggai', testament: 'OT' },
  { id: 'zec', name: 'Zechariah', testament: 'OT' },
  { id: 'mal', name: 'Malachi', testament: 'OT' },
  // New Testament
  { id: 'mat', name: 'Matthew', testament: 'NT' },
  { id: 'mrk', name: 'Mark', testament: 'NT' },
  { id: 'luk', name: 'Luke', testament: 'NT' },
  { id: 'jhn', name: 'John', testament: 'NT' },
  { id: 'act', name: 'Acts', testament: 'NT' },
  { id: 'rom', name: 'Romans', testament: 'NT' },
  { id: '1co', name: '1 Corinthians', testament: 'NT' },
  { id: '2co', name: '2 Corinthians', testament: 'NT' },
  { id: 'gal', name: 'Galatians', testament: 'NT' },
  { id: 'eph', name: 'Ephesians', testament: 'NT' },
  { id: 'php', name: 'Philippians', testament: 'NT' },
  { id: 'col', name: 'Colossians', testament: 'NT' },
  { id: '1th', name: '1 Thessalonians', testament: 'NT' },
  { id: '2th', name: '2 Thessalonians', testament: 'NT' },
  { id: '1ti', name: '1 Timothy', testament: 'NT' },
  { id: '2ti', name: '2 Timothy', testament: 'NT' },
  { id: 'tit', name: 'Titus', testament: 'NT' },
  { id: 'phm', name: 'Philemon', testament: 'NT' },
  { id: 'heb', name: 'Hebrews', testament: 'NT' },
  { id: 'jas', name: 'James', testament: 'NT' },
  { id: '1pe', name: '1 Peter', testament: 'NT' },
  { id: '2pe', name: '2 Peter', testament: 'NT' },
  { id: '1jn', name: '1 John', testament: 'NT' },
  { id: '2jn', name: '2 John', testament: 'NT' },
  { id: '3jn', name: '3 John', testament: 'NT' },
  { id: 'jud', name: 'Jude', testament: 'NT' },
  { id: 'rev', name: 'Revelation', testament: 'NT' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ru', name: 'Russian' },
];

// ============================================================================
// Main Component
// ============================================================================

const NewProjectScreen: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();

  // Step state
  const [activeStep, setActiveStep] = useState(0);

  // Form state
  const [availableResources, setAvailableResources] = useState<CachedResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<CachedResource | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);
  const [projectName, setProjectName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [description, setDescription] = useState('');

  // Load resources on mount
  useEffect(() => {
    loadResources();
  }, []);

  // Auto-generate project name when book is selected
  useEffect(() => {
    if (selectedBook && !projectName) {
      const langName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
      setProjectName(`${selectedBook.name} - ${langName} Translation`);
    }
  }, [selectedBook, targetLanguage]);

  const loadResources = useCallback(async () => {
    try {
      const resources = await resourceDownloader.listCached();
      setAvailableResources(resources);
    } catch (e) {
      console.error('Failed to load resources:', e);
    }
  }, []);

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !selectedBook) return;

    const newProject = {
      id: Date.now().toString(),
      name: projectName,
      type: 'translation',
      language: targetLanguage,
      progress: 0,
      lastModified: Date.now(),
      book: selectedBook.id,
      resource: selectedResource?.id,
      formatVersion: 'dcs', // New DCS format
    };

    dispatch({ type: 'ADD_PROJECT', payload: { ...newProject, lastModified: new Date() } });

    try {
      await projectRepository.createProject(
        {
          id: newProject.id,
          name: newProject.name,
          type: newProject.type,
          language: newProject.language,
          progress: newProject.progress,
          lastModified: newProject.lastModified,
        },
        { recordRecent: true }
      );
    } catch (e) {
      console.error('Failed to save project:', e);
    }

    navigate('/translate');
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return true; // Resource is optional (can use demo mode)
      case 1:
        return selectedBook !== null;
      case 2:
        return projectName.trim().length > 0;
      default:
        return false;
    }
  };

  // ============================================================================
  // Step Content
  // ============================================================================

  const renderResourceStep = () => (
    <Box>
      <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
        Select a downloaded resource to use as the source text for your translation. If you haven't
        downloaded any resources yet, you can still create a project.
      </Typography>

      {availableResources.length === 0 ? (
        <Alert
          severity='info'
          action={
            <Button color='inherit' size='small' onClick={() => navigate('/resources')}>
              <CloudDownload sx={{ mr: 1 }} />
              Download Resources
            </Button>
          }
        >
          No resources downloaded yet. Download resources for word-level alignment and translation
          notes.
        </Alert>
      ) : (
        <List>
          {availableResources.map(resource => (
            <ListItemButton
              key={resource.id}
              selected={selectedResource?.id === resource.id}
              onClick={() => setSelectedResource(resource)}
              sx={{ borderRadius: 1, mb: 1 }}
            >
              <ListItemIcon>
                <MenuBook color={selectedResource?.id === resource.id ? 'primary' : 'action'} />
              </ListItemIcon>
              <ListItemText
                primary={resource.name}
                secondary={`${resource.owner} • v${resource.version}`}
              />
              {selectedResource?.id === resource.id && <Check color='primary' />}
            </ListItemButton>
          ))}
        </List>
      )}

      {availableResources.length > 0 && !selectedResource && (
        <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
          You can skip resource selection to use demo mode without alignment data.
        </Typography>
      )}
    </Box>
  );

  const renderBookStep = () => (
    <Box>
      <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
        Select the book you want to translate.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant='subtitle2' gutterBottom>
            Old Testament
          </Typography>
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <List dense>
              {BIBLE_BOOKS.filter(b => b.testament === 'OT').map(book => (
                <ListItemButton
                  key={book.id}
                  selected={selectedBook?.id === book.id}
                  onClick={() => setSelectedBook(book)}
                  dense
                >
                  <ListItemText primary={book.name} />
                  {selectedBook?.id === book.id && <Check color='primary' fontSize='small' />}
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Typography variant='subtitle2' gutterBottom>
            New Testament
          </Typography>
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <List dense>
              {BIBLE_BOOKS.filter(b => b.testament === 'NT').map(book => (
                <ListItemButton
                  key={book.id}
                  selected={selectedBook?.id === book.id}
                  onClick={() => setSelectedBook(book)}
                  dense
                >
                  <ListItemText primary={book.name} />
                  {selectedBook?.id === book.id && <Check color='primary' fontSize='small' />}
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Grid>
      </Grid>

      {selectedBook && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.selected', borderRadius: 1 }}>
          <Typography variant='body2'>
            Selected: <strong>{selectedBook.name}</strong>
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderDetailsStep = () => (
    <Box>
      <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
        Enter the project details for your translation.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label='Project Name'
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            variant='outlined'
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant='outlined'>
            <InputLabel>Target Language</InputLabel>
            <Select
              value={targetLanguage}
              onChange={(e: SelectChangeEvent) => setTargetLanguage(e.target.value)}
              label='Target Language'
            >
              {LANGUAGES.map(lang => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label='Description (Optional)'
            value={description}
            onChange={e => setDescription(e.target.value)}
            variant='outlined'
            multiline
            rows={3}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant='subtitle2' gutterBottom>
        Project Summary
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {selectedResource && <Chip label={`Resource: ${selectedResource.name}`} size='small' />}
        {selectedBook && <Chip label={`Book: ${selectedBook.name}`} size='small' color='primary' />}
        <Chip
          label={`Language: ${LANGUAGES.find(l => l.code === targetLanguage)?.name}`}
          size='small'
        />
        <Chip label='Format: DCS' size='small' variant='outlined' />
      </Box>
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderResourceStep();
      case 1:
        return renderBookStep();
      case 2:
        return renderDetailsStep();
      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#00796B',
          color: 'white',
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Button onClick={() => navigate('/home')} sx={{ color: 'white', minWidth: 'auto' }}>
          <ArrowBack />
        </Button>
        <Typography variant='h5' component='h1'>
          Create New Project
        </Typography>
      </Box>

      {/* Stepper */}
      <Box sx={{ px: 4, py: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Stepper activeStep={activeStep}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
        <Card sx={{ maxWidth: 800, mx: 'auto' }}>
          <CardContent sx={{ p: 4 }}>{getStepContent(activeStep)}</CardContent>
        </Card>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<ArrowBack />}>
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant='outlined' onClick={() => navigate('/home')}>
            Cancel
          </Button>
          {activeStep === STEPS.length - 1 ? (
            <Button
              variant='contained'
              onClick={handleCreateProject}
              disabled={!canProceed()}
              startIcon={<Save />}
              sx={{ backgroundColor: '#00796B' }}
            >
              Create Project
            </Button>
          ) : (
            <Button
              variant='contained'
              onClick={handleNext}
              disabled={!canProceed()}
              endIcon={<ArrowForward />}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default NewProjectScreen;
