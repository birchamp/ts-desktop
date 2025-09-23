import { Box, Paper } from '@mui/material';
import React from 'react';
import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import LoadingDialog from '../dialogs/LoadingDialog';
import HomeScreen from '../screens/HomeScreen';
import NewProjectScreen from '../screens/NewProjectScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TranslationScreen from '../screens/TranslationScreen';
import TitleBar from './TitleBar';

const DashboardContent: React.FC = () => {
  const { state } = useApp();

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <TitleBar />

      <Box
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <Paper
          elevation={0}
          style={{
            flex: 1,
            margin: '16px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/new" element={<NewProjectScreen />} />
            <Route path="/translate" element={<TranslationScreen />} />
            <Route path="/review" element={<div>Review Screen - Coming Soon</div>} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/profile" element={<div>Profile Screen - Coming Soon</div>} />
            <Route path="/print" element={<div>Print Screen - Coming Soon</div>} />
            <Route path="/updates" element={<div>Updates Screen - Coming Soon</div>} />
            <Route path="/terms" element={<div>Terms Screen - Coming Soon</div>} />
          </Routes>
        </Paper>
      </Box>

      {/* Status Bar - equivalent to Polymer dashboard statusbar */}
      <Box
        style={{
          width: '100%',
          backgroundColor: '#00796B',
          color: 'white',
          minHeight: '30px',
          padding: '0 20px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span>Status: </span>
        <span style={{ paddingLeft: '10px' }}>
          {state.currentScreen ? `Viewing ${state.currentScreen}` : 'Ready'}
        </span>
      </Box>

      <LoadingDialog open={state.loading} />
    </Box>
  );
};

const Dashboard: React.FC = () => {
  return (
    <Router>
      <DashboardContent />
    </Router>
  );
};

export default Dashboard;
