// Enhanced useApi hook with automatic toast notifications

import { useState, useCallback } from 'react';
import { ApiError } from '@/lib/api/client';
import { translations } from '@/lib/translations/ar';

/**
 * Get display name for a field (translate field names to Arabic)
 */
function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    'noOfPayments': 'عدد المدفوعات',
    'projectName': 'اسم المشروع',
    'projectAddress': 'عنوان المشروع',
    'startDate': 'تاريخ البدء',
    'endDate': 'تاريخ الانتهاء',
    'totalProjectAmount': 'مبلغ المشروع',
    'projectProfitMargin': 'هامش الربح',
    'projectLatitude': 'خط العرض',
    'projectLongitude': 'خط الطول',
    'gpsRadiusMeters': 'نطاق GPS',
    'requireGpsCheck': 'التحقق من GPS',
    'firstDownPaymentDate': 'تاريخ الدفعة الأولى',
    'projectMgr': 'مدير المشروع',
    'technoSuffix': 'لاحقة Techno',
    'projectStatus': 'حالة المشروع',
    'scheduleId': 'جدول الوقت',
  };

  return fieldNames[field] || field;
}

// Optional toast - will work even if ToastProvider is not available
let toastContext: {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
} | null = null;

export function setToastContext(context: typeof toastContext) {
  toastContext = context;
}

export interface UseApiWithToastState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiWithToastReturn<T, A extends unknown[]> extends UseApiWithToastState<T> {
  execute: (...args: A) => Promise<T | void>;
  reset: () => void;
}

interface UseApiWithToastOptions<T, A extends unknown[]> {
  showSuccessToast?: boolean;
  successMessage?: string | ((...args: A) => string);
  showErrorToast?: boolean;
  errorMessage?: string | ((error: unknown) => string);
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  silent?: boolean; // If true, don't show any toasts
}

/**
 * Enhanced hook for making API calls with loading, error states, and automatic toast notifications
 */
export function useApiWithToast<T, A extends unknown[] = unknown[]>(
  apiFunction: (...args: A) => Promise<T>,
  options: UseApiWithToastOptions<T, A> = {}
): UseApiWithToastReturn<T, A> {
  const {
    showSuccessToast = true,
    successMessage,
    showErrorToast = true,
    errorMessage: customErrorMessage,
    onSuccess,
    onError,
    silent = false,
  } = options;

  // Toast will be set by ToastProvider when available
  const [state, setState] = useState<UseApiWithToastState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: A): Promise<T | void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await apiFunction(...args);
        setState({ data, loading: false, error: null });

        if (!silent && showSuccessToast && toastContext) {
          let message: string;
          if (typeof successMessage === 'function') {
            // If function, call it with the args (typically the first arg is the params object)
            message = args.length > 0 ? successMessage(...args) : (successMessage as () => string)();
          } else {
            message = successMessage || 'تمت العملية بنجاح';
          }
          toastContext.showSuccess(message);
        }

        if (onSuccess) {
          onSuccess(data);
        }

        return data;
      } catch (error) {
        let errorMessage = translations.messages.anErrorOccurred;

        if (customErrorMessage) {
          if (typeof customErrorMessage === 'function') {
            errorMessage = customErrorMessage(error);
          } else {
            errorMessage = customErrorMessage;
          }
        } else if (error instanceof ApiError) {
          errorMessage = error.message || translations.messages.anErrorOccurred;

          // Enhance error message for assignment overlaps
          if (error.data && Array.isArray(error.data) && error.data.length > 0) {
            const overlapInfo = error.data;
            const firstOverlap = overlapInfo[0];
            const projectName = firstOverlap.projectName || `المشروع #${firstOverlap.projectCode}`;
            const startDate = new Date(firstOverlap.startDate).toLocaleDateString('en-GB');
            const endDate = new Date(firstOverlap.endDate).toLocaleDateString('en-GB');

            errorMessage = `⚠️ تعارض في التواريخ: الموظف لديه ${overlapInfo.length} مهمة(ات) متداخلة. ` +
              `المهمة رقم ${firstOverlap.assignmentNo} (${projectName}) من ${startDate} إلى ${endDate}. ` +
              `يرجى تعديل التواريخ أو إنهاء المهمة السابقة.`;
          }

          // Enhance error message for validation errors (field-specific errors)
          if (error.errors && Object.keys(error.errors).length > 0) {
            const fieldErrors = Object.entries(error.errors)
              .map(([field, messages]) => {
                const fieldName = getFieldDisplayName(field);
                const errorText = Array.isArray(messages) ? messages.join(', ') : (typeof messages === 'string' ? messages : String(messages));
                return `• ${fieldName}: ${errorText}`;
              })
              .join(' ');

            // Combine main message with field errors (use space for toast, newlines might not render well)
            errorMessage = `${errorMessage} ${fieldErrors}`;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));

        if (!silent && showErrorToast && toastContext) {
          toastContext.showError(errorMessage);
        }

        if (onError) {
          onError(errorMessage);
        }

        throw error;
      }
    },
    [apiFunction, showSuccessToast, successMessage, showErrorToast, customErrorMessage, onSuccess, onError, silent]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

