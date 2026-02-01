'use client';

import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorDisplayProps {
  error?: string | null;
  message?: string | null; // Backward compatibility
  onRetry?: () => void;
  title?: string;
  severity?: 'error' | 'warning' | 'info';
}

export default function ErrorDisplay({
  error,
  message,
  onRetry,
  title = 'خطأ',
  severity = 'error'
}: ErrorDisplayProps) {
  const errorMessage = error || message;

  if (!errorMessage) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Alert
        severity={severity}
        icon={<ErrorOutline />}
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry} startIcon={<Refresh />}>
              إعادة المحاولة
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {errorMessage}
      </Alert>
    </Box>
  );
}

