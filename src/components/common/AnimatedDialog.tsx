'use client';

import { useEffect, ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface AnimatedDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  disableBackdropClick?: boolean;
  showCloseButton?: boolean;
  hideHeader?: boolean;
}

export default function AnimatedDialog({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
  fullWidth = true,
  disableBackdropClick = false,
  showCloseButton = true,
  hideHeader = false,
}: AnimatedDialogProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !disableBackdropClick) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose, disableBackdropClick]);

  return (
    <Dialog
      open={open}
      onClose={disableBackdropClick ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          animation: open ? 'dialogEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          '@keyframes dialogEnter': {
            from: {
              opacity: 0,
              transform: 'scale(0.95) translateY(-10px)',
            },
            to: {
              opacity: 1,
              transform: 'scale(1) translateY(0)',
            },
          },
          overflow: 'hidden',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          animation: open ? 'backdropEnter 0.3s ease-out' : 'none',
          '@keyframes backdropEnter': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        },
      }}
    >
      {!hideHeader && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 24px 16px 24px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            fontWeight: 700,
            fontSize: '20px',
            color: '#111827',
            animation: open ? 'titleEnter 0.4s ease-out 0.1s both' : 'none',
            '@keyframes titleEnter': {
              from: {
                opacity: 0,
                transform: 'translateY(-10px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          {title}
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: '#6B7280',
                '&:hover': {
                  backgroundColor: '#F3F4F6',
                  color: '#111827',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Close />
            </IconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent
        sx={{
          padding: hideHeader ? 0 : '24px',
          backgroundColor: '#FFFFFF',
          maxHeight: hideHeader ? 'none' : '70vh',
          overflowY: 'auto',
          width: 'auto',
          height: 'auto',
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            width: 'auto',
            objectFit: 'contain',
          },
          '& video': {
            maxWidth: '100%',
            height: 'auto',
            width: 'auto',
          },
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#9CA3AF',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#6B7280',
            },
          },
        }}
      >
        {children}
      </DialogContent>

      {actions && (
        <DialogActions
          sx={{
            padding: '16px 24px 24px 24px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E5E7EB',
            gap: 1,
            animation: open ? 'actionsEnter 0.4s ease-out 0.2s both' : 'none',
            '@keyframes actionsEnter': {
              from: {
                opacity: 0,
                transform: 'translateY(10px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}

