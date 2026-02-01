'use client';

import { useState, useEffect, useMemo } from 'react';
import { arSA } from 'date-fns/locale';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Stack,
} from '@mui/material';
import {
  Save,
  ChevronRight,
  ChevronLeft,
  PersonOutline,
  WorkOutline,
  AdminPanelSettingsOutlined,
  ContactMailOutlined,
  PaymentsOutlined,
  VpnKeyOutlined,
  EventNoteOutlined,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedTextField,
  AnimatedSelect,
  AnimatedNumberField,
  AnimatedDatePicker,
  AnimatedAutocomplete,
  LocalizationProvider,
  AdapterDateFns,
  FormSection,
} from '@/components/common/FormFields';
import type { Employee, ContractType, EmployeeStatus } from '@/types';
import { departmentsApi, employeesApi, contractTypesApi } from '@/lib/api';
import type { DepartmentResponse, ContractTypeResponse } from '@/lib/api';
import { mapEmployeeResponseToEmployee } from '@/lib/mappers/employeeMapper';

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Employee>) => Promise<void>;
  initialData?: Employee | null;
  loading?: boolean;
}

const COUNTRIES = [
  // --- دول الخليج وذات الأولوية الإقليمية ---
  'المملكة العربية السعودية', 'الإمارات العربية المتحدة', 'قطر', 'الكويت', 'البحرين', 'سلطنة عمان',
  'مصر', 'الأردن', 'لبنان', 'سوريا', 'فلسطين', 'العراق', 'اليمن',
  'السودان', 'المغرب', 'تونس', 'الجزائر', 'ليبيا', 'موريتانيا', 'الصومال', 'جيبوتي', 'جزر القمر',

  // --- آسيا ---
  'الهند', 'باكستان', 'بنغلاديش', 'الفلبين', 'سريلانكا', 'نيبال', 'إندونيسيا',
  'تايلاند', 'فيتنام', 'ماليزيا', 'سنغافورة', 'الصين', 'اليابان', 'كوريا الجنوبية',
  'أفغانستان', 'أرمينيا', 'أذربيجان', 'كمبوديا', 'جورجيا', 'إيران', 'كازاخستان',
  'قيرغيزستان', 'لاوس', 'المالديف', 'منغوليا', 'ميانمار', 'تايوان', 'طاجيكستان',
  'تركمانستان', 'أوزبكستان', 'بروناي', 'تيمور الشرقية', 'بوتان',

  // --- أوروبا ---
  'المملكة المتحدة', 'فرنسا', 'ألمانيا', 'إيطاليا', 'إسبانيا', 'البرتغال', 'هولندا',
  'بلجيكا', 'سويسرا', 'السويد', 'الرويج', 'الدنمارك', 'فنلندا', 'أيرلندا',
  'النمسا', 'اليونان', 'بولندا', 'تركيا', 'روسيا', 'أوكرانيا', 'جمهورية التشيك',
  'سلوفاكيا', 'المجر', 'رومانيا', 'بلغاريا', 'صربيا', 'كرواتيا', 'البوسنة والهرسك',
  'ألبانيا', 'سلوفينيا', 'إستونيا', 'لاتفيا', 'ليتوانيا', 'بيلاروسيا', 'مولدوفا',
  'قبرص', 'مالطا', 'أيسلندا', 'لوكسمبورغ', 'موناكو',

  // --- الأمريكتان ---
  'الولايات المتحدة', 'كندا', 'البرازيل', 'الأرجنتين', 'المكسيك', 'كولومبيا', 'تشيلي',
  'بيرو', 'فنزويلا', 'الإكوادور', 'بوليفيا', 'باراغواي', 'أوروغواي', 'كوبا', 'جامايكا',
  'جمهورية الدومينيكان', 'كوستاريكا', 'بنما', 'غواتيمالا', 'هندوراس', 'السلفادور',
  'نيكاراغوا', 'ترينيداد وتوباغو', 'غيانا', 'سورينام', 'جزر البهاما', 'بربادوس',

  // --- أفريقيا ---
  'جنوب أفريقيا', 'نيجيريا', 'كينيا', 'إثيوبيا', 'غانا', 'أنغولا', 'ساحل العاج',
  'تنزانيا', 'أوغندا', 'زامبيا', 'زيمبابوي', 'السنغال', 'الكاميرون', 'مالي', 'موزمبيق',
  'ناميبيا', 'بوتسوانا', 'رواندا', 'مدغشقر', 'موريشيوس', 'سيشل', 'غامبيا',
  'ليبيريا', 'سيراليون', 'الغابون', 'تشاد', 'النيجر', 'بوركينا فاسو', 'توغو', 'بنين',

  // --- أوقيانوسيا ---
  'أستراليا', 'نيوزيلندا', 'فيجي', 'بابوا غينيا الجديدة', 'ساموا', 'جزر سليمان',

  'أخرى'
];

