import type { AttendanceTransaction, LeaveRequest, TimeSchedule } from '@/types';

export const mockTimeSchedules: TimeSchedule[] = [
  { departmentCode: 1, requiredHours: 8, entryTime: '09:00', exitTime: '17:00' },
  { departmentCode: 2, requiredHours: 8, entryTime: '09:00', exitTime: '17:00' },
  { departmentCode: 3, requiredHours: 8, entryTime: '09:00', exitTime: '18:00' },
  { departmentCode: 4, requiredHours: 9, entryTime: '07:00', exitTime: '16:00' },
  { departmentCode: 4, requiredHours: 9, entryTime: '07:00', exitTime: '16:00' },
  { departmentCode: 5, requiredHours: 9, entryTime: '07:00', exitTime: '16:00' },
  { departmentCode: 6, requiredHours: 9, entryTime: '07:00', exitTime: '16:00' },
  { departmentCode: 7, requiredHours: 8, entryTime: '09:00', exitTime: '17:00' },
];

// Generate attendance data for current month
const generateAttendanceForMonth = (year: number, month: number): AttendanceTransaction[] => {
  const attendance: AttendanceTransaction[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let transactionId = 50001;

  // Employee IDs to generate attendance for
  const employeeIds = [1001, 1002, 1005, 1006, 1010, 1011, 1020, 1021, 1025, 1026, 1030, 1035];

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay();

    // Skip Fridays and Saturdays (weekend)
    if (dayOfWeek === 5) continue;

    for (const empId of employeeIds) {
      // Random absence (5% chance)
      const isAbsent = Math.random() < 0.05;

      // Random variations in entry and exit times
      const entryHour = empId < 1020 ? 9 : 7;
      const exitHour = empId < 1020 ? 17 : 16;

      const entryMinutes = Math.floor(Math.random() * 30) - 10; // -10 to +20 minutes
      const exitMinutes = Math.floor(Math.random() * 60) - 10; // -10 to +50 minutes

      const entryTime = `${entryHour.toString().padStart(2, '0')}:${Math.max(0, entryMinutes).toString().padStart(2, '0')}`;
      const exitTime = `${(exitHour + Math.floor(Math.abs(exitMinutes) / 60)).toString().padStart(2, '0')}:${(Math.abs(exitMinutes) % 60).toString().padStart(2, '0')}`;

      // Calculate working hours
      const entryInMinutes = entryHour * 60 + Math.max(0, entryMinutes);
      const exitInMinutes = (exitHour + Math.floor(Math.abs(exitMinutes) / 60)) * 60 + (Math.abs(exitMinutes) % 60);
      const workingMinutes = exitInMinutes - entryInMinutes;
      const workingHours = `${Math.floor(workingMinutes / 60).toString().padStart(2, '0')}:${(workingMinutes % 60).toString().padStart(2, '0')}`;

      // Calculate overtime (if working more than scheduled)
      const scheduledMinutes = empId < 1020 ? 480 : 540; // 8 or 9 hours
      const overtimeMinutes = Math.max(0, workingMinutes - scheduledMinutes);
      const overtimeCalc = overtimeMinutes > 0 ? `${Math.floor(overtimeMinutes / 60).toString().padStart(2, '0')}:${(overtimeMinutes % 60).toString().padStart(2, '0')}` : '00:00';

      // Calculate delays
      const expectedEntry = empId < 1020 ? 540 : 420; // 9:00 or 7:00 in minutes
      const delayMinutes = Math.max(0, entryInMinutes - expectedEntry);
      const delayedCalc = delayMinutes > 0 ? `${Math.floor(delayMinutes / 60).toString().padStart(2, '0')}:${(delayMinutes % 60).toString().padStart(2, '0')}` : '00:00';

      // Calculate early out
      const expectedExit = empId < 1020 ? 1020 : 960; // 17:00 or 16:00 in minutes
      const earlyOutMinutes = Math.max(0, expectedExit - exitInMinutes);
      const earlyOutCalc = earlyOutMinutes > 0 ? `${Math.floor(earlyOutMinutes / 60).toString().padStart(2, '0')}:${(earlyOutMinutes % 60).toString().padStart(2, '0')}` : '00:00';

      attendance.push({
        transactionId: transactionId++,
        employeeId: empId,
        attendanceDate: currentDate,
        entryTime: isAbsent ? '00:00' : entryTime,
        exitTime: isAbsent ? '00:00' : exitTime,
        scheduledHours: empId < 1020 ? '08:00' : '09:00',
        workingHours: isAbsent ? '00:00' : workingHours,
        overtimeCalc: isAbsent ? '00:00' : overtimeCalc,
        delayedCalc: isAbsent ? '00:00' : delayedCalc,
        earlyOutCalc: isAbsent ? '00:00' : earlyOutCalc,
        shortageHours: '00:00',
        absenceFlag: isAbsent ? 'Y' : 'N',
        projectCode: empId >= 1020 ? 1001 : undefined,
        locationLat: 24.7136 + (Math.random() * 0.01 - 0.005),
        locationLong: 46.6753 + (Math.random() * 0.01 - 0.005),
        notes: isAbsent ? 'Absent' : undefined,
        isAutoCheckout: 'N',
        isManualEntry: 'N',
        isWeekendWork: 'N',
        isHolidayWork: 'N',
      });
    }
  }

  return attendance;
};

export const mockAttendance: AttendanceTransaction[] = generateAttendanceForMonth(2025, 11); // November 2025

// Export alias for compatibility
export const mockAttendanceRecords = mockAttendance;

export const mockLeaveRequests: LeaveRequest[] = [
  {
    requestId: 3001,
    employeeId: 1006,
    leaveType: 'Annual Leave',
    fromDate: new Date('2025-12-15'),
    toDate: new Date('2025-12-22'),
    numberOfDays: 8,
    reason: 'Family vacation',
    status: 'NEW',
    requestDate: new Date('2025-11-20'),
    nextApproval: 1005,
    nextLevel: 1,
  },
  {
    requestId: 3002,
    employeeId: 1011,
    leaveType: 'Annual Leave',
    fromDate: new Date('2025-12-01'),
    toDate: new Date('2025-12-05'),
    numberOfDays: 5,
    reason: 'Personal matters',
    status: 'APPROVED',
    requestDate: new Date('2025-11-15'),
  },
  {
    requestId: 3003,
    employeeId: 1026,
    leaveType: 'Sick Leave',
    fromDate: new Date('2025-11-25'),
    toDate: new Date('2025-11-27'),
    numberOfDays: 3,
    reason: 'Medical treatment',
    status: 'NEW',
    requestDate: new Date('2025-11-24'),
    nextApproval: 1025,
    nextLevel: 1,
  },
  {
    requestId: 3004,
    employeeId: 1021,
    leaveType: 'Annual Leave',
    fromDate: new Date('2025-12-20'),
    toDate: new Date('2025-12-31'),
    numberOfDays: 12,
    reason: 'End of year vacation',
    status: 'INPROCESS',
    requestDate: new Date('2025-11-18'),
    nextApproval: 1020,
    nextLevel: 2,
  },
  {
    requestId: 3005,
    employeeId: 1030,
    leaveType: 'Emergency Leave',
    fromDate: new Date('2025-11-28'),
    toDate: new Date('2025-11-29'),
    numberOfDays: 2,
    reason: 'Family emergency',
    status: 'REJECTED',
    requestDate: new Date('2025-11-27'),
  },
];

