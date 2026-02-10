import { Box, CircularProgress, Dialog, DialogContent, Typography } from '@mui/material';
import React from 'react';

interface LoadingDialogProps {
  open: boolean;
  message?: string;
}

const LoadingDialog: React.FC<LoadingDialogProps> = ({ open, message = 'Loading...' }) => {
  return (
    <Dialog
      open={open}
      maxWidth='xs'
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        },
      }}
    >
      <DialogContent style={{ textAlign: 'center', padding: '40px 24px' }}>
        <Box style={{ marginBottom: '20px' }}>
          <CircularProgress size={60} thickness={4} style={{ color: '#00796B' }} />
        </Box>
        <Typography variant='h6' style={{ color: '#00796B', fontWeight: 500 }}>
          {message}
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingDialog;
