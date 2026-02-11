import { Avatar, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { readJson, writeJson } from '../../utils/files';

const ProfileScreen: React.FC = () => {
  const { state, setUser } = useApp();
  const [name, setName] = React.useState(state.user?.name ?? '');
  const [email, setEmail] = React.useState(state.user?.email ?? '');
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const disk = await readJson<{ id?: string; name?: string; email?: string }>('profile.json');
      if (!disk) return;
      if (disk.name) setName(disk.name);
      if (disk.email) setEmail(disk.email);
      if (disk.id && (disk.name || disk.email)) {
        setUser({
          id: disk.id,
          name: disk.name || '',
          email: disk.email || '',
        });
      }
    })();
  }, [setUser]);

  const handleSave = async () => {
    const next = {
      id: state.user?.id ?? Date.now().toString(),
      name,
      email,
    };
    setUser(next);
    await writeJson('profile.json', next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box p={3} display='flex' flexDirection='column' gap={3}>
      <Typography variant='h5'>Profile</Typography>

      <Card sx={{ maxWidth: 480 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box display='flex' alignItems='center' gap={2}>
            <Avatar sx={{ width: 64, height: 64 }}>
              {(name || 'TS')[0]?.toUpperCase() ?? 'T'}
            </Avatar>
            <Typography variant='subtitle1' color='text.secondary'>
              Manage your translationStudio account information.
            </Typography>
          </Box>

          <TextField
            label='Full Name'
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label='Email'
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            fullWidth
          />

          <Button
            variant='contained'
            color='primary'
            onClick={handleSave}
            disabled={!name || !email}
          >
            Save Profile
          </Button>
          {saved && (
            <Typography variant='caption' color='success.main'>
              Profile saved.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfileScreen;
