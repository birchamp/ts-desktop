import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';
import React from 'react';
import { get } from '../../utils/net';

interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

interface GitHubRelease {
  tag_name?: string;
  name?: string;
  published_at?: string;
  body?: string;
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
  const [checking, setChecking] = React.useState(false);
  const [checkError, setCheckError] = React.useState<string | null>(null);
  const [latestRelease, setLatestRelease] = React.useState<ReleaseNote | null>(null);

  const checkForUpdates = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const response = await get<GitHubRelease>(
        'https://api.github.com/repos/unfoldingWord-dev/ts-desktop/releases/latest',
        {
          responseType: 'json',
          headers: {
            Accept: 'application/vnd.github+json',
          },
        }
      );
      if (!response.ok || !response.data) {
        throw new Error(response.error || `Update check failed with status ${response.status}.`);
      }
      const parsed = response.data;
      const body = parsed.body || '';
      const highlights = body
        .split('\n')
        .map(line => line.replace(/^\s*[-*]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 6);
      setLatestRelease({
        version: parsed.tag_name || parsed.name || 'unknown',
        date: parsed.published_at
          ? new Date(parsed.published_at).toISOString().slice(0, 10)
          : 'unknown',
        highlights:
          highlights.length > 0
            ? highlights
            : ['Release metadata received, but no structured release notes were found.'],
      });
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : 'Failed to check for updates.');
      setLatestRelease(null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box p={3} display='flex' flexDirection='column' gap={3}>
      <Typography variant='h5'>Updates</Typography>
      <Typography variant='body2' color='text.secondary'>
        translationStudio checks for resource and application updates automatically. Latest release
        notes are below.
      </Typography>

      <Box>
        <Button variant='contained' onClick={checkForUpdates} disabled={checking}>
          {checking ? 'Checking...' : 'Check For Updates'}
        </Button>
      </Box>

      {checking && (
        <Box display='flex' alignItems='center' gap={1}>
          <CircularProgress size={16} />
          <Typography variant='body2' color='text.secondary'>
            Contacting release endpoint...
          </Typography>
        </Box>
      )}

      {checkError && <Alert severity='warning'>{checkError}</Alert>}

      {latestRelease && (
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box display='flex' justifyContent='space-between' alignItems='center'>
              <Typography variant='subtitle1'>Latest Release: {latestRelease.version}</Typography>
              <Chip label={latestRelease.date} size='small' color='secondary' variant='outlined' />
            </Box>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {latestRelease.highlights.map(item => (
                <li key={`latest:${item}`}>
                  <Typography variant='body2'>{item}</Typography>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Box display='flex' flexDirection='column' gap={2}>
        {releaseNotes.map(note => (
          <Card key={note.version}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box display='flex' justifyContent='space-between' alignItems='center'>
                <Typography variant='subtitle1'>Version {note.version}</Typography>
                <Chip label={note.date} size='small' color='primary' variant='outlined' />
              </Box>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {note.highlights.map(item => (
                  <li key={item}>
                    <Typography variant='body2'>{item}</Typography>
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
