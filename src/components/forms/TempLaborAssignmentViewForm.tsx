'use client';

import { Chip } from '@mui/material';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { TempWorkerAssignment } from '@/types';
import { formatNumber } from '@/lib/utils/numberFormatter';

interface TempLaborAssignmentViewFormProps {
  open: boolean;
  onClose: () => void;
  data: TempWorkerAssignment | null;
}

// Define types for helper objects
type HelperObject = { label?: string; value?: string };
type ProjectObject = { projectName?: string };
type NotesObject = { notes?: string };

export default function TempLaborAssignmentViewForm({
  open,
  onClose,
  data,
}: TempLaborAssignmentViewFormProps) {
  if (!data) return null;

  // Ensure we extract string values properly (handle potential object issues)
  const workerName = typeof data.workerName === 'string'
    ? data.workerName
    : (data.workerName as unknown as HelperObject)?.label || 'غير معروف';

  const specialization = typeof data.specialization === 'string'
    ? data.specialization
    : (data.specialization as unknown as HelperObject)?.label || 'غير معروف';

  const nationality = typeof data.nationality === 'string'
    ? data.nationality
    : (data.nationality as unknown as HelperObject)?.label || 'غير معروف';

  const status = typeof data.status === 'string'
    ? data.status
    : (data.status as unknown as HelperObject)?.value || (data.status as unknown as HelperObject)?.label || 'ACTIVE';

  const statusColors = {
    ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
    COMPLETED: { bg: '#DBEAFE', text: '#1E40AF' },
    TERMINATED: { bg: '#FEE2E2', text: '#991B1B' },
  };

  const statusColor = statusColors[status as keyof typeof statusColors] || statusColors.ACTIVE;

  // Get project name from data if available
  const projectName = (data as unknown as ProjectObject)?.projectName || (data as unknown as ProjectObject)?.projectName || 'غير متوفر';
  const notes = (data as unknown as NotesObject)?.notes || '';

  const fields = [
    {
      label: 'رقم العامل',
      value: `#${data.workerId}`,
    },
    {
      label: 'اسم العامل',
      value: workerName,
    },
    {
      label: 'المشروع',
      value: projectName,
    },
    {
      label: 'التخصص',
      value: (
        <Chip
          label={specialization}
          size="small"
          sx={{
            backgroundColor: '#EDE9FE',
            color: '#6B21A8',
            fontWeight: 600,
            fontSize: '11px',
          }}
        />
      ),
    },
    {
      label: 'الجنسية',
      value: nationality,
    },
    {
      label: 'تاريخ البدء',
      value: new Date(data.startDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'تاريخ الانتهاء',
      value: new Date(data.endDate).toLocaleDateString('en-GB'),
    },
    {
      label: 'الأجر اليومي',
      value: `ر.س ${formatNumber(data.dailyWage)}`,
    },
    {
      label: 'الحالة',
      value: (
        <Chip
          label={status}
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

  // Add Notes field if it exists
  if (notes) {
    fields.push({
      label: 'ملاحظات',
      value: notes,
    });
  }

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل تعيين العمالة المؤقتة"
      fields={fields}
    />
  );
}

