'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  HelpOutline,
  ExpandMore,
  QuestionAnswer,
} from '@mui/icons-material';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import useRouteProtection from '@/hooks/useRouteProtection';
import { getUserRole } from '@/lib/permissions';
import type { UserRole } from '@/types/roles';

interface FAQItem {
  question: string;
  answer: string;
  roles?: UserRole[]; // If specified, only show for these roles. If not specified, show for all non-employee roles
}

const translations = {
  en: {
    helpCenter: 'Help Center',
    subtitle: 'Find answers, tutorials, and support resources',
    faq: 'Frequently Asked Questions',
    // Employee FAQs
    checkInOutQ: 'How do I check in/out?',
    checkInOutA: 'Go to Self Service > Check In/Out, click the "Check In" or "Check Out" button. Make sure to enable location services for GPS validation.',
    requestLeaveQ: 'How do I request leave?',
    requestLeaveA: 'Navigate to Self Service > Request Leave, select your leave dates and reason, then submit the request. You can track the status in Self Service > Request Leave.',
    requestLoanQ: 'How do I request a loan?',
    requestLoanA: 'Go to Self Service > Request Loan, enter the loan amount, number of installments, and first installment date, then submit the request.',
    requestAllowanceQ: 'How do I request an allowance?',
    requestAllowanceA: 'Navigate to Self Service > Request Allowance, select the allowance type, enter the amount and reason, then submit the request.',
    viewPayrollQ: 'How do I view my payroll?',
    viewPayrollA: 'Go to Self Service > View Payroll, select a month from the dropdown to view your salary details, allowances, and deductions for that month.',
    viewAttendanceQ: 'How do I view my attendance history?',
    viewAttendanceA: 'Navigate to Self Service > Attendance History to view all your attendance records, including entry/exit times, working hours, and overtime.',
    viewProfileQ: 'How do I view my profile?',
    viewProfileA: 'Go to Self Service > My Profile to view and update your personal information, contact details, and other profile data.',
    postponeInstallmentQ: 'How do I postpone a loan installment?',
    postponeInstallmentA: 'Navigate to Self Service > Postpone Installment, select the installment you want to postpone, choose a new due date, and submit the request.',
    viewLeaveBalanceQ: 'How do I view my leave balance?',
    viewLeaveBalanceA: 'Go to Employee Management > Leave Balance to see your current leave balances for annual leave, sick leave, and emergency leave.',
    viewLoanInstallmentsQ: 'How do I view my loan installments?',
    viewLoanInstallmentsA: 'Navigate to Employee Management > Loan Installments to view all your loan installments, their due dates, payment status, and paid dates.',
    // Management FAQs
    addEmployeeQ: 'How do I add a new employee?',
    addEmployeeA: 'Navigate to Employee Management > Employees List, then click the "Add Employee" button. Fill in all required fields and submit the form.',
    approveLeaveQ: 'How do I approve a leave request?',
    approveLeaveA: 'Go to Employee Management > Leave Requests, find the pending request, and click the "Approve" button in the actions column.',
    calculatePayrollQ: 'How do I calculate payroll?',
    calculatePayrollA: 'Navigate to Payroll Management > Salary Calculation, select the month/year and calculation type, then click "Calculate Salaries".',
    createPurchaseOrderQ: 'How do I create a purchase order?',
    createPurchaseOrderA: 'Go to Warehouse & Inventory > Purchase Orders, click "New Purchase Order", fill in the details, and submit for approval.',
    viewSystemLogsQ: 'How do I view system logs?',
    viewSystemLogsA: 'Navigate to System Settings > System Logs to view all system activity, filter by log level, and monitor system events.',
    managePermissionsQ: 'How do I manage user permissions?',
    managePermissionsA: 'Go to System Settings > Roles & Permissions, select a role, and configure module-level permissions using the edit button.',
  },
  ar: {
    helpCenter: 'مركز المساعدة',
    subtitle: 'ابحث عن الإجابات والدروس وموارد الدعم',
    faq: 'الأسئلة الشائعة',
    // Employee FAQs
    checkInOutQ: 'كيف أقوم بتسجيل الدخول والانصراف؟',
    checkInOutA: 'انتقل إلى الخدمة الذاتية > تسجيل الدخول والانصراف، انقر على زر "تسجيل الدخول" أو "تسجيل الانصراف". تأكد من تفعيل خدمات الموقع للتحقق من GPS.',
    requestLeaveQ: 'كيف أطلب إجازة؟',
    requestLeaveA: 'انتقل إلى الخدمة الذاتية > طلب إجازة، اختر تواريخ الإجازة والسبب، ثم أرسل الطلب. يمكنك تتبع الحالة في الخدمة الذاتية > طلب إجازة.',
    requestLoanQ: 'كيف أطلب قرضاً؟',
    requestLoanA: 'انتقل إلى الخدمة الذاتية > طلب قرض، أدخل مبلغ القرض وعدد الأقساط وتاريخ القسط الأول، ثم أرسل الطلب.',
    requestAllowanceQ: 'كيف أطلب بدل؟',
    requestAllowanceA: 'انتقل إلى الخدمة الذاتية > طلب بدل، اختر نوع البدل وأدخل المبلغ والسبب، ثم أرسل الطلب.',
    viewPayrollQ: 'كيف أطلع على كشف الراتب؟',
    viewPayrollA: 'انتقل إلى الخدمة الذاتية > عرض كشف الراتب، اختر شهراً من القائمة المنسدلة لعرض تفاصيل راتبك والبدلات والخصومات لذلك الشهر.',
    viewAttendanceQ: 'كيف أطلع على سجل الحضور؟',
    viewAttendanceA: 'انتقل إلى الخدمة الذاتية > سجل الحضور لعرض جميع سجلات الحضور الخاصة بك، بما في ذلك أوقات الدخول/الخروج وساعات العمل والإضافي.',
    viewProfileQ: 'كيف أطلع على ملفي الشخصي؟',
    viewProfileA: 'انتقل إلى الخدمة الذاتية > ملفي الشخصي لعرض وتحديث معلوماتك الشخصية وتفاصيل الاتصال وبيانات الملف الشخصي الأخرى.',
    postponeInstallmentQ: 'كيف أؤجل قسط قرض؟',
    postponeInstallmentA: 'انتقل إلى الخدمة الذاتية > تأجيل قسط، اختر القسط الذي تريد تأجيله، اختر تاريخ استحقاق جديد، ثم أرسل الطلب.',
    viewLeaveBalanceQ: 'كيف أطلع على رصيد إجازاتي؟',
    viewLeaveBalanceA: 'انتقل إلى إدارة الموظفين > رصيد الإجازات لرؤية أرصدة إجازاتك الحالية للإجازة السنوية والإجازة المرضية والإجازة الطارئة.',
    viewLoanInstallmentsQ: 'كيف أطلع على أقساط قروضي؟',
    viewLoanInstallmentsA: 'انتقل إلى إدارة الموظفين > أقساط القروض لعرض جميع أقساط قروضك وتواريخ الاستحقاق وحالة الدفع والتواريخ المدفوعة.',
    // Management FAQs
    addEmployeeQ: 'كيف أضيف موظفاً جديداً؟',
    addEmployeeA: 'انتقل إلى إدارة الموظفين > قائمة الموظفين، ثم انقر على زر "إضافة موظف". املأ جميع الحقول المطلوبة وأرسل النموذج.',
    approveLeaveQ: 'كيف أوافق على طلب إجازة؟',
    approveLeaveA: 'انتقل إلى إدارة الموظفين > طلبات الإجازة، ابحث عن الطلب المعلق، وانقر على زر "موافقة" في عمود الإجراءات.',
    calculatePayrollQ: 'كيف أحسب الرواتب؟',
    calculatePayrollA: 'انتقل إلى إدارة الرواتب > حساب الرواتب، اختر الشهر/السنة ونوع الحساب، ثم انقر على "حساب الرواتب".',
    createPurchaseOrderQ: 'كيف أنشئ أمر شراء؟',
    createPurchaseOrderA: 'انتقل إلى المستودع والمخزون > أوامر الشراء، انقر على "أمر شراء جديد"، املأ التفاصيل، وأرسل للموافقة.',
    viewSystemLogsQ: 'كيف أطلع على سجلات النظام؟',
    viewSystemLogsA: 'انتقل إلى إعدادات النظام > سجلات النظام لعرض جميع أنشطة النظام، والتصفية حسب مستوى السجل، ومراقبة أحداث النظام.',
    managePermissionsQ: 'كيف أدير صلاحيات المستخدمين؟',
    managePermissionsA: 'انتقل إلى إعدادات النظام > الأدوار والصلاحيات، اختر دوراً، وحدد صلاحيات على مستوى الوحدة باستخدام زر التعديل.',
  },
};

