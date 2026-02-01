'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { PostponementRequest } from '@/lib/mappers/postponementMapper';

interface InstallmentPostponementViewFormProps {
  open: boolean;
  onClose: () => void;
  data: PostponementRequest | null;
}

export default function InstallmentPostponementViewForm({
  open,
  onClose,
  data,
}: InstallmentPostponementViewFormProps) {
  if (!data) return null;

  // Use employeeName from mapped data (populated by mapper from backend response)
  const employeeName = data.employeeName || `موظف ${data.employeeId}`;

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

  const formatMonth = (monthStr: string): string => {
    if (!monthStr) return 'غير متوفر';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
  };

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
      label: 'رقم القرض',
      value: `#${data.loanId}`,
    },
    {
      label: 'الشهر الأصلي',
      value: formatMonth(data.originalMonth),
    },
    {
      label: 'الشهر الجديد',
      value: (
        <Chip
          label={formatMonth(data.newMonth)}
          size="small"
          sx={{
            backgroundColor: '#DBEAFE',
            color: '#1E40AF',
            fontWeight: 600,
            fontSize: '11px',
          }}
        />
      ),
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
      title="تفاصيل طلب تأجيل القسط"
      fields={fields}
    />
  );
}

