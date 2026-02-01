'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { Project, Employee } from '@/types';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface ProjectViewFormProps {
  open: boolean;
  onClose: () => void;
  data: Project | null;
  employees?: Employee[];
}

export default function ProjectViewForm({
  open,
  onClose,
  data,
  employees = [],
}: ProjectViewFormProps) {
  if (!data) return null;

  const manager = employees.find((e) => e.employeeId === data.projectManagerId);
  const managerName = manager?.fullName || (data.projectManagerId && data.projectManagerId !== 0 ? `رقم: ${data.projectManagerId}` : '-');

  const statusColors = {
    ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
    COMPLETED: { bg: '#DBEAFE', text: '#1E40AF' },
    ON_HOLD: { bg: '#FEF3C7', text: '#92400E' },
    CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'نشط',
    COMPLETED: 'مكتمل',
    ON_HOLD: 'معلق',
    CANCELLED: 'ملغي',
  };

  const statusColor = statusColors[data.status] || statusColors.ACTIVE;
  const statusLabel = statusLabels[data.status] || data.status;

  const fields = [
    {
      label: 'رمز المشروع',
      value: `#${data.projectCode}`,
    },
    {
      label: 'اسم المشروع (عربي)',
      value: data.projectName,
    },
    {
      label: 'اسم المشروع (إنجليزي)',
      value: data.projectName,
    },
    {
      label: 'عنوان المشروع',
      value: data.projectAddress,
    },
    {
      label: 'تاريخ البدء',
      value: new Date(data.startDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'تاريخ الانتهاء',
      value: new Date(data.endDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'إجمالي مبلغ المشروع',
      value: data.totalProjectAmount && data.totalProjectAmount > 0
        ? `ر.س ${formatNumber(data.totalProjectAmount)}`
        : '-',
    },
    ...(data.projectProfitMargin
      ? [
        {
          label: 'هامش الربح',
          value: `${data.projectProfitMargin}%`,
        },
      ]
      : []),
    {
      label: 'مدير المشروع',
      value: data.projectManagerId && data.projectManagerId !== 0
        ? `${managerName}${manager ? ` (رقم: ${data.projectManagerId})` : ''}`
        : '-',
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
    ...(data.numberOfPayments
      ? [
        {
          label: 'عدد المدفوعات',
          value: data.numberOfPayments.toString(),
        },
      ]
      : []),
    ...(data.firstDownPaymentDate
      ? [
        {
          label: 'تاريخ الدفعة الأولى',
          value: new Date(data.firstDownPaymentDate).toLocaleDateString('en-GB'),
        },
      ]
      : []),
    ...(data.technoSuffix
      ? [
        {
          label: 'لاحقة تكنو',
          value: data.technoSuffix,
        },
      ]
      : []),
    ...(data.projectGoogleMap
      ? [
        {
          label: 'رابط خرائط جوجل',
          value: data.projectGoogleMap,
        },
      ]
      : []),
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل المشروع"
      fields={fields}
    />
  );
}

