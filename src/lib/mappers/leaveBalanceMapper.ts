// Leave Balance Data Mapper
// Maps between backend LeaveBalanceDetailsResponse and frontend LeaveBalance types

import type { LeaveBalance } from '@/types';
import type { LeaveBalanceDetailsResponse } from '@/lib/api/leaves';

/**
 * Map backend LeaveBalanceDetailsResponse to frontend LeaveBalance type
 */
export function mapLeaveBalanceResponseToLeaveBalance(
  response: LeaveBalanceDetailsResponse
): LeaveBalance {
  return {
    employeeId: response.employeeNo,
    employeeName: response.employeeName,
    annualLeaveBalance: Number(response.annualLeaveBalance),
    sickLeaveBalance: Number(response.sickLeaveBalance),
    emergencyLeaveBalance: Number(response.emergencyLeaveBalance),
    lastUpdated: response.lastUpdated ? new Date(response.lastUpdated) : new Date(),
  };
}

/**
 * Map a list of backend LeaveBalanceDetailsResponse to a list of frontend LeaveBalance
 */
export function mapLeaveBalanceResponseListToLeaveBalanceList(
  responses: LeaveBalanceDetailsResponse[]
): LeaveBalance[] {
  return responses.map(mapLeaveBalanceResponseToLeaveBalance);
}

