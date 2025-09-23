import { Avatar, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import React from 'react';
import { useApp } from '../../contexts/AppContext';

const ProfileScreen: React.FC = () => {
  const { state, setUser } = useApp();
  const [name, setName] = React.useState(state.user?.name ?? '');
  const [email, setEmail] = React.useState(state.user?.email ?? '');

  const handleSave = () => {
    setUser({
      id: state.user?.id ?? Date.now().toString(),
      name,
      email,
    });
  };

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5">Profile</Typography>

      <Card sx={{ maxWidth: 480 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ width: 64, height: 64 }}>
              {(name || 'TS')[0]?.toUpperCase() ?? 'T'}
            </Avatar>
            <Typography variant="subtitle1" color="text.secondary">
              Manage your translationStudio account information.
            </Typography>
          </Box>

          <TextField label="Full Name" value={name} onChange={e => setName(e.target.value)} fullWidth />
          <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />

          <Button variant="contained" color="primary" onClick={handleSave} disabled={!name || !email}>
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfileScreen;
