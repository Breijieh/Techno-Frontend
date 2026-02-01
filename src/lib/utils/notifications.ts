/**
 * Notification utilities for formatting and processing notification content.
 */

/**
 * Substitute placeholders in notification messages.
 * This serves as a fallback in case the backend template engine misses some variables.
 */
export function substituteNotificationVariables(message: string, variables?: Record<string, any>): string {
    if (!message) return '';
    if (!variables || Object.keys(variables).length === 0) return cleanNotificationMessage(message);

    let result = message;
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(placeholder, String(value ?? ''));
    });

    // Clean any remaining placeholders
    return cleanNotificationMessage(result);
}

/**
 * Clean notification message by removing unsubstituted template variables.
 * This is a last-resort cleanup for messages that still contain {{...}} placeholders.
 */
export function cleanNotificationMessage(message: string): string {
    if (!message) return '';

    // Remove any remaining {{variable}} placeholders
    let cleaned = message.replace(/\{\{[^}]+\}\}/g, '');

    // Clean up extra spaces that may result from placeholder removal
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // Remove empty elements (e.g., "لـ  موظف" -> "")
    cleaned = cleaned.replace(/لـ\s*موظف/g, '');
    cleaned = cleaned.replace(/إجمالي\s*ريال/g, '');
    cleaned = cleaned.replace(/الراتب\s*-/g, 'الراتب');

    return cleaned.trim();
}

/**
 * Get notification category from notification type.
 */
export function getNotificationCategory(notificationType: string): string {
    if (!notificationType) return 'SYSTEM';

    const type = notificationType.toUpperCase();

    if (type.includes('LEAVE') || type.includes('VAC')) return 'LEAVE';
    if (type.includes('LOAN')) return 'LOAN';
    if (type.includes('PAYROLL') || type.includes('SALARY')) return 'PAYROLL';
    if (type.includes('ATTENDANCE')) return 'ATTENDANCE';
    if (type.includes('ALLOWANCE')) return 'ALLOWANCE';
    if (type.includes('DEDUCTION')) return 'DEDUCTION';
    if (type.includes('TRANSFER')) return 'TRANSFER';
    if (type.includes('PAYMENT')) return 'PAYMENT';
    if (type.includes('ALERT') || type.includes('WARNING')) return 'ALERT';

    return 'SYSTEM';
}

/**
 * Get friendly title for notification based on its type.
 */
export function getNotificationFriendlyTitle(notificationType: string): string {
    const titleMap: Record<string, string> = {
        // Leave
        'LEAVE_SUBMITTED': 'طلب إجازة جديد',
        'LEAVE_APPROVED_INTERMEDIATE': 'يحتاج موافقتك',
        'LEAVE_APPROVED_FINAL': 'تمت الموافقة على الإجازة',
        'LEAVE_REJECTED': 'تم رفض الإجازة',
        'LEAVE_CANCELLED': 'تم إلغاء الإجازة',

        // Loan
        'LOAN_SUBMITTED': 'طلب قرض جديد',
        'LOAN_APPROVED_INTERMEDIATE': 'يحتاج موافقتك',
        'LOAN_APPROVED_FINAL': 'تمت الموافقة على القرض',
        'LOAN_REJECTED': 'تم رفض القرض',
        'LOAN_FULLY_PAID': 'تم سداد القرض',
        'LOAN_INSTALLMENT_PAID': 'تم خصم قسط',
        'LOAN_POSTPONEMENT_SUBMITTED': 'طلب تأجيل قسط',
        'LOAN_POSTPONEMENT_APPROVED': 'تمت الموافقة على التأجيل',
        'LOAN_POSTPONEMENT_REJECTED': 'تم رفض التأجيل',

        // Payroll
        'PAYROLL_CALCULATED': 'تم احتساب الراتب',
        'PAYROLL_APPROVED_L1': 'موافقة الموارد البشرية',
        'PAYROLL_APPROVED_L2': 'موافقة المالية',
        'PAYROLL_APPROVED_FINAL': 'الراتب جاهز',
        'PAYROLL_REJECTED': 'تم رفض الراتب',
        'PAYROLL_RECALCULATED': 'تم تحديث الراتب',

        // Attendance
        'ATTENDANCE_LATE': 'تنبيه تأخر',
        'ATTENDANCE_ABSENT': 'تنبيه غياب',
        'ATTENDANCE_EARLY_DEPARTURE': 'تنبيه انصراف مبكر',
        'MANUAL_ATTENDANCE_SUBMITTED': 'طلب حضور يدوي',
        'MANUAL_ATTENDANCE_APPROVED': 'تمت الموافقة على الحضور',
        'MANUAL_ATTENDANCE_REJECTED': 'تم رفض طلب الحضور',

        // Allowance & Deduction
        'ALLOWANCE_SUBMITTED': 'طلب بدل',
        'ALLOWANCE_APPROVED': 'تمت الموافقة على البدل',
        'ALLOWANCE_REJECTED': 'تم رفض البدل',
        'DEDUCTION_SUBMITTED': 'طلب خصم',
        'DEDUCTION_APPROVED': 'تمت الموافقة على الخصم',
        'DEDUCTION_REJECTED': 'تم رفض الخصم',

        // Transfer
        'TRANSFER_SUBMITTED': 'طلب نقل',
        'TRANSFER_APPROVED_INTERMEDIATE': 'يحتاج موافقتك',
        'TRANSFER_APPROVED_FINAL': 'تمت الموافقة على النقل',
        'TRANSFER_REJECTED': 'تم رفض النقل',

        // Payment
        'PAYMENT_REQUEST_SUBMITTED': 'طلب دفع',
        'PAYMENT_REQUEST_APPROVED_INTERMEDIATE': 'يحتاج موافقتك',
        'PAYMENT_REQUEST_APPROVED_FINAL': 'تمت الموافقة على الدفع',
        'PAYMENT_REQUEST_REJECTED': 'تم رفض طلب الدفع',
        'PAYMENT_DUE_ALERT': 'تنبيه دفعة مستحقة',

        // Salary
        'SALARY_RAISE_PROCESSED': 'زيادة الراتب',
    };

    return titleMap[notificationType] || 'إشعار النظام';
}

/**
 * Get icon type based on notification type.
 */
export type NotificationIconType = 'success' | 'warning' | 'error' | 'info';

export function getNotificationIconType(notificationType: string): NotificationIconType {
    const type = notificationType?.toUpperCase() || '';

    // Success types
    if (type.includes('APPROVED') || type.includes('FINAL') || type.includes('PAID') || type.includes('PROCESSED')) {
        return 'success';
    }

    // Warning types
    if (type.includes('ALERT') || type.includes('WARNING') || type.includes('DUE') ||
        type.includes('LATE') || type.includes('EARLY') || type.includes('PENDING')) {
        return 'warning';
    }

    // Error types
    if (type.includes('REJECTED') || type.includes('CANCELLED') || type.includes('ABSENT') || type.includes('FAILED')) {
        return 'error';
    }

    // Default to info
    return 'info';
}
