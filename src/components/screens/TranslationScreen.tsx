import React from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  ProjectContextRecord,
  ProjectRecord,
  projectRepository,
} from '../../services/projectRepository';

const TranslationScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [project, setProject] = React.useState<ProjectRecord | null>(null);
  const [projectContext, setProjectContext] = React.useState<ProjectContextRecord | null>(null);

  React.useEffect(() => {
    if (!projectId) {
      setLoading(false);
      setError(null);
      setProject(null);
      setProjectContext(null);
      return;
    }

    let cancelled = false;
    const loadProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectRecord, contextRecord] = await Promise.all([
          projectRepository.getProjectById(projectId),
          projectRepository.getProjectContext(projectId),
        ]);
        if (cancelled) return;
        if (!projectRecord) {
          setProject(null);
          setProjectContext(null);
          setError(`Project ${projectId} was not found.`);
          return;
        }
        setProject(projectRecord);
        setProjectContext(contextRecord);
      } catch (e) {
        if (cancelled) return;
        setProject(null);
        setProjectContext(null);
        setError(e instanceof Error ? e.message : 'Failed to load selected project.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const context = projectContext?.context;
  const book = context?.book;
  const resource = context?.resource;
  const support = context?.supportSummary;

  return (
    <Box p={2} display='flex' flexDirection='column' style={{ gap: 12, height: '100%' }}>
      {!projectId && (
        <Alert severity='info'>
          Open a project from Home or create one in New Project to load translation context.
        </Alert>
      )}

      {error && <Alert severity='warning'>{error}</Alert>}

      {loading && (
        <Box display='flex' alignItems='center' style={{ gap: 8 }}>
          <CircularProgress size={18} />
          <Typography variant='body2'>Loading project context...</Typography>
        </Box>
      )}

      <Box display='flex' style={{ gap: 16, height: '100%' }}>
        <Paper style={{ width: 320, minWidth: 280, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Navigation</Typography>
          {project ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant='subtitle1'>{project.name}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {project.language} • {project.id}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                {book && <Chip label={`Book: ${book.name}`} size='small' color='primary' />}
                {resource && (
                  <Chip
                    label={`Resource: ${resource.name} (${resource.source})`}
                    size='small'
                    variant='outlined'
                  />
                )}
                {support && (
                  <Chip
                    label={`TN ${support.tnRows} • TWL ${support.twlRows} • TW ${support.twArticles}`}
                    size='small'
                    variant='outlined'
                  />
                )}
              </Box>
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              Book/Chapter/Verse
            </Typography>
          )}
        </Paper>

        <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Source Text</Typography>
          {resource && resource.source !== 'none' ? (
            <>
              <Typography variant='body2' color='text.secondary'>
                Source resource: {resource.name}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {resource.owner ? `Owner: ${resource.owner}` : 'Owner: n/a'}
                {resource.version ? ` • v${resource.version}` : ''}
                {resource.language ? ` • ${resource.language}` : ''}
              </Typography>
            </>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              Placeholder source content (demo mode until a source resource is selected).
            </Typography>
          )}
        </Paper>

        <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
          <Typography variant='h6'>Target Translation</Typography>
          <Typography variant='body2' color='text.secondary'>
            Placeholder target editor…
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default TranslationScreen;
