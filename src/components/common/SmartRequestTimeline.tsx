import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import RequestTimeline from './RequestTimeline';
import { apiClient } from '@/lib/api/client';

interface ApprovalStep {
    levelNo: number;
    levelName: string;
    approverNo: number;
    approverName: string;
    status: 'COMPLETED' | 'PENDING' | 'FUTURE' | 'REJECTED' | 'SKIPPED';
}

interface SmartRequestTimelineProps {
    requestType: 'LEAVE' | 'LOAN';
    requestId: number;
    orientation?: 'vertical' | 'horizontal';
    // Fallback data if fetch fails or while loading
    fallbackStatus?: string;
    fallbackRequestDate?: Date;
}

export default function SmartRequestTimeline({
    requestType,
    requestId,
    orientation = 'vertical',
    fallbackStatus,
    fallbackRequestDate
}: SmartRequestTimelineProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [steps, setSteps] = useState<Array<{ label: string; description?: React.ReactNode; status?: 'PENDING' | 'FUTURE' | 'COMPLETED' | 'REJECTED'; date?: Date }>>([]);

    useEffect(() => {
        const fetchTimeline = async () => {
            if (!requestId) return;

            setLoading(true);
            setError(null);
            try {
                const endpoint = requestType === 'LEAVE'
                    ? `/leaves/${requestId}/timeline`
                    : `/loans/${requestId}/timeline`;

                const response = await apiClient.get<ApprovalStep[]>(endpoint);

                // Map API steps to RequestTimeline steps format
                const mappedSteps = [
                    {
                        label: 'تم إرسال الطلب',
                        date: fallbackRequestDate, // We might want to pass this or fetch it
                        description: 'تم إرسال الطلب بنجاح.',
                        status: 'COMPLETED' as const
                    },
                    ...response.map(step => {
                        // Map status to Arabic
                        const statusMap: Record<string, string> = {
                            'COMPLETED': 'مكتمل',
                            'PENDING': 'قيد الانتظار',
                            'FUTURE': 'مستقبلي',
                            'REJECTED': 'مرفوض',
                            'SKIPPED': 'تم التخطي'
                        };
                        const statusText = statusMap[step.status] || step.status;

                        return {
                            label: step.levelName,
                            description: (
                                <Box component="span">
                                    <Typography variant="body2" color="text.secondary">
                                        {step.status === 'COMPLETED' ? 'تمت الموافقة من قبل:' : 'الموافق:'} <strong>{step.approverName}</strong>
                                    </Typography>
                                    <Typography variant="caption" sx={{
                                        color: step.status === 'COMPLETED' ? 'success.main' :
                                            step.status === 'PENDING' ? 'warning.main' :
                                                step.status === 'REJECTED' ? 'error.main' : 'text.disabled',
                                        fontWeight: 600
                                    }}>
                                        {statusText}
                                    </Typography>
                                </Box>
                            ),
                            status: step.status as 'PENDING' | 'FUTURE' | 'COMPLETED' | 'REJECTED',
                            error: step.status === 'REJECTED'
                        };
                    }),
                    {
                        label: 'القرار النهائي',
                        description: 'حالة الطلب النهائية.',
                        status: 'FUTURE' as const // Will be updated by logic below
                    }
                ];

                setSteps(mappedSteps);
            } catch (err) {
                console.error('Failed to fetch timeline:', err);
                setError('فشل تحميل الخط الزمني التفصيلي.');
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();
    }, [requestId, requestType, fallbackRequestDate]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>;
    }

    if (error) {
        // Fallback to basic timeline if error
        return <Alert severity="warning">تعذر تحميل السجل التفصيلي. يتم عرض المعلومات الأساسية.</Alert>;
    }

    return (
        <RequestTimeline
            status={fallbackStatus || 'NEW'}
            requestDate={fallbackRequestDate || new Date()}
            orientation={orientation}
            steps={steps} // We need to update RequestTimeline to accept this
        />
    );
}
