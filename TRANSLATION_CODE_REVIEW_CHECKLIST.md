# 📋 Arabic Translation Code Review Checklist

This document provides a comprehensive code review checklist for ensuring all Arabic translations are properly implemented in the Techno Frontend application.

---

## 🔍 Consistency Checks

### Translation Consistency
- [ ] All similar labels use the same translation throughout the application
  - Example: "Save" should always be "حفظ", not "حفظ" in one place and "حفظ البيانات" in another
- [ ] Button labels are consistent across all pages
  - "Save" → "حفظ"
  - "Cancel" → "إلغاء"
  - "Delete" → "حذف"
  - "Edit" → "تعديل"
  - "View" → "عرض"
- [ ] Error messages follow the same format and style
- [ ] Status labels are consistent
  - "Active" → "نشط"
  - "Pending" → "قيد الانتظار"
  - "Approved" → "موافق عليه"
  - "Rejected" → "مرفوض"
- [ ] Date formats are consistent (use Arabic locale)
- [ ] Number formats are consistent

### Terminology Consistency
- [ ] Employee-related terms are consistent
  - "Employee" → "موظف"
  - "Employee Name" → "اسم الموظف"
  - "Employee ID" → "رقم الموظف"
- [ ] Project-related terms are consistent
  - "Project" → "المشروع"
  - "Project Name" → "اسم المشروع"
  - "Project Manager" → "مدير المشروع"
- [ ] Financial terms are consistent
  - "Amount" → "المبلغ"
  - "Salary" → "الراتب"
  - "Payment" → "الدفع"
- [ ] Status terms are consistent across all modules

---

## ✅ Completeness Checks

### No Hardcoded English Strings
- [ ] No hardcoded English strings in component files
- [ ] No hardcoded English strings in page files
- [ ] No hardcoded English strings in utility files
- [ ] No hardcoded English strings in mapper files
- [ ] No hardcoded English strings in API files
- [ ] No hardcoded English strings in type definitions

### All User-Facing Text is Arabic
- [ ] All form labels are in Arabic
- [ ] All form placeholders are in Arabic
- [ ] All form helper text is in Arabic
- [ ] All form validation messages are in Arabic
- [ ] All button labels are in Arabic
- [ ] All table headers are in Arabic
- [ ] All dialog titles are in Arabic
- [ ] All dialog messages are in Arabic
- [ ] All notification messages are in Arabic
- [ ] All error messages are in Arabic
- [ ] All empty state messages are in Arabic
- [ ] All loading state messages are in Arabic
- [ ] All tooltips are in Arabic
- [ ] All page titles are in Arabic
- [ ] All section headers are in Arabic
- [ ] All chart labels are in Arabic
- [ ] All report labels are in Arabic

### All Placeholders are Arabic
- [ ] Input field placeholders are in Arabic
- [ ] Select dropdown placeholders are in Arabic
- [ ] Search placeholders are in Arabic
- [ ] Date picker placeholders are in Arabic

### All Helper Text is Arabic
- [ ] Form field helper text is in Arabic
- [ ] Input field helper text is in Arabic
- [ ] Validation helper text is in Arabic

### All Tooltips are Arabic
- [ ] Button tooltips are in Arabic
- [ ] Icon tooltips are in Arabic
- [ ] Table column tooltips are in Arabic
- [ ] Form field tooltips are in Arabic

### All Aria-Labels are Arabic (Accessibility)
- [ ] Button aria-labels are in Arabic
- [ ] Icon aria-labels are in Arabic
- [ ] Form field aria-labels are in Arabic
- [ ] Navigation aria-labels are in Arabic

---

## 🎨 Quality Checks

### Grammatical Correctness
- [ ] Arabic text is grammatically correct
- [ ] Arabic text uses proper sentence structure
- [ ] Arabic text uses appropriate verb forms
- [ ] Arabic text uses correct gender agreement
- [ ] Arabic text uses proper plural forms

### Contextual Appropriateness
- [ ] Arabic text is contextually appropriate
- [ ] Arabic text matches the intended meaning
- [ ] Arabic text uses professional terminology
- [ ] Arabic text is culturally appropriate
- [ ] Arabic text uses formal language where appropriate

