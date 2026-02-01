// Techno Company ERP System - TypeScript Type Definitions

// ========== Common Types ==========
export type StatusType = 'N' | 'A' | 'R' | 'W' | 'Y'; // New, Approved, Rejected, Work, Yes
export type UserType = 'ADMIN' | 'GENERAL_MANAGER' | 'HR_MANAGER' | 'FINANCE_MANAGER' | 'PROJECT_MANAGER' | 'REGIONAL_PROJECT_MANAGER' | 'PROJECT_SECRETARY' | 'PROJECT_ADVISOR' | 'WAREHOUSE_MANAGER' | 'EMPLOYEE' | 'USER';
export type ContractType = 'TECHNO' | 'TEMPORARY' | 'DAILY';
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE' | 'TERMINATED';
export type RequestStatus = 'NEW' | 'INPROCESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL';
export type PriorityType = 'H' | 'M' | 'L'; // High, Medium, Low
export type HolidayType = 'Fitr' | 'Adha' | 'National' | 'Foundation' | 'Custom';

// ========== User Management ==========
export interface UserAccount {
  userId: string;
  username: string;
  password?: string;
  nationalId?: string;
  userType: UserType;
  isActive: boolean;
  lastLoginDate?: Date;
  lastLoginTime?: string;
  createdDate?: Date;
  employeeId?: number;
  fullName?: string;
  email?: string;
}

export interface MenuGrant {
  userId: string;
  menuId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface RolePermission {
  roleName: string;
  description: string;
  canManageEmployees: boolean;
  canManageAttendance: boolean;
  canManageLeave: boolean;
  canManageLoans: boolean;
  canManagePayroll: boolean;
  canManageProjects: boolean;
  canManageWarehouse: boolean;
  canViewReports: boolean;
  canApprove: boolean;
  canManageSettings: boolean;
}

// ========== Employee Management ==========
export interface Employee {
  employeeId: number;
  residenceId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  hireDate: Date;
  terminationDate?: Date;
  departmentCode: number;
  positionTitle: string;
  specializationCode?: string;
  contractType: ContractType;
  socialInsuranceNo?: string;
  status: EmployeeStatus;
  monthlySalary: number;
  nationality: string;
  isSaudi: boolean;
  passportNumber?: string;
  passportExpiry?: Date;
  residenceExpiry?: Date;
  vacationBalance: number;
  managerId?: number;
  projectCode?: number;
  username?: string;
  password?: string;
}

export interface Department {
  departmentCode: number;
  departmentName: string;
  parentDepartmentCode?: number;
  managerEmployeeId?: number;
  employeeCount: number;
}

export interface AttendanceTransaction {
  transactionId: number;
  employeeId: number;
  employeeName?: string;
  attendanceDate: Date;
  entryTime: string;
  exitTime: string;
  scheduledHours: string;
  workingHours: string;
  overtimeCalc: string;
  delayedCalc: string;
  earlyOutCalc: string;
  shortageHours: string;
  absenceFlag: 'Y' | 'N';
  projectCode?: number;
  projectName?: string;
  locationLat?: number;
  locationLong?: number;
  notes?: string;
  // Flags for special attendance types
  isAutoCheckout: 'Y' | 'N';
  isManualEntry: 'Y' | 'N';
  isWeekendWork: 'Y' | 'N';
  isHolidayWork: 'Y' | 'N';
}

export interface LeaveRequest {
  requestId: number;
  employeeId: number;
  leaveType: string;
  fromDate: Date;
  toDate: Date;
  numberOfDays: number;
  reason: string;
  status: RequestStatus;
  requestDate: Date;
  nextApproval?: number;
  nextApproverName?: string;
  nextLevel?: number;
  nextLevelName?: string;
}

export interface LoanRequest {
  loanId: number;
  employeeId: number;
  loanAmount: number;
  numberOfInstallments: number;
  firstPaymentDate: Date;
  remainingBalance: number;
  status: RequestStatus;
  requestDate: Date;
  approvedDate?: Date;
  nextApproval?: number;
  nextApproverName?: string;
  nextLevel?: number;
  nextLevelName?: string;
  paidCount?: number;
  unpaidCount?: number;
}

export interface LoanInstallment {
  installmentId?: number;
  loanId: number;
  installmentNo: number;
  employeeNo?: number;
  employeeName?: string;
  dueDate: Date;
  installmentAmount: number;
  paidDate?: Date;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'POSTPONED' | 'OVERDUE';
  postponedTo?: Date;
  salaryMonth?: string;
}

export interface AllowanceRequest {
  requestId: number;
  employeeId: number;
  allowanceType: string;
  allowanceAmount: number;
  reason: string;
  status: RequestStatus;
  requestDate: Date;
  nextApproval?: number;
  nextLevel?: number;
}

export interface MonthlyAllowance {
  transactionId: number;
  employeeId: number;
  monthYear: string;
  transactionType: number;
  transactionAmount: number;
  status: StatusType;
  notes?: string;
}

export interface MonthlyDeduction {
  transactionId: number;
  employeeId: number;
  monthYear: string;
  deductionType: number;
  deductionAmount: number;
  status: StatusType;
  notes?: string;
}

// ========== Payroll Management ==========
export interface SalaryHeader {
  salaryId: number;
  employeeNo: number;
  salaryMonth: string; // Format: YYYY-MM
  salaryVersion: number;
  isLatest: 'Y' | 'N';
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  transStatus: 'N' | 'A' | 'R'; // N=New/Pending, A=Approved, R=Rejected
  rejectionReason?: string;

