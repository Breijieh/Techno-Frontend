'use client';

import { forwardRef } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Switch,
  FormControlLabel,
  Box,
  Autocomplete,
  Chip,
  Typography,
  type InputProps,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { arSA } from 'date-fns/locale';

// Re-export LocalizationProvider for use in forms
export { LocalizationProvider, AdapterDateFns };

// Shared styles to ensure absolute consistency across all form fields
const SHARED_INPUT_STYLES = (error?: boolean) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#FFFFFF',
    height: '56px !important',
    minHeight: '56px !important',
    maxHeight: '56px !important',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    borderRadius: '10px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    direction: 'rtl', // Explicit RTL direction
    '& fieldset': {
      borderColor: error ? '#DC2626' : '#E5E7EB',
      borderWidth: '1.5px',
      transition: 'border-color 0.2s ease, border-width 0.2s ease',
      textAlign: 'right !important', // RTL text alignment - Important for Notch positioning
      // Force RTL context specifically for the notch calculation
      direction: 'rtl',
      '& legend': {
        textAlign: 'right',
        float: 'none', // Ensure floats don't interfere
      },
    },
    '&:hover fieldset': {
      borderColor: error ? '#DC2626' : '#0c2b7a',
    },
    '&.Mui-focused fieldset': {
      borderColor: error ? '#DC2626' : '#0c2b7a',
      borderWidth: '2px',
      boxShadow: error ? 'none' : '0 0 0 3px rgba(12, 43, 122, 0.1)',
    },
    '&.Mui-disabled': {
      backgroundColor: '#F9FAFB',
    },
    '& .MuiInputAdornment-root': {
      height: 'auto',
      maxHeight: '100%',
      // RTL: Force all adornments (prefix/suffix) to be correctly positioned
      marginLeft: '8px',
      marginRight: '-8px',
    },
    '& .MuiIconButton-root': {
      padding: '10px !important',
      height: '40px !important',
      width: '40px !important',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#6B7280',
    fontSize: '14px',
    fontWeight: 500,
    right: 14, // Position label on the right for RTL
    left: 'auto',
    transformOrigin: 'top right', // RTL transform origin
    transform: 'translate(-14px, 18px) scale(1)', // RTL translation
    '&.Mui-focused, &.MuiFormLabel-filled, &.MuiInputLabel-shrink': {
      color: '#0c2b7a',
      fontWeight: 600,
      transform: 'translate(-14px, -11px) scale(0.75)', // RTL shrink transform
    },
    '&.Mui-error': {
      color: '#DC2626',
    },
  },
  '& .MuiInputBase-input': {
    color: '#111827 !important',
    fontSize: '14px',
    padding: '0 16px !important',
    height: '56px !important',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'right', // RTL text alignment
    direction: 'rtl', // Explicit RTL direction
  },
  '& .MuiSelect-select': {
    padding: '0 16px !important',
    height: '56px !important',
    lineHeight: '56px !important',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'right', // RTL text alignment
    direction: 'rtl', // Explicit RTL direction
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginRight: 14, // RTL margin
    marginTop: '4px',
    fontSize: '12px',
    textAlign: 'right', // RTL text alignment
  },
});

interface AnimatedTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  InputProps?: Partial<InputProps>;
}

export const AnimatedTextField = forwardRef<HTMLInputElement, AnimatedTextFieldProps>(
  (
    {
      label,
      value,
      onChange,
      error = false,
      helperText,
      required = false,
      disabled = false,
      type = 'text',
      placeholder,
      fullWidth = true,
      multiline = false,
      rows,
      autoFocus = false,
      inputRef,
      InputProps,
    },
    ref
  ) => {
    return (
      <TextField
        ref={inputRef || ref}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        helperText={helperText}
        required={required}
        disabled={disabled}
        type={type}
        placeholder={placeholder}
        fullWidth={fullWidth}
        multiline={multiline}
        rows={rows}
        autoFocus={autoFocus}
        InputProps={InputProps}
        variant="outlined"
        sx={{
          ...SHARED_INPUT_STYLES(error),
          '& .MuiFormHelperText-root': {
            ...SHARED_INPUT_STYLES(error)['& .MuiFormHelperText-root'],
            animation: error ? 'shake 0.3s ease' : 'none',
            '@keyframes shake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '25%': { transform: 'translateX(-4px)' },
              '75%': { transform: 'translateX(4px)' },
            },
          },
        }}
      />
    );
  }
);

