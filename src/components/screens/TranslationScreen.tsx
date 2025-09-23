import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TranslationScreen: React.FC = () => {
  return (
    <Box p={2} display="flex" style={{ gap: 16, height: '100%' }}>
      <Paper style={{ width: 320, minWidth: 280, padding: 12, overflow: 'auto' }}>
        <Typography variant="h6">Navigation</Typography>
        <Typography variant="body2">Book/Chapter/Verse</Typography>
      </Paper>

      <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
        <Typography variant="h6">Source Text</Typography>
        <Typography variant="body2" color="textSecondary">
          Placeholder source content…
        </Typography>
      </Paper>

      <Paper style={{ flex: 1, padding: 12, overflow: 'auto' }}>
        <Typography variant="h6">Target Translation</Typography>
        <Typography variant="body2" color="textSecondary">
          Placeholder target editor…
        </Typography>
      </Paper>
    </Box>
  );
};

export default TranslationScreen;
