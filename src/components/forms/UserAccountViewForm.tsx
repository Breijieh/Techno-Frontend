'use client';

import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { UserAccount } from '@/types';
import { mockEmployees } from '@/lib/mockData';

interface UserAccountViewFormProps {
  open: boolean;
  onClose: () => void;
  userAccount: UserAccount | null;
}

export default function UserAccountViewForm({
  open,
  onClose,
  userAccount,
}: UserAccountViewFormProps) {
  if (!userAccount) return null;

  const getEmployeeName = (employeeId?: number) => {
    if (!employeeId) return 'غير متوفر';
    const employee = mockEmployees.find((e) => e.employeeId === employeeId);
    return employee?.fullName || 'غير متوفر';
  };

  const userTypeColors: Record<string, { bg: string; text: string }> = {
    ADMIN: { bg: '#FED7AA', text: '#9A3412' },
    USER: { bg: '#E0E7FF', text: '#3730A3' },
  };

  const fields = [
    { label: 'رقم المستخدم', value: userAccount.userId, type: 'text' as const },
    { label: 'اسم المستخدم', value: userAccount.username, type: 'text' as const },
    {
      label: 'نوع المستخدم',
      value: userAccount.userType,
      type: 'chip' as const,
      chipColor: userTypeColors[userAccount.userType] || userTypeColors.USER,
    },
    { label: 'الموظف', value: getEmployeeName(userAccount.employeeId), type: 'text' as const },
    { label: 'نشط', value: userAccount.isActive, type: 'boolean' as const },
    { label: 'تاريخ آخر تسجيل دخول', value: userAccount.lastLoginDate, type: 'date' as const },
    { label: 'وقت آخر تسجيل دخول', value: userAccount.lastLoginTime, type: 'text' as const },
    { label: 'تاريخ الإنشاء', value: userAccount.createdDate, type: 'date' as const },
  ];

  return (
    <ViewDetailsDialog
      open={open}
      onClose={onClose}
      title="تفاصيل حساب المستخدم"
      fields={fields}
      maxWidth="md"
    />
  );
}