  // Breakdown fields
  totalOvertime: number;
  totalAbsence: number;
  totalLoans: number;

  // Relationships
  salaryDetails?: SalaryDetail[];

  // UI Helpers (Optional)
  status?: string; // Mapped from transStatus
  nextApproval?: number;
  nextLevel?: number;
  approvedBy?: number;
  approvedDate?: Date;
  blockingReason?: string;
}

export interface SalaryDetail {
  salaryId: number;
  lineNo: number;
  transTypeCode: number;
  transCategory: 'A' | 'D'; // A=Allowance, D=Deduction
  transAmount: number;
  referenceTable?: string;
  referenceId?: number;
  description?: string; // Optional client-side description
}

export interface PayrollTransaction {
  employeeId: number;
  transactionCode: number;
  transactionName: string;
  percentage: number;
  isSaudi: boolean;
}

export interface TimeSchedule {
  scheduleId?: number;
  scheduleName?: string;
  departmentCode: number;
  requiredHours: number;
  entryTime: string;
  exitTime: string;
  departmentNameEn?: string;
  gracePeriodMinutes?: number;
  isActive?: string;
}

// ========== Project Management ==========
export interface Project {
  projectCode: number;
  projectName: string;
  projectAddress: string;
  startDate: Date;
  endDate: Date;
  totalProjectAmount: number;
  projectProfitMargin?: number;
  projectGoogleMap?: string;
  projectLongitude?: number;
  projectLatitude?: number;
  attendanceRadius?: number; // in meters
  numberOfPayments?: number;
  firstDownPaymentDate?: Date;
  projectManagerId: number;
  regionalManagerId?: number;
  technoSuffix?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  scheduleId?: number; // Time schedule ID assigned to this project
}

export interface ProjectDuePayment {
  paymentId?: number; // Added for API operations
  projectCode: number;
  serialNo: number;
  dueDate: Date;
  dueAmount: number;
  paymentStatus: PaymentStatus;
  paidDate?: Date;
  // Extended fields for UI/Forms
  paymentType?: 'INCOMING' | 'OUTGOING';
  paymentPercentage?: number;
  notes?: string;
  projectName?: string; // Sometimes present in responses
}

export interface ProjectPaymentRequest {
  // Core fields
  requestNo: number;
  projectCode: number;
  projectName?: string;
  supplierCode: number;
  supplierName: string;
  requestDate: Date;
  paymentAmount: number;
  paymentPurpose: string;

  // Status and workflow
  transStatus: 'P' | 'A' | 'R'; // P = Pending, A = Approved, R = Rejected
  nextApproval?: number;
  nextApproverName?: string;
  nextAppLevel?: number;
  approvedBy?: number;
  approverName?: string;
  approvedDate?: Date;
  rejectionReason?: string;

  // Requester info
  requestedBy: number;
  requesterName?: string;

  // Processing
  attachmentPath?: string;
  isProcessed: 'Y' | 'N';
  isDeleted: 'Y' | 'N';

