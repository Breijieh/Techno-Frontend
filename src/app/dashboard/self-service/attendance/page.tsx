'use client';

import { Box } from '@mui/material';
import useRouteProtection from '@/hooks/useRouteProtection';
import AttendanceCheckIn from '@/components/dashboard/AttendanceCheckIn';

export default function AttendancePage() {
  // Protect route - employees and admins
  useRouteProtection(['Employee', 'Admin']);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F8F9FC',
        minHeight: '100%',
        p: 3
      }}
    >
      <AttendanceCheckIn />
    </Box>
  );
}


