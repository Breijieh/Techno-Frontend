'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { TempLaborRequest } from '@/types';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface TempLaborRequestViewFormProps {
  open: boolean;
  onClose: () => void;
  data: TempLaborRequest | null;
}

// Define types for potential object structures
type SpecializationObject = { label?: string; jobTitleEn?: string };
type StatusObject = { value?: string; label?: string };

export default function TempLaborRequestViewForm({
  open,
  onClose,
  data,
}: TempLaborRequestViewFormProps) {
  if (!data) return null;

  // Ensure we extract string values properly (handle potential object issues)
  const specialization = typeof data.specialization === 'string'
    ? data.specialization
    : (data.specialization as SpecializationObject)?.label || (data.specialization as SpecializationObject)?.jobTitleEn || 'غير معروف';

  const status = typeof data.status === 'string'
    ? data.status
    : (data.status as StatusObject)?.value || (data.status as StatusObject)?.label || 'NEW';

  const statusColors = {
    NEW: { bg: '#FEF3C7', text: '#92400E' },
    PENDING: { bg: '#DBEAFE', text: '#1E40AF' },
    APPROVED: { bg: '#D1FAE5', text: '#065F46' },
    REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  };

  const statusLabels: Record<string, string> = {
    NEW: 'جديد',
    PENDING: 'قيد الموافقة',
    APPROVED: 'موافق عليه',
    REJECTED: 'مرفوض',
  };

  const statusColor = statusColors[status as keyof typeof statusColors] || statusColors.NEW;
  const statusLabel = statusLabels[status] || status;

  const fields = [
    {
      label: 'رقم الطلب',
      value: `#${data.requestId}`,
    },
    {
      label: 'تاريخ الطلب',
      value: new Date(data.requestDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'التخصص',
      value: (
        <Chip
          label={specialization}
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
      label: 'عدد العمال',
      value: `${data.numberOfWorkers} عامل${data.numberOfWorkers !== 1 ? '' : ''}`,
    },
    {
      label: 'من تاريخ',
      value: new Date(data.fromDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'إلى تاريخ',
      value: new Date(data.toDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'الأجر اليومي',
      value: `ر.س ${formatNumber(data.dailyWage)}`,
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
  ];

  // Add notes field if it exists
  if (data.notes) {
    fields.push({
      label: 'ملاحظات',
      value: data.notes,
    });
  }

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل طلب العمالة المؤقتة"
      fields={fields}
    />
  );
}