  // Calculated fields (from backend)
  isPending?: boolean;
  isApproved?: boolean;
  isRejected?: boolean;
  isProcessedFlag?: boolean;

  // Audit fields
  createdDate?: Date;
  createdBy?: number;
  modifiedDate?: Date;
  modifiedBy?: number;
}

export interface ProjectPaymentProcess {
  requestNo: number;
  paymentDueDate: Date;
  paymentPercentage: number;
  paidPercentage: number;
  remainPercentage: number;
  processedBy: number;
}

export interface TransferRequest {
  requestId: number;
  employeeId: number;
  employeeName?: string; // Employee name from backend
  fromProjectCode: number;
  fromProjectName?: string; // From project name from backend
  toProjectCode: number;
  toProjectName?: string; // To project name from backend
  requestDate: Date;
  reason: string;
  status: RequestStatus;
  // Workflow fields
  transStatus?: 'P' | 'A' | 'R';
  nextApproval?: number;
  nextApproverName?: string;
  nextLevel?: number;

  requestedBy?: number; // Employee who requested the transfer
  requestedByName?: string; // Name of employee who requested the transfer
}

// ========== Temporary Labor ==========
export interface LaborRequest {
  requestNo: number;
  projectCode: number;
  fromDate: Date;
  toDate: Date;
  requestDate: Date;
  requestedBy: number;
  status: RequestStatus;
}

export interface LaborRequestDetail {
  requestNo: number;
  lineNo: number;
  specialization: string;
  requiredCount: number;
}

export interface LaborAssignment {
  assignmentNo?: number; // Assignment ID (primary key)
  requestNo?: number | null; // Optional: can be null if not linked to a labor request
  lineNo: number;
  employeeId: number;
  employeeName?: string; // Employee name from backend
  specialization: string;
  fromDate: Date;
  toDate: Date;
  dailyRate?: number; // Daily rate/wage for the assignment
  status: 'ACTIVE' | 'COMPLETED';
  projectCode?: number; // Project code for the assignment
}

export interface TempLaborRequest {
  requestId: number;
  requestDate: Date;
  specialization: string;
  numberOfWorkers: number;
  fromDate: Date;
  toDate: Date;
  dailyWage: number;
  status: 'NEW' | 'APPROVED' | 'REJECTED'; // Legacy internal status
  // Additional fields from backend
  transStatus?: 'P' | 'A' | 'R'; // Workflow Status
  nextApproval?: number;
  nextApproverName?: string;
  nextAppLevel?: number;

