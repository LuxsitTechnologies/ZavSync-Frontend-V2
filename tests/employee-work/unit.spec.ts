import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { workActions, workWritable } from '../../src/lib/work';
import { navigationForModules, permissionForPath, moduleForPath, presentationKeyForRoute } from '../../src/lib/nav';
test('certified task and ticket transition matrix', () => {
  expect(['ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s=>workActions('tasks',s,false))).toEqual([['start'],['complete'],[],[]]);
  expect(['ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s=>workActions('tasks',s,true))).toEqual([['start','cancel'],['complete','cancel'],['reopen'],[]]);
  expect(['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s=>workActions('tickets',s,false))).toEqual([['close'],['close'],['close'],[]]);
  expect(['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s=>workActions('tickets',s,true))).toEqual([['start','close'],['resolve','close'],['close','reopen'],['reopen']]);
  expect(workActions('tasks','UNKNOWN',true)).toEqual([]);
});
test('append only evidence has exact open state policy', () => {
  expect(['ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s=>workWritable('tasks',s))).toEqual([true,true,false,false]);
  expect(['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s=>workWritable('tickets',s))).toEqual([true,true,true,false]);
});
test('navigation permissions and commercial gates are independent of CRM and presentation', () => {
  for (const [path,permission] of Object.entries({'/employee/tasks':'employee.tasks.view','/employee/tickets':'employee.tickets.view','/hrm/tasks':'tasks.view','/hrm/tickets':'tickets.view'})) {
    expect(permissionForPath(path)).toBe(permission); expect(moduleForPath(path)).toBe('payroll');
  }
  expect(presentationKeyForRoute['/hrm/tasks']).toBe('hrm.tasks'); expect(presentationKeyForRoute['/hrm/tickets']).toBe('hrm.tickets');
  const effective = {visible_keys:['hrm.tasks','hrm.tickets'],items:[],catalog:[]};
  expect(JSON.stringify(navigationForModules(['payroll'],true,[],effective))).not.toContain('/hrm/tasks');
  expect(JSON.stringify(navigationForModules([],true,['tasks.view'],effective))).not.toContain('/hrm/tasks');
  expect(JSON.stringify(navigationForModules(['payroll'],false,['tasks.view'],effective))).toContain('/hrm/tasks');
  expect(JSON.stringify(navigationForModules(['payroll'],false,['tasks.view'],{...effective,visible_keys:[]}))).not.toContain('/hrm/tasks');
  expect(presentationKeyForRoute['/crm/tasks']).toBe('crm.tasks');
  const sidebar=readFileSync('src/components/employee/PortalSidebar.vue','utf8');
  for(const key of ['employee.tasks','employee.tickets']) expect(sidebar).toContain(`navigation: "${key}"`);
  expect(sidebar).toContain('effective_navigation?.visible_keys.includes(item.navigation)');
});
test('self/admin repositories and UI preserve privacy and domain firewalls', () => {
  const self=readFileSync('src/services/employeeWork.repository.ts','utf8'),admin=readFileSync('src/services/adminWork.repository.ts','utf8');
  expect(self).toContain('`/employee/${kind}`'); expect(admin).toContain('`/${kind}`');
  expect(self).not.toMatch(/employee_id|assigned_employee_id/);
  for(const s of [self,admin]) expect(s).not.toMatch(/payroll|attendance|leave|accounting|banking|inventory|crm|\/platform\/documents|employee\/me/);
  for(const path of ['src/components/work/WorkSurface.vue','src/components/work/WorkEvidence.vue','src/components/work/WorkDashboard.vue','src/composables/useWorkContext.ts']) {
    expect(readFileSync(path,'utf8')).not.toMatch(/v-html|localStorage|sessionStorage|console\.|employee-data|mock-data|storage_key|storage_path|https:\/\//);
  }
  expect(readFileSync('src/pages/HrmWork.vue','utf8')).not.toMatch(/employeePortal|identity|employee\/me/);
});
