'use client';

import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { LeaveRequest } from '@/types';

interface LeaveRequestViewFormProps {
  open: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequest | null;
}

export default function LeaveRequestViewForm({
  open,
  onClose,
  leaveRequest,
}: LeaveRequestViewFormProps) {
  if (!leaveRequest) return null;

  // Employee name should come from the leave request data or API response
  // For now, we'll use the employeeId if name is not available
  const getEmployeeName = (employeeId: number) => {
    // The employee name should be included in the leave request from the API
    // If not, we'll just show the ID
    return `موظف ${employeeId}`;
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    NEW: { bg: '#FEF3C7', text: '#92400E' },
    INPROCESS: { bg: '#DBEAFE', text: '#1E40AF' },
    APPROVED: { bg: '#D1FAE5', text: '#065F46' },
    REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
    COMPLETED: { bg: '#E0E7FF', text: '#3730A3' },
  };

  const fields = [
    { label: 'رقم الطلب', value: leaveRequest.requestId, type: 'text' as const },
    { label: 'الموظف', value: getEmployeeName(leaveRequest.employeeId), type: 'text' as const },
    { label: 'نوع الإجازة', value: leaveRequest.leaveType, type: 'text' as const },
    { label: 'من تاريخ', value: leaveRequest.fromDate, type: 'date' as const },
    { label: 'إلى تاريخ', value: leaveRequest.toDate, type: 'date' as const },
    { label: 'عدد الأيام', value: leaveRequest.numberOfDays, type: 'text' as const },
    { label: 'السبب', value: leaveRequest.reason, type: 'text' as const },
    {
      label: 'الحالة',
      value: leaveRequest.status,
      type: 'chip' as const,
      chipColor: statusColors[leaveRequest.status] || statusColors.NEW,
    },
    ...(leaveRequest.status === 'NEW' || leaveRequest.status === 'INPROCESS' ? [
      {
        label: 'المستوى الحالي',
        value: leaveRequest.nextLevelName || (leaveRequest.nextLevel ? `المستوى ${leaveRequest.nextLevel}` : '-'),
        type: 'text' as const
      },
      {
        label: 'في انتظار الموافقة من',
        value: leaveRequest.nextApproverName || (leaveRequest.nextApproval ? `مستخدم رقم ${leaveRequest.nextApproval}` : '-'),
        type: 'text' as const
      }
    ] : []),
    { label: 'تاريخ الطلب', value: leaveRequest.requestDate, type: 'date' as const },
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل طلب الإجازة"
      fields={fields}
      maxWidth="md"
    />
  );
}

