'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { ProjectPaymentRequest } from '@/types';
import {
  getTransStatusDisplay,
  getTransStatusColor,
  getApprovalLevelDisplay
} from '@/lib/mappers/paymentRequestMapper';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface PaymentRequestViewFormProps {
  open: boolean;
  onClose: () => void;
  data: ProjectPaymentRequest | null;
}

export default function PaymentRequestViewForm({
  open,
  onClose,
  data,
}: PaymentRequestViewFormProps) {
  if (!data) return null;

  const statusColor = getTransStatusColor(data.transStatus);
  const statusDisplay = getTransStatusDisplay(data.transStatus);

  const formatAmount = (amount: number | undefined) => {
    if (!amount || amount === 0) return 'ر.س 0.00';
    return `ر.س ${formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB');
  };

  const formatDateTime = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-GB');
  };

  const projectName = data.projectName || data.projectName || `مشروع رقم ${data.projectCode}`;

  const fields = [
    {
      label: 'رقم الطلب',
      value: `#${data.requestNo}`,
    },
    {
      label: 'تاريخ الطلب',
      value: formatDate(data.requestDate),
    },
    {
      label: 'المشروع',
      value: `${projectName} (#${data.projectCode})`,
    },
    {
      label: 'المورد',
      value: data.supplierName || `مورد رقم ${data.supplierCode}`,
    },
    {
      label: 'مبلغ الدفع',
      value: formatAmount(data.paymentAmount),
    },
    {
      label: 'الغرض من الدفع',
      value: data.paymentPurpose || '-',
    },
    {
      label: 'الحالة',
      value: (
        <Chip
          label={statusDisplay}
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
      value: data.requesterName || `موظف رقم ${data.requestedBy}`,
    },
    ...(data.transStatus === 'P' && data.nextApproverName ? [{
      label: 'الموافق التالي',
      value: `${data.nextApproverName}${data.nextAppLevel ? ` (${getApprovalLevelDisplay(data.nextAppLevel)})` : ''}`,
    }] : []),
    ...(data.transStatus === 'A' && data.approverName ? [{
      label: 'وافق عليه',
      value: `${data.approverName}${data.approvedDate ? ` في ${formatDateTime(data.approvedDate)}` : ''}`,
    }] : []),
    ...(data.transStatus === 'R' && data.rejectionReason ? [{
      label: 'سبب الرفض',
      value: data.rejectionReason,
    }] : []),
    ...(data.transStatus === 'R' && data.approverName ? [{
      label: 'رفض بواسطة',
      value: `${data.approverName}${data.approvedDate ? ` في ${formatDateTime(data.approvedDate)}` : ''}`,
    }] : []),
    {
      label: 'حالة المعالجة',
      value: data.isProcessed === 'Y' ? (
        <Chip
          label="تمت المعالجة"
          size="small"
          sx={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            fontWeight: 600,
            fontSize: '11px',
          }}
        />
      ) : (
        <Chip
          label="لم تتم المعالجة"
          size="small"
          sx={{
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontWeight: 600,
            fontSize: '11px',
          }}
        />
      ),
    },
    ...(data.attachmentPath ? [{
      label: 'المرفق',
      value: data.attachmentPath,
    }] : []),
    ...(data.createdDate ? [{
      label: 'تاريخ الإنشاء',
      value: formatDateTime(data.createdDate),
    }] : []),
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل طلب الدفع"
      fields={fields}
    />
  );
}

