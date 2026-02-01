'use client';

import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { TransactionType } from '@/types';

interface TransactionTypeViewFormProps {
  open: boolean;
  onClose: () => void;
  data: TransactionType | null;
}

export default function TransactionTypeViewForm({
  open,
  onClose,
  data,
}: TransactionTypeViewFormProps) {
  if (!data) return null;

  const fields = [
    {
      label: 'رمز المعاملة',
      value: `#${data.transactionCode}`,
    },
    {
      label: 'اسم المعاملة (عربي)',
      value: data.transactionNameAr,
    },
    {
      label: 'اسم المعاملة (إنجليزي)',
      value: data.transactionNameEn,
    },
    {
      label: 'نوع المعاملة',
      value: data.transactionType,
      type: 'chip' as const,
      chipColor: {
        bg: data.transactionType === 'ALLOWANCE' ? '#D1FAE5' : '#FEE2E2',
        text: data.transactionType === 'ALLOWANCE' ? '#065F46' : '#991B1B',
      },
    },
    {
      label: 'نوع نظامي',
      value: data.isSystem,
      type: 'boolean' as const,
    },
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل نوع المعاملة"
      fields={fields}
    />
  );
}

