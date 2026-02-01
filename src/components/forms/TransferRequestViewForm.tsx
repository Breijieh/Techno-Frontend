'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { TransferRequest } from '@/types';
import type { Employee } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';

interface TransferRequestViewFormProps {
  open: boolean;
  onClose: () => void;
  data: TransferRequest | null;
  employees?: Employee[];
  projects?: ProjectSummary[];
}

export default function TransferRequestViewForm({
  open,
  onClose,
  data,
  employees = [],
  projects = [],
}: TransferRequestViewFormProps) {
  if (!data) return null;

  const employee = employees.find((e) => e.employeeId === data.employeeId);
  const fromProject = projects.find((p) => p.projectCode === data.fromProjectCode);
  const toProject = projects.find((p) => p.projectCode === data.toProjectCode);
  const requester = data.requestedBy ? employees.find((e) => e.employeeId === data.requestedBy) : null;

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

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-GB');
    } catch {
      return '-';
    }
  };

  const fields = [
    {
      label: 'رقم الطلب',
      value: `#${data.requestId}`,
    },
    {
      label: 'تاريخ الطلب',
      value: formatDate(data.requestDate),
    },
    {
      label: 'الموظف',
      value: data.employeeName || (employee ? `${employee.firstName} ${employee.lastName} (رقم: ${data.employeeId})` : `رقم الموظف: ${data.employeeId}`),
    },
    {
      label: 'من المشروع',
      value: data.fromProjectName || (fromProject ? `${fromProject.projectName || fromProject.projectName} (#${data.fromProjectCode})` : `مشروع رقم ${data.fromProjectCode}`),
    },
    {
      label: 'إلى المشروع',
      value: data.toProjectName || (toProject ? `${toProject.projectName || toProject.projectName} (#${data.toProjectCode})` : `مشروع رقم ${data.toProjectCode}`),
    },
    {
      label: 'السبب',
      value: data.reason || '-',
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
      label: 'طلب بواسطة',
      value: data.requestedByName || (requester ? `${requester.firstName} ${requester.lastName} (رقم: ${data.requestedBy})` : (data.requestedBy ? `موظف رقم ${data.requestedBy}` : '-')),
    },
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل طلب النقل"
      fields={fields}
    />
  );
}

