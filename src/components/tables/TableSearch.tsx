import React, { useMemo, useState } from 'react';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';
import { type MRT_TableInstance } from 'material-react-table';

interface TableSearchProps<TData extends Record<string, any> = {}> {
    table: MRT_TableInstance<TData>;
}

export const TableSearch = <TData extends Record<string, any>>({
    table,
}: TableSearchProps<TData>) => {
    const [inputValue, setInputValue] = useState('');

    // Generate unique options from text-based columns
    const searchOptions = useMemo(() => {
        const options = new Set<string>();
        const rows = table.getPrePaginationRowModel().rows;
        const allColumns = table.getAllColumns();

        // Get columns that should provide search suggestions
        allColumns.forEach(col => {
            const def = col.columnDef;
            const id = col.id;

            // Skip if explicitly disabled for global filter
            if (def.enableGlobalFilter === false) return;

            // Skip system columns
            if (!def.header || typeof def.header !== 'string') return;

            // Collect values from this column
            rows.forEach(row => {
                const val = row.getValue(id);

                // Skip null/undefined/empty
                if (val === null || val === undefined || val === '') return;

                const strVal = String(val).trim();
                if (!strVal || strVal === '-') return;

                // Skip if purely numeric
                if (/^[\d.,٠-٩۰-۹\s]+$/.test(strVal)) return;

                // Skip time formats
                if (/^\d{1,2}:\d{2}/.test(strVal)) return;

                // Skip date formats
                if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(strVal)) return;

                // Add to options
                options.add(strVal);
            });
        });

        return Array.from(options).sort((a, b) => a.localeCompare(b, 'ar'));
    }, [table.getPrePaginationRowModel().rows, table.getAllColumns()]);

    const handleInputChange = (_: React.SyntheticEvent, newValue: string) => {
        setInputValue(newValue);
        table.setGlobalFilter(newValue || undefined);
    };

    return (
        <Autocomplete
            freeSolo
            options={searchOptions}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            sx={{ width: 300 }}
            size="small"
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="بحث..."
                    variant="outlined"
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                        sx: {
                            backgroundColor: '#fff',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#E5E7EB',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#0c2b7a',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#0c2b7a',
                            },
                        }
                    }}
                />
            )}
            renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                    <li key={key} {...rest} style={{ fontSize: '13px', padding: '6px 16px' }}>
                        {option}
                    </li>
                );
            }}
            noOptionsText="لا توجد نتائج"
        />
    );
};
