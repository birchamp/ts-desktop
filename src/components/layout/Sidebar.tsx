import { Box, List, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import TranslateIcon from '@mui/icons-material/Translate';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import PrintIcon from '@mui/icons-material/Print';
import UpdateIcon from '@mui/icons-material/Update';
import ArticleIcon from '@mui/icons-material/Article';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  description: string;
  icon: React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home', description: 'Overview of projects', icon: <HomeIcon /> },
  {
    label: 'New Project',
    path: '/new',
    description: 'Create translation projects',
    icon: <AddCircleIcon />,
  },
  {
    label: 'Translate',
    path: '/translate',
    description: 'Work on translations',
    icon: <TranslateIcon />,
  },
  {
    label: 'Review',
    path: '/review',
    description: 'Quality checks and feedback',
    icon: <RateReviewIcon />,
  },
  {
    label: 'Settings',
    path: '/settings',
    description: 'Application preferences',
    icon: <SettingsIcon />,
  },
  { label: 'Profile', path: '/profile', description: 'Account information', icon: <PersonIcon /> },
  {
    label: 'Print',
    path: '/print',
    description: 'Export and print resources',
    icon: <PrintIcon />,
  },
  {
    label: 'Updates',
    path: '/updates',
    description: 'Resource and app updates',
    icon: <UpdateIcon />,
  },
  {
    label: 'Terms',
    path: '/terms',
    description: 'Legal and license details',
    icon: <ArticleIcon />,
  },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box
      component='nav'
      sx={{
        width: 220,
        minWidth: 220,
        backgroundColor: '#f2f5f4',
        borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        overflowY: 'auto',
      }}
    >
      <List dense sx={{ paddingY: 1 }}>
        {NAV_ITEMS.map(item => {
          const selected = location.pathname === item.path;
          return (
            <Tooltip key={item.path} title={item.description} placement='right' arrow>
              <ListItemButton
                selected={selected}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: '0 24px 24px 0',
                  marginRight: 1,
                }}
              >
                <ListItemIcon sx={{ color: selected ? '#00796B' : 'inherit', minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: selected ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
};

export default Sidebar;
