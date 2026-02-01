'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { ProjectDuePayment } from '@/types';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface PaymentScheduleViewFormProps {
  open: boolean;
  onClose: () => void;
  data: ProjectDuePayment | null;
  projects?: Array<{ projectCode: number; projectName?: string }>;
}

export default function PaymentScheduleViewForm({
  open,
  onClose,
  data,
  projects = [],
}: PaymentScheduleViewFormProps) {
  if (!data) return null;

  const project = projects.find((p) => p.projectCode === data.projectCode);

  const statusColors = {
    PAID: { bg: '#D1FAE5', text: '#065F46' },
    UNPAID: { bg: '#FEE2E2', text: '#991B1B' },
    PARTIAL: { bg: '#FEF3C7', text: '#92400E' },
  };

  const statusLabels: Record<string, string> = {
    PAID: 'مدفوع',
    UNPAID: 'غير مدفوع',
    PARTIAL: 'جزئي',
  };

  const statusColor = statusColors[data.paymentStatus] || statusColors.UNPAID;
  const statusLabel = statusLabels[data.paymentStatus] || data.paymentStatus;

  const fields = [
    {
      label: 'الرقم التسلسلي',
      value: `#${data.serialNo}`,
    },
    {
      label: 'المشروع',
      value: project ? `${project.projectName} (#${data.projectCode})` : `مشروع رقم ${data.projectCode}`,
    },
    {
      label: 'تاريخ الاستحقاق',
      value: new Date(data.dueDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'المبلغ المستحق',
      value: `ر.س ${formatNumber(data.dueAmount)}`,
    },
    {
      label: 'حالة الدفع',
      value: (
        <Chip
          label={statusLabel}
          size="small"
          sx={{
            backgroundColor: statusColor.bg,
            color: statusColor.text,
            fontWeight: 600,
            fontSize: '11px',
          }}
        />
      ),
    },
    ...(data.paidDate
      ? [
        {
          label: 'تاريخ الدفع',
          value: new Date(data.paidDate).toLocaleDateString('en-GB'),
        },
      ]
      : []),
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل جدول الدفع"
      fields={fields}
    />
  );
}

