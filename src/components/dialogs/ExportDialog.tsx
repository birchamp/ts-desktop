/**
 * Export Dialog
 * Allows exporting projects to USFM, Markdown, and backup formats
 */

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Download,
  Description,
  Archive,
} from '@mui/icons-material';
import React, { useState, useCallback, useEffect } from 'react';
import { generateUSFM, ProjectMeta, TranslationChunk } from '../../services/export/exporter';
import { projectRepository, ProjectRecord } from '../../services/projectRepository';
import { buildProjectBackup } from '../../services/backup/projectBackup';
import { readText, writeAbsoluteFile } from '../../utils/files';
import { saveDialog } from '../../utils/dialog';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected project ID */
  projectId?: string;
}

type ExportFormat = 'usfm' | 'markdown' | 'backup';

const FORMAT_OPTIONS = [
  {
    value: 'usfm',
    label: 'USFM',
    description: 'Standard Bible translation format',
    icon: <Description />,
  },
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'For Open Bible Stories and documentation',
    icon: <Description />,
  },
  {
    value: 'backup',
    label: 'Project Backup (.tstudio)',
    description: 'Full project archive for backup or sharing',
    icon: <Archive />,
  },
];

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, projectId }) => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('usfm');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    filename?: string;
    error?: string;
  } | null>(null);

  // Load projects on open
  useEffect(() => {
    if (open) {
      loadProjects();
      if (projectId) {
        setSelectedProjectId(projectId);
      }
    }
  }, [open, projectId]);

  const loadProjects = useCallback(async () => {
    try {
      const projectList = await projectRepository.listProjects();
      setProjects(projectList);
      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, [selectedProjectId]);

  const handleExport = useCallback(async () => {
    if (!selectedProjectId) return;

    setExporting(true);
    setProgress(0);
    setResult(null);

    try {
      const project = projects.find(p => p.id === selectedProjectId);
      if (!project) {
        throw new Error('Project not found');
      }
      const assets = await projectRepository.getProjectAssets(project.id);

      setProgress(20);

      const chunks: TranslationChunk[] = [];
      const meta: ProjectMeta = {
        project: {
          id: project.id,
          name: project.name,
        },
        target_language: {
          id: project.language,
          name: project.language,
          direction: 'ltr',
        },
        resource: {
          id: 'ult',
          name: 'Unlocked Literal Text',
        },
        unique_id: project.id,
        format: exportFormat === 'markdown' ? 'markdown' : 'usfm',
        project_type_class: 'bible',
      };

      setProgress(40);

      let content = '';
      let filename = '';
      const importedUsfm = assets?.sourceUsfmPath ? await readText(assets.sourceUsfmPath) : null;

      if (exportFormat === 'usfm') {
        content = importedUsfm?.trim() ? `${importedUsfm.trim()}\n` : generateUSFM(chunks, meta);
        filename = `${project.name.replace(/\s+/g, '_')}.usfm`;
      } else if (exportFormat === 'markdown') {
        const markdownBody = importedUsfm?.trim()
          ? `\`\`\`usfm\n${importedUsfm.trim()}\n\`\`\`\n`
          : 'Exported translation project.\n';
        content = `# ${project.name}\n\n${markdownBody}`;
        filename = `${project.name.replace(/\s+/g, '_')}.md`;
      } else {
        const backup = await buildProjectBackup(project.id);
        content = `${JSON.stringify(backup, null, 2)}\n`;
        filename = `${project.name.replace(/\s+/g, '_')}.tstudio`;
      }

      setProgress(70);

      // Show save dialog
      const saveResult = await saveDialog({
        defaultPath: filename,
        filters: [
          exportFormat === 'usfm'
            ? { name: 'USFM Files', extensions: ['usfm'] }
            : exportFormat === 'markdown'
              ? { name: 'Markdown Files', extensions: ['md'] }
              : { name: 'Project Backup', extensions: ['tstudio'] },
        ],
      });

      if (saveResult && !saveResult.canceled && saveResult.filePath) {
        // Write file
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const writeOk = await writeAbsoluteFile(saveResult.filePath, data);
        if (!writeOk) {
          throw new Error('Failed to write export output file.');
        }

        setProgress(100);
        setResult({
          success: true,
          filename: saveResult.filePath.split(/[\\/]/).pop(),
        });
      } else {
        setResult({
          success: false,
          error: 'Export cancelled.',
        });
      }
    } catch (e) {
      setResult({
        success: false,
        error: e instanceof Error ? e.message : 'An unknown error occurred.',
      });
    } finally {
      setExporting(false);
    }
  }, [selectedProjectId, projects, exportFormat]);

  const handleClose = useCallback(() => {
    setResult(null);
    setProgress(0);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Export Project</DialogTitle>
      <DialogContent>
        {/* Project Selection */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Project</InputLabel>
          <Select
            value={selectedProjectId}
            onChange={(e: SelectChangeEvent) => setSelectedProjectId(e.target.value)}
            label='Project'
          >
            {projects.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Format Selection */}
        <Typography variant='subtitle2' gutterBottom>
          Export Format
        </Typography>
        <RadioGroup
          value={exportFormat}
          onChange={e => setExportFormat(e.target.value as ExportFormat)}
        >
          {FORMAT_OPTIONS.map(opt => (
            <FormControlLabel
              key={opt.value}
              value={opt.value}
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {opt.icon}
                  <Box>
                    <Typography variant='body2'>{opt.label}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {opt.description}
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ mb: 1 }}
            />
          ))}
        </RadioGroup>

        <Divider sx={{ my: 2 }} />

        {/* Progress */}
        {exporting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              Exporting project...
            </Typography>
            <LinearProgress variant='determinate' value={progress} />
          </Box>
        )}

        {/* Result */}
        {result && (
          <Alert
            severity={result.success ? 'success' : 'error'}
            icon={result.success ? <CheckCircle /> : <ErrorIcon />}
          >
            {result.success ? `Exported to ${result.filename}` : result.error || 'Export failed.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={exporting}>
          {result?.success ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={handleExport}
          color='primary'
          variant='contained'
          disabled={!selectedProjectId || exporting}
          startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
        >
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