export default function HelpCenterPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('مركز المساعدة');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const userRole = getUserRole();
  const [language] = useState<'en' | 'ar'>(() => {
    if (typeof window === 'undefined') return 'ar';
    const savedLanguage = sessionStorage.getItem('language') as 'en' | 'ar' | null;
    return savedLanguage || 'ar';
  });
  const t = translations[language];

  // Protect route - all authenticated users can access
  useRouteProtection(['Admin', 'General Manager', 'HR Manager', 'Finance Manager', 'Project Manager', 'Warehouse Manager', 'Employee']);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    router.push('/logout-transition');
  };

  const handleToggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  // All FAQ items with role restrictions
  const allFaqItems: FAQItem[] = [
    // Employee-specific FAQs
    {
      question: t.checkInOutQ,
      answer: t.checkInOutA,
      roles: ['Employee'],
    },
    {
      question: t.requestLeaveQ,
      answer: t.requestLeaveA,
      roles: ['Employee'],
    },
    {
      question: t.requestLoanQ,
      answer: t.requestLoanA,
      roles: ['Employee'],
    },
    {
      question: t.requestAllowanceQ,
      answer: t.requestAllowanceA,
      roles: ['Employee'],
    },
    {
      question: t.viewPayrollQ,
      answer: t.viewPayrollA,
      roles: ['Employee'],
    },
    {
      question: t.viewAttendanceQ,
      answer: t.viewAttendanceA,
      roles: ['Employee'],
    },
    {
      question: t.viewProfileQ,
      answer: t.viewProfileA,
      roles: ['Employee'],
    },
    {
      question: t.postponeInstallmentQ,
      answer: t.postponeInstallmentA,
      roles: ['Employee'],
    },
    {
      question: t.viewLeaveBalanceQ,
      answer: t.viewLeaveBalanceA,
      roles: ['Employee'],
    },
    {
      question: t.viewLoanInstallmentsQ,
      answer: t.viewLoanInstallmentsA,
      roles: ['Employee'],
    },
    // Management FAQs (not for employees)
    {
      question: t.addEmployeeQ,
      answer: t.addEmployeeA,
      roles: ['Admin', 'HR Manager'],
    },
    {
      question: t.approveLeaveQ,
      answer: t.approveLeaveA,
      roles: ['Admin', 'HR Manager', 'General Manager', 'Project Manager'],
    },
    {
      question: t.calculatePayrollQ,
      answer: t.calculatePayrollA,
      roles: ['Admin', 'HR Manager', 'Finance Manager'],
    },
    {
      question: t.createPurchaseOrderQ,
      answer: t.createPurchaseOrderA,
      roles: ['Admin', 'Warehouse Manager', 'Finance Manager'],
    },
    {
      question: t.viewSystemLogsQ,
      answer: t.viewSystemLogsA,
      roles: ['Admin'],
    },
    {
      question: t.managePermissionsQ,
      answer: t.managePermissionsA,
      roles: ['Admin'],
    },
  ];

  // Filter FAQs based on user role
  const faqItems = allFaqItems.filter(item => {
    if (!userRole) return false;
    // If roles are specified, only show if user role is in the list
    if (item.roles) {
      return item.roles.includes(userRole);
    }
    // If no roles specified, show for all non-employee roles (backward compatibility)
    return userRole !== 'Employee';
  });


  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FC' }}>
      <DashboardSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onLogout={handleLogout}
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={handleToggleSidebar}
      />
      <Box
        sx={{
          marginRight: sidebarExpanded ? '280px' : '80px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <DashboardHeader />
        <Box sx={{ flex: 1, padding: '32px', backgroundColor: '#F8F9FC' }}>
          <Box
            sx={{
              mb: 4,
              animation: 'fadeInUp 0.6s ease-out 0.2s both',
              '@keyframes fadeInUp': {
                from: { opacity: 0, transform: 'translateY(20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
              {t.helpCenter}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B7280' }}>
              {t.subtitle}
            </Typography>
          </Box>

          {/* FAQ Section */}
          <Paper
            elevation={0}
            sx={{
              padding: 3,
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              animation: 'fadeInUp 0.6s ease-out 0.5s both',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 2 }}>
              {t.faq}
            </Typography>
            <Box>
              {faqItems.map((item, index) => (
                <Accordion
                  key={index}
                  sx={{
                    mb: 1,
                    '&:before': { display: 'none' },
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px !important',
                    boxShadow: 'none',
                    '&.Mui-expanded': {
                      margin: '0 0 8px 0',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ color: '#0c2b7a' }} />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        margin: '16px 0',
                      },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                      {item.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                    <Typography sx={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
                      {item.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}


