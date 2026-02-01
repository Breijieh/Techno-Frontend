'use client';

import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: '#0c2b7a',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#F8F9FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: '"El Messiri", var(--font-tajawal), sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
        startIcon: ({ theme }) => ({
          '& > *:nth-of-type(1)': {
            fontSize: '18px',
            color: 'inherit',
          },
          ...(theme.direction === 'rtl' ? {
            marginLeft: '8px',
            marginRight: '-4px',
          } : {
            marginRight: '8px',
            marginLeft: '-4px',
          }),
        }),
        endIcon: ({ theme }) => ({
          '& > *:nth-of-type(1)': {
            fontSize: '18px',
            color: 'inherit',
          },
          ...(theme.direction === 'rtl' ? {
            marginRight: '8px',
            marginLeft: '-4px',
          } : {
            marginLeft: '8px',
            marginRight: '-4px',
          }),
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: ({ theme }) => ({
          minWidth: 40,
          ...(theme.direction === 'rtl' ? {
            marginLeft: '16px',
            marginRight: '0',
          } : {
            marginRight: '16px',
            marginLeft: '0',
          }),
        }),
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        positionStart: ({ theme }) => ({
          ...(theme.direction === 'rtl' ? {
            marginLeft: '8px',
            marginRight: '0',
          } : {
            marginRight: '8px',
            marginLeft: '0',
          }),
        }),
        positionEnd: ({ theme }) => ({
          ...(theme.direction === 'rtl' ? {
            marginRight: '8px',
            marginLeft: '0',
          } : {
            marginLeft: '8px',
            marginRight: '0',
          }),
        }),
      },
    },
    // RTL support for TextField labels
    MuiInputLabel: {
      styleOverrides: {
        root: {
          right: 14,
          left: 'auto',
          transformOrigin: 'top right',
        },
        shrink: {
          transform: 'translate(-14px, -9px) scale(0.75)',
        },
        outlined: {
          '&.MuiInputLabel-shrink': {
            transform: 'translate(-14px, -9px) scale(0.75)',
          },
        },
      },
    },
    // RTL support for OutlinedInput
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          textAlign: 'right',
        },
      },
    },
    // RTL support for FormHelperText
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          textAlign: 'right',
          marginRight: 14,
          marginLeft: 0,
        },
      },
    },
    // RTL support for Select
    MuiSelect: {
      styleOverrides: {
        icon: {
          right: 'auto',
          left: 7,
        },
      },
    },
  },
});

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}
