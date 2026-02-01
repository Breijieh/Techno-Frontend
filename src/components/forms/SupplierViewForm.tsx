'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { Supplier } from '@/types';

interface SupplierViewFormProps {
  open: boolean;
  onClose: () => void;
  data: Supplier | null;
}

export default function SupplierViewForm({
  open,
  onClose,
  data,
}: SupplierViewFormProps) {
  if (!data) return null;

  const fields = [
    {
      label: 'رقم المورد',
      value: `#${data.supplierId}`,
    },
    {
      label: 'اسم المورد (إنجليزي)',
      value: data.supplierName,
    },
    ...(data.supplierName
      ? [
        {
          label: 'اسم المورد (عربي)',
          value: data.supplierName,
        },
      ]
      : []),
    ...(data.contactPerson
      ? [
        {
          label: 'الشخص المسؤول',
          value: data.contactPerson,
        },
      ]
      : []),
    ...(data.email
      ? [
        {
          label: 'البريد الإلكتروني',
          value: data.email,
        },
      ]
      : []),
    ...(data.phone
      ? [
        {
          label: 'رقم الهاتف',
          value: data.phone,
        },
      ]
      : []),
    ...(data.address
      ? [
        {
          label: 'العنوان',
          value: data.address,
        },
      ]
      : []),
    {
      label: 'الحالة',
      value: (
        <Chip
          label={data.isActive ? 'نشط' : 'غير نشط'}
          size="small"
          sx={{
            backgroundColor: data.isActive ? '#D1FAE5' : '#FEE2E2',
            color: data.isActive ? '#065F46' : '#991B1B',
            fontSize: '11px',
            fontWeight: 600,
          }}
        />
      ),
    },
    ...(data.createdDate
      ? [
        {
          label: 'تاريخ الإنشاء',
          value: data.createdDate instanceof Date
            ? data.createdDate.toLocaleDateString('en-GB')
            : new Date(data.createdDate).toLocaleDateString('en-GB'),
        },
      ]
      : []),
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل المورد"
      fields={fields}
    />
  );
}