  projectCode?: number;
  projectName?: string;
  requestedByName?: string;
  approvedByName?: string;
  approvalDate?: Date;
  notes?: string;
  detailSequenceNo?: number; // To track which detail line this row represents
}

export interface TempWorkerAssignment {
  workerId: number;
  workerName: string;
  specialization: string;
  nationality: string;
  startDate: Date;
  endDate: Date;
  dailyWage: number;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  // Form extensions
  employeeNo?: number;
  projectCode?: number;
  notes?: string;
}

// ========== Warehouse & Inventory ==========
export interface StoreItemCategory {
  categoryCode: number;
  categoryName: string;
  itemCount?: number;
}

export interface StoreItem {
  itemCode: number;
  itemName: string;
  itemCategoryCode: number;
  totalItemQuantity: number;
}

export interface ProjectStore {
  storeCode: number;
  projectCode: number;
  projectName?: string;
  storeName: string;
  storeLocation?: string;
  storeManagerId?: number;
  storeManagerName?: string;
  isActive?: boolean;
  itemCount?: number;
}

export interface ItemPO {
  transactionNo: number; // Maps to poId
  transactionDate: Date; // Maps to poDate
  storeCode: number;
  requestStatus: RequestStatus; // Maps to poStatus
  supplierName: string;
  poAmount: number; // Maps to totalAmount
  requestedBy: number;
  supplyDate?: string | Date;
  // Additional backend fields
  poId?: number;
  poNumber?: string;
  storeName?: string;
  projectCode?: number;
  projectName?: string;
  poStatus?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  requestedByName?: string;
  approvalNotes?: string;
  // Form extensions
  expectedDeliveryDate?: Date;
  supplierId?: number;
  orderLines?: Array<{
    itemCode: number;
    quantity: number;
    unitPrice: number;
    notes?: string;
    lineId?: number;
    itemName?: string;
    lineTotal?: number;
  }>;
}

export interface ItemPODetail {
  transactionNo: number;
  serialNo: number;
  itemCode: number;
  quantityRequired: number;
}

export interface StoreItemReceivable {
  transactionNo: number;
  transactionDate: Date;
  projectCode: number;
  storeCode: number;
  requestStatus: RequestStatus;
  supplierName: string;
  supplyDate?: Date;
  supplierInvoiceAttachment?: string;
  itemsPOTransactionNo?: number;
  requestedBy: number;
}

export interface StoreItemReceivableDetail {
  transactionNo: number;
  serialNo: number;
  itemCode: number;
  quantityReceived: number;
}

export interface StoreItemPayable {
  transactionNo: number;
  transactionDate: Date;
  projectCode: number;
  storeCode: number;
  requestStatus: RequestStatus;
  requestedBy: number;
}

export interface StoreItemPayableDetail {
  transactionNo: number;
  serialNo: number;
  itemCode: number;
  quantityOutGoing: number;
}

export interface StoreItemTransfer {
  transactionNo: number;
  transactionDate: Date;
  fromProjectCode: number;
  fromStoreCode: number;
  toProjectCode: number;
  toStoreCode: number;
  requestStatus: RequestStatus;
  requestedBy: number;
}

export interface StoreItemTransferDetail {
  transactionNo: number;
  serialNo: number;
  itemCode: number;
  quantityForTransfer: number;
}

export interface StoreItemBalance {
  projectCode: number;
  storeCode: number;
  itemCode: number;
  itemBalance: number;
}

export interface ReceivingTransaction {
  receiptNo: number;
  receiptDate: Date;
  itemCode: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  storeId: number;
  receivedBy: number;
}

export interface IssuingTransaction {
  issueNo: number;
  issueDate: Date;
  itemCode: number;
  quantity: number;
  projectCode: number | null;
  issuedBy: number;
}

export interface TransferTransaction {
  transferNo: number;
  transferDate: Date;
  itemCode: number;
  quantity: number;
  fromStoreId: number;
  toStoreId: number;
  status: 'PENDING' | 'COMPLETED';
  transferredBy: number;
}

// ========== Approvals & Workflow ==========
export interface ApprovalRequest {
  requestId: number;
  requestType: 'LEAVE' | 'LOAN' | 'ALLOWANCE' | 'TRANSFER' | 'PAYMENT' | 'PAYROLL' | 'MANUAL_ATTENDANCE';
  requestedBy: number;
  requestDate: Date;
  amount?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentLevel: number;
  approvedBy?: number;
  approvalDate?: Date;
  notes?: string;
}

export interface ApprovalWorkflow {
  requestType: 'VAC' | 'LOAN' | 'INCR' | 'POSTLOAN' | 'PAYROLL' | 'TRANSFER' | 'PROJECT_PAYMENT';
  level: number;
  functionCall: string;
  closeLevel: 'Y' | 'N';
  description?: string;
}

// ========== System Configuration ==========
export interface Holiday {
  serialNo: number;
  holidayType: HolidayType;
  gregYear: number;
  hijriYear: number;
  fromDate: Date;
  toDate: Date;
  numberOfDays: number;
  holidayName?: string;
  isPaid?: boolean;
  isRecurring?: boolean;
  isActive?: boolean;
  holidayIds?: number[]; // Store backend holiday IDs for deletion
}

export interface TransactionType {
  transactionCode: number;
  transactionNameAr: string;
  transactionNameEn: string;
  transactionType: 'ALLOWANCE' | 'DEDUCTION';
  isSystem: boolean;
}

export interface Notification {
  notificationId: number;
  userId: string;
  notificationType: 'OVERTIME' | 'DOCUMENT_EXPIRY' | 'APPROVAL_REQUIRED' | 'PAYMENT_DUE';
  title: string;
  message: string;
  isRead: boolean;
  createdDate: Date;
  relatedId?: number;
  priority: PriorityType;
}

export interface SystemLog {
  logId: number;
  userId: string;
  actionType: string;
  module: string;
  description: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  timestamp: Date;
  ipAddress?: string;
}

// ========== Reports & Analytics ==========
export interface EmployeeTimesheet {
  employeeId: number;
  employeeName: string;
  month: string;
  totalWorkingDays: number;
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  totalOvertimeHours: number;
  totalLateHours: number;
  totalEarlyOutHours: number;
}

export interface ExpiringDocument {
  employeeId: number;
  employeeName: string;
  documentType: 'RESIDENCE' | 'PASSPORT';
  documentNumber: string;
  issueDate: Date;
  expiryDate: Date;
  daysRemaining: number;
}

// ========== Dashboard Statistics ==========
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalProjects: number;
  activeProjects: number;
  monthlyPayroll: number;
  pendingApprovals: number;
  expiringDocuments: number;
  overtimeAlerts: number;
}

