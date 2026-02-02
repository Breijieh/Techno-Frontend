'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import useRouteProtection from '@/hooks/useRouteProtection';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [activeMenu, setActiveMenu] = useState('');
    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    // Protect all dashboard routes
    useRouteProtection();

    const handleLogout = useCallback(() => {
        router.push('/logout-transition');
    }, [router]);

    const handleToggleSidebar = useCallback(() => {
        setSidebarExpanded(prev => !prev);
    }, []);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box
                sx={{
                    display: 'flex',
                    minHeight: '100vh',
                    maxWidth: '100vw',
                    overflow: 'hidden',
                    backgroundColor: '#F8F9FC',
                }}
            >
                {/* Left Sidebar */}
                <DashboardSidebar
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    onLogout={handleLogout}
                    sidebarExpanded={sidebarExpanded}
                    onToggleSidebar={handleToggleSidebar}
                />

                {/* Main Content Area */}
                <Box sx={{
                    marginRight: sidebarExpanded ? '280px' : '80px',
                    width: sidebarExpanded ? 'calc(100vw - 280px)' : 'calc(100vw - 80px)',
                    maxWidth: sidebarExpanded ? 'calc(100vw - 280px)' : 'calc(100vw - 80px)',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    minWidth: 0,
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                    {/* Top Header Bar */}
                    <DashboardHeader />

                    {/* Main Content */}
                    <Box sx={{
                        flex: 1,
                        padding: '32px',
                        backgroundColor: '#F8F9FC',
                        minWidth: 0, // Prevent flex item from expanding beyond container
                        overflow: 'hidden', // Contain any potential overflow
                    }}>
                        {children}
                    </Box>
                </Box>
            </Box>
        </LocalizationProvider>
    );
}
