/**
 * Arabic Translation Constants
 * 
 * This file contains all common Arabic translations used throughout the application.
 * Use these constants to ensure consistency across all components and pages.
 * 
 * Usage:
 *   import { translations } from '@/lib/translations/ar';
 *   const t = translations;
 *   
 *   <Button>{t.common.save}</Button>
 *   <span>{t.errors.required}</span>
 */

export const translations = {
  // Common buttons and actions
  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    view: 'عرض',
    add: 'إضافة',
    update: 'تحديث',
    submit: 'إرسال',
    close: 'إغلاق',
    confirm: 'تأكيد',
    approve: 'موافقة',
    reject: 'رفض',
    export: 'تصدير',
    print: 'طباعة',
    search: 'بحث',
    filter: 'تصفية',
    clear: 'مسح',
    reset: 'إعادة تعيين',
    refresh: 'تحديث',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    first: 'الأول',
    last: 'الأخير',
    select: 'اختيار',
    choose: 'اختر',
    apply: 'تطبيق',
    ok: 'موافق',
    yes: 'نعم',
    no: 'لا',
  },

  // Status labels
  status: {
    active: 'نشط',
    inactive: 'غير نشط',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    completed: 'مكتمل',
    inProgress: 'قيد التنفيذ',
    cancelled: 'ملغي',
    new: 'جديد',
    inProcess: 'قيد المعالجة',
    paid: 'مدفوع',
    unpaid: 'غير مدفوع',
    overdue: 'متأخر',
    postponed: 'مؤجل',
    terminated: 'منتهي',
  },

  // Common labels
  labels: {
    name: 'الاسم',
    code: 'الرمز',
    date: 'التاريخ',
    time: 'الوقت',
    status: 'الحالة',
    actions: 'الإجراءات',
    description: 'الوصف',
    notes: 'الملاحظات',
    required: 'مطلوب',
    optional: 'اختياري',
    employee: 'الموظف',
    employeeName: 'اسم الموظف',
    employeeId: 'رقم الموظف',
    department: 'القسم',
    position: 'المنصب',
    project: 'المشروع',
    projectName: 'اسم المشروع',
    amount: 'المبلغ',
    quantity: 'الكمية',
    total: 'الإجمالي',
    balance: 'الرصيد',
    available: 'المتاح',
  },

  // Messages
  messages: {
    success: 'نجح',
    error: 'خطأ',
    warning: 'تحذير',
    information: 'معلومات',
    loading: 'جارٍ التحميل',
    processing: 'جارٍ المعالجة',
    saving: 'جارٍ الحفظ',
    deleting: 'جارٍ الحذف',
    updating: 'جارٍ التحديث',
    noData: 'لا توجد بيانات',
    notFound: 'غير موجود',
    savedSuccessfully: 'تم الحفظ بنجاح',
    updatedSuccessfully: 'تم التحديث بنجاح',
    deletedSuccessfully: 'تم الحذف بنجاح',
    createdSuccessfully: 'تم الإنشاء بنجاح',
    approvedSuccessfully: 'تمت الموافقة بنجاح',
    rejectedSuccessfully: 'تم الرفض بنجاح',
    operationSuccess: 'تمت العملية بنجاح',
    anErrorOccurred: 'حدث خطأ',
    supplierCreatedSuccessfully: 'تم إنشاء المورد بنجاح',
    supplierUpdatedSuccessfully: 'تم تحديث المورد بنجاح',
    supplierDeletedSuccessfully: 'تم حذف المورد بنجاح',
  },

  // Error messages
  errors: {
    required: 'هذا الحقل مطلوب',
    invalidFormat: 'تنسيق غير صحيح',
    invalidEmail: 'تنسيق بريد إلكتروني غير صحيح',
    invalidPhone: 'رقم هاتف غير صحيح',
    minLength: 'يجب أن يكون على الأقل {min} حرف',
    maxLength: 'الحد الأقصى {max} حرف',
    mustBeNumber: 'يجب أن يكون رقماً',
    mustBeGreaterThan: 'يجب أن يكون أكبر من {value}',
    mustBeGreaterThanOrEqual: 'يجب أن يكون أكبر من أو يساوي {value}',
    mustBeLessThan: 'يجب أن يكون أقل من {value}',
    mustBeLessThanOrEqual: 'يجب أن يكون أقل من أو يساوي {value}',
    invalidDate: 'تاريخ غير صحيح',
    dateMustBeFuture: 'التاريخ يجب أن يكون في المستقبل',
    dateMustBePast: 'التاريخ يجب أن يكون في الماضي',
    endDateAfterStartDate: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء',
    passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
    passwordMinLength: 'كلمة المرور يجب أن تكون {min} أحرف على الأقل',
    networkError: 'خطأ في الشبكة',
    serverError: 'خطأ في الخادم',
    requestTimeout: 'انتهت مهلة الطلب',
    unauthorized: 'غير مصرح',
    forbidden: 'ممنوع',
    notFound: 'غير موجود',
    badRequest: 'طلب غير صحيح',
    validationError: 'خطأ في التحقق',
    failedToConnect: 'فشل الاتصال بالخادم',
    failedToSave: 'فشل الحفظ',
    failedToLoad: 'فشل التحميل',
    failedToDelete: 'فشل الحذف',
    pleaseTryAgain: 'يرجى المحاولة مرة أخرى',
    pleaseCheckInput: 'يرجى التحقق من المدخلات',
    sessionExpired: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى',
    unableToFetchUserInfo: 'تعذر جلب معلومات المستخدم من API',
    failedToConnectBackend: 'فشل الاتصال بالخادم الخلفي. يرجى التأكد من أن الخادم الخلفي يعمل',
    invalidServerResponse: 'استجابة غير صالحة من الخادم',
    nonJsonResponse: 'الخادم أرجَع استجابة غير JSON',
    missingRequiredFields: 'الحقول المطلوبة مفقودة',
    transactionCodeRequired: 'رمز المعاملة مطلوب',
    endpointNotAvailable: 'نقطة النهاية غير متاحة',
    updateEndpointNotAvailable: 'نقطة النهاية للتحديث غير متاحة. يحتاج الخادم الخلفي إلى نقطة نهاية PUT',
    approveEndpointNotAvailable: 'نقطة النهاية للموافقة غير متاحة. يحتاج الخادم الخلفي إلى نقطة نهاية POST',
    rejectEndpointNotAvailable: 'نقطة النهاية للرفض غير متاحة. يحتاج الخادم الخلفي إلى نقطة نهاية POST',
    transferEndpointNotFound: 'نقطة النهاية للنقل غير موجودة. يرجى التأكد من أن الخادم الخلفي يعمل وأن TransferController مسجل بشكل صحيح',
    approvalWorkflowNotConfigured: 'سير عمل الموافقة غير مُكوّن. يحتاج سلسلة الموافقة لـ "PROJ_TRANSFER" إلى الإعداد في تكوين النظام',
    missingRequiredData: 'البيانات المطلوبة مفقودة',
    serverErrorCreatingTransfer: 'حدث خطأ في الخادم أثناء إنشاء طلب النقل',
    failedToExportReport: 'فشل تصدير التقرير',
    paymentProcessCannotBeUpdated: 'لا يمكن تحديث سجلات عملية الدفع مباشرة. يرجى تحديث طلب الدفع بدلاً من ذلك',
    failedToCreate: 'فشل الإنشاء',
    failedToUpdate: 'فشل التحديث',
    failedToCreateSupplier: 'فشل إنشاء المورد',
    failedToUpdateSupplier: 'فشل تحديث المورد',
    failedToDeleteSupplier: 'فشل حذف المورد',
    failedToLoadAttendanceHistory: 'فشل تحميل سجل الحضور',
    failedToLoadManualAttendanceRequests: 'فشل تحميل طلبات الحضور اليدوي',
    failedToLoadAttendanceRecords: 'فشل تحميل سجلات الحضور. يرجى المحاولة مرة أخرى',
    failedToLoadLeaveRequests: 'فشل تحميل طلبات الإجازة',
    failedToGetLocation: 'فشل الحصول على الموقع',
    failedToCheckIn: 'فشل تسجيل الدخول',
    failedToCheckOut: 'فشل تسجيل الخروج',
    failedToSubmitManualCheckIn: 'فشل إرسال تسجيل الدخول اليدوي',
    failedToSubmitAllowanceRequest: 'فشل إرسال طلب البدل',
    failedToSubmitPostponementRequest: 'فشل إرسال طلب تأجيل القسط',
    failedToLoadSettings: 'فشل تحميل الإعدادات',
    employeeRecordNotFound: 'سجل الموظف غير موجود. يرجى التواصل مع الدعم',
    errorLoadingEmployeeData: 'خطأ في تحميل بيانات الموظف',
    paymentScheduleNotFound: 'جدول الدفع غير موجود',
    installmentNotFound: 'القسط غير موجود للشهر المحدد',
    missingRequiredInformation: 'المعلومات المطلوبة مفقودة: معرف الموافق غير موجود. يرجى تسجيل الدخول مرة أخرى',
  },

  // Validation messages
  validation: {
    required: 'هذا الحقل مطلوب',
    requiredField: 'الحقل {field} مطلوب',
    invalidFormat: 'تنسيق غير صحيح',
    invalidEmail: 'تنسيق بريد إلكتروني غير صحيح',
    invalidPhone: 'رقم هاتف غير صحيح',
    minLength: 'يجب أن يكون على الأقل {min} حرف',
    maxLength: 'الحد الأقصى {max} حرف',
    mustBeNumber: 'يجب أن يكون رقماً',
    mustBePositive: 'يجب أن يكون رقماً موجباً',
    mustBeGreaterThan: 'يجب أن يكون أكبر من {value}',
    mustBeGreaterThanOrEqual: 'يجب أن يكون أكبر من أو يساوي {value}',
    mustBeLessThan: 'يجب أن يكون أقل من {value}',
    mustBeLessThanOrEqual: 'يجب أن يكون أقل من أو يساوي {value}',
    invalidDate: 'تاريخ غير صحيح',
    dateMustBeFuture: 'التاريخ يجب أن يكون في المستقبل',
    dateMustBePast: 'التاريخ يجب أن يكون في الماضي',
    endDateAfterStartDate: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء',
    passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
    passwordMinLength: 'كلمة المرور يجب أن تكون {min} أحرف على الأقل',
    projectRequired: 'المشروع مطلوب',
    employeeRequired: 'الموظف مطلوب',
    specializationRequired: 'التخصص مطلوب',
    fromDateRequired: 'تاريخ البدء مطلوب',
    toDateRequired: 'تاريخ الانتهاء مطلوب',
    toDateAfterFromDate: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء',
    dailyRateGreaterThanZero: 'المعدل اليومي يجب أن يكون أكبر من 0',
    supplierNameRequired: 'اسم المورد مطلوب',
    paymentTypeRequired: 'نوع الدفع مطلوب',
    sequenceNumberAtLeastOne: 'رقم التسلسل يجب أن يكون على الأقل 1',
    dueDateRequired: 'تاريخ الاستحقاق مطلوب',
    dueAmountGreaterThanZero: 'المبلغ المستحق يجب أن يكون أكبر من 0',
    paymentPercentageBetweenZeroAndHundred: 'نسبة الدفع يجب أن تكون بين 0 و 100',
    numberOfWorkersGreaterThanZero: 'عدد العمال يجب أن يكون أكبر من 0',
    dailyWageGreaterThanZero: 'الأجر اليومي يجب أن يكون أكبر من 0',
  },

  // Table labels
  table: {
    rowsPerPage: 'الصفوف لكل صفحة',
    showing: 'عرض {from} من {to}',
    noData: 'لا توجد بيانات للعرض',
    noResults: 'لم يتم العثور على نتائج',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء تحديد الكل',
    sort: 'ترتيب',
    ascending: 'تصاعدي',
    descending: 'تنازلي',
    filter: 'تصفية',
    clearFilters: 'مسح الفلاتر',
    showColumns: 'إظهار الأعمدة',
    export: 'تصدير',
    exportToCSV: 'تصدير إلى CSV',
    exportToExcel: 'تصدير إلى Excel',
    exportToPDF: 'تصدير إلى PDF',
    print: 'طباعة',
    density: 'الكثافة',
    refresh: 'تحديث',
    search: 'بحث',
    next: 'التالي',
    previous: 'السابق',
    first: 'الأول',
    last: 'الأخير',
  },

  // Dialog messages
  dialogs: {
    confirmDelete: 'هل أنت متأكد من حذف هذا العنصر؟',
    confirmDeleteMessage: 'لا يمكن التراجع عن هذا الإجراء',
    confirmCancel: 'هل أنت متأكد من إلغاء التغييرات؟',
    unsavedChanges: 'لديك تغييرات غير محفوظة',
    areYouSure: 'هل أنت متأكد؟',
    thisActionCannotBeUndone: 'لا يمكن التراجع عن هذا الإجراء',
  },

  // Report labels
  reports: {
    reportPeriod: 'فترة التقرير',
    fromDate: 'من تاريخ',
    toDate: 'إلى تاريخ',
    generateReport: 'إنشاء التقرير',
    exportToExcel: 'تصدير إلى Excel',
    exportToPDF: 'تصدير إلى PDF',
    printReport: 'طباعة التقرير',
    total: 'الإجمالي',
    average: 'المتوسط',
    count: 'العدد',
    percentage: 'النسبة المئوية',
  },

  // Approval labels
  approvals: {
    pendingApprovals: 'الموافقات المعلقة',
    approvalHistory: 'سجل الموافقات',
    requestType: 'نوع الطلب',
    requestedBy: 'المطلوب بواسطة',
    requestDate: 'تاريخ الطلب',
    approve: 'موافقة',
    reject: 'رفض',
    viewDetails: 'عرض التفاصيل',
    approvalNotes: 'ملاحظات الموافقة',
  },

  // Timeline labels
  timeline: {
    timeline: 'الخط الزمني',
    status: 'الحالة',
    submitted: 'تم الإرسال',
    submittedBy: 'تم الإرسال بواسطة',
    approvedBy: 'تمت الموافقة بواسطة',
    rejectedBy: 'تم الرفض بواسطة',
    comments: 'التعليقات',
    notes: 'الملاحظات',
  },
};

/**
 * Helper function to format messages with placeholders
 * Example: formatMessage(t.errors.minLength, { min: 8 }) => "يجب أن يكون على الأقل 8 حرف"
 */
export function formatMessage(
  message: string,
  params: Record<string, string | number>
): string {
  let formatted = message;
  Object.entries(params).forEach(([key, value]) => {
    formatted = formatted.replace(`{${key}}`, String(value));
  });
  return formatted;
}

/**
 * Helper function to get translation with formatting
 * Example: t.format(t.errors.minLength, { min: 8 })
 */
export const t = {
  ...translations,
  format: formatMessage,
};

export default translations;