// ========== Supplier Management ==========
export interface Supplier {
  supplierId: number;
  supplierName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdDate: Date;
}

// ========== Monthly Allowances & Deductions ==========
export interface MonthlyAllowanceRecord {
  recordId: number;
  employeeId: number;
  monthYear: string;
  transactionCode: number;
  amount: number;
  description?: string;
  createdDate: Date;
}

export interface MonthlyDeductionRecord {
  recordId: number;
  employeeId: number;
  monthYear: string;
  transactionCode: number;
  amount: number;
  description?: string;
  createdDate: Date;
}

// ========== Loan Installments ==========
export interface LoanInstallmentRecord {
  installmentId: number;
  loanRequestId: number;
  employeeId: number;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  paidDate?: Date;
  status: 'PENDING' | 'PAID' | 'POSTPONED';
  postponedTo?: Date;
}

// ========== Leave Balance ==========
export interface LeaveBalance {
  employeeId: number;
  employeeName?: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  emergencyLeaveBalance: number;
  lastUpdated: Date;
}

// ========== Project Payment Process ==========
export interface ProjectPaymentProcessRecord {
  processId: number;
  requestNo: number;
  projectCode?: number;
  projectName?: string;
  supplierName?: string;
  paymentAmount?: number;
  paymentDueDate: Date;
  paymentPercentage: number;
  paidPercentage: number;
  remainPercentage: number;
  processedBy?: number;
  processedDate?: Date;
  transStatus?: 'P' | 'A' | 'R'; // P = Pending, A = Approved, R = Rejected
  isProcessed?: 'Y' | 'N'; // Y = Processed, N = Not Processed
}

// ========== Project Due Payment ==========
export interface ProjectDuePaymentRecord {
  paymentId: number;
  projectCode: number;
  projectName?: string; // From backend response
  serialNumber: number;
  dueDate: Date;
  dueAmount: number;
  paymentStatus: PaymentStatus;
  paidDate?: Date;
  paidAmount?: number;
}

// ========== Employee Contract Allowances ==========
export interface EmployeeContractAllowance {
  recordId: number;
  employeeId: number;
  transactionCode: number;
  transactionName: string;
  percentage: number;
  isActive: boolean;
  createdDate: Date;
}

// ========== Salary Allowance Percentages ==========
export interface AllowancePercentage {
  recordId: number;
  transactionCode: number;
  transactionName: string;
  saudiPercentage: number;
  nonSaudiPercentage: number;
  isActive: boolean;
}

// ========== Manual Attendance ==========
export interface ManualAttendanceRequest {
  requestId: number;
  employeeId: number;
  employeeName: string;
  attendanceDate: Date;
  entryTime: string;
  exitTime: string;
  reason: string;
  requestStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: number;
  requestedDate: Date;
  approvedBy?: number;
  approvedDate?: Date;
  rejectionReason?: string;
}

// ========== Attendance Day Closure ==========
export interface AttendanceDayClosure {
  closureId: number;
  attendanceDate: Date;
  isClosed: boolean;
  closedBy?: number;
  closedDate?: Date;
  reopenedBy?: number;
  reopenedDate?: Date;
  notes?: string;
}

// ========== Project GPS Settings ==========
export interface ProjectGPSSettings {
  projectCode: number;
  latitude: number;
  longitude: number;
  attendanceRadius: number; // in meters
  lastUpdated: Date;
  updatedBy: number;
}

