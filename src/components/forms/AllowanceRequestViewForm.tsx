'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { AllowanceRequest } from '@/types';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface AllowanceRequestViewFormProps {
  open: boolean;
  onClose: () => void;
  data: (AllowanceRequest & { employeeName?: string }) | null;
}

export default function AllowanceRequestViewForm({
  open,
  onClose,
  data,
}: AllowanceRequestViewFormProps) {
  if (!data) return null;

  // Use employeeName from mapped data if available, otherwise fallback to employeeId
  const employeeName = (data as { employeeName?: string }).employeeName || `موظف ${data.employeeId}`;

  const statusColors = {
    NEW: { bg: '#FEF3C7', text: '#92400E' },
    INPROCESS: { bg: '#DBEAFE', text: '#1E40AF' },
    APPROVED: { bg: '#D1FAE5', text: '#065F46' },
    REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
    COMPLETED: { bg: '#E0E7FF', text: '#3730A3' },
  };

  const statusLabels: Record<string, string> = {
    NEW: 'جديد',
    INPROCESS: 'قيد المعالجة',
    APPROVED: 'موافق عليه',
    REJECTED: 'مرفوض',
    COMPLETED: 'مكتمل',
  };

  const statusColor = statusColors[data.status as keyof typeof statusColors] || statusColors.NEW;
  const statusLabel = statusLabels[data.status] || data.status;

  const fields = [
    {
      label: 'رقم الطلب',
      value: `#${data.requestId}`,
    },
    {
      label: 'الموظف',
      value: `${employeeName} (رقم: ${data.employeeId})`,
    },
    {
      label: 'نوع البدل',
      value: (
        <Chip
          label={data.allowanceType}
          size="small"
          sx={{
            backgroundColor: '#EDE9FE',
            color: '#6B21A8',
            fontWeight: 600,
            fontSize: '11px',
          }}
        />
      ),
    },
    {
      label: 'مبلغ البدل',
      value: `ر.س ${formatNumber(data.allowanceAmount)}`,
    },
    {
      label: 'السبب',
      value: data.reason,
    },
    {
      label: 'الحالة',
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
    {
      label: 'تاريخ الطلب',
      value: new Date(data.requestDate).toLocaleDateString('en-GB'),
    },
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل طلب البدل"
      fields={fields}
    />
  );
}