AnimatedTextField.displayName = 'AnimatedTextField';

interface AnimatedSelectProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
}

export function AnimatedSelect({
  label,
  value,
  onChange,
  options,
  error = false,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  placeholder,
}: AnimatedSelectProps) {
  return (
    <FormControl
      fullWidth={fullWidth}
      error={error}
      required={required}
      disabled={disabled}
      sx={SHARED_INPUT_STYLES(error)}
    >
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        displayEmpty
        renderValue={(selected) => {
          if (selected === '' || selected === 0 || !selected) {
            return <span style={{ color: '#9CA3AF' }}>{placeholder || 'اختر خياراً'}</span>;
          }
          const option = options.find(opt => opt.value === selected);
          return option ? option.label : selected;
        }}
      >
        {options.map((option, index) => (
          <MenuItem key={`opt-${option.value}-${index}`} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl >
  );
}

interface AnimatedNumberFieldProps {
  label: string;
  value: number | '';
  onChange: (value: number | '') => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  fullWidth?: boolean;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumberField({
  label,
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  disabled = false,
  min,
  max,
  step,
  fullWidth = true,
  prefix,
  suffix,
}: AnimatedNumberFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '') {
          onChange('');
        } else {
          const num = Number(val);
          if (!isNaN(num)) {
            if (min !== undefined && num < min) return;
            if (max !== undefined && num > max) return;
            onChange(num);
          }
        }
      }}
      type="number"
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      inputProps={{ min, max, step }}
      InputProps={{
        startAdornment: prefix ? (
          <Box sx={{ mr: 1, color: '#6B7280' }}>{prefix}</Box>
        ) : undefined,
        endAdornment: suffix ? (
          <Box sx={{ ml: 1, color: '#6B7280' }}>{suffix}</Box>
        ) : undefined,
      }}
      variant="outlined"
      sx={SHARED_INPUT_STYLES(error)}
    />
  );
}

