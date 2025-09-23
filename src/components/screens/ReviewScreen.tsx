import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';
import { useApp } from '../../contexts/AppContext';

const ReviewScreen: React.FC = () => {
  const { state } = useApp();
  const projects = state.projects.length ? state.projects : [
    {
      id: 'sample-review-1',
      name: 'Genesis 1-5',
      type: 'translation',
      language: 'en',
      progress: 68,
      lastModified: new Date(),
    },
  ];

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5">Review Queue</Typography>

      <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}>
        {projects.map(project => (
          <Card key={project.id}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">{project.name}</Typography>
                <Chip
                  label={`${project.progress ?? 0}%`}
                  color={(project.progress ?? 0) >= 80 ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Language: {project.language.toUpperCase()} • Updated {new Date(project.lastModified ?? Date.now()).toLocaleDateString()}
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Translation Checks
                </Typography>
                <LinearProgress variant="determinate" value={project.progress ?? 0} sx={{ mt: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Recent Feedback
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Chapter 3 verse 5 reviewed by Maria"
                secondary="Suggested smoother phrasing for target language"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Chapter 4 verse 1 reviewed by Daniel"
                secondary="Verified theological accuracy"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReviewScreen;
