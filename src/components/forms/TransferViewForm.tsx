'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { StoreItemTransfer } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';
import type { EmployeeResponse } from '@/lib/api/employees';

interface TransferViewFormProps {
  open: boolean;
  onClose: () => void;
  data: StoreItemTransfer | null;
  projects?: ProjectSummary[];
  employees?: EmployeeResponse[];
}

export default function TransferViewForm({
  open,
  onClose,
  data,
  projects = [],
  employees = [],
}: TransferViewFormProps) {
  if (!data) return null;

  const fromProject = projects.find((p) => p.projectCode === data.fromProjectCode);
  const toProject = projects.find((p) => p.projectCode === data.toProjectCode);
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
      label: 'رقم المعاملة',
      value: `#${data.transactionNo}`,
    },
    {
      label: 'تاريخ المعاملة',
      value: new Date(data.transactionDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'من المشروع',
      value: fromProject ? `${fromProject.projectName || fromProject.projectName} (#${data.fromProjectCode})` : `مشروع رقم ${data.fromProjectCode}`,
    },
    {
      label: 'من المستودع',
      value: `مستودع رقم ${data.fromStoreCode}`,
    },
    {
      label: 'إلى المشروع',
      value: toProject ? `${toProject.projectName || toProject.projectName} (#${data.toProjectCode})` : `مشروع رقم ${data.toProjectCode}`,
    },
    {
      label: 'إلى المستودع',
      value: `مستودع رقم ${data.toStoreCode}`,
    },
    {
      label: 'طلب بواسطة',
      value: requester
        ? `${requester.employeeName || requester.employeeName || 'غير معروف'} (رقم: ${data.requestedBy})`
        : `رقم الموظف: ${data.requestedBy}`,
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
      title="تفاصيل معاملة النقل"
      fields={fields}
    />
  );
}

