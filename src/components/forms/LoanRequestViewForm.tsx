'use client';

import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { LoanRequest } from '@/types';
import RequestTimeline from '../common/RequestTimeline';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface LoanRequestViewFormProps {
  open: boolean;
  onClose: () => void;
  data: LoanRequest | null;
}

export default function LoanRequestViewForm({
  open,
  onClose,
  data,
}: LoanRequestViewFormProps) {
  if (!data) return null;

  // Employee name should come from the loan request data or API response
  // For now, we'll use the employeeId if name is not available
  const employeeName = `موظف ${data.employeeId}`;

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

  const fields = [
    {
      label: 'رقم القرض',
      value: `#${data.loanId}`,
    },
    {
      label: 'الموظف',
      value: `${employeeName} (رقم: ${data.employeeId})`,
    },
    {
      label: 'مبلغ القرض',
      value: `ر.س ${formatNumber(data.loanAmount)}`,
    },
    {
      label: 'عدد الأقساط',
      value: `${data.numberOfInstallments} شهر`,
    },
    {
      label: 'تاريخ الدفعة الأولى',
      value: new Date(data.firstPaymentDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'الرصيد المتبقي',
      value: `ر.س ${formatNumber(data.remainingBalance)}`,
    },
    {
      label: 'الحالة',
      value: statusLabel,
      type: 'chip' as const,
      chipColor: statusColor,
    },
    {
      label: 'تاريخ الطلب',
      value: new Date(data.requestDate).toLocaleDateString('en-GB'),
    },
    ...(data.approvedDate
      ? [
        {
          label: 'تاريخ الموافقة',
          value: new Date(data.approvedDate).toLocaleDateString('en-GB'),
        },
      ]
      : []),
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل طلب القرض"
      fields={fields}
      renderContent={() => (
        <RequestTimeline
          status={data.status}
          requestDate={data.requestDate}
          approvedDate={data.approvedDate}
          nextApprover={data.nextApproverName}
          nextControlNumber={data.nextApproval}
          currentLevel={data.nextLevel}
          currentLevelName={data.nextLevelName}
        />
      )}
    />
  );
}

