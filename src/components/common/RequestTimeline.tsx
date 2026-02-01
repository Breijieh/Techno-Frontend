import React from 'react';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Typography,
} from '@mui/material';
import {
    CheckCircle,
    RadioButtonUnchecked,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { formatDate } from '@/lib/utils/dateFormatter';

interface TimelineStep {
    label: string;
    date?: Date;
    description?: string | React.ReactNode;
    status?: 'PENDING' | 'FUTURE' | 'COMPLETED' | 'REJECTED';
    error?: boolean;
}

interface RequestTimelineProps {
    status: string;
    requestDate: Date;
    approvedDate?: Date;
    nextApprover?: string;
    nextControlNumber?: number; // employee number
    currentLevel?: number;
    currentLevelName?: string;
    rejectionReason?: string;
    orientation?: 'vertical' | 'horizontal';
    steps?: TimelineStep[];
}

export default function RequestTimeline({
    status,
    requestDate,
    approvedDate,
    nextApprover,
    nextControlNumber,
    currentLevel,
    currentLevelName,
    rejectionReason,
    orientation = 'vertical',
    steps: providedSteps
}: RequestTimelineProps) {

    // Determine active step based on status
    let activeStep = 0;

    // If steps are provided, calculate active step based on status of steps if possible, or just rely on global status
    // For now, let's keep the global status logic as fallback or primary driver if needed.

    if (status === 'INPROCESS' || (status === 'NEW' && currentLevel && currentLevel > 0)) {
        activeStep = 1;
    } else if (status === 'APPROVED' || status === 'REJECTED') {
        activeStep = 2; // This might need adjustment if there are more than 3 steps
    }

    // Define steps
    const defaultSteps = [
        {
            label: 'تم إرسال الطلب',
            date: requestDate,
            description: 'تم إرسال الطلب بنجاح.',
        },
        {
            label: 'عملية الموافقة',
            // If we are past this step (approved/rejected), we don't show "Waiting for..." unless we want to show history (which we don't have fully)
            // If we are IN this step, we show details.
            description: activeStep === 1
                ? (
                    <Box component="span">
                        <Typography variant="body2" color="text.secondary">
                            المرحلة الحالية: <strong>{currentLevelName || `المستوى ${currentLevel || 1}`}</strong>
                        </Typography>
                        {(nextApprover || nextControlNumber) && (
                            <Typography variant="body2" color="text.secondary">
                                في انتظار: <strong>{nextApprover || `المستخدم #${nextControlNumber}`}</strong>
                            </Typography>
                        )}
                    </Box>
                )
                : status === 'APPROVED' || status === 'REJECTED'
                    ? 'تمت المراجعة.'
                    : 'قيد المراجعة.',
        },
        {
            label: status === 'REJECTED' ? 'تم رفض الطلب' : 'القرار النهائي',
            date: approvedDate,
            description: status === 'APPROVED'
                ? 'تمت الموافقة على الطلب بالكامل.'
                : status === 'REJECTED'
                    ? (rejectionReason ? `مرفوض: ${rejectionReason}` : 'تم رفض الطلب.')
                    : 'في انتظار الموافقة النهائية.',
            error: status === 'REJECTED',
        }
    ];

    const stepsToRender = providedSteps || defaultSteps;

    // Recalculate activeStep if steps are provided
    if (providedSteps) {
        // Find the first step that is PENDING or FUTURE using findIndex
        const firstPendingIndex = providedSteps.findIndex(s => s.status === 'PENDING' || s.status === 'FUTURE');
        if (firstPendingIndex !== -1) {
            activeStep = firstPendingIndex;
        } else {
            // If no pending/future steps, assume all complete?
            // Or check if last is rejected?
            const lastStep = providedSteps[providedSteps.length - 1];
            if (lastStep.status === 'COMPLETED' || lastStep.status === 'REJECTED') {
                activeStep = providedSteps.length;
            }
        }
    }

    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '16px', fontWeight: 600 }}>
                الخط الزمني للطلب
            </Typography>
            <Stepper activeStep={activeStep} orientation={orientation} alternativeLabel={orientation === 'horizontal'}>
                {stepsToRender.map((step, index) => (
                    <Step key={step.label}>
                        <StepLabel
                            error={step.error}
                            StepIconComponent={() => {
                                // Custom icons
                                if (step.error) return <ErrorIcon color="error" />;
                                if (index < activeStep || status === 'APPROVED') return <CheckCircle color="success" />;
                                return <RadioButtonUnchecked color={index === activeStep ? "primary" : "disabled"} />;
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: orientation === 'vertical' ? 'row' : 'column', justifyContent: 'space-between', alignItems: orientation === 'vertical' ? 'center' : 'inherit' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {step.label}
                                </Typography>
                                {step.date && (
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDate(step.date)}
                                    </Typography>
                                )}
                            </Box>
                        </StepLabel>
                        {orientation === 'vertical' && (
                            <StepContent>
                                <Box sx={{ mb: 1 }}>
                                    {typeof step.description === 'string' ? (
                                        <Typography variant="body2" color="text.secondary">
                                            {step.description}
                                        </Typography>
                                    ) : (
                                        step.description
                                    )}
                                </Box>
                            </StepContent>
                        )}
                    </Step>
                ))}
            </Stepper>
            {/* For horizontal, we might need a different way to show descriptions, e.g., below or tooltip. 
                For now, simple horizontal steps are enough for table detail panel or we can keep vertical in detail panel. 
                If user wants "in table" as expanded row, vertical is fine. If as column, horizontal is needed. 
                Let's stick to providing basic structure. */}
        </Box>
    );
}
