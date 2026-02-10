import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Send Feedback</DialogTitle>
      <DialogContent>
        <Typography style={{ marginBottom: '16px' }}>
          Help us improve translationStudio by sharing your feedback.
        </Typography>
        <TextField label='Your Email' fullWidth margin='normal' variant='outlined' />
        <TextField
          label='Feedback'
          fullWidth
          multiline
          rows={4}
          margin='normal'
          variant='outlined'
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onClose} color='primary'>
          Send Feedback
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
