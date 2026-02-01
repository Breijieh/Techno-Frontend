'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { StoreItemReceivable } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import type { EmployeeResponse } from '@/lib/api/employees';

interface ReceivingViewFormProps {
  open: boolean;
  onClose: () => void;
  data: StoreItemReceivable | null;
  projects?: ProjectSummary[];
  employees?: EmployeeResponse[];
}

export default function ReceivingViewForm({
  open,
  onClose,
  data,
  projects = [],
  employees = [],
}: ReceivingViewFormProps) {
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

  const statusColor = statusColors[data.requestStatus as keyof typeof statusColors] || statusColors.NEW;

  const fields = [
    {
      label: 'رقم المعاملة',
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
    ...(data.supplierName
      ? [
        {
          label: 'اسم المورد',
          value: data.supplierName,
        },
      ]
      : []),
    ...(data.supplyDate
      ? [
        {
          label: 'تاريخ التوريد',
          value: new Date(data.supplyDate).toLocaleDateString('en-GB'),
        },
      ]
      : []),
    ...(data.itemsPOTransactionNo
      ? [
        {
          label: 'رقم معاملة أمر الشراء',
          value: `#${data.itemsPOTransactionNo}`,
        },
      ]
      : []),
    {
      label: 'طلب بواسطة',
      value: requester
        ? `${requester.employeeName || requester.employeeName || 'غير معروف'} (ID: ${data.requestedBy})`
        : `رقم الموظف: ${data.requestedBy}`,
    },
    {
      label: 'الحالة',
      value: (
        <Chip
          label={data.requestStatus}
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
      title="تفاصيل معاملة الاستلام"
      fields={fields}
    />
  );
}