### Professional Terminology
- [ ] Technical terms are translated correctly
- [ ] Business terms are translated correctly
- [ ] Financial terms are translated correctly
- [ ] HR terms are translated correctly
- [ ] Project management terms are translated correctly

### No Mixed Languages
- [ ] No mixed English/Arabic in the same context
- [ ] No English words mixed with Arabic text
- [ ] No code comments in user-facing text
- [ ] No debug messages in user-facing text

---

## 🔧 Technical Checks

### RTL (Right-to-Left) Support
- [ ] All components support RTL layout
- [ ] Text alignment is correct in RTL mode
- [ ] Icon positioning is correct in RTL mode
- [ ] Button positioning is correct in RTL mode
- [ ] Table alignment is correct in RTL mode
- [ ] Form alignment is correct in RTL mode
- [ ] Dialog alignment is correct in RTL mode
- [ ] Navigation alignment is correct in RTL mode
- [ ] No layout breaks in RTL mode

### Font Support
- [ ] Fonts support Arabic characters
- [ ] Arabic diacritics display correctly
- [ ] Arabic ligatures display correctly
- [ ] No font fallback issues

### Text Overflow
- [ ] Arabic text doesn't overflow containers
- [ ] Arabic text doesn't break layout
- [ ] Long Arabic text wraps correctly
- [ ] Table cells handle long Arabic text correctly
- [ ] Form fields handle long Arabic text correctly

### Date & Number Formatting
- [ ] Dates use Arabic locale (`toLocaleDateString('ar-SA')`)
- [ ] Numbers are formatted correctly
- [ ] Currency amounts use Arabic format (SAR/ر.س)
- [ ] Time formats use Arabic locale

---

## 📁 File-Specific Checks

### Components (`src/components/`)
- [ ] All auth components are translated
- [ ] All common components are translated
- [ ] All dashboard components are translated
- [ ] All form components are translated (all 56 forms)

### Pages (`src/app/`)
- [ ] All dashboard pages are translated
- [ ] All employee pages are translated
- [ ] All payroll pages are translated
- [ ] All project pages are translated
- [ ] All warehouse pages are translated
- [ ] All report pages are translated
- [ ] All settings pages are translated
- [ ] All self-service pages are translated
- [ ] Login page is translated
- [ ] Unauthorized page is translated

### Library Files (`src/lib/`)
- [ ] All API error messages are translated
- [ ] All table configurations are translated
- [ ] All utility functions with user-facing messages are translated
- [ ] All mappers with display text are translated

### Contexts & Hooks
- [ ] ToastContext messages are translated
- [ ] useApi error messages are translated
- [ ] useApiWithToast messages are translated

---

## 🧪 Testing Checks

### Visual Testing
- [ ] All pages have been visually inspected
- [ ] All components have been visually inspected
- [ ] All dialogs have been visually inspected
- [ ] All tables have been visually inspected
- [ ] All forms have been visually inspected

### Functional Testing
- [ ] Form validation has been tested
- [ ] Error handling has been tested
- [ ] Success notifications have been tested
- [ ] Warning dialogs have been tested
- [ ] Table functionality has been tested

### Edge Cases
- [ ] Empty states have been tested
- [ ] Network errors have been tested
- [ ] Permission denied has been tested
- [ ] Not found pages have been tested
- [ ] Loading states have been tested

### Cross-Browser Testing
- [ ] Chrome has been tested
- [ ] Firefox has been tested
- [ ] Edge has been tested
- [ ] Safari has been tested (if applicable)

### Mobile Testing
- [ ] Mobile devices have been tested
- [ ] Tablet devices have been tested
- [ ] Responsive design works correctly

---

## 📝 Code Review Notes

**Reviewer Name:** _______________

**Date of Review:** _______________

**Files Reviewed:**
- [ ] Components
- [ ] Pages
- [ ] Library files
- [ ] Contexts & Hooks
- [ ] Mappers
- [ ] Utilities

**Issues Found:**
1. 
2. 
3. 

**Recommendations:**
1. 
2. 
3. 

**Overall Status:** ☐ Approved  ☐ Needs Changes  ☐ Rejected

**Comments:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## ✅ Sign-Off

**Reviewed By:** _______________

**Date:** _______________

**Status:** ☐ Complete  ☐ Incomplete

---

**Last Updated:** 2025-01-XX
