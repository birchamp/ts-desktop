import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import React from 'react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Project</DialogTitle>
      <DialogContent>
        <Typography>
          Import functionality will be implemented based on the original Polymer ts-import-options component.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onClose} color="primary">Import</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;



