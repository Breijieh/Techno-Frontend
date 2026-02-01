'use client';

import {
  Button,
  Box,
  Typography,
} from '@mui/material';
import {
  Warning,
  Delete,
  Cancel,
} from '@mui/icons-material';
import AnimatedDialog from './AnimatedDialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  loading?: boolean;
  confirmLabel?: string;
  confirmColor?: string;
  showWarning?: boolean;
  warningMessage?: string;
  showForceDelete?: boolean;
  onForceDelete?: () => void;
  forceDeleteLabel?: string;
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد من حذف هذا العنصر؟',
  itemName,
  loading = false,
  confirmLabel,
  confirmColor = '#DC2626',
  showWarning = true,
  warningMessage = 'لا يمكن التراجع عن هذا الإجراء.',
  showForceDelete = false,
  onForceDelete,
  forceDeleteLabel = 'حذف قسري (تجاهل المخزون)',
}: DeleteConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      disableBackdropClick={loading}
      showCloseButton={!loading}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '8px 0',
        }}
      >
        {showWarning && (
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: confirmColor === '#F59E0B' ? '#FEF3C7' : '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.05)',
                  opacity: 0.9,
                },
              },
            }}
          >
            <Warning
              sx={{
                fontSize: 32,
                color: confirmColor,
              }}
            />
          </Box>
        )}

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

        {itemName && (
          <Box
            sx={{
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              width: '100%',
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

        {warningMessage && (
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '14px',
              mt: 1,
            }}
          >
            {warningMessage}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end',
          mt: 3,
          flexWrap: 'wrap',
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          startIcon={<Cancel />}
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
            transition: 'all 0.2s ease',
          }}
        >
          إلغاء
        </Button>
        {showForceDelete && onForceDelete && (
          <Button
            onClick={onForceDelete}
            variant="contained"
            startIcon={<Delete />}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#F59E0B',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#D97706',
              },
              '&:disabled': {
                backgroundColor: '#FCD34D',
                color: '#FFFFFF',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'جارٍ الحذف...' : forceDeleteLabel}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          variant="contained"
          startIcon={loading ? undefined : <Delete />}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: confirmColor,
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: confirmColor === '#F59E0B' ? '#D97706' : '#B91C1C',
            },
            '&:disabled': {
              backgroundColor: confirmColor === '#F59E0B' ? '#FCD34D' : '#FCA5A5',
              color: '#FFFFFF',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? (confirmLabel?.includes('Reset') ? 'جارٍ إعادة التعيين...' : 'جارٍ الحذف...') : (confirmLabel || 'حذف')}
        </Button>
      </Box>
    </AnimatedDialog>
  );
}

