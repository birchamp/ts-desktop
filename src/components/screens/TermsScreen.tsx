import { Box, Card, CardContent, Typography } from '@mui/material';
import React from 'react';

const TermsScreen: React.FC = () => {
  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5">Terms & Licensing</Typography>
      <Typography variant="body2" color="text.secondary">
        translationStudio is part of the unfoldingWord suite of tools. This screen summarizes key terms; consult the full license for details.
      </Typography>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1">Usage</Typography>
          <Typography variant="body2">
            You may copy, adapt, and distribute content created with translationStudio provided attribution is retained where required.
          </Typography>

          <Typography variant="subtitle1">Contributions</Typography>
          <Typography variant="body2">
            Contributions are welcome through the official GitHub repository. By contributing you agree to the project&apos;s contributor guidelines and license.
          </Typography>

          <Typography variant="subtitle1">Privacy</Typography>
          <Typography variant="body2">
            translationStudio stores project data locally on your device. Sync features use encrypted connections when interacting with Door43.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TermsScreen;
