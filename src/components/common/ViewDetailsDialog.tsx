'use client';

import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import AnimatedDialog from './AnimatedDialog';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface ViewField {
  label: string;
  value: string | number | boolean | Date | React.ReactNode | null | undefined;
  type?: 'text' | 'date' | 'currency' | 'boolean' | 'chip' | 'custom';
  chipColor?: {
    bg: string;
    text: string;
  };
  renderCustom?: (value: string | number | boolean | Date | null | undefined) => React.ReactNode;
}

interface ViewDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: ViewField[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  renderContent?: () => React.ReactNode;
}

export default function ViewDetailsDialog({
  open,
  onClose,
  title,
  fields = [],
  maxWidth = 'md',
  renderContent,
}: ViewDetailsDialogProps) {
  const formatValue = (field: ViewField) => {
    const { value, type, chipColor, renderCustom } = field;

    if (value === null || value === undefined || value === '') {
      return (
        <Typography sx={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>
          غير متوفر
        </Typography>
      );
    }

    // If value is already a React element, return it directly
    if (React.isValidElement(value)) {
      return value;
    }

    if (renderCustom) {
      return renderCustom(value as any);
    }

    switch (type) {
      case 'date':
        return (
          <Typography sx={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>
            {new Date(value as Date).toLocaleDateString('en-GB')}
          </Typography>
        );
      case 'currency':
        return (
          <Typography sx={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>
            ر.س {formatNumber(value as number)}
          </Typography>
        );
      case 'boolean':
        return (
          <Chip
            label={value ? 'نعم' : 'لا'}
            size="small"
            sx={{
              backgroundColor: value ? '#D1FAE5' : '#F3F4F6',
              color: value ? '#065F46' : '#6B7280',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        );
      case 'chip':
        return (
          <Chip
            label={String(value)}
            size="small"
            sx={{
              backgroundColor: chipColor?.bg || '#E0E7FF',
              color: chipColor?.text || '#3730A3',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        );
      default:
        return (
          <Typography sx={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>
            {String(value)}
          </Typography>
        );
    }
  };

  return (
    <AnimatedDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
      actions={
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          {/* View dialogs typically don't need actions, but can be customized */}
        </Box>
      }
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          paddingTop: 2,
        }}
      >
        {(fields || []).map((field, index) => (
          <Box
            key={index}
            sx={{
              animation: open
                ? `fieldEnter 0.3s ease-out ${index * 0.05}s both`
                : 'none',
              '@keyframes fieldEnter': {
                from: {
                  opacity: 0,
                  transform: 'translateX(-10px)',
                },
                to: {
                  opacity: 1,
                  transform: 'translateX(0)',
                },
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 0.5, sm: 2 },
                padding: '12px 0',
              }}
            >
              <Box
                sx={{
                  minWidth: { xs: '100%', sm: '180px' },
                  maxWidth: { xs: '100%', sm: '180px' },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '13px',
                    color: '#6B7280',
                    fontWeight: 500,
                    mb: { xs: 0.5, sm: 0 },
                  }}
                >
                  {field.label}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                {formatValue(field)}
              </Box>
            </Box>
            {index < (fields || []).length - 1 && (
              <Divider
                sx={{
                  borderColor: '#E5E7EB',
                  animation: open
                    ? `dividerEnter 0.3s ease-out ${index * 0.05 + 0.1}s both`
                    : 'none',
                  '@keyframes dividerEnter': {
                    from: { opacity: 0, scaleX: 0 },
                    to: { opacity: 1, scaleX: 1 },
                  },
                }}
              />
            )}
          </Box>
        ))}

        {renderContent && (
          <Box sx={{ mt: 2, borderTop: '1px solid #E5E7EB', pt: 2 }}>
            {renderContent()}
          </Box>
        )}
      </Box>
    </AnimatedDialog>
  );
}

