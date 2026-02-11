import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ProjectContextRecord,
  ProjectRecord,
  projectRepository,
} from '../../services/projectRepository';
import {
  TranslationDraftDocument,
  listBookVerses,
  loadDraft,
} from '../../services/translationDrafts';

const ReviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('projectId') || '';

  const [projects, setProjects] = React.useState<ProjectRecord[]>([]);
  const [project, setProject] = React.useState<ProjectRecord | null>(null);
  const [context, setContext] = React.useState<ProjectContextRecord | null>(null);
  const [draft, setDraft] = React.useState<TranslationDraftDocument | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const loadProjects = async () => {
      const items = await projectRepository.listProjects();
      if (cancelled) return;
      setProjects(items);
      if (!selectedProjectId && items.length > 0) {
        setSearchParams({ projectId: items[0].id });
      }
    };
    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, setSearchParams]);

  React.useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setContext(null);
      setDraft(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadReviewData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextProject, nextContext, nextDraft] = await Promise.all([
          projectRepository.getProjectById(selectedProjectId),
          projectRepository.getProjectContext(selectedProjectId),
          loadDraft(selectedProjectId),
        ]);
        if (cancelled) return;
        if (!nextProject) {
          setProject(null);
          setContext(null);
          setDraft(null);
          setError(`Project ${selectedProjectId} was not found.`);
          return;
        }
        setProject(nextProject);
        setContext(nextContext);
        setDraft(nextDraft);
      } catch (e) {
        if (cancelled) return;
        setProject(null);
        setContext(null);
        setDraft(null);
        setError(e instanceof Error ? e.message : 'Failed to load review data.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReviewData();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const handleProjectSelect = (event: SelectChangeEvent<string>) => {
    const projectId = event.target.value;
    if (!projectId) return;
    setSearchParams({ projectId });
  };

  const bookId = context?.context.book.id || '';
  const verses = draft && bookId ? listBookVerses(draft, bookId) : [];

  const openTranslate = () => {
    if (!selectedProjectId) {
      navigate('/translate');
      return;
    }
    navigate(`/translate?projectId=${encodeURIComponent(selectedProjectId)}`);
  };

  return (
    <Box p={3} display='flex' flexDirection='column' gap={3}>
      <Typography variant='h5'>Review Queue</Typography>

      <FormControl sx={{ minWidth: 320, maxWidth: 520 }}>
        <InputLabel>Project</InputLabel>
        <Select value={selectedProjectId} onChange={handleProjectSelect} label='Project'>
          {projects.map(item => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity='warning'>{error}</Alert>}
      {loading && <Alert severity='info'>Loading review data...</Alert>}

      {project && (
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <Typography variant='subtitle1'>{project.name}</Typography>
              <Chip label={`${verses.length} translated`} size='small' />
            </Box>

            <Typography variant='body2' color='text.secondary'>
              Language: {project.language.toUpperCase()} • Book:{' '}
              {context?.context.book.name || 'Unknown'}
            </Typography>

            <Box>
              <Button variant='outlined' size='small' onClick={openTranslate}>
                Open In Translate
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant='subtitle1' gutterBottom>
            Recent Translation Draft Entries
          </Typography>
          {verses.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No saved translation draft entries found for this project yet.
            </Typography>
          ) : (
            <List dense>
              {verses.slice(0, 24).map(item => (
                <ListItem key={`${item.chapter}:${item.verse}`}>
                  <ListItemText
                    primary={`${item.chapter}:${item.verse}`}
                    secondary={item.text.slice(0, 140)}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReviewScreen;
