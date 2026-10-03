import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { leaveDays, leaveDecisions } from '../../src/lib/leave';
import type { AdminLeaveRequest } from '../../src/types/leave';
test('half-day presentation preserves signed integer units', () => {
  expect([0,1,2,3,-1,-3,10000].map(leaveDays)).toEqual(['0','0.5','1','1.5','-0.5','-1.5','5000']);
  expect(leaveDays(1.25)).toBe('Unavailable');
});
test('certified ownership exclusively controls admin decisions, missing values fail closed', () => {
  const request = { status: 'PENDING', is_own_request: false, start_date: '2030-10-05' } as AdminLeaveRequest;
  expect(leaveDecisions(request, true, '2030-10-01')).toEqual(['approve','reject']);
  for (const is_own_request of [true, undefined, null]) expect(leaveDecisions({ ...request, is_own_request } as AdminLeaveRequest, true, '2030-10-01')).toEqual([]);
  expect(leaveDecisions(request, false, '2030-10-01')).toEqual([]);
  expect(leaveDecisions({ ...request, status: 'CANCELLATION_PENDING' }, true, '2030-10-05')).toEqual(['reject-cancellation']);
  expect(leaveDecisions({ ...request, status: 'CANCELLATION_PENDING' }, true, '2030-10-01')).toEqual(['approve-cancellation','reject-cancellation']);
});
test('Leave repositories enforce self/admin and Attendance Payroll Accounting firewalls', () => {
  const self = readFileSync('src/services/employeeLeave.repository.ts','utf8');
  const admin = readFileSync('src/services/adminLeave.repository.ts','utf8');
  expect(self).toContain("const root = '/employee/leave'");
  expect(admin).toContain("const root = '/leave'");
  expect(self).not.toMatch(/employee_id|payroll|attendance|accounting|banking|inventory|journal|\/platform/);
  expect(admin).not.toMatch(/employee\/me|payroll|attendance|accounting|banking|inventory|journal/);
  for (const path of ['src/pages/employee/EmployeeLeaves.vue','src/pages/HrmLeave.vue','src/components/leave/LeaveDetail.vue','src/components/leave/LeaveDashboard.vue','src/components/leave/LeaveCalendar.vue', 'src/composables/useLeaveContext.ts']) {
    const content = readFileSync(path,'utf8');
    expect(content).not.toMatch(/employee-data|mock-data|v-html|localStorage|sessionStorage|https:\/\//);
  }
  const adminPage = readFileSync('src/pages/HrmLeave.vue','utf8');
  expect(adminPage).not.toMatch(/employee\/me|identityRepository|useEmployeePortalStore|currentUser|actor_id/);
  expect(adminPage).toContain('leaveDecisions(detail.value');
});

test('leave navigation retains Stage 16A effective visibility and exact permission', async () => {
  const { navigationForModules, permissionForPath } = await import('../../src/lib/nav');
  const effective = (visible_keys: string[]) => ({ visible_keys, catalog: [], items: [] });
  const paths = (permissions: string[], keys: string[]) => JSON.stringify(navigationForModules(['payroll'], false, permissions, effective(keys)));
  expect(permissionForPath('/hrm/leave')).toBe('leave.view');
  expect(paths(['leave.view'], ['hrm.leave'])).toContain('/hrm/leave');
  expect(paths(['payroll.view'], ['hrm.leave'])).not.toContain('/hrm/leave');
  expect(paths(['*'], [])).not.toContain('/hrm/leave');
});
