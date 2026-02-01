'use client';

import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import type { StoreItemCategory } from '@/types';

interface WarehouseCategoryViewFormProps {
  open: boolean;
  onClose: () => void;
  category: StoreItemCategory | null;
}

export default function WarehouseCategoryViewForm({
  open,
  onClose,
  category,
}: WarehouseCategoryViewFormProps) {
  if (!category) return null;

  const fields = [
    { label: 'رمز الفئة', value: category.categoryCode, type: 'text' as const },
    { label: 'الاسم بالإنجليزية', value: category.categoryName, type: 'text' as const },
    { label: 'الاسم بالعربية', value: category.categoryName, type: 'text' as const },
  ];

  return <ViewDetailsDialog open={open} onClose={onClose} title="تفاصيل الفئة" fields={fields} maxWidth="md" />;
}

