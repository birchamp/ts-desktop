import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import React from 'react';

interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

const releaseNotes: ReleaseNote[] = [
  {
    version: '12.2.0',
    date: '2025-09-10',
    highlights: [
      'Added React-based dashboard experience',
      'Improved USFM import performance',
      'Resolved synchronization issues when switching projects',
    ],
  },
  {
    version: '12.1.1',
    date: '2025-07-22',
    highlights: [
      'Bundled new resource containers for Swahili and Hindi',
      'Fixed download retries for Door43 resources',
    ],
  },
];

const UpdatesScreen: React.FC = () => {
  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5">Updates</Typography>
      <Typography variant="body2" color="text.secondary">
        translationStudio checks for resource and application updates automatically. Latest release notes are below.
      </Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        {releaseNotes.map(note => (
          <Card key={note.version}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">Version {note.version}</Typography>
                <Chip label={note.date} size="small" color="primary" variant="outlined" />
              </Box>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {note.highlights.map(item => (
                  <li key={item}>
                    <Typography variant="body2">{item}</Typography>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default UpdatesScreen;
