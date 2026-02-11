import {
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import ArchiveIcon from '@mui/icons-material/Archive';
import React from 'react';
import ExportDialog from '../dialogs/ExportDialog';

const steps = [
  {
    icon: <DownloadIcon color='primary' />,
    title: 'Download Resources',
    description: 'Select the resource containers you need before starting a print job.',
  },
  {
    icon: <ArchiveIcon color='primary' />,
    title: 'Prepare Content',
    description: 'Choose the content sections and generate a preview PDF.',
  },
  {
    icon: <PrintIcon color='primary' />,
    title: 'Print or Share',
    description: 'Send the PDF to a printer or share it with translators and reviewers.',
  },
];

const PrintScreen: React.FC = () => {
  const [exportOpen, setExportOpen] = React.useState(false);

  return (
    <Box p={3} display='flex' flexDirection='column' gap={3}>
      <Typography variant='h5'>Print & Export</Typography>
      <Typography variant='body2' color='text.secondary'>
        Export translations to USFM, Markdown, or backup files.
      </Typography>

      <Box>
        <Button variant='contained' onClick={() => setExportOpen(true)}>
          Open Export Tool
        </Button>
      </Box>

      <Card>
        <CardContent>
          <List>
            {steps.map(step => (
              <ListItem key={step.title} sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 40 }}>{step.icon}</ListItemIcon>
                <ListItemText primary={step.title} secondary={step.description} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </Box>
  );
};

export default PrintScreen;
