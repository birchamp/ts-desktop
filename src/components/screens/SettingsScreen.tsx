import React from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useApp } from '../../contexts/AppContext';
import { readJson, writeJson } from '../../utils/files';

const SettingsScreen: React.FC = () => {
  const { state, updateSettings } = useApp();
  const [language, setLanguage] = React.useState(state.settings.language);
  const [fontSize, setFontSize] = React.useState(state.settings.fontSize);
  const [autoSave, setAutoSave] = React.useState(state.settings.autoSave);

  React.useEffect(() => {
    // Load persisted settings
    (async () => {
      const disk = await readJson<Partial<typeof state.settings>>('settings.json');
      if (disk) {
        updateSettings(disk);
        if (disk.language) setLanguage(disk.language);
        if (typeof disk.fontSize === 'number') setFontSize(disk.fontSize);
        if (typeof disk.autoSave === 'boolean') setAutoSave(disk.autoSave);
      }
    })();
  }, []);

  const handleSave = async () => {
    const next = { language, fontSize, autoSave };
    updateSettings(next);
    await writeJson('settings.json', next);
  };

  return (
    <Box p={3} display='flex' flexDirection='column' style={{ gap: 16 }}>
      <Typography variant='h5'>Settings</Typography>

      <Box display='flex' style={{ gap: 24 }}>
        <Box display='flex' flexDirection='column' style={{ gap: 12, minWidth: 280 }}>
          <Typography variant='subtitle1'>Language</Typography>
          <Select value={language} onChange={e => setLanguage(e.target.value as string)}>
            <MenuItem value='en'>English</MenuItem>
            <MenuItem value='es-419'>Spanish (LATAM)</MenuItem>
            <MenuItem value='fr'>French</MenuItem>
          </Select>
        </Box>

        <Box display='flex' flexDirection='column' style={{ gap: 12, minWidth: 280 }}>
          <Typography variant='subtitle1'>Font Size</Typography>
          <TextField
            type='number'
            inputProps={{ min: 10, max: 24 }}
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
          />
        </Box>
      </Box>

      <FormControlLabel
        control={<Switch checked={autoSave} onChange={e => setAutoSave(e.target.checked)} />}
        label='Auto Save'
      />

      <Box>
        <Button color='primary' variant='contained' onClick={handleSave}>
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsScreen;
