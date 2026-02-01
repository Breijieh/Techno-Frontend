'use client';

import { useState } from 'react';
import {
  Button,
  Box,
  Typography,
  TextField,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Close,
} from '@mui/icons-material';
import AnimatedDialog from './AnimatedDialog';

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: (notes?: string) => void;
  onReject: (notes?: string) => void;
  title: string;
  message?: string;
  itemName?: string;
  loading?: boolean;
  showNotes?: boolean;
  requireNotes?: boolean; // If true, notes are required for reject action
  approveLabel?: string;
  showReject?: boolean;
}

export default function ApprovalDialog({
  open,
  onClose,
  onApprove,
  onReject,
  title,
  message,
  itemName,
  loading = false,
  showNotes = true,
  requireNotes = false,
  approveLabel = 'موافقة',
  showReject = true,
}: ApprovalDialogProps) {
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notesError, setNotesError] = useState('');

  const handleApprove = () => {
    if (loading) return;
    setNotesError('');
    setActionType('approve');
    onApprove(notes || undefined);
  };

  const handleReject = () => {
    if (loading) return;
    if (requireNotes && !notes.trim()) {
      setNotesError('سبب الرفض مطلوب');
      return;
    }
    setNotesError('');
    setActionType('reject');
    onReject(notes || undefined);
  };

  const handleClose = () => {
    if (!loading) {
      setNotes('');
      setNotesError('');
      setActionType(null);
      onClose();
    }
  };

  const isApproving = loading && actionType === 'approve';
  const isRejecting = loading && actionType === 'reject';

  return (
    <AnimatedDialog
      open={open}
      onClose={handleClose}
      title={title}
      maxWidth="sm"
      disableBackdropClick={loading}
      showCloseButton={!loading}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: '8px 0',
        }}
      >
        {message && (
          <Typography
            variant="body1"
            sx={{
              textAlign: 'center',
              color: '#111827',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            {message}
          </Typography>
        )}

        {itemName && (
          <Box
            sx={{
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <Typography
              sx={{
                fontSize: '14px',
                color: '#6B7280',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {itemName}
            </Typography>
          </Box>
        )}

        {showNotes && (
          <TextField
            label={requireNotes ? 'ملاحظات (مطلوب)' : 'ملاحظات (اختياري)'}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (notesError) setNotesError('');
            }}
            multiline
            rows={3}
            fullWidth
            disabled={loading}
            variant="outlined"
            error={!!notesError}
            helperText={notesError}
            required={requireNotes}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FFFFFF',
                '& fieldset': {
                  borderColor: notesError ? '#DC2626' : '#E5E7EB',
                },
                '&:hover fieldset': {
                  borderColor: notesError ? '#DC2626' : '#0c2b7a',
                },
                '&.Mui-focused fieldset': {
                  borderColor: notesError ? '#DC2626' : '#0c2b7a',
                },
              },
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end',
          mt: 3,
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          startIcon={<Close />}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderColor: '#D1D5DB',
            color: '#374151',
            '&:hover': {
              borderColor: '#9CA3AF',
              backgroundColor: '#F9FAFB',
            },
          }}
        >
          إلغاء
        </Button>
        {showReject && (
          <Button
            onClick={handleReject}
            variant="contained"
            startIcon={isRejecting ? <Cancel /> : <Cancel />}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#B91C1C',
              },
              '&:disabled': {
                backgroundColor: '#FCA5A5',
                color: '#FFFFFF',
              },
            }}
          >
            {isRejecting ? 'جارٍ الرفض...' : 'رفض'}
          </Button>
        )}
        <Button
          onClick={handleApprove}
          variant="contained"
          startIcon={isApproving ? <CheckCircle /> : <CheckCircle />}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: '#059669',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#047857',
            },
            '&:disabled': {
              backgroundColor: '#86EFAC',
              color: '#FFFFFF',
            },
          }}
        >
          {isApproving ? `جارٍ ${approveLabel}...` : approveLabel}
        </Button>
      </Box>
    </AnimatedDialog>
  );
}

