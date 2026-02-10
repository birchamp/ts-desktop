/**
 * Import Dialog
 * Allows importing USFM files and project archives
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { Description, CheckCircle, Error as ErrorIcon, Upload, Folder } from '@mui/icons-material';
import React, { useState, useCallback } from 'react';
import { ImportService, extractProjectIdFromUSFM } from '../../services/import/importer';
import { projectRepository } from '../../services/projectRepository';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: (projectId: string) => void;
}

interface FileInfo {
  name: string;
  path: string;
  type: 'usfm' | 'archive' | 'unknown';
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'sw', name: 'Swahili' },
  { code: 'id', name: 'Indonesian' },
];

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onImportComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    projectId?: string;
    error?: string;
  } | null>(null);

  const handleFileSelect = useCallback(async () => {
    try {
      const result = await window.electronAPI?.dialog.open({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'USFM Files', extensions: ['usfm', 'sfm', 'txt'] },
          { name: 'Project Archives', extensions: ['zip', 'tsproj', 'tstudio'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        const files: FileInfo[] = result.filePaths.map((path: string) => {
          const name = path.split(/[\\/]/).pop() || 'Unknown';
          let type: 'usfm' | 'archive' | 'unknown' = 'unknown';

          if (/\.(usfm|sfm|txt)$/i.test(name)) {
            type = 'usfm';
          } else if (/\.(zip|tsproj|tstudio)$/i.test(name)) {
            type = 'archive';
          }

          return { name, path, type };
        });

        setSelectedFiles(files);
        setResult(null);
      }
    } catch (e) {
      console.error('Failed to select files:', e);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      let totalImported = 0;
      let lastProjectId: string | undefined;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProgress(((i + 0.5) / selectedFiles.length) * 100);

        if (file.type === 'usfm') {
          // Read file content as text
          const content = await window.electronAPI?.fs.readAbsoluteText(file.path);
          if (content) {
            const projectId = extractProjectIdFromUSFM(content);
            if (projectId) {
              // Create project record
              await projectRepository.createProject(
                {
                  id: projectId,
                  name: file.name.replace(/\.(usfm|sfm|txt)$/i, ''),
                  type: 'translation',
                  language: targetLanguage,
                  progress: 0,
                  lastModified: Date.now(),
                },
                { recordRecent: true }
              );
              lastProjectId = projectId;
              totalImported++;
            }
          }
        } else if (file.type === 'archive') {
          // TODO: Handle archive imports
          console.log('Archive import not yet implemented:', file.path);
        }

        setProgress(((i + 1) / selectedFiles.length) * 100);
      }

      if (totalImported > 0) {
        setResult({
          success: true,
          projectId: lastProjectId,
        });
      } else {
        setResult({
          success: false,
          error: 'No files were successfully imported.',
        });
      }
    } catch (e) {
      setResult({
        success: false,
        error: e instanceof Error ? e.message : 'An unknown error occurred.',
      });
    } finally {
      setImporting(false);
    }
  }, [selectedFiles, targetLanguage]);

  const handleClose = useCallback(() => {
    if (result?.success && result.projectId && onImportComplete) {
      onImportComplete(result.projectId);
    }
    setSelectedFiles([]);
    setResult(null);
    setProgress(0);
    onClose();
  }, [result, onImportComplete, onClose]);

  const getFileIcon = (type: FileInfo['type']) => {
    switch (type) {
      case 'usfm':
        return <Description color='primary' />;
      case 'archive':
        return <Folder color='secondary' />;
      default:
        return <Description color='action' />;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Import Project</DialogTitle>
      <DialogContent>
        {/* Language Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Target Language</InputLabel>
          <Select
            value={targetLanguage}
            onChange={(e: SelectChangeEvent) => setTargetLanguage(e.target.value)}
            label='Target Language'
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* File Selection */}
        <Card variant='outlined' sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Button
                variant='outlined'
                startIcon={<Upload />}
                onClick={handleFileSelect}
                disabled={importing}
              >
                Select Files
              </Button>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                Supports USFM (.usfm, .sfm) and project archives (.zip, .tsproj)
              </Typography>
            </Box>

            {selectedFiles.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant='subtitle2' gutterBottom>
                  Selected Files ({selectedFiles.length})
                </Typography>
                <List dense>
                  {selectedFiles.map((file, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>{getFileIcon(file.type)}</ListItemIcon>
                      <ListItemText primary={file.name} secondary={file.type.toUpperCase()} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        {importing && (
          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              Importing files...
            </Typography>
            <LinearProgress variant='determinate' value={progress} />
          </Box>
        )}

        {/* Result */}
        {result && (
          <Alert
            severity={result.success ? 'success' : 'error'}
            icon={result.success ? <CheckCircle /> : <ErrorIcon />}
            sx={{ mb: 2 }}
          >
            {result.success ? 'Import completed successfully!' : result.error || 'Import failed.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {result?.success ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={handleImport}
          color='primary'
          variant='contained'
          disabled={selectedFiles.length === 0 || importing}
          startIcon={importing ? <CircularProgress size={16} /> : undefined}
        >
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;
