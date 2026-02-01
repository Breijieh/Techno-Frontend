'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Box } from '@mui/material';

export default function PayrollRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id;

    useEffect(() => {
        if (id && id !== 'undefined') {
            router.replace(`/dashboard/self-service/payroll?viewId=${id}`);
        } else {
            console.warn('Missing or invalid ID for redirect');
            router.replace('/dashboard/self-service/payroll');
        }
    }, [id, router]);

    return (
        <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner />
        </Box>
    );
}
