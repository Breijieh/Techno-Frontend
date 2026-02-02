'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Notifications,
  Visibility,
  EventNote,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from 'material-react-table';
import { lightTableTheme } from '@/lib/tableConfig';
import { mrtArabicLocalization } from '@/lib/tables/mrt-arabic-localization';
import useRouteProtection from '@/hooks/useRouteProtection';
import ViewDetailsDialog from '@/components/common/ViewDetailsDialog';
import { Snackbar, Alert } from '@mui/material';
import { employeesApi, type DocumentExpiryResponse } from '@/lib/api/employees';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';

interface ExpiringDoc {
  employeeId: number;
  employeeName: string;
  documentType: string;
  expiryDate: Date;
  daysRemaining: number;
  status: 'CRITICAL' | 'WARNING' | 'NOTICE';
}

export default function ExpiringDocumentsPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ExpiringDoc | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const [sendingReminder, setSendingReminder] = useState<{ employeeId: number; documentType: string } | null>(null);

  // Protect route
  useRouteProtection(['Admin', 'HR Manager', 'General Manager', 'Employee']);

  // Get current user role and employee number
  const userRole = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('userRole') || sessionStorage.getItem('userType');
  }, []);

  const employeeNo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const empNo = sessionStorage.getItem('employeeNo');
    return empNo ? parseInt(empNo, 10) : null;
  }, []);

  // Create API function that uses current role and employee number
  const fetchExpiringDocuments = useCallback(() => {
    // If user is Employee, pass their employee number (backend will also enforce this)
    const employeeNumber = userRole === 'Employee' && employeeNo ? employeeNo : undefined;
    return employeesApi.getExpiringDocuments(90, employeeNumber);
  }, [userRole, employeeNo]);

  // Fetch expiring documents from backend (90 days threshold to show all statuses)
  // For Employee role, pass their employee number to filter to their own documents
  const {
    data: expiringDocumentsData,
    loading: loadingDocuments,
    error: documentsError,
    execute: fetchDocuments,
  } = useApi(fetchExpiringDocuments, { immediate: true });

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

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

  const handleView = (doc: ExpiringDoc) => {
    setSelectedDoc(doc);
    setIsViewDialogOpen(true);
  };

  const handleSendReminder = async (doc: ExpiringDoc) => {
    setSendingReminder({ employeeId: doc.employeeId, documentType: doc.documentType });
    try {
      // Map document type to backend enum
      const documentType: 'PASSPORT' | 'RESIDENCY' = doc.documentType === 'Passport' ? 'PASSPORT' : 'RESIDENCY';
      await employeesApi.sendDocumentReminder(doc.employeeId, documentType);

      setSnackbar({
        open: true,
        message: `تم إرسال تذكير إلى ${doc.employeeName} بخصوص ${doc.documentType} المنتهي خلال ${doc.daysRemaining} يوم`,
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'فشل إرسال التذكير. يرجى المحاولة مرة أخرى.',
        severity: 'error',
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const getDocumentDetails = (doc: ExpiringDoc) => {
    const statusColors = {
      CRITICAL: { bg: '#FEE2E2', text: '#991B1B' },
      WARNING: { bg: '#FEF3C7', text: '#92400E' },
      NOTICE: { bg: '#DBEAFE', text: '#1E40AF' },
    };
    const statusColor = statusColors[doc.status];

    return [
      { label: 'رقم الموظف', value: doc.employeeId, type: 'text' as const },
      { label: 'اسم الموظف', value: doc.employeeName, type: 'text' as const },
      { label: 'نوع المستند', value: doc.documentType, type: 'chip' as const, chipColor: { bg: '#E0E7FF', text: '#3730A3' } },
      { label: 'تاريخ الانتهاء', value: doc.expiryDate, type: 'date' as const },
      { label: 'الأيام المتبقية', value: `${doc.daysRemaining} يوم`, type: 'text' as const },
      { label: 'الحالة', value: doc.status, type: 'chip' as const, chipColor: statusColor },
    ];
  };

  // Transform backend data to ExpiringDoc[] format
  const expiringDocs = useMemo((): ExpiringDoc[] => {
    const backendData = expiringDocumentsData || [];
    const docs: ExpiringDoc[] = [];

    backendData.forEach((employeeData: DocumentExpiryResponse) => {
      const employeeName = employeeData.employeeName || employeeData.employeeName || 'غير معروف';

      // Create Passport row if passport expiry exists and is within threshold
      if (employeeData.passportExpiryDate &&
        employeeData.daysUntilPassportExpiry !== null &&
        employeeData.daysUntilPassportExpiry !== undefined &&
        employeeData.daysUntilPassportExpiry >= 0) {
        const daysRemaining = employeeData.daysUntilPassportExpiry;
        // Map backend alert level to frontend status
        let status: 'CRITICAL' | 'WARNING' | 'NOTICE' = 'NOTICE';
        if (employeeData.passportExpired || daysRemaining <= 15) {
          status = 'CRITICAL';
        } else if (daysRemaining <= 30) {
          status = 'WARNING';
        }

        docs.push({
          employeeId: employeeData.employeeNo,
          employeeName,
          documentType: 'Passport',
          expiryDate: new Date(employeeData.passportExpiryDate),
          daysRemaining,
          status,
        });
      }

      // Create Iqama (Residency) row if residency expiry exists and is within threshold
      if (employeeData.residencyExpiryDate &&
        employeeData.daysUntilResidencyExpiry !== null &&
        employeeData.daysUntilResidencyExpiry !== undefined &&
        employeeData.daysUntilResidencyExpiry >= 0) {
        const daysRemaining = employeeData.daysUntilResidencyExpiry;
        // Map backend alert level to frontend status
        let status: 'CRITICAL' | 'WARNING' | 'NOTICE' = 'NOTICE';
        if (employeeData.residencyExpired || daysRemaining <= 15) {
          status = 'CRITICAL';
        } else if (daysRemaining <= 30) {
          status = 'WARNING';
        }

        docs.push({
          employeeId: employeeData.employeeNo,
          employeeName,
          documentType: 'Iqama',
          expiryDate: new Date(employeeData.residencyExpiryDate),
          daysRemaining,
          status,
        });
      }
    });

    return docs.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [expiringDocumentsData]);

  const columns = useMemo<MRT_ColumnDef<ExpiringDoc>[]>(
    () => [
      {
        accessorKey: 'employeeName',
        header: 'الموظف',
        size: 200,
      },
      {
        accessorKey: 'documentType',
        header: 'نوع المستند',
        size: 180,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue<string>()}
            size="small"
            sx={{
              backgroundColor: '#E0E7FF',
              color: '#3730A3',
              fontWeight: 600,
              fontSize: '11px',
            }}
          />
        ),
      },
      {
        accessorKey: 'expiryDate',
        header: 'تاريخ الانتهاء',
        size: 140,
        Cell: ({ cell }) => new Date(cell.getValue<Date>()).toLocaleDateString('en-GB'),
      },
      {
        accessorKey: 'daysRemaining',
        header: 'الأيام المتبقية',
        size: 150,
        Cell: ({ cell }) => {
          const days = cell.getValue<number>();
          const color = days <= 15 ? '#DC2626' : days <= 30 ? '#F59E0B' : '#059669';
          return (
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color }}>
              {days} يوم
            </Typography>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'الحالة',
        size: 130,
        Cell: ({ cell }) => {
          const status = cell.getValue<string>();
          const colors = {
            CRITICAL: { bg: '#FEE2E2', text: '#991B1B' },
            WARNING: { bg: '#FEF3C7', text: '#92400E' },
            NOTICE: { bg: '#DBEAFE', text: '#1E40AF' },
          };
          const color = colors[status as keyof typeof colors];
          return (
            <Chip
              label={status}
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
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: expiringDocs,
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
        overflowX: 'auto',
        maxWidth: '100%',
        width: '100%',
        ...(isFullscreen && { maxHeight: 'calc(100vh - 120px)' }),
      },
    },
    renderTopToolbarCustomActions: () => (
      <Tooltip title={isFullscreen ? 'الخروج من وضع ملء الشاشة' : 'دخول وضع ملء الشاشة'}>
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
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="عرض التفاصيل">
          <IconButton
            size="small"
            sx={{ color: '#0c2b7a' }}
            onClick={() => handleView(row.original)}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="إرسال تذكير">
          <IconButton
            size="small"
            sx={{ color: '#F59E0B' }}
            onClick={() => handleSendReminder(row.original)}
            disabled={loadingDocuments || (sendingReminder?.employeeId === row.original.employeeId &&
              sendingReminder?.documentType === row.original.documentType)}
          >
            <Notifications fontSize="small" />
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

  const criticalCount = expiringDocs.filter(d => d.status === 'CRITICAL').length;
  const warningCount = expiringDocs.filter(d => d.status === 'WARNING').length;

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
        transition: isFullscreen ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              المستندات المنتهية الصلاحية - ملء الشاشة
            </Typography>
            <Tooltip title="الخروج من وضع ملء الشاشة (ESC)">
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
              padding: 0,
              overflow: 'auto',
              backgroundColor: '#F8F9FC',
            }}
          >
            {tableWrapper}
          </Box>
        </Box>
      )}

      {/* Normal View */}
      <Box
        sx={{
          flex: 1,
          opacity: isFullscreen ? 0 : 1,
          pointerEvents: isFullscreen ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-out',
        }}
      >
        <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
          {loadingDocuments && <LoadingSpinner />}
          {documentsError && (
            <ErrorDisplay
              error={documentsError || 'فشل تحميل المستندات المنتهية الصلاحية'}
              onRetry={fetchDocuments}
            />
          )}
          <Box
            sx={{
              mb: 3,
              animation: 'fadeInUp 0.6s ease-out 0.2s both',
              '@keyframes fadeInUp': {
                from: { opacity: 0, transform: 'translateY(20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}
            >
              المستندات المنتهية الصلاحية
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              تتبع مستندات الموظفين القريبة من الانتهاء مع تنبيهات تلقائية
            </Typography>
          </Box>

          {/* Alert Banner */}
          {(criticalCount > 0 || warningCount > 0) && (
            <Box
              sx={{
                mb: 3,
                padding: 2,
                backgroundColor: '#FEE2E2',
                borderRadius: '12px',
                border: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                animation: 'fadeInUp 0.6s ease-out 0.3s both',
              }}
            >
              <Notifications sx={{ color: '#DC2626', fontSize: 28 }} />
              <Box>
                <Typography
                  sx={{ fontSize: '14px', fontWeight: 600, color: '#991B1B' }}
                >
                  {criticalCount} مستند(ات) حرج(ة) تنتهي خلال 15 يوم
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#7F1D1D' }}>
                  {warningCount} مستند(ات) تنتهي خلال 30 يوم
                </Typography>
              </Box>
            </Box>
          )}

          {tableWrapper}
        </Box>
      </Box>

      {/* View Details Dialog */}
      <ViewDetailsDialog
        open={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setSelectedDoc(null);
        }}
        title="تفاصيل المستند"
        fields={selectedDoc ? getDocumentDetails(selectedDoc) : []}
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


