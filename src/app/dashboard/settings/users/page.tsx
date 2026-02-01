'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Edit,
  Lock,
  Visibility,
  PersonAdd,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_Row,
  useMaterialReactTable,
} from 'material-react-table';

import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import useRouteProtection from '@/hooks/useRouteProtection';
import type { UserAccount, UserType } from '@/types';
import UserAccountForm from '@/components/forms/UserAccountForm';
import UserAccountViewForm from '@/components/forms/UserAccountViewForm';
import ResetPasswordForm from '@/components/forms/ResetPasswordForm';
import DeleteConfirmDialog from '@/components/common/DeleteConfirmDialog';
import { usersApi } from '@/lib/api/users';
import { employeesApi } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import { useApiWithToast } from '@/hooks/useApiWithToast';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { TableToolbarWrapper } from '@/components/tables/TableToolbarWrapper';

export default function UserAccountsPage() {
  const router = useRouter();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const toast = useToast();

  // Fetch users from backend
  const { data: usersData, loading: loadingUsers, error: usersError, execute: fetchUsers } = useApi(
    () => usersApi.getAllUsers({ page: 0, size: 1000, sortBy: 'userId', sortDirection: 'asc' }),
    { immediate: true }
  );

  // Fetch employees for dropdown
  const { data: employeesData } = useApi(
    () => employeesApi.getAllEmployees({ size: 1000 }),
    { immediate: true }
  );

  // Create user API
  const createUser = useApiWithToast(
    async (data: { username: string; password?: string; nationalId: string; userType: string; employeeNo?: number }) => {
      return usersApi.createUser({
        ...data,
        userType: data.userType as UserType,
        password: data.password!, // password is required here
      });
    },
    {
      successMessage: () => 'تم إنشاء المستخدم بنجاح',
      onSuccess: () => {
        fetchUsers();
        setIsAddModalOpen(false);
        setSelectedUser(null);
      },
    }
  );

  // Update user API
  const updateUser = useApiWithToast(
    async ({ id, data }: { id: number; data: Partial<UserAccount> & { password?: string } }) => {
      return usersApi.updateUser(id, {
        username: data.username!,
        userType: data.userType as UserType,
        employeeNo: data.employeeId,
        isActive: data.isActive!,
        password: data.password || undefined,
      });
    },
    {
      successMessage: () => 'تم تحديث المستخدم بنجاح',
      onSuccess: () => {
        fetchUsers();
        setIsEditModalOpen(false);
        setSelectedUser(null);
      },
    }
  );

  // Delete user API
  const deleteUser = useApiWithToast(
    async (id: number) => {
      await usersApi.deleteUser(id);
    },
    {
      successMessage: () => 'تم حذف المستخدم بنجاح',
      onSuccess: () => {
        fetchUsers();
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
      },
    }
  );

  // Reset password API
  const resetPassword = useApiWithToast(
    async ({ id, password, generatePassword }: { id: number; password?: string; generatePassword?: boolean }) => {
      const generatedPwd = await usersApi.resetPassword(id, {
        newPassword: password,
        generatePassword,
      });
      return generatedPwd;
    },
    {
      successMessage: 'تم إعادة تعيين كلمة المرور بنجاح',
      onSuccess: (generatedPassword) => {
        if (generatedPassword) {
          toast.showInfo(`كلمة المرور الجديدة: ${generatedPassword}`);
        }
        setIsResetPasswordModalOpen(false);
        setSelectedUser(null);
      },
    }
  );

  const toggleUserStatus = useApiWithToast(
    async ({ id, activate }: { id: number; activate: boolean }) => {
      if (activate) {
        return usersApi.activateUser(id);
      } else {
        return usersApi.deactivateUser(id);
      }
    },
    {
      successMessage: ({ activate }: { activate: boolean }) => activate ? 'تم تفعيل المستخدم بنجاح' : 'تم إلغاء تفعيل المستخدم بنجاح',
      onSuccess: () => {
        usersApi.getAllUsers({ page: 0, size: 1000, sortBy: 'userId', sortDirection: 'asc' }).then((data) => {
          if (data?.content) {
            const mappedUsers: UserAccount[] = data.content.map((user) => {
              const employee = employeesData?.employees?.find((e) => e.employeeNo === (user.employeeNo || user.employeeId));
              let lastLoginDate: Date | null = null;
              if (user.lastLoginDate) {
                const dateTime = user.lastLoginTime
                  ? `${user.lastLoginDate}T${user.lastLoginTime}`
                  : user.lastLoginDate;
                lastLoginDate = new Date(dateTime);
              }
              return {
                userId: user.userId.toString(),
                username: user.username,
                userType: user.userType as UserType,
                isActive: typeof user.isActive === 'string'
                  ? user.isActive === 'Y' || user.isActive === 'true'
                  : Boolean(user.isActive),
                employeeId: user.employeeNo || user.employeeId,
                fullName: employee?.employeeName || 'غير متاح',
                email: employee?.email || 'غير متاح',
                lastLoginDate,
              } as UserAccount;
            });
            setUserAccounts(mappedUsers);
          } else {
            setUserAccounts([]);
          }
        });
      },
    }
  );

  // Protect route based on role
  useRouteProtection();

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when in fullscreen
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);



  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Map backend users to frontend format
  useEffect(() => {
    if (usersData?.content) {
      const mappedUsers: UserAccount[] = usersData.content.map((user) => {
        // Find employee for this user
        const employee = employeesData?.employees?.find((e) => e.employeeNo === (user.employeeNo || user.employeeId));

        // Combine lastLoginDate and lastLoginTime into a Date object
        let lastLoginDate: Date | null = null;
        if (user.lastLoginDate) {
          const dateTime = user.lastLoginTime
            ? `${user.lastLoginDate}T${user.lastLoginTime}`
            : user.lastLoginDate;
          lastLoginDate = new Date(dateTime);
        }

        return {
          userId: user.userId.toString(),
          username: user.username,
          userType: user.userType as UserType,
          isActive: typeof user.isActive === 'string'
            ? user.isActive === 'Y' || user.isActive === 'true'
            : Boolean(user.isActive),
          employeeId: user.employeeNo || user.employeeId,
          fullName: employee?.employeeName || 'غير متاح',
          email: employee?.email || 'غير متاح',
          nationalId: user.nationalId,
          lastLoginDate,
        } as UserAccount;
      });
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setUserAccounts(mappedUsers);
      }, 0);
    } else if (usersData && !usersData.content) {
      // If API returned but content is empty/null, set empty array
      setTimeout(() => {
        setUserAccounts([]);
      }, 0);
    }
  }, [usersData, employeesData]);

  // Form handlers
  const handleAdd = () => {
    setSelectedUser(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (user: UserAccount) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleView = (user: UserAccount) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };


  const handleSubmit = async (data: Partial<UserAccount>) => {
    if (selectedUser) {
      // Update existing user
      const userId = parseInt(selectedUser.userId);
      if (isNaN(userId)) {
        toast.showError('رقم مستخدم غير صحيح');
        return;
      }
      await updateUser.execute({ id: userId, data });
    } else {
      // Create new user
      if (!data.username || !data.password || !data.nationalId) {
        toast.showError('اسم المستخدم وكلمة المرور والهوية الوطنية مطلوبة');
        return;
      }
      await createUser.execute({
        username: data.username,
        password: data.password,
        nationalId: data.nationalId!,
        userType: (data.userType || 'EMPLOYEE'),
        employeeNo: data.employeeId,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    const userId = parseInt(selectedUser.userId);
    if (isNaN(userId)) {
      toast.showError('رقم مستخدم غير صحيح');
      return;
    }
    await deleteUser.execute(userId);
  };

  const handleResetPassword = (user: UserAccount) => {
    setSelectedUser(user);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPasswordConfirm = async (newPassword?: string, generatePassword?: boolean) => {
    if (!selectedUser) return;
    const userId = parseInt(selectedUser.userId);
    if (isNaN(userId)) {
      toast.showError('رقم مستخدم غير صحيح');
      return;
    }
    await resetPassword.execute({ id: userId, password: newPassword, generatePassword });
  };

  const handleToggleLock = useCallback(async (user: UserAccount) => {
    const userId = Number(user.userId);
    if (isNaN(userId)) {
      toast.showError('رقم مستخدم غير صحيح');
      return;
    }
    await toggleUserStatus.execute({ id: userId, activate: !user.isActive });
  }, [toggleUserStatus, toast]);

  const columns = useMemo<MRT_ColumnDef<UserAccount>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'اسم المستخدم',
        size: 150,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'nationalId',
        header: 'الهوية الوطنية',
        size: 140,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>
            {cell.getValue<string>() || '-'}
          </Typography>
        ),
      },
      {
        accessorKey: 'fullName',
        header: 'الاسم الكامل',
        size: 200,
        Cell: ({ cell }) => (
          <Typography sx={{ fontSize: '13px', color: '#374151' }}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'userType',
        header: 'الدور',
        size: 150,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: UserAccount) => {
            const roleLabels: Record<string, string> = {
              ADMIN: 'مدير النظام',
              GENERAL_MANAGER: 'المدير العام',
              HR_MANAGER: 'مدير الموارد البشرية',
              FINANCE_MANAGER: 'مدير المالية',
              PROJECT_MANAGER: 'مدير المشروع',
              WAREHOUSE_MANAGER: 'مدير المستودعات',
              EMPLOYEE: 'موظف',
            };
            return roleLabels[row.userType] || row.userType;
          }
        },
        Cell: ({ cell }) => {
          const role = cell.getValue<string>();
          if (!role) return <Typography sx={{ fontSize: '13px', color: '#6B7280' }}>غير متاح</Typography>;

          const colors: { [key: string]: { bg: string; text: string } } = {
            ADMIN: { bg: '#FEE2E2', text: '#991B1B' },
            GENERAL_MANAGER: { bg: '#FED7AA', text: '#9A3412' },
            HR_MANAGER: { bg: '#DBEAFE', text: '#1E40AF' },
            FINANCE_MANAGER: { bg: '#E0E7FF', text: '#3730A3' },
            PROJECT_MANAGER: { bg: '#F3E8FF', text: '#6B21A8' },
            WAREHOUSE_MANAGER: { bg: '#ECFDF5', text: '#065F46' },
            EMPLOYEE: { bg: '#F3F4F6', text: '#374151' },
          };

          const color = colors[role] || colors.EMPLOYEE;
          const roleLabels: Record<string, string> = {
            ADMIN: 'مدير النظام',
            GENERAL_MANAGER: 'المدير العام',
            HR_MANAGER: 'مدير الموارد البشرية',
            FINANCE_MANAGER: 'مدير المالية',
            PROJECT_MANAGER: 'مدير المشروع',
            WAREHOUSE_MANAGER: 'مدير المستودعات',
            EMPLOYEE: 'موظف',
          };
          return (
            <Chip
              label={roleLabels[role] || role.replace('_', ' ')}
              size="small"
              sx={{
                backgroundColor: color.bg,
                color: color.text,
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'الحالة',
        size: 110,
        filterVariant: 'multi-select',
        meta: {
          getFilterLabel: (row: UserAccount) => row.isActive ? 'نشط' : 'غير نشط'
        },
        Cell: ({ cell, row }) => {
          const isActive = cell.getValue<boolean>();
          return (
            <Chip
              label={isActive ? 'نشط' : 'غير نشط'}
              size="small"
              sx={{
                backgroundColor: isActive ? '#D1FAE5' : '#F3F4F6',
                color: isActive ? '#065F46' : '#6B7280',
                fontWeight: 600,
                fontSize: '11px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLock(row.original);
              }}
              style={{ cursor: 'pointer' }}
            />
          );
        },
      },
      {
        accessorKey: 'lastLoginDate',
        header: 'آخر تسجيل دخول',
        size: 150,
        filterVariant: 'date-range',
        Cell: ({ cell }) => {
          const date = cell.getValue<Date | null | undefined>();
          return date ? new Date(date).toLocaleString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'أبداً';
        },
      },
    ],
    [handleToggleLock],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useMaterialReactTable<any>({
    columns,
    data: userAccounts || [],
    enableRowSelection: false,
    enableColumnFilters: true,
    enableColumnResizing: true,
    enableStickyHeader: true,
    enableDensityToggle: true,
    enableFullScreenToggle: false, // Disable built-in fullscreen, using custom
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 80,
      maxSize: 500,
      size: 150,
    },
    initialState: {
      density: 'comfortable',
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    localization: mrtArabicLocalization,
    ...lightTableTheme,
    muiTableContainerProps: {
      sx: {
        ...(lightTableTheme.muiTableContainerProps as { sx?: Record<string, unknown> })?.sx,
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
        ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
      },
    },
    renderTopToolbar: ({ table }) => (
      <TableToolbarWrapper table={table}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={handleAdd}
            sx={{
              background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              '& .MuiSvgIcon-root': {
                color: '#FFFFFF',
              },
              '&:hover': {
                background: 'linear-gradient(135deg, #0b328a 0%, #0a266e 100%)',
              },
            }}
          >
            مستخدم جديد
          </Button>
          <Tooltip title={isFullscreen ? 'إغلاق ملء الشاشة' : 'ملء الشاشة'}>
            <IconButton
              onClick={handleToggleFullscreen}
              sx={{
                color: '#0c2b7a',
                '&:hover': {
                  backgroundColor: 'rgba(12, 43, 122, 0.08)',
                },
              }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Box>
      </TableToolbarWrapper>
    ),
    renderRowActions: ({ row }: { row: MRT_Row<UserAccount> }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="عرض التفاصيل">
          <IconButton size="small" sx={{ color: '#0c2b7a' }} onClick={() => handleView(row.original)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton size="small" sx={{ color: '#059669' }} onClick={() => handleEdit(row.original)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={row.original.isActive ? 'قفل الحساب' : 'إلغاء قفل الحساب'}>
          <IconButton
            size="small"
            sx={{ color: row.original.isActive ? '#DC2626' : '#059669' }}
            onClick={() => handleToggleLock(row.original)}
            disabled={toggleUserStatus.loading}
          >
            <Lock fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="إعادة تعيين كلمة المرور">
          <IconButton
            size="small"
            sx={{ color: '#F59E0B' }}
            onClick={() => handleResetPassword(row.original)}
          >
            <Lock fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'الإجراءات',
        size: 200,
      },
    },
  });

  const tableWrapper = (
    <Box
      sx={{
        animation: isFullscreen ? 'none' : 'fadeInUp 0.6s ease-out 0.4s both',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        width: '100%',
        maxWidth: '100%',
        height: isFullscreen ? '100%' : 'auto',
        overflow: 'hidden',
        transition: isFullscreen ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), maxWidth 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '& .MuiPaper-root': {
          width: '100%',
          maxWidth: '100%',
          height: isFullscreen ? '100%' : 'auto',
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#9CA3AF',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#6B7280',
            },
          },
        },
        '& .MuiTableContainer-root': {
          overflowX: 'auto !important',
          ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#9CA3AF',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#6B7280',
            },
          },
        },
      }}
    >
      <MaterialReactTable table={table} />
    </Box>
  );

  return (
    <>
      {/* Fullscreen Container */}
      {isFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: '#F8F9FC',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.3s ease-out',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          {/* Fullscreen Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: '#111827' }}
            >
              حسابات المستخدمين - ملء الشاشة
            </Typography>
            <Tooltip title="إغلاق ملء الشاشة (ESC)">
              <IconButton
                onClick={handleToggleFullscreen}
                sx={{
                  color: '#0c2b7a',
                  '&:hover': {
                    backgroundColor: 'rgba(12, 43, 122, 0.08)',
                  },
                }}
              >
                <FullscreenExit />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Fullscreen Table Container */}
          <Box
            sx={{
              flex: 1,
              padding: '24px',
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {tableWrapper}
          </Box>
        </Box>
      )}

      {/* Normal View */}
      <Box sx={{ flex: 1, opacity: isFullscreen ? 0 : 1, pointerEvents: isFullscreen ? 'none' : 'auto', transition: 'opacity 0.3s ease-out' }}>
        <Box sx={{ mb: 3, animation: 'fadeInUp 0.6s ease-out 0.2s both', '@keyframes fadeInUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
            حسابات المستخدمين
          </Typography>
          <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
            إدارة حسابات المستخدمين والأدوار والوصول إلى النظام
          </Typography>
        </Box>
        {loadingUsers ? (
          <LoadingSpinner />
        ) : usersError ? (
          <ErrorDisplay error={usersError} onRetry={fetchUsers} />
        ) : userAccounts.length === 0 && usersData ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Typography variant="h6" sx={{ color: '#6B7280', mb: 1 }}>
              لم يتم العثور على مستخدمين
            </Typography>
            <Typography sx={{ color: '#9CA3AF', fontSize: '14px', mb: 3 }}>
              {usersData.totalElements === 0
                ? 'لا يوجد مستخدمون في النظام. انقر على "مستخدم جديد" لإنشاء واحد.'
                : 'تعذر تحميل المستخدمين. يرجى التحقق من الصلاحيات أو محاولة التحديث.'}
            </Typography>
            <Button
              variant="contained"
              onClick={fetchUsers}
              sx={{
                background: 'linear-gradient(135deg, #0f3a94 0%, #0c2b7a 100%)',
                color: '#FFFFFF',
                textTransform: 'none',
              }}
            >
              تحديث
            </Button>
          </Box>
        ) : (
          tableWrapper
        )}
      </Box>

      {/* Forms */}
      <UserAccountForm
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleSubmit}
        loading={createUser.loading || updateUser.loading}
      />
      <UserAccountForm
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedUser}
        loading={createUser.loading || updateUser.loading}
      />
      <UserAccountViewForm
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUser(null);
        }}
        userAccount={selectedUser}
      />
      <DeleteConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="حذف حساب المستخدم"
        message="هل أنت متأكد أنك تريد حذف حساب المستخدم هذا؟"
        itemName={selectedUser?.username}
        loading={deleteUser.loading}
      />

      <ResetPasswordForm
        open={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleResetPasswordConfirm}
        username={selectedUser?.username}
        loading={resetPassword.loading}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}


