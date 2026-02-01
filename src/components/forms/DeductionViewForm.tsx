'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { MonthlyDeduction, Employee } from '@/types';
import type { TransactionTypeResponse } from '@/lib/api/transactionTypes';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface DeductionViewFormProps {
  open: boolean;
  onClose: () => void;
  data: MonthlyDeduction | null;
  employees: Employee[];
  transactionTypes: TransactionTypeResponse[];
}

export default function DeductionViewForm({
  open,
  onClose,
  data,
  employees,
  transactionTypes,
}: DeductionViewFormProps) {
  if (!data) return null;

  const employee = employees.find((e) => e.employeeId === data.employeeId);
  const employeeName = employee?.fullName || `رقم: ${data.employeeId}`;

  const transactionType = transactionTypes.find((t) => t.typeCode === data.deductionType);
  const transactionTypeName = transactionType?.typeName || `نوع #${data.deductionType}`;

  const statusColors = {
    N: { bg: '#FEF3C7', text: '#92400E' },
    A: { bg: '#D1FAE5', text: '#065F46' },
    R: { bg: '#FEE2E2', text: '#991B1B' },
    W: { bg: '#DBEAFE', text: '#1E40AF' },
    Y: { bg: '#E0E7FF', text: '#3730A3' },
  };

  const statusLabels: Record<string, string> = {
    N: 'جديد',
    A: 'موافق عليه',
    R: 'مرفوض',
    W: 'قيد الانتظار',
    Y: 'مكتمل',
  };

  const statusColor = statusColors[data.status] || statusColors.N;
  const statusLabel = statusLabels[data.status] || data.status;

  const formatMonthYear = (monthYear: string): string => {
    if (!monthYear) return 'غير متوفر';
    const [year, month] = monthYear.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return `${date.toLocaleDateString('ar-SA', { month: 'long' })} ${date.getFullYear()}`;
  };

  const fields = [
    {
      label: 'رقم المعاملة',
      value: `#${data.transactionId}`,
    },
    {
      label: 'الموظف',
      value: `${employeeName} (رقم: ${data.employeeId})`,
    },
    {
      label: 'الشهر/السنة',
      value: formatMonthYear(data.monthYear),
    },
    {
      label: 'نوع الخصم',
      value: transactionTypeName,
    },
    {
      label: 'مبلغ الخصم',
      value: `ر.س ${formatNumber(data.deductionAmount ?? 0)}`,
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
    ...(data.notes
      ? [
        {
          label: 'ملاحظات',
          value: data.notes,
        },
      ]
      : []),
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل الخصم"
      fields={fields}
    />
  );
}

