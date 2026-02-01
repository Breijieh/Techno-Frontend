'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { ItemPO } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import type { EmployeeResponse } from '@/lib/api/employees';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface PurchaseOrderViewFormProps {
  open: boolean;
  onClose: () => void;
  data: ItemPO | null;
  projects?: ProjectSummary[];
  employees?: EmployeeResponse[];
}

export default function PurchaseOrderViewForm({
  open,
  onClose,
  data,
  projects = [],
  employees = [],
}: PurchaseOrderViewFormProps) {
  if (!data) return null;

  const project = projects.find((p) => p.projectCode === data.projectCode);
  const requester = employees.find((e) => e.employeeNo === data.requestedBy);

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

  const statusColor = statusColors[data.requestStatus as keyof typeof statusColors] || statusColors.NEW;
  const statusLabel = statusLabels[data.requestStatus] || data.requestStatus;

  const fields = [
    {
      label: 'رقم أمر الشراء',
      value: `#${data.transactionNo}`,
    },
    {
      label: 'تاريخ المعاملة',
      value: new Date(data.transactionDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'المشروع',
      value: project ? `${project.projectName || project.projectName} (#${data.projectCode})` : `مشروع رقم ${data.projectCode}`,
    },
    {
      label: 'رمز المستودع',
      value: `#${data.storeCode}`,
    },
    {
      label: 'اسم المورد',
      value: data.supplierName,
    },
    {
      label: 'مبلغ أمر الشراء',
      value: `ر.س ${formatNumber(data.poAmount)}`,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...((data as any).supplyDate
      ? [
        {
          label: 'تاريخ التوريد',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value: new Date((data as any).supplyDate).toLocaleDateString('en-GB'),
        },
      ]
      : []),
    {
      label: 'طلب بواسطة',
      value: requester ? `${requester.employeeName} (رقم: ${data.requestedBy})` : `رقم الموظف: ${data.requestedBy}`,
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
      title="تفاصيل أمر الشراء"
      fields={fields}
    />
  );
}

