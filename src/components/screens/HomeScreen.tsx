import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
} from '@mui/material';
import { Add, Delete, PlayArrow, Upload } from '@mui/icons-material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import {
  projectRepository,
  RecentProjectRecord as RecentProject,
  ProjectRecord,
} from '../../services/projectRepository';
import { openFile } from '../../utils/dialog';
import { importUsfm } from '../../utils/import/usfm';

const HomeScreen: React.FC = () => {
  const { state, setAppLoaded } = useApp();
  const [recents, setRecents] = React.useState<RecentProject[]>([]);
  const [dbProjects, setDbProjects] = React.useState<ProjectRecord[]>([]);
  const navigate = useNavigate();

  // Mark app as loaded when component mounts
  React.useEffect(() => {
    setAppLoaded(true);
  }, []);

  React.useEffect(() => {
    (async () => {
      const items = await projectRepository.listRecentProjects(5);
      setRecents(items);
      const projects = await projectRepository.listProjects();
      setDbProjects(projects);
    })();
  }, []);

  const refresh = React.useCallback(async () => {
    const items = await projectRepository.listRecentProjects(5);
    setRecents(items);
    const projects = await projectRepository.listProjects();
    setDbProjects(projects);
  }, []);

  const handleNewProject = () => {
    navigate('/new');
  };

  const handleImportProject = async () => {
    const res = await openFile([
      { name: 'USFM or Project Archive', extensions: ['usfm', 'zip', 'tsproj'] },
    ]);
    if (res.canceled || !res.filePaths.length) return;
    const filePath = res.filePaths[0];
    if (/\.usfm$/i.test(filePath)) {
      await importUsfm(filePath, 'en');
      await refresh();
    } else {
      const fileName = filePath.split(/[\\/]/).pop() || 'Imported Project';
      const baseName = fileName.replace(/\.(zip|tsproj)$/i, '');
      const id = Date.now().toString();
      await projectRepository.createProject(
        {
          id,
          name: baseName,
          type: 'translation',
          language: 'en',
          progress: 0,
          lastModified: Date.now(),
        },
        { recordRecent: true }
      );
      await refresh();
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await projectRepository.deleteProject(projectId);
    await refresh();
  };

  const handleOpenProject = (projectId: string) => {
    // TODO: Open project in translation screen
    navigate('/translate');
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
          justifyContent: 'space-between',
        }}
      >
        <Typography variant='h5' component='h1'>
          translationStudio
        </Typography>
        <Box>
          <Button
            variant='contained'
            onClick={handleNewProject}
            style={{
              backgroundColor: 'white',
              color: '#00796B',
              marginRight: 12,
            }}
          >
            <Add style={{ marginRight: '8px' }} />
            New Project
          </Button>
          <Button
            variant='outlined'
            onClick={handleImportProject}
            style={{
              borderColor: 'white',
              color: 'white',
            }}
          >
            <Upload style={{ marginRight: 8 }} /> Import
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column' }}>
        {/* Welcome Card */}
        <Card style={{ maxWidth: 600, marginBottom: '30px', alignSelf: 'center' }}>
          <CardContent style={{ textAlign: 'center', padding: '30px' }}>
            <Typography variant='h6' gutterBottom>
              Welcome to translationStudio
            </Typography>
            <Typography variant='body2' color='textSecondary' style={{ marginBottom: '20px' }}>
              Create a new project or continue working on an existing one to start translating.
            </Typography>
            <Button
              variant='contained'
              size='large'
              onClick={handleNewProject}
              style={{ minWidth: '150px' }}
            >
              Get Started
            </Button>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        {recents.length > 0 && (
          <Box style={{ maxWidth: 800, alignSelf: 'center', width: '100%', marginBottom: '24px' }}>
            <Typography variant='h6' gutterBottom style={{ marginBottom: '12px' }}>
              Recent Projects
            </Typography>
            <Card>
              <List dense>
                {recents.map(r => (
                  <ListItem key={r.id} divider button onClick={() => handleOpenProject(r.id)}>
                    <ListItemText
                      primary={r.name}
                      secondary={`${r.language} • ${new Date(r.lastOpened).toLocaleString()}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge='end' onClick={() => handleOpenProject(r.id)}>
                        <PlayArrow />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Box>
        )}

        {/* Projects List */}
        {(dbProjects.length > 0 || state.projects.length > 0) && (
          <Box style={{ maxWidth: 800, alignSelf: 'center', width: '100%' }}>
            <Typography variant='h6' gutterBottom style={{ marginBottom: '20px' }}>
              Your Projects
            </Typography>

            <Card>
              <List>
                {(dbProjects.length > 0 ? dbProjects : state.projects).map(project => (
                  <ListItem key={project.id} divider>
                    <ListItemText
                      primary={
                        <Box style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Typography variant='subtitle1'>{project.name}</Typography>
                          <Chip
                            label={`${project.progress ?? 0}%`}
                            size='small'
                            color={(project.progress ?? 0) === 100 ? 'primary' : 'default'}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant='body2' color='textSecondary'>
                          {project.language} • Last modified:{' '}
                          {new Date(project.lastModified ?? Date.now()).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge='end'
                        onClick={() => handleOpenProject(project.id)}
                        style={{ marginRight: 8 }}
                      >
                        <PlayArrow />
                      </IconButton>
                      <IconButton edge='end' onClick={() => handleDeleteProject(project.id)}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Card>
          </Box>
        )}

        {/* Empty State */}
        {state.projects.length === 0 && dbProjects.length === 0 && (
          <Box style={{ textAlign: 'center', marginTop: '50px' }}>
            <Typography variant='h6' color='textSecondary' gutterBottom>
              No projects yet
            </Typography>
            <Typography variant='body2' color='textSecondary'>
              Create your first translation project to get started.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HomeScreen;