interface AnimatedDatePickerProps {
  label: string;
  value: Date | null | undefined;
  onChange: (value: Date | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  minDate?: Date;
  maxDate?: Date;
  views?: ('year' | 'month' | 'day')[];
  format?: string;
}

export function AnimatedDatePicker({
  label,
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  minDate,
  maxDate,
  views,
  format,
}: AnimatedDatePickerProps) {
  // Ensure value is never undefined - convert to null for controlled component
  const normalizedValue = value ?? null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={arSA}>
      <DatePicker
        label={label}
        value={normalizedValue}
        onChange={onChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        views={views}
        format={format || 'dd/MM/yyyy'}
        slotProps={{
          textField: {
            fullWidth,
            required,
            error,
            helperText,
            variant: 'outlined',
            sx: {
              ...SHARED_INPUT_STYLES(error),
              // Specific fix for DatePicker icon in RTL
              '& .MuiInputAdornment-root': {
                position: 'absolute',
                left: '14px',
                right: 'auto !important',
                marginLeft: 0,
              },
              '& .MuiInputBase-input': {
                paddingLeft: '50px !important', // Space for icon on left
                paddingRight: '16px !important',
              },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}

interface AnimatedSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  helperText?: string;
}

export function AnimatedSwitch({
  label,
  checked,
  onChange,
  disabled = false,
  helperText,
}: AnimatedSwitchProps) {
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#0c2b7a',
                '& + .MuiSwitch-track': {
                  backgroundColor: '#0c2b7a',
                },
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#0c2b7a',
              },
            }}
          />
        }
        label={label}
        sx={{
          '& .MuiFormControlLabel-label': {
            color: '#111827',
            fontSize: '14px',
          },
        }}
      />
      {helperText && (
        <FormHelperText sx={{ marginLeft: 0, fontSize: '12px', color: '#6B7280' }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  );
}

import { createFilterOptions } from '@mui/material/Autocomplete';
import { normalizeArabicText } from '@/lib/utils/stringUtils';

interface AnimatedAutocompleteProps<T = unknown> {
  label: string;
  value: T | T[] | null | string;
  onChange: (value: T | T[] | null) => void;
  options: T[];
  getOptionLabel: (option: T | string) => string;
  /** Return a unique key for each option to avoid duplicate-key warnings when labels repeat (e.g. same employee name). */
  getOptionKey?: (option: T) => string | number;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  multiple?: boolean;
  freeSolo?: boolean;
}

export function AnimatedAutocomplete<T = unknown>({
  label,
  value,
  onChange,
  options,
  getOptionLabel,
  getOptionKey,
  error = false,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  multiple = false,
  freeSolo = false,
}: AnimatedAutocompleteProps<T>) {

  const filterOptions = createFilterOptions<any>({
    stringify: (option) => normalizeArabicText(getOptionLabel(option as T)),
    ignoreCase: true,
  });

  const getKey = (option: T | string, index: number): string | number => {
    if (typeof option === 'string') return option || index;
    if (getOptionKey) return getOptionKey(option);
    const o = option as { value?: string | number; id?: string | number };
    if (o?.value != null) return o.value;
    if (o?.id != null) return o.id;
    return index;
  };

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue as T | T[] | null)}
      options={options}
      getOptionLabel={getOptionLabel}
      renderOption={(props, option, state) => {
        const { key: _omit, ...rest } = props as { key?: string; [k: string]: unknown };
        return (
          <li {...rest} key={getKey(option, state.index)}>
            {getOptionLabel(option)}
          </li>
        );
      }}
      filterOptions={(options, params) => {
        // Normalize the input value as well
        const normalizedInput = normalizeArabicText(params.inputValue);
        return filterOptions(options as any[], { ...params, inputValue: normalizedInput }) as T[];
      }}
      disabled={disabled}
      multiple={multiple}
      freeSolo={freeSolo}
      fullWidth={fullWidth}
      // RTL support for dropdown
      componentsProps={{
        popper: {
          sx: {
            direction: 'rtl',
            '& .MuiAutocomplete-listbox': {
              textAlign: 'right',
              direction: 'rtl',
            },
            '& .MuiAutocomplete-option': {
              textAlign: 'right',
              direction: 'rtl',
              justifyContent: 'flex-end',
            },
          },
        },
        clearIndicator: {
          sx: {
            // Remove conflicting margins to let flexbox/absolute positioning work
          },
        },
      }}
      sx={{
        direction: 'rtl',
        '& .MuiAutocomplete-endAdornment': {
          right: 'auto !important',
          left: '9px !important',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          zIndex: 5, // Fix clickability
          position: 'absolute',
          pointerEvents: 'none', // Allow clicks to pass through to input
          '& button, & .MuiIconButton-root': {
            pointerEvents: 'auto', // Re-enable clicks for buttons
          },
        },
        '& .MuiAutocomplete-inputRoot': {
          paddingRight: '14px !important',
          paddingLeft: '65px !important',
        },
        '& .MuiAutocomplete-tag': {
          direction: 'rtl',
          margin: '2px', // Better spacing for tags
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          required={required}
          variant="outlined"
          sx={SHARED_INPUT_STYLES(error)}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={index}
            label={getOptionLabel(option)}
            size="small"
            sx={{
              backgroundColor: '#E0E7FF',
              color: '#3730A3',
              direction: 'rtl',
              '& .MuiChip-deleteIcon': {
                marginLeft: '-6px',
                marginRight: '5px',
              },
            }}
          />
        ))
      }
    />
  );
}

interface AnimatedMultiSelectProps {
  label: string;
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options: { value: string | number; label: string }[];
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
}

export function AnimatedMultiSelect({
  label,
  value,
  onChange,
  options,
  error = false,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
}: AnimatedMultiSelectProps) {
  // Convert simple values to option objects for Autocomplete
  const selectedOptions = options.filter(opt => value.includes(opt.value));

  return (
    <AnimatedAutocomplete
      label={label}
      value={selectedOptions}
      onChange={(newValue) => {
        if (Array.isArray(newValue)) {
          onChange(newValue.map(v => (v as { value: string | number }).value));
        } else {
          onChange([]);
        }
      }}
      options={options}
      getOptionLabel={(option) => (option as { label: string }).label}
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      multiple
    />
  );
}

// Custom styled section header
// eslint-disable-next-line react/display-name
export const FormSection = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 3, pb: 1, borderBottom: '1px dashed #e0e0e0' }}>
    <Typography variant="h6" sx={{ color: '#1f2937', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box component="span" sx={{ display: 'flex', color: '#0c2b7a', '& svg': { fontSize: '1.25rem' } }}>{icon}</Box> {title}
    </Typography>
  </Box>
);

