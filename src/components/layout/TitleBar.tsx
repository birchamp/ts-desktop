import { Box, IconButton, Typography } from '@mui/material';
import { Close, Maximize, Minimize } from '@mui/icons-material';
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { closeWindow, maximizeWindow, minimizeWindow } from '../../utils/files';

const TitleBar: React.FC = () => {
  const { state } = useApp();

  const handleMinimize = () => {
    // Electron minimize window
    minimizeWindow();
  };

  const handleMaximize = () => {
    maximizeWindow();
  };

  const handleClose = () => {
    closeWindow();
  };

  return (
    <div
      style={{
        backgroundColor: '#00796B',
        height: '40px',
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
      } as any}
    >
      <Typography
        variant="h6"
        component="div"
        style={{
          flexGrow: 1,
          fontSize: '14px',
          fontWeight: 500,
          color: 'white',
        }}
      >
        translationStudio
      </Typography>

      <Box style={{ display: 'flex', gap: '4px' }}>
        <IconButton
          size="small"
          onClick={handleMinimize}
          style={{
            color: 'white',
            padding: '4px',
          } as any}
        >
          <Minimize fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={handleMaximize}
          style={{
            color: 'white',
            padding: '4px',
          } as any}
        >
          <Maximize fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={handleClose}
          style={{
            color: 'white',
            padding: '4px',
          } as any}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>
    </div>
  );
};

export default TitleBar;
