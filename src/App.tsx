import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';
import Dashboard from './components/layout/Dashboard';
import { AppProvider } from './contexts/AppContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00796B',
    },
    secondary: {
      main: '#FF5722',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Dashboard />
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
