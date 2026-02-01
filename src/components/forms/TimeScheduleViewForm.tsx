'use client';

import { useMemo } from 'react';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { TimeSchedule } from '@/types';
import { departmentsApi } from '@/lib/api/departments';
import { useApi } from '@/hooks/useApi';

interface TimeScheduleViewFormProps {
  open: boolean;
  onClose: () => void;
  data: TimeSchedule | null;
}

export default function TimeScheduleViewForm({
  open,
  onClose,
  data,
}: TimeScheduleViewFormProps) {
  // Fetch departments when form is open
  const { data: departmentsData } = useApi(
    () => departmentsApi.getAllDepartments(),
    { immediate: open }
  );

  const fields = useMemo(() => {
    if (!data) return [];

    const department = departmentsData?.find((d) => d.deptCode === data.departmentCode);

    const baseFields = [
      ...(data.scheduleName
        ? [
          {
            label: 'اسم الجدول',
            value: data.scheduleName,
          },
        ]
        : []),
      {
        label: 'القسم',
        value: data.departmentNameEn || department?.deptName || department?.deptName || `رمز: ${data.departmentCode}`,
      },
      {
        label: 'الساعات المطلوبة',
        value: `${data.requiredHours} ساعة`,
      },
      {
        label: 'وقت الدخول',
        value: data.entryTime,
      },
      {
        label: 'وقت الخروج',
        value: data.exitTime,
      },
      ...(data.gracePeriodMinutes !== undefined
        ? [
          {
            label: 'فترة السماح',
            value: `${data.gracePeriodMinutes} دقيقة`,
          },
        ]
        : []),
      {
        label: 'الحالة',
        value: data.isActive === 'Y' ? 'نشط' : 'غير نشط',
      },
    ];

    return baseFields;
  }, [data, departmentsData]);

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل جدول الوقت"
      fields={fields}
    />
  );
}

