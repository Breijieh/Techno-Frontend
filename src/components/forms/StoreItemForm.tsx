'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Typography,
} from '@mui/material';
import {
    Save,
    Cancel,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
    AnimatedTextField,
    AnimatedSelect,
    AnimatedSwitch,
} from '@/components/common/FormFields';
import { ItemResponse } from '@/lib/api/warehouse';

// Extended type to include form-specific fields
export interface StoreItemFormData extends Partial<ItemResponse> {
    storeName?: string;
    itemDescription?: string;
    storeCode?: number; // For initial quantity
    initialQuantity?: number; // For initial quantity
}

interface StoreItemFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<StoreItemFormData>) => Promise<void>;
    initialData?: StoreItemFormData | null;
    loading?: boolean;
    categories: Array<{ categoryCode: number; categoryName: string }>;
    stores: Array<{ storeCode: number; storeName: string; projectCode?: number }>;
}

// Custom Smart Row component
const SmartRow = ({ children, spacing = 2 }: { children: React.ReactNode; spacing?: number }) => (
    <Box sx={{ display: 'flex', gap: spacing, mb: spacing, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        {children}
    </Box>
);

const SmartField = ({ children, flex = 1 }: { children: React.ReactNode; flex?: number | string }) => (
    <Box sx={{ flex, minWidth: { xs: '100%', md: '0' } }}>
        {children}
    </Box>
);

export default function StoreItemForm({
    open,
    onClose,
    onSubmit,
    initialData,
    loading = false,
    categories = [],
    stores = [],
}: StoreItemFormProps) {
    const isEdit = !!initialData;

    const getInitialFormData = (): Partial<StoreItemFormData> => {
        if (!initialData) {
            return {
                itemName: '',
                categoryCode: categories.length > 0 ? categories[0].categoryCode : 1,
                totalQuantity: 0,
                unitOfMeasure: '',
                storeCode: 0,
                reorderLevel: undefined,
                itemDescription: '',
                isActive: true,
            };
        }
        return {
            itemName: initialData.itemName || '',
            categoryCode: initialData.categoryCode || (categories.length > 0 ? categories[0].categoryCode : 1),
            totalQuantity: 0, // Reset for form, specific logic handles this
            unitOfMeasure: initialData.unitOfMeasure || '',
            storeCode: 0,
            reorderLevel: initialData.reorderLevel,
            itemDescription: initialData.itemDescription || '',
            isActive: initialData.isActive !== undefined ? initialData.isActive : true,
        };
    };

    const [formData, setFormData] = useState<Partial<StoreItemFormData>>(getInitialFormData());
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
            setFormData(getInitialFormData());
            setErrors({});
        }, 0);
    }, [initialData, open]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.itemName?.trim()) newErrors.itemName = 'اسم العنصر مطلوب';
        if (!formData.categoryCode) newErrors.categoryCode = 'الفئة مطلوبة';
        if (!formData.unitOfMeasure?.trim()) newErrors.unitOfMeasure = 'وحدة القياس مطلوبة';

        // Validate store/quantity ONLY when creating new item (or if explicitly handling initial stock)
        // Based on previous logic: if creating and quantity > 0, store is required.
        if (!isEdit && (formData.totalQuantity || 0) > 0 && !formData.storeCode) {
            newErrors.storeCode = 'المستودع مطلوب عند تحديد الكمية الأولية';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        await onSubmit(formData);
    };

    return (
        <AnimatedDialog
            open={open}
            onClose={onClose}
            title={isEdit ? 'تعديل العنصر' : 'إضافة عنصر جديد'}
            maxWidth="md"
            disableBackdropClick={loading}
            showCloseButton={!loading}
            actions={
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', width: '100%' }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        startIcon={<Cancel />}
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderColor: '#D1D5DB',
                            color: '#374151',
                            '&:hover': {
                                borderColor: '#9CA3AF',
                                backgroundColor: '#F9FAFB',
                            },
                        }}
                    >
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save />}
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                            color: '#FFFFFF',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
                            },
                            '&:disabled': {
                                background: '#9CA3AF',
                            },
                        }}
                    >
                        {loading ? 'جارٍ الحفظ...' : isEdit ? 'تحديث' : 'إنشاء'}
                    </Button>
                </Box>
            }
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    padding: '8px 4px',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: '8px' },
                    '&::-webkit-scrollbar-track': { backgroundColor: '#F3F4F6' },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: '#9CA3AF', borderRadius: '4px' },
                }}
            >
                <Typography variant="subtitle2" sx={{ color: '#6B7280', mb: 1 }}>
                    معلومات العنصر
                </Typography>

                <SmartRow>
                    <SmartField>
                        <AnimatedTextField
                            label="اسم العنصر"
                            value={formData.itemName || ''}
                            onChange={(val: string) => setFormData({ ...formData, itemName: val })}
                            error={!!errors.itemName}
                            helperText={errors.itemName}
                            required
                            autoFocus
                        />
                    </SmartField>
                    <SmartField>
                        <AnimatedSelect
                            label="الفئة"
                            value={formData.categoryCode || ''}
                            onChange={(val: string | number) => setFormData({ ...formData, categoryCode: Number(val) })}
                            options={categories.map((category) => ({
                                value: category.categoryCode,
                                label: category.categoryName
                            }))}
                            error={!!errors.categoryCode}
                            helperText={errors.categoryCode}
                            required
                            placeholder={loading ? 'جارٍ تحميل الفئات...' : 'لا توجد فئات متاحة'}
                        />
                    </SmartField>
                </SmartRow>

                <SmartRow>
                    <SmartField>
                        <AnimatedTextField
                            label="وحدة القياس"
                            value={formData.unitOfMeasure || ''}
                            onChange={(val: string) => setFormData({ ...formData, unitOfMeasure: val })}
                            error={!!errors.unitOfMeasure}
                            helperText={errors.unitOfMeasure || "مثال: حبة، كجم، لتر"}
                            required
                        />
                    </SmartField>
                    <SmartField>
                        <AnimatedTextField
                            label="نقطة إعادة الطلب"
                            value={formData.reorderLevel?.toString() || ''}
                            onChange={(val: string) => setFormData({ ...formData, reorderLevel: val === '' ? undefined : Number(val) })}
                            type="number"
                            helperText="أقل مستوى مخزون قبل التنبيه"
                        />
                    </SmartField>
                </SmartRow>

                <SmartRow>
                    <SmartField>
                        <AnimatedTextField
                            label="الوصف"
                            value={formData.itemDescription || ''}
                            onChange={(val: string) => setFormData({ ...formData, itemDescription: val })}
                            multiline
                            rows={2}
                        />
                    </SmartField>
                </SmartRow>

                {!isEdit && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 1, border: '1px solid #E2E8F0' }}>
                        <Typography variant="subtitle2" sx={{ color: '#475569', mb: 2 }}>
                            المخزون الأولي (اختياري)
                        </Typography>
                        <SmartRow>
                            <SmartField>
                                <AnimatedTextField
                                    label="الكمية الأولية"
                                    value={formData.totalQuantity?.toString() || '0'}
                                    onChange={(val: string) => {
                                        const qty = Number(val);
                                        setFormData(prev => ({
                                            ...prev,
                                            totalQuantity: qty,
                                            storeCode: qty > 0 ? (prev.storeCode || 0) : 0
                                        }));
                                    }}
                                    type="number"
                                />
                            </SmartField>
                            {(formData.totalQuantity || 0) > 0 && (
                                <SmartField>
                                    <AnimatedSelect
                                        label="المستودع"
                                        value={formData.storeCode || 0}
                                        onChange={(val: string | number) => setFormData({ ...formData, storeCode: Number(val) })}
                                        options={[
                                            { value: 0, label: 'اختر المستودع' },
                                            ...stores.map((store) => ({
                                                value: store.storeCode,
                                                label: `${store.storeName} ${store.projectCode ? `(#${store.projectCode})` : ''}`
                                            }))
                                        ]}
                                        error={!!errors.storeCode}
                                        helperText={errors.storeCode}
                                        required
                                    />
                                </SmartField>
                            )}
                        </SmartRow>
                    </Box>
                )}

                {isEdit && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#F3F4F6', borderRadius: 1, border: '1px solid #E5E7EB' }}>
                        <Typography variant="body2" color="text.secondary">
                            لتعديل مستويات المخزون، يرجى استخدام عمليات استلام أو صرف البضائع.
                        </Typography>
                    </Box>
                )}

                <Box sx={{ mt: 2 }}>
                    {isEdit && (
                        <AnimatedSwitch
                            label="العنصر نشط"
                            checked={formData.isActive || false}
                            onChange={(val: boolean) => setFormData({ ...formData, isActive: val })}
                        />
                    )}
                </Box>

            </Box>
        </AnimatedDialog>
    );
}
