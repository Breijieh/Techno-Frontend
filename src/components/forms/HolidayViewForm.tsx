'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { Holiday } from '@/types';

interface HolidayViewFormProps {
  open: boolean;
  onClose: () => void;
  data: Holiday | null;
}

export default function HolidayViewForm({
  open,
  onClose,
  data,
}: HolidayViewFormProps) {
  if (!data) return null;

  const holidayTypeLabels: Record<string, string> = {
    Fitr: 'عيد الفطر',
    Adha: 'عيد الأضحى',
    National: 'عطلة وطنية',
    Foundation: 'يوم التأسيس',
    Custom: 'عطلة مخصصة',
  };

  const fields = [
    {
      label: 'الرقم التسلسلي',
      value: `#${data.serialNo}`,
      type: 'text' as const,
    },
    {
      label: 'نوع العطلة',
      value: holidayTypeLabels[data.holidayType] || data.holidayType,
      type: 'text' as const,
    },
    {
      label: 'الاسم بالإنجليزية',
      value: data.holidayName || 'غير متوفر',
      type: 'text' as const,
    },
    {
      label: 'الاسم بالعربية',
      value: data.holidayName || 'غير متوفر',
      type: 'text' as const,
    },
    {
      label: 'السنة الميلادية',
      value: data.gregYear.toString(),
      type: 'text' as const,
    },
    {
      label: 'السنة الهجرية',
      value: data.hijriYear.toString(),
      type: 'text' as const,
    },
    {
      label: 'من تاريخ',
      value: data.fromDate ? new Date(data.fromDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير متوفر',
      type: 'text' as const,
    },
    {
      label: 'إلى تاريخ',
      value: data.toDate ? new Date(data.toDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير متوفر',
      type: 'text' as const,
    },
    {
      label: 'عدد الأيام',
      value: `${data.numberOfDays} يوم${data.numberOfDays !== 1 ? '' : ''}`,
      type: 'text' as const,
    },
    {
      label: 'مدفوع',
      value: data.isPaid,
      type: 'custom' as const,
      renderCustom: (value: unknown) => (
        <Chip
          label={value ? 'مدفوع' : 'غير مدفوع'}
          size="small"
          sx={{
            backgroundColor: value ? '#DCFCE7' : '#F3F4F6',
            color: value ? '#166534' : '#6B7280',
            fontSize: '11px',
            fontWeight: 600
          }}
        />
      ),
    },
    {
      label: 'متكرر',
      value: data.isRecurring,
      type: 'custom' as const,
      renderCustom: (value: unknown) => (
        <Chip
          label={value ? 'نعم' : 'لا'}
          size="small"
          sx={{
            backgroundColor: value ? '#DBEAFE' : '#F3F4F6',
            color: value ? '#1E40AF' : '#6B7280',
            fontSize: '11px',
            fontWeight: 600
          }}
        />
      ),
    },
    {
      label: 'الحالة',
      value: data.isActive,
      type: 'custom' as const,
      renderCustom: (value: unknown) => (
        <Chip
          label={value ? 'نشط' : 'غير نشط'}
          size="small"
          sx={{
            backgroundColor: value ? '#ECFDF5' : '#FEF2F2',
            color: value ? '#059669' : '#DC2626',
            fontSize: '11px',
            fontWeight: 600
          }}
        />
      ),
    },
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل العطلة"
      fields={fields}
    />
  );
}