type EmployeeFormData = Omit<Partial<Employee>, 'dateOfBirth' | 'hireDate' | 'terminationDate' | 'passportExpiry' | 'residenceExpiry'> & {
  dateOfBirth?: Date | null;
  hireDate?: Date | null;
  terminationDate?: Date | null;
  passportExpiry?: Date | null;
  residenceExpiry?: Date | null;
  fullName?: string;
  username?: string;
  password?: string;
  userType?: string;
  socialInsuranceNo?: string;
};

import { SmartRow, SmartField } from '@/components/common/SmartLayout';

export default function EmployeeForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: EmployeeFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<EmployeeFormData>({
    residenceId: '', nationalId: '', fullName: '', email: '', phone: '',
    dateOfBirth: null, hireDate: null, terminationDate: null, departmentCode: 0,
    positionTitle: '', contractType: 'TECHNO' as ContractType, status: 'ACTIVE' as EmployeeStatus,
    monthlySalary: 0, nationality: '', isSaudi: false, passportNumber: '',
    passportExpiry: null, residenceExpiry: null, vacationBalance: 30, managerId: undefined,
    username: '', password: '', userType: 'EMPLOYEE', socialInsuranceNo: '',
  });

  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractTypeResponse[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingContractTypes, setLoadingContractTypes] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setErrors({});

    const loadData = async () => {
      setLoadingDepartments(true);
      try {
        const depts = await departmentsApi.getAllDepartments();
        setDepartments(depts);
      } catch (error) { console.error(error); } finally { setLoadingDepartments(false); }

      setLoadingContractTypes(true);
      try {
        const types = await contractTypesApi.getAllContractTypes();
        setContractTypes(types);
      } catch (error) { console.error(error); } finally { setLoadingContractTypes(false); }

      setLoadingManagers(true);
      try {
        const response = await employeesApi.getAllEmployees({ page: 0, size: 1000 });
        setManagers(response.employees.map(mapEmployeeResponseToEmployee));
      } catch (error) { console.error(error); } finally { setLoadingManagers(false); }
    };

    loadData();
  }, [open]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : null,
        hireDate: initialData.hireDate ? new Date(initialData.hireDate) : null,
        terminationDate: initialData.terminationDate ? new Date(initialData.terminationDate) : null,
        passportExpiry: initialData.passportExpiry ? new Date(initialData.passportExpiry) : null,
        residenceExpiry: initialData.residenceExpiry ? new Date(initialData.residenceExpiry) : null,
        socialInsuranceNo: initialData.socialInsuranceNo || '',
      });
    } else {
      setFormData({
        residenceId: '', nationalId: '', fullName: '', email: '', phone: '',
        dateOfBirth: null, hireDate: null, terminationDate: null, departmentCode: 0,
        positionTitle: '', contractType: 'TECHNO' as ContractType, status: 'ACTIVE' as EmployeeStatus,
        monthlySalary: 0, nationality: '', isSaudi: false, passportNumber: '',
        passportExpiry: null, residenceExpiry: null, vacationBalance: 30, managerId: undefined,
        username: '', password: '', userType: 'EMPLOYEE', socialInsuranceNo: '',
      });
    }
  }, [initialData, open]);

  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleIdChange = (idField: 'nationalId' | 'passportNumber' | 'residenceId', value: string) => {


    setFormData(prev => {
      const next = { ...prev, [idField]: value };
      if (!isEdit) {
        if (!usernameTouched) next.username = value;
        if (!passwordTouched) next.password = value;
      }
      return next;
    });


  };

  // "Smart Sync" between Nationality and IsSaudi status
  // One-way sync: nationality changes → update isSaudi
  useEffect(() => {
    if (formData.nationality === 'المملكة العربية السعودية' && !formData.isSaudi) {
      setFormData(prev => ({ ...prev, isSaudi: true }));
    } else if (formData.nationality && formData.nationality !== 'المملكة العربية السعودية' && formData.isSaudi) {
      setFormData(prev => ({ ...prev, isSaudi: false }));
    }
  }, [formData.nationality, formData.isSaudi]);

  // Clear residence ID when user is Saudi citizen
  useEffect(() => {
    if (formData.isSaudi && formData.residenceId) {
      setFormData(prev => ({ ...prev, residenceId: '' }));
    }
  }, [formData.isSaudi]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.fullName?.trim()) newErrors.fullName = 'مطلوب';
      if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'البريد الإلكتروني غير صحيح';
      }
      if (!formData.nationality?.trim()) newErrors.nationality = 'مطلوب';
    } else if (step === 1) {
      if (!formData.hireDate) newErrors.hireDate = 'مطلوب';
      if (!formData.monthlySalary || (formData.monthlySalary && formData.monthlySalary <= 0)) newErrors.monthlySalary = 'يجب أن يكون أكبر من 0';
    } else if (step === 2) {
      if (!formData.nationalId?.trim() && !formData.residenceId?.trim() && !formData.passportNumber?.trim()) {
        newErrors.nationalId = 'الهوية مطلوبة';
      }
      if (!isEdit) {
        if (!formData.username?.trim()) newErrors.username = 'اسم المستخدم مطلوب';
        if (!formData.password?.trim()) newErrors.password = 'كلمة المرور مطلوبة';
      }
      if (!isEdit) {
        if (!formData.username?.trim()) newErrors.username = 'اسم المستخدم مطلوب';
        if (!formData.password?.trim()) newErrors.password = 'كلمة المرور مطلوبة';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(activeStep)) setActiveStep(prev => prev + 1); };
  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;
    const submitData: Partial<Employee> = {
      ...formData,
      dateOfBirth: formData.dateOfBirth ?? undefined,
      hireDate: formData.hireDate ?? undefined,
      terminationDate: formData.terminationDate ?? undefined,
      passportExpiry: formData.passportExpiry ?? undefined,
      residenceExpiry: formData.residenceExpiry ?? undefined,
    };
    await onSubmit(submitData);
  };

  const departmentOptions = [
    { value: 0, label: 'لا يوجد قسم' },
    ...departments.map(dept => ({ value: dept.deptCode || 0, label: dept.deptName || dept.deptName || 'غير معروف' })),
  ];

  const contractTypeOptions = useMemo(() => {
    return contractTypes
      .filter(type => {
        const isActive = type.isActive;
        return isActive !== 'N' && isActive !== 'n';
      })
      .map(type => ({ value: type.contractTypeCode, label: type.typeName || type.typeName || type.contractTypeCode }));
  }, [contractTypes]);

  const managerOptions = managers
    .filter(emp => emp.employeeId !== initialData?.employeeId)
    .map(emp => ({ value: emp.employeeId, label: emp.fullName }));

  const steps = [
    { label: 'المعلومات الأساسية', icon: <PersonOutline fontSize="small" /> },
    { label: 'الملف الوظيفي', icon: <WorkOutline fontSize="small" /> },
    { label: 'الوصول والامتثال', icon: <AdminPanelSettingsOutlined fontSize="small" /> },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={arSA}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل الموظف' : 'إضافة موظف جديد'}
        maxWidth="md"
        disableBackdropClick={loading}
        showCloseButton={!loading}
        actions={
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', width: '100%', px: 1 }}>
            <Button
              onClick={activeStep === 0 ? onClose : handleBack}
              variant="text"
              startIcon={activeStep > 0 ? <ChevronRight /> : null}
              sx={{ color: '#6B7280', textTransform: 'none', fontWeight: 600 }}
              disabled={loading}
            >
              {activeStep === 0 ? 'إلغاء' : 'السابق'}
            </Button>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {activeStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  sx={{
                    px: 4, borderRadius: '8px', textTransform: 'none', fontWeight: 600,
                    background: '#0c2b7a',
                    boxShadow: '0 4px 12px rgba(12, 43, 122, 0.2)',
                    '&:hover': { background: '#09215e' },
                  }}
                >
                  الخطوة التالية
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{
                    px: 4, borderRadius: '8px', textTransform: 'none', fontWeight: 600,
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    '&:hover': { opacity: 0.9 },
                  }}
                >
                  {loading ? 'جارٍ المعالجة...' : isEdit ? 'تحديث التغييرات' : 'إتمام التسجيل'}
                </Button>
              )}
            </Box>
          </Box>
        }
      >
        <Box sx={{ py: 2 }}>
          {/* Enhanced Modern Stepper */}
          <Box sx={{ mb: 6, display: 'flex', justifyContent: 'center', px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {steps.map((s, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  {/* Step Card */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1.5,
                      px: { xs: 1.5, sm: 2.5 },
                      py: { xs: 1.25, sm: 1.75 },
                      borderRadius: '12px',
                      width: { xs: '120px', sm: '200px' },
                      background: idx === activeStep
                        ? 'linear-gradient(135deg, #0c2b7a 0%, #0f3a94 100%)'
                        : idx < activeStep
                          ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                          : '#F9FAFB',
                      color: idx <= activeStep ? '#FFFFFF' : '#6B7280',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: idx === activeStep
                        ? '0 8px 24px rgba(12, 43, 122, 0.25), 0 2px 8px rgba(12, 43, 122, 0.15)'
                        : idx < activeStep
                          ? '0 4px 12px rgba(16, 185, 129, 0.2)'
                          : '0 1px 3px rgba(0, 0, 0, 0.05)',
                      border: idx === activeStep
                        ? '2px solid rgba(255, 255, 255, 0.2)'
                        : idx < activeStep
                          ? '2px solid rgba(255, 255, 255, 0.2)'
                          : '2px solid #E5E7EB',
                      transform: idx === activeStep ? 'scale(1.05)' : 'scale(1)',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: idx === activeStep ? 'scale(1.05)' : 'scale(1.02)',
                        boxShadow: idx === activeStep
                          ? '0 8px 24px rgba(12, 43, 122, 0.25), 0 2px 8px rgba(12, 43, 122, 0.15)'
                          : '0 4px 12px rgba(0, 0, 0, 0.1)',
                      },
                      direction: 'rtl',
                    }}
                  >
                    {/* Icon Container */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: { xs: 28, sm: 32 },
                        height: { xs: 28, sm: 32 },
                        borderRadius: '8px',
                        background: idx <= activeStep
                          ? 'rgba(255, 255, 255, 0.2)'
                          : '#FFFFFF',
                        color: idx <= activeStep ? '#FFFFFF' : '#9CA3AF',
                        transition: 'all 0.3s ease',
                        flexShrink: 0,
                        '& svg': {
                          fontSize: { xs: '18px', sm: '20px' },
                        },
                      }}
                    >
                      {idx < activeStep ? (
                        <Box
                          component="span"
                          sx={{
                            fontSize: { xs: '16px', sm: '18px' },
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          ✓
                        </Box>
                      ) : (
                        s.icon
                      )}
                    </Box>
                    {/* Step Label */}
                    <Typography
                      sx={{
                        fontWeight: idx === activeStep ? 700 : idx < activeStep ? 600 : 500,
                        fontSize: { xs: '11px', sm: '13px' },
                        color: idx <= activeStep ? '#FFFFFF' : '#6B7280',
                        whiteSpace: 'nowrap',
                        display: { xs: 'none', sm: 'block' },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {s.label}
                    </Typography>
                    {/* Mobile Label */}
                    <Typography
                      sx={{
                        fontWeight: idx === activeStep ? 700 : 500,
                        fontSize: '10px',
                        color: idx <= activeStep ? '#FFFFFF' : '#6B7280',
                        whiteSpace: 'nowrap',
                        display: { xs: 'block', sm: 'none' },
                        textAlign: 'center',
                      }}
                    >
                      {s.label.split(' ')[0]}
                    </Typography>
                  </Box>

                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <Box
                      sx={{
                        width: { xs: '20px', sm: '40px' },
                        height: '3px',
                        mx: { xs: 0.5, sm: 1 },
                        background: idx < activeStep
                          ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                          : '#E5E7EB',
                        borderRadius: '2px',
                        position: 'relative',
                        overflow: 'hidden',
                        display: { xs: 'none', sm: 'block' },
                        '&::after': idx < activeStep ? {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                          animation: 'shimmer 2s infinite',
                        } : {},
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ minHeight: '400px', animation: 'fadeIn 0.5s ease-out' }}>
            {activeStep === 0 && (
              <Stack spacing={4}>
                {/* Full Name Row - Smart Layout */}
                <Box>
                  <FormSection icon={<PersonOutline />} title="الاسم الكامل" />
                  <SmartRow>
                    <SmartField>
                      <AnimatedTextField
                        label="الاسم الكامل"
                        placeholder="أدخل الاسم الرسمي للموظف"
                        value={formData.fullName || ''}
                        onChange={(v: string) => setFormData(p => ({ ...p, fullName: v }))}
                        error={!!errors.fullName}
                        helperText={errors.fullName}
                        required
                      />
                    </SmartField>
                  </SmartRow>
                </Box>

                {/* Identity & Origin Row */}
                <Box>
                  <FormSection icon={<AdminPanelSettingsOutlined />} title="الهوية والأصل" />
                  <SmartRow>
                    <SmartField>
                      <AnimatedDatePicker
                        label="تاريخ الميلاد (اختياري)"
                        value={formData.dateOfBirth}
                        onChange={(v: Date | null) => setFormData(p => ({ ...p, dateOfBirth: v }))}
                        maxDate={new Date()}
                      />
                    </SmartField>
                    <SmartField>
                      <AnimatedAutocomplete
                        label="الجنسية"
                        value={formData.nationality || ''}
                        onChange={(v: string | string[] | null) => {
                          const val = Array.isArray(v) ? v[0] : v;
                          setFormData(p => ({ ...p, nationality: val || '' }));
                        }}
                        options={COUNTRIES}
                        getOptionLabel={(option: string) => option}
                        error={!!errors.nationality}
                        helperText={errors.nationality}
                        required
                      />
                    </SmartField>
                  </SmartRow>
                </Box>

                {/* Contact Row */}
                <Box>
                  <FormSection icon={<ContactMailOutlined />} title="معلومات الاتصال" />
                  <SmartRow>
                    <SmartField>
                      <AnimatedTextField
                        label="البريد الإلكتروني للعمل (اختياري)"
                        type="email"
                        value={formData.email || ''}
                        onChange={(v: string) => setFormData(p => ({ ...p, email: v }))}
                        error={!!errors.email}
                        helperText={errors.email}
                      />
                    </SmartField>
                    <SmartField>
                      <AnimatedTextField
                        label="رقم الهاتف (اختياري)"
                        placeholder="+966"
                        value={formData.phone || ''}
                        onChange={(v: string) => setFormData(p => ({ ...p, phone: v }))}
                        error={!!errors.phone}
                        helperText={errors.phone}
                      />
                    </SmartField>
                  </SmartRow>
                </Box>
              </Stack>
            )}

            {activeStep === 1 && (
              <Stack spacing={4}>
                {/* Organizational Placement */}
                <Box>
                  <FormSection icon={<WorkOutline />} title="الدور التنظيمي" />
                  <SmartRow>
                    <SmartField>
                      <AnimatedSelect
                        label="القسم (اختياري)"
                        value={formData.departmentCode || 0}
                        onChange={(v: string | number) => setFormData(p => ({ ...p, departmentCode: v as number }))}
                        options={departmentOptions}
                        disabled={loadingDepartments}
                      />
                    </SmartField>
                    <SmartField>
                      <AnimatedTextField
                        label="المسمى الوظيفي (اختياري)"
                        value={formData.positionTitle || ''}
                        onChange={(v: string) => setFormData(p => ({ ...p, positionTitle: v }))}
                      />
                    </SmartField>
                  </SmartRow>
                  <Box sx={{ mb: 2 }}>
                    <AnimatedAutocomplete
                      label="المدير المباشر"
                      value={managerOptions.find(opt => opt.value === (formData.managerId || 0)) || null}
                      onChange={(val) => {
                        const option = val as { value: number; label: string } | null;
                        setFormData(p => ({ ...p, managerId: option?.value === 0 ? undefined : option?.value }));
                      }}
                      options={[{ value: 0, label: 'الإدارة المباشرة (لا يوجد مدير)' }, ...managerOptions]}
                      getOptionLabel={(opt) => (opt as { label: string }).label}
                      disabled={loadingManagers}
                    />
                  </Box>
                </Box>

                {/* Compensation & Status */}
                <Box>
                  <FormSection icon={<PaymentsOutlined />} title="التفاصيل المالية" />
                  <SmartRow>
                    <SmartField>
                      <AnimatedNumberField
                        label="الراتب الشهري الإجمالي"
                        prefix="ر.س"
                        value={formData.monthlySalary || ''}
                        onChange={(v: number | string) => setFormData(p => ({ ...p, monthlySalary: Number(v) }))}
                        error={!!errors.monthlySalary}
                        helperText={errors.monthlySalary}
                        required
                      />
                    </SmartField>
                    <SmartField>
                      <AnimatedSelect
                        label="نوع العقد"
                        value={formData.contractType || ''}
                        onChange={(v: string | number) => setFormData(p => ({ ...p, contractType: v as ContractType }))}
                        options={contractTypeOptions}
                        disabled={loadingContractTypes}
                        required
                      />
                    </SmartField>
                  </SmartRow>
                  <Box sx={{ mb: 2 }}>
                    {isEdit && (
                      <AnimatedSelect
                        label="الحالة الحالية"
                        value={formData.status || 'ACTIVE'}
                        onChange={(v: string | number) => setFormData(p => ({ ...p, status: v as EmployeeStatus }))}
                        options={[
                          { value: 'ACTIVE', label: 'نشط' },
                          { value: 'ON_LEAVE', label: 'في إجازة' },
                          { value: 'INACTIVE', label: 'غير نشط' },
                          { value: 'TERMINATED', label: 'منتهي' },
                        ]}
                        required
                      />
                    )}
                  </Box>
                </Box>

                {/* Engagement Timeline */}
                <Box>
                  <FormSection icon={<EventNoteOutlined />} title="جدول التوظيف" />
                  <SmartRow>
                    <SmartField flex={1}>
                      <AnimatedDatePicker
                        label="تاريخ التوظيف"
                        value={formData.hireDate}
                        onChange={(v: Date | null) => setFormData({ ...formData, hireDate: v })}
                        error={!!errors.hireDate}
                        helperText={errors.hireDate}
                        required
                      />
                    </SmartField>
                    <SmartField flex={1}>
                      <AnimatedDatePicker
                        label="تاريخ انتهاء العقد"
                        value={formData.terminationDate}
                        onChange={(v: Date | null) => setFormData({ ...formData, terminationDate: v })}
                      />
                    </SmartField>
                    <SmartField flex={1}>
                      <AnimatedNumberField
                        label="رصيد الإجازات (اختياري)"
                        value={formData.vacationBalance || ''}
                        onChange={(v: number | string) => setFormData({ ...formData, vacationBalance: Number(v) })}
                      />
                    </SmartField>
                  </SmartRow>
                </Box >
              </Stack >
            )
            }

            {
              activeStep === 2 && (
                <Stack spacing={4}>
                  <Box>
                    <FormSection icon={<AdminPanelSettingsOutlined />} title="الامتثال التنظيمي" />
                    <Paper variant="outlined" sx={{ p: 4, borderRadius: '16px', bgcolor: '#FDFDFD', borderStyle: 'solid', borderColor: '#F3F4F6' }}>
                      <SmartRow>
                        <SmartField>
                          <AnimatedTextField
                            label={formData.nationality === 'المملكة العربية السعودية' ? "رقم الهوية الوطنية" : "رقم جواز السفر"}
                            value={(formData.nationality === 'المملكة العربية السعودية' ? formData.nationalId : formData.passportNumber) || ''}
                            onChange={(v: string) => handleIdChange(formData.nationality === 'المملكة العربية السعودية' ? 'nationalId' : 'passportNumber', v)}
                            error={!!errors.nationalId}
                            helperText={errors.nationalId}
                            required
                          />
                        </SmartField>
                        {formData.nationality !== 'المملكة العربية السعودية' && (
                          <SmartField>
                            <AnimatedTextField
                              label="رقم الإقامة"
                              value={formData.residenceId || ''}
                              onChange={(v: string) => handleIdChange('residenceId', v)}
                            />
                          </SmartField>
                        )}
                        {formData.contractType === 'TECHNO' && (
                          <SmartField>
                            <AnimatedTextField
                              label="رقم الاشتراك في التأمينات"
                              value={formData.socialInsuranceNo || ''}
                              onChange={(v: string) => setFormData(p => ({ ...p, socialInsuranceNo: v }))}
                            />
                          </SmartField>
                        )}
                      </SmartRow>
                      {formData.nationality !== 'المملكة العربية السعودية' && (
                        <SmartRow>
                          <SmartField>
                            <AnimatedDatePicker
                              label="صلاحية جواز السفر"
                              value={formData.passportExpiry}
                              onChange={(v: Date | null) => setFormData(p => ({ ...p, passportExpiry: v }))}
                            />
                          </SmartField>
                          <SmartField>
                            <AnimatedDatePicker
                              label="صلاحية الإقامة"
                              value={formData.residenceExpiry}
                              onChange={(v: Date | null) => setFormData(p => ({ ...p, residenceExpiry: v }))}
                            />
                          </SmartField>
                        </SmartRow>
                      )}
                    </Paper>
                  </Box>

                  {
                    !isEdit && (
                      <Box>
                        <FormSection icon={<VpnKeyOutlined />} title="الوصول إلى المنصة" />
                        <SmartRow>
                          <SmartField>
                            <AnimatedTextField
                              label="اسم المستخدم"
                              value={formData.username || ''}
                              onChange={(v: string) => {
                                setFormData(p => ({ ...p, username: v }));
                                setUsernameTouched(true);
                              }}
                              placeholder="يتم ملؤه تلقائياً من الهوية"
                              error={!!errors.username}
                              helperText={errors.username}
                              required
                            />
                          </SmartField>
                          <SmartField>
                            <AnimatedTextField
                              label="كلمة المرور المؤقتة"
                              value={formData.password || ''}
                              onChange={(v: string) => {
                                setFormData(p => ({ ...p, password: v }));
                                setPasswordTouched(true);
                              }}
                              type="text"
                              error={!!errors.password}
                              helperText={errors.password}
                              required
                            />
                          </SmartField>
                        </SmartRow>
                        <Box sx={{ mt: 2 }}>
                          <AnimatedSelect
                            label="صلاحية المستخدم (الدور)"
                            value={formData.userType || 'EMPLOYEE'}
                            onChange={(v: string | number) => setFormData(p => ({ ...p, userType: v as string }))}
                            options={[
                              { value: 'EMPLOYEE', label: 'موظف (Employee)' },
                              { value: 'ADMIN', label: 'مدير نظام (Admin)' },
                              { value: 'HR_MANAGER', label: 'مدير موارد بشرية (HR Manager)' },
                              { value: 'FINANCE_MANAGER', label: 'مدير مالي (Finance Manager)' },
                              { value: 'PROJECT_MANAGER', label: 'مدير مشروع (Project Manager)' },
                              { value: 'WAREHOUSE_MANAGER', label: 'مدير مستودع (Warehouse Manager)' },
                              { value: 'REGIONAL_MANAGER', label: 'مدير إقليمي (Regional Manager)' },
                              { value: 'GENERAL_MANAGER', label: 'مدير عام (General Manager)' },
                            ]}
                          />
                        </Box>
                      </Box >
                    )
                  }
                </Stack >
              )
            }
          </Box >
        </Box >

        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </AnimatedDialog >
    </LocalizationProvider >
  );
}
