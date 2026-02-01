'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Visibility, Warning } from '@mui/icons-material';
import { ApiError } from '@/lib/api/client';

interface AssignmentOverlapInfo {
  assignmentNo: number;
  projectCode: number;
  projectName?: string;
  startDate: string;
  endDate: string;
  assignmentStatus: string;
  dailyRate?: number;
}

interface AssignmentOverlapDialogProps {
  open: boolean;
  onClose: () => void;
  error: ApiError | null;
  onViewAssignment?: (assignmentNo: number) => void;
}

export default function AssignmentOverlapDialog({
  open,
  onClose,
  error,
  onViewAssignment,
}: AssignmentOverlapDialogProps) {
  // Extract overlap data from error
  const overlapData = (error?.data as AssignmentOverlapInfo[]) || [];

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير متاح';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'غير متاح';
    // Use formatNumber or Intl.NumberFormat with en-US
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Warning color="error" />
        <Typography variant="h6" fontWeight={600}>
          تم اكتشاف تعيين متداخل
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {error?.message || 'الموظف لديه تعيين متداخل. يرجى مراجعة التفاصيل أدناه وتعديل التواريخ أو إنهاء التعيين السابق.'}
        </Typography>

        {overlapData.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>رقم التعيين</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>المشروع</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>تاريخ البدء</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>تاريخ الانتهاء</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>المعدل اليومي</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overlapData.map((overlap) => (
                  <TableRow key={overlap.assignmentNo}>
                    <TableCell>#{overlap.assignmentNo}</TableCell>
                    <TableCell>
                      {overlap.projectName || `المشروع #${overlap.projectCode}`}
                    </TableCell>
                    <TableCell>{formatDate(overlap.startDate)}</TableCell>
                    <TableCell>{formatDate(overlap.endDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={overlap.assignmentStatus}
                        size="small"
                        color={
                          overlap.assignmentStatus === 'ACTIVE'
                            ? 'success'
                            : overlap.assignmentStatus === 'COMPLETED'
                              ? 'default'
                              : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell>{formatCurrency(overlap.dailyRate)}</TableCell>
                    <TableCell>
                      {onViewAssignment && (
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => {
                            onViewAssignment(overlap.assignmentNo);
                            onClose();
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          عرض
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              لا توجد تفاصيل متداخلة متاحة
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            كيفية الحل:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2 }}>
            <li>تعديل تاريخ البدء أو الانتهاء لتجنب التداخل</li>
            <li>إنهاء التعيين السابق مبكراً إذا كان لا يزال نشطاً</li>
            <li>التحقق من إمكانية عمل الموظف على مشاريع متعددة في نفس الوقت</li>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
