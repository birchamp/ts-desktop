import { Box, Paper } from '@mui/material';
import React from 'react';
import { HashRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import LoadingDialog from '../dialogs/LoadingDialog';
import HomeScreen from '../screens/HomeScreen';
import NewProjectScreen from '../screens/NewProjectScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TranslationScreen from '../screens/TranslationScreen';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import ProfileScreen from '../screens/ProfileScreen';
import ReviewScreen from '../screens/ReviewScreen';
import PrintScreen from '../screens/PrintScreen';
import UpdatesScreen from '../screens/UpdatesScreen';
import TermsScreen from '../screens/TermsScreen';

const SCREEN_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/new': 'New Project',
  '/translate': 'Translate',
  '/review': 'Review',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/print': 'Print & Export',
  '/updates': 'Updates',
  '/terms': 'Terms & Licensing',
};

const DashboardContent: React.FC = () => {
  const { state, setScreen } = useApp();
  const location = useLocation();

  React.useEffect(() => {
    const title = SCREEN_TITLES[location.pathname] ?? 'Home';
    if (state.currentScreen !== title) {
      setScreen(title);
    }
  }, [location.pathname, setScreen, state.currentScreen]);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
      className='no-drag'
    >
      <TitleBar />

      <Box
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <Sidebar />
        <Paper
          elevation={0}
          style={{
            flex: 1,
            margin: '16px',
            marginLeft: '8px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Routes>
            <Route path='/' element={<Navigate to='/home' replace />} />
            <Route path='/home' element={<HomeScreen />} />
            <Route path='/new' element={<NewProjectScreen />} />
            <Route path='/translate' element={<TranslationScreen />} />
            <Route path='/review' element={<ReviewScreen />} />
            <Route path='/settings' element={<SettingsScreen />} />
            <Route path='/profile' element={<ProfileScreen />} />
            <Route path='/print' element={<PrintScreen />} />
            <Route path='/updates' element={<UpdatesScreen />} />
            <Route path='/terms' element={<TermsScreen />} />
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
