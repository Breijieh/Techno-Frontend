'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Cancel,
} from '@mui/icons-material';
import AnimatedDialog from '@/components/common/AnimatedDialog';
import {
  AnimatedTextField,
  AnimatedSelect,
  LocalizationProvider,
  AdapterDateFns,
} from '@/components/common/FormFields';
import type { TransferRequest, RequestStatus, Employee } from '@/types';
import type { ProjectSummary } from '@/lib/api/projects';

interface TransferRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<TransferRequest>) => Promise<void>;
  initialData?: TransferRequest | null;
  loading?: boolean;
  employees: Employee[];
  projects: ProjectSummary[];
}

export default function TransferRequestForm({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  employees,
  projects,
}: TransferRequestFormProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState<Partial<TransferRequest>>({
    employeeId: 0,
    fromProjectCode: 0,
    toProjectCode: 0,
    reason: '',
    status: 'NEW' as RequestStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fromProjectName, setFromProjectName] = useState<string>('');

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (initialData) {
        setFormData({
          employeeId: initialData.employeeId,
          fromProjectCode: initialData.fromProjectCode,
          toProjectCode: initialData.toProjectCode,
          reason: initialData.reason,
          status: initialData.status,
        });
        // Set from project name for edit mode
        const fromProject = projects.find(p => p.projectCode === initialData.fromProjectCode);
        setFromProjectName(fromProject?.projectName || '');
      } else {
        setFormData({
          employeeId: 0,
          fromProjectCode: 0,
          toProjectCode: 0,
          reason: '',
          status: 'NEW',
        });
        setFromProjectName('');
      }
      setErrors({});
    }, 0);
  }, [initialData, open, projects]);

  // Auto-fill from project when employee is selected
  useEffect(() => {
    if (!initialData && formData.employeeId && formData.employeeId > 0) {
      const selectedEmployee = employees.find(emp => emp.employeeId === formData.employeeId);
      if (selectedEmployee) {
        if (selectedEmployee.projectCode) {
          // Use setTimeout to avoid synchronous setState in effect
          setTimeout(() => {
            setFormData(prev => ({
              ...prev,
              fromProjectCode: selectedEmployee.projectCode || 0,
            }));
            const project = projects.find(p => p.projectCode === selectedEmployee.projectCode);
            setFromProjectName(project?.projectName || project?.projectName || `المشروع #${selectedEmployee.projectCode}`);
          }, 0);
        } else {
          setTimeout(() => {
            setFormData(prev => ({
              ...prev,
              fromProjectCode: 0,
            }));
            setFromProjectName('غير معين في مشروع');
          }, 0);
        }
      }
    }
  }, [formData.employeeId, employees, projects, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'الموظف مطلوب';
    if (!formData.fromProjectCode) {
      newErrors.fromProjectCode = 'الموظف غير معين حالياً في أي مشروع';
    }
    if (!formData.toProjectCode) newErrors.toProjectCode = 'المشروع الهدف مطلوب';
    if (formData.fromProjectCode === formData.toProjectCode) {
      newErrors.toProjectCode = 'المشروع الهدف يجب أن يكون مختلفاً عن المشروع الحالي';
    }
    if (!formData.reason?.trim()) newErrors.reason = 'السبب مطلوب';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const submitData: Partial<TransferRequest> = {
      ...formData,
      requestDate: new Date(),
    };

    await onSubmit(submitData);
  };

  const employeeOptions = (employees || []).map((emp) => ({
    value: emp.employeeId,
    label: `${emp.fullName} (${emp.employeeId})`,
  }));

  const projectOptions = (projects || []).map((proj) => ({
    value: proj.projectCode,
    label: `${proj.projectName} (#${proj.projectCode})`,
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AnimatedDialog
        open={open}
        onClose={onClose}
        title={isEdit ? 'تعديل طلب النقل' : 'طلب نقل جديد'}
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
              {loading ? 'جارٍ الإرسال...' : isEdit ? 'تحديث' : 'إرسال الطلب'}
            </Button>
          </Box>
        }
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '8px 0',
          }}
        >
          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.1s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedSelect
              label="الموظف"
              value={formData.employeeId || 0}
              onChange={(val: string | number) => setFormData({ ...formData, employeeId: val as number })}
              options={[{ value: 0, label: 'اختر الموظف' }, ...employeeOptions]}
              error={!!errors.employeeId}
              helperText={errors.employeeId}
              required
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              animation: open ? 'fieldEnter 0.4s ease-out 0.15s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Box>
              <AnimatedTextField
                label="المشروع الحالي"
                value={fromProjectName || (formData.fromProjectCode ? `مشروع #${formData.fromProjectCode}` : 'غير معين في مشروع')}
                onChange={() => { }} // Read-only
                error={!!errors.fromProjectCode}
                helperText={errors.fromProjectCode || 'يتم ملؤه تلقائياً بناءً على تعيين الموظف الحالي'}
                required
                disabled
              />
            </Box>
            <AnimatedSelect
              label="المشروع الهدف"
              value={formData.toProjectCode || 0}
              onChange={(val: string | number) => setFormData({ ...formData, toProjectCode: val as number })}
              options={[{ value: 0, label: 'اختر المشروع' }, ...projectOptions.filter(p => p.value !== formData.fromProjectCode)]}
              error={!!errors.toProjectCode}
              helperText={errors.toProjectCode}
              required
            />
          </Box>

          <Box
            sx={{
              animation: open ? 'fieldEnter 0.4s ease-out 0.2s both' : 'none',
              '@keyframes fieldEnter': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <AnimatedTextField
              label="السبب"
              value={formData.reason || ''}
              onChange={(val: string) => setFormData({ ...formData, reason: val })}
              error={!!errors.reason}
              helperText={errors.reason}
              required
              multiline
              rows={4}
            />
          </Box>
        </Box>
      </AnimatedDialog>
    </LocalizationProvider>
  );
}

