'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { LaborAssignment, Employee } from '@/types';

interface LaborAssignmentViewFormProps {
  open: boolean;
  onClose: () => void;
  data: LaborAssignment | null;
  employees?: Employee[];
}

export default function LaborAssignmentViewForm({
  open,
  onClose,
  data,
  employees = [],
}: LaborAssignmentViewFormProps) {
  if (!data) return null;

  // Use employeeName from data if available, otherwise look it up from employees list
  const employeeName = data.employeeName ||
    employees.find((e) => e.employeeId === data.employeeId)?.fullName ||
    'غير معروف';

  const statusColors = {
    ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
    COMPLETED: { bg: '#DBEAFE', text: '#1E40AF' },
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'نشط',
    COMPLETED: 'مكتمل',
  };

  const statusColor = statusColors[data.status] || statusColors.ACTIVE;
  const statusLabel = statusLabels[data.status] || data.status;

  const fields = [
    {
      label: 'رقم الطلب',
      value: data.requestNo ? `#${data.requestNo}` : '-',
    },
    {
      label: 'رقم السطر',
      value: `#${data.lineNo}`,
    },
    {
      label: 'الموظف',
      value: `${employeeName} (رقم: ${data.employeeId})`,
    },
    {
      label: 'التخصص',
      value: (
        <Chip
          label={data.specialization}
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
      label: 'من تاريخ',
      value: new Date(data.fromDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'إلى تاريخ',
      value: new Date(data.toDate).toLocaleDateString('en-GB'),
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

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل تعيين العمالة"
      fields={fields}
    />
  );
}

