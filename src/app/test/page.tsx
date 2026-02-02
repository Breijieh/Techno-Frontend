'use client';

import React, { useMemo } from 'react';

// MRT Imports
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
    MRT_GlobalFilterTextField,
    MRT_ToggleFiltersButton,
} from 'material-react-table';

// Material UI Imports
import {
    Box,
    Button,
    ListItemIcon,
    MenuItem,
    Typography,
    lighten,
    createTheme,
    ThemeProvider as MuiThemeProvider,
} from '@mui/material';

// Icons Imports
import { AccountCircle, Send } from '@mui/icons-material';

// Date Picker Imports
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// Dummy data type extended to 10+ columns as requested
export type Employee = {
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    salary: number;
    startDate: string;
    signatureCatchPhrase: string;
    avatar: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    department: string;
};

// Mock Data
const data: Employee[] = [
    {
        firstName: 'Dylan',
        lastName: 'Murray',
        email: 'dmurray@example.com',
        jobTitle: 'Software Engineer',
        salary: 75000,
        startDate: '2012-10-21',
        signatureCatchPhrase: 'Hello World',
        avatar: 'https://i.pravatar.cc/150?u=dylan',
        phone: '555-0101',
        address: '123 Main St',
        city: 'Tech City',
        country: 'USA',
        department: 'Engineering',
    },
    {
        firstName: 'Raquel',
        lastName: 'Kohler',
        email: 'rkohler@example.com',
        jobTitle: 'Product Manager',
        salary: 85000,
        startDate: '2015-01-15',
        signatureCatchPhrase: 'Synergize more',
        avatar: 'https://i.pravatar.cc/150?u=raquel',
        phone: '555-0102',
        address: '456 Market St',
        city: 'Business Central',
        country: 'Germany',
        department: 'Product',
    },
    {
        firstName: 'Ervin',
        lastName: 'Reinger',
        email: 'ereinger@example.com',
        jobTitle: 'Data Scientist',
        salary: 115000,
        startDate: '2020-05-12',
        signatureCatchPhrase: 'Data is the new oil',
        avatar: 'https://i.pravatar.cc/150?u=ervin',
        phone: '555-0103',
        address: '789 Logic Dr',
        city: 'Data Valley',
        country: 'Canada',
        department: 'Data',
    },
];

const Example = () => {
    const columns = useMemo<MRT_ColumnDef<Employee>[]>(
        () => [
            // REVERSED ORDER FOR PSEUDO-RTL: Start from the "logical" right
            {
                id: 'additional-info',
                header: 'Additional Info (معلومات إضافية)',
                columns: [
                    { accessorKey: 'department', header: 'Department (القسم)' },
                    { accessorKey: 'country', header: 'Country (البلد)' },
                    { accessorKey: 'city', header: 'City (المدينة)' },
                    { accessorKey: 'address', header: 'Address (العنوان)' },
                    { accessorKey: 'phone', header: 'Phone (الهاتف)' },
                ],
            },
            {
                id: 'id',
                header: 'Job Info (معلومات الوظيفة)',
                columns: [
                    {
                        accessorFn: (row) => new Date(row.startDate),
                        id: 'startDate',
                        header: 'Start Date (تاريخ البدء)',
                        filterVariant: 'date',
                        Cell: ({ cell }) => cell.getValue<Date>()?.toLocaleDateString(),
                    },
                    {
                        accessorKey: 'jobTitle',
                        header: 'Job Title (المسمى الوظيفي)',
                        size: 200,
                    },
                    {
                        accessorKey: 'salary',
                        header: 'Salary (الراتب)',
                        Cell: ({ cell }) => (
                            <Box
                                component="span"
                                sx={(theme) => ({
                                    backgroundColor:
                                        cell.getValue<number>() < 50_000
                                            ? theme.palette.error.dark
                                            : theme.palette.success.dark,
                                    borderRadius: '0.25rem',
                                    color: '#fff',
                                    p: '0.25rem',
                                })}
                            >
                                {cell.getValue<number>()?.toLocaleString?.('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                })}
                            </Box>
                        ),
                    },
                ],
            },
            {
                id: 'employee',
                header: 'Employee (الموظف)',
                columns: [
                    {
                        accessorKey: 'email',
                        header: 'Email (البريد الإلكتروني)',
                        size: 250,
                    },
                    {
                        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
                        id: 'name',
                        header: 'Name (الاسم)',
                        size: 200,
                        Cell: ({ renderedCellValue, row }) => (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem', direction: 'rtl' }}>
                                <img
                                    alt="avatar"
                                    height={30}
                                    src={row.original.avatar}
                                    loading="lazy"
                                    style={{ borderRadius: '50%' }}
                                />
                                <span>{renderedCellValue}</span>
                            </Box>
                        ),
                    },
                ],
            },
        ],
        [],
    );

    const table = useMaterialReactTable({
        columns,
        data,
        enableColumnPinning: true,
        enableRowActions: true,
        enableRowSelection: true,
        initialState: {
            showColumnFilters: true,
            columnPinning: {
                // IN LTR: 'left' is physical left, 'right' is physical right.
                // We want Actions on physical left (since it's the "end" of an RTL row).
                // We want Expand/Select on physical right (since it's the "start" of an RTL row).
                left: ['mrt-row-actions'],
                right: ['mrt-row-expand', 'mrt-row-select'],
            },
        },
        // Mirroring text alignment for RTL look in LTR container
        muiTableHeadCellProps: {
            sx: { textAlign: 'right', direction: 'rtl' },
        },
        muiTableBodyCellProps: {
            sx: { textAlign: 'right', direction: 'rtl' },
        },
        renderDetailPanel: ({ row }) => (
            <Box sx={{ p: '20px', textAlign: 'right', direction: 'rtl' }}>
                <Typography variant="h6">Signature: {row.original.signatureCatchPhrase}</Typography>
            </Box>
        ),
        renderRowActionMenuItems: ({ closeMenu }) => [
            <MenuItem key={0} onClick={() => closeMenu()}>View Profile</MenuItem>,
            <MenuItem key={1} onClick={() => closeMenu()}>Send Email</MenuItem>,
        ],
        renderTopToolbar: ({ table }) => (
            <Box sx={{ p: '8px', display: 'flex', justifyContent: 'space-between', direction: 'rtl' }}>
                <Typography variant="h6">Toolbar (RTL Look)</Typography>
                <Box sx={{ display: 'flex', gap: '1rem' }}>
                    <MRT_GlobalFilterTextField table={table} />
                    <Button variant="contained" color="primary">Action</Button>
                </Box>
            </Box>
        ),
    });

    return <MaterialReactTable table={table} />;
};

const ltrTheme = createTheme({
    direction: 'ltr', // Stable pinning mode
});

export default function TestPage() {
    return (
        <MuiThemeProvider theme={ltrTheme}>
            <Box
                dir="ltr"
                sx={{
                    p: '20px',
                    minHeight: '100vh',
                    background: '#F0F4F8',
                    // This container is LTR for pinning, but we can make the parent text RTL
                    '& .MuiTypography-root': { textAlign: 'right' }
                }}
            >
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Typography variant="h4" sx={{ mb: 3, color: '#000' }}>
                        Pseudo-RTL Workaround Test
                    </Typography>
                    <Example />
                </LocalizationProvider>
            </Box>
        </MuiThemeProvider>
    );
}
