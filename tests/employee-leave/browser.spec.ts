import { test, expect, type Page } from '@playwright/test';
import type { AdminLeaveRequest, LeaveInput, LeaveStatus } from '../../src/types/leave';
type Options = { unlinked?: boolean; former?: string; permissions?: string[]; own?: boolean; status?: LeaveStatus; date?: string; fail?: number; uncertain?: boolean; slow?: boolean; balance?: boolean };
async function setup(page: Page, options: Options = {}) {
  await page.clock.install({ time: new Date('2030-10-01T09:00:00Z') });
  const calls: { path: string; method: string; company: string; body: unknown; key?: string }[] = [];
  const permissions = options.permissions ?? ['employee.self.view','employee.leave.view','employee.leave.request','employee.leave.cancel','leave.view','leave.approve','leave.manage','holiday.view','holiday.manage'];
  const company = (id: string) => ({ id, name: `Company ${id}`, modules: ['payroll'], permissions, timezone: 'Asia/Karachi', roles: [], effective_navigation: { visible_keys: ['hrm.leave'], items: [], catalog: [] } });
  const records = new Map<string, AdminLeaveRequest[]>();
  const row = (id: string): AdminLeaveRequest => ({ id: `request-${id}`, employee_id: 'employee-A', leave_type_id: 'type-A', type_name: `Rest ${id}`, is_paid: true, start_date: options.date ?? '2030-10-05', end_date: options.date ?? '2030-10-05', day_portion: 'FULL_DAY', units: 2, reason: 'Family break', status: options.status ?? 'PENDING', submitted_at: '2030-10-01T08:00:00Z', events: [], is_own_request: options.own ?? false });
  for (const id of ['A','B']) records.set(id,[row(id)]);
  let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
  let failed = false;
  const evidence: { id: string; original_filename: string; size_bytes: number; mime_type: string }[] = [];
  const holidays = [{ id: 'holiday', name: 'Foundation Day', date: '2030-10-05', description: 'Company celebration', is_active: true }];
  let available = 17;
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method(), id = request.headers()['x-company-id'] ?? 'A';
    let body: Record<string, unknown> = {};
    if (request.postData() && !request.headers()['content-type']?.includes('multipart')) body = request.postDataJSON() as Record<string, unknown>;
    calls.push({ path, method, company: id, body, key: request.headers()['idempotency-key'] });
    const respond = (json: unknown, status = 200) => route.fulfill({ json, status });
    if (path.endsWith('/auth/me')) return respond({ user: { id: 1, name: 'Employee', email: 'employee@example.invalid' }, companies: ['A','B'].map(company) });
    if (path.endsWith('/auth/switch-company')) return respond({ company: company(String(body.company_id)) });
    if (path.endsWith('/employee/me')) return respond({ linked: !options.unlinked, employee: options.unlinked ? null : { id: 'employee-A', full_name: 'Employee A', employee_code: 'EMP-A', status: options.former ?? 'active' }, self_editable: false });
    if (path.endsWith('/platform/notifications')) return respond({ unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, total: 0 } });
    if (path.endsWith('/leave/summary')) {
      if (options.slow && id === 'A') await gate;
      if (options.unlinked) return respond({ message: 'Not linked', error_code: 'EMPLOYEE_IDENTITY_NOT_LINKED' },409);
      return respond({ year: Number(url.searchParams.get('year')), data: [{ leave_type_id: 'type-A', type_name: `Rest ${id}`, allocated_units: 20, adjustment_units: 1, pending_units: 2, approved_units: 2, available_units: available }] });
    }
    if (path.endsWith('/leave/types')) return respond({ data: [{ id:'type-A', name:`Rest ${id}`, is_paid:true, is_active:true }] });
    if (path.endsWith('/leave/holidays')) {
      if (method === 'POST') { holidays.push({ ...holidays[0], ...body, id:'new' }); return respond(holidays.at(-1),201); }
      return respond({ data: holidays });
    }
    if (/\/leave\/holidays\/[^/]+$/.test(path)) { Object.assign(holidays[0],body); return respond(holidays[0]); }
    if (path.endsWith('/leave/entitlements')) return method === 'POST' ? respond({ id:'allocation', available_units: Number(body.allocated_units) },201) : respond({ data: [{ id:'allocation', leave_type_id:'type-A', type_name:'Rest A', year:2030, allocated_units:20, adjustment_units:0, pending_units:2, approved_units:1, available_units:available }] });
    if (path.endsWith('/adjustments')) { available += Number(body.delta_units); return respond({ id:'adjustment', available_units:available },201); }
    if (path.endsWith('/attachments') && method === 'GET') return respond({ data: evidence });
    if (path.endsWith('/attachments') && method === 'POST') { evidence.push({ id:'doc', original_filename:'note.txt', mime_type:'text/plain', size_bytes:4 }); return respond(evidence[0],201); }
    if (path.endsWith('/attachments/doc')) return route.fulfill({ body:'note', contentType:'text/plain' });
    const items = records.get(id)!;
    if (path.endsWith('/leave/requests') && method === 'POST') {
      if (!failed && (options.fail || options.uncertain)) { failed = true; if (options.uncertain) return route.abort('failed'); return respond({ message: options.fail === 422 ? 'Past date rejected' : 'Overlap or insufficient available entitlement', error_code: options.fail === 422 ? 'LEAVE_PAST_DATE' : options.balance ? 'LEAVE_BALANCE_INSUFFICIENT' : 'LEAVE_OVERLAP', errors: options.fail === 422 ? { start_date:['Past date rejected'] } : {} }, options.fail); }
      const created = { ...row(id), ...body as unknown as LeaveInput, id:'created', units: body.day_portion === 'FULL_DAY' ? 2 : 1 };
      items.unshift(created); return respond(created,201);
    }
    if (path.endsWith('/leave/requests')) {
      const status = url.searchParams.get('status');
      const data = items.filter(item => !status || item.status === status);
      return respond({ data, meta: { total:data.length, current_page:Number(url.searchParams.get('page') ?? 1), last_page:status === 'APPROVED' || status === 'CANCELLATION_PENDING' ? 1 : 2 } });
    }
    const action = path.split('/').at(-1);
    if (method === 'POST' && ['cancel','approve','reject','approve-cancellation','reject-cancellation'].includes(action ?? '')) {
      const target = items.find(item => path.includes(`/${item.id}/`))!;
      target.status = action === 'cancel' ? target.status === 'PENDING' ? 'CANCELLED' : 'CANCELLATION_PENDING' : action === 'approve' || action === 'reject-cancellation' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CANCELLED';
      return respond(target);
    }
    if (/\/leave\/requests\/[^/]+$/.test(path)) return respond(items.find(item => path.endsWith(`/${item.id}`)));
    return respond({ message:'Unexpected request' },500);
  });
  return { calls, release };
}
async function apply(page: Page, portion = 'FULL_DAY') {
  await page.getByRole('button',{name:'Apply for leave',exact:true}).click();
  await page.getByLabel('Leave type',{exact:true}).selectOption('type-A');
  await page.getByLabel('Day portion').selectOption(portion);
  await page.getByLabel('Start date',{exact:true}).fill('2030-10-06');
  await page.getByLabel('End date',{exact:true}).fill('2030-10-06');
  await page.getByLabel('Reason',{exact:true}).fill('Family appointment');
}
test('linked overview uses authoritative balances, API types, history and pagination', async ({page}) => {
  const {calls} = await setup(page); await page.goto('/employee/leaves');
  await expect(page.getByText('8.5 days available')).toBeVisible();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByText('Page 2 of 2', {exact:false})).toBeVisible();
  await page.getByRole('button',{name:'View request'}).click();
  await expect(page.getByText('Family break')).toBeVisible();
  expect(calls.filter(call=>call.path.includes('/leave')).every(call=>call.path.includes('/employee/leave'))).toBeTruthy();
});
for (const portion of ['FULL_DAY','FIRST_HALF','SECOND_HALF']) test(`submission ${portion} and no side effects`, async ({page}) => {
  const {calls} = await setup(page); await page.goto('/employee/leaves'); await apply(page,portion);
  await page.getByRole('button',{name:'Submit request',exact:true}).click(); await expect(page.getByText('Family appointment')).toBeVisible();
  const writes = calls.filter(call=>call.method==='POST'); expect(writes).toHaveLength(1);
  expect(writes[0].path).toBe('/api/v1/employee/leave/requests'); expect(writes[0].body).not.toHaveProperty('employee_id'); expect(writes[0].key).toBeTruthy();
});
test('multi-date half-day is prevented without client unit arithmetic', async ({page}) => {
  const {calls} = await setup(page); await page.goto('/employee/leaves'); await apply(page,'FIRST_HALF'); await page.getByLabel('End date',{exact:true}).fill('2030-10-07'); await page.getByRole('button',{name:'Submit request',exact:true}).click();
  await expect(page.getByText('Half-day leave must cover exactly one date.')).toBeVisible(); expect(calls.filter(call=>call.method==='POST')).toHaveLength(0);
});
for (const fail of [409,422]) test(`server ${fail} validation/conflict does not claim success`, async ({page}) => {
  await setup(page,{fail}); await page.goto('/employee/leaves'); await apply(page); await page.getByRole('button',{name:'Submit request',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:fail===422?'Past date rejected':'Overlap or insufficient'}).first()).toBeVisible(); await expect(page.getByRole('button',{name:'Submit request',exact:true})).toBeVisible();
});
test('uncertain retry preserves payload and idempotency key', async ({page}) => {
  const {calls} = await setup(page,{uncertain:true}); await page.goto('/employee/leaves'); await apply(page); await page.getByRole('button',{name:'Submit request',exact:true}).click();
  await expect(page.getByLabel('Reason',{exact:true})).toBeDisabled(); await page.getByRole('button',{name:'Retry same request'}).click(); await expect(page.getByText('Family appointment')).toBeVisible();
  const writes=calls.filter(call=>call.method==='POST'); expect(writes).toHaveLength(2); expect(writes[1].key).toBe(writes[0].key); expect(writes[1].body).toEqual(writes[0].body);
});
for (const former of ['resigned','terminated']) test(`${former} historical read with no mutation controls`, async ({page}) => {
  await setup(page,{former}); await page.goto('/employee/leaves'); await expect(page.getByText('8.5 days available')).toBeVisible(); await expect(page.getByRole('button',{name:'Apply for leave'})).toHaveCount(0); await page.getByRole('button',{name:'View request'}).click(); await expect(page.getByText('Family break')).toBeVisible(); await expect(page.getByRole('button',{name:'Cancel pending request'})).toHaveCount(0); await expect(page.getByLabel('Evidence file')).toHaveCount(0);
});
test('unlinked and permission-denied states are explicit', async ({page}) => {
  await setup(page,{unlinked:true}); await page.goto('/employee/leaves'); await expect(page.getByText('No employee profile is linked', {exact:false})).toBeVisible(); await expect(page.getByRole('button',{name:'Submit request'})).toHaveCount(0);
});
test('ordinary account has no leave API authority', async ({page}) => {
  const {calls} = await setup(page,{permissions:['employee.self.view']}); await page.goto('/employee/leaves'); await expect(page.getByText('Leave self-service is unavailable in this company.')).toBeVisible(); expect(calls.filter(call=>call.path.includes('/leave/'))).toHaveLength(0);
});
for (const status of ['PENDING','APPROVED'] as const) test(`${status} cancellation preserves server lifecycle and dialog keyboard`, async ({page}) => {
  await setup(page,{status}); await page.goto('/employee/leaves'); await page.getByRole('button',{name:'View request'}).click(); const button=page.getByRole('button',{name:status==='PENDING'?'Cancel pending request':'Request cancellation',exact:true}); await button.click(); await page.keyboard.press('Escape'); await expect(button).toBeFocused(); await button.click(); await page.getByRole('button',{name:'Confirm cancellation',exact:true}).click(); const requestRow = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'View request', exact: true }) }); const badge = requestRow.locator('.zs-badge'); await expect(badge).toHaveText(status === 'PENDING' ? 'CANCELLED' : 'CANCELLATION PENDING'); await expect(badge).toBeVisible(); await expect(button).toHaveCount(0);
});
test('started approved leave has no cancellation control', async ({page}) => {
  await setup(page,{status:'APPROVED',date:'2030-10-01'}); await page.goto('/employee/leaves'); await page.getByRole('button',{name:'View request'}).click(); await expect(page.getByRole('button',{name:'Request cancellation'})).toHaveCount(0);
});
test('private evidence upload and authorized download', async ({page}) => {
  const {calls}=await setup(page); await page.goto('/employee/leaves'); await page.getByRole('button',{name:'View request'}).click(); await page.getByLabel('Evidence file').setInputFiles({ name:'note.txt',mimeType:'text/plain',buffer:Buffer.from('note') }); await page.getByRole('button',{name:'Upload evidence'}).click(); await expect(page.getByText('Evidence uploaded.')).toBeVisible(); const downloaded=page.waitForEvent('download'); await page.getByRole('button',{name:'note.txt'}).click(); expect((await downloaded).suggestedFilename()).toBe('note.txt'); expect(calls.some(call=>call.path.endsWith('/attachments/doc'))).toBeTruthy();
});
test('calendar distinguishes holidays and approved leave; dashboard backed values', async ({page}) => {
  await setup(page,{status:'APPROVED'}); await page.goto('/employee/calendar'); await expect(page.getByText('Company holiday: Foundation Day')).toBeVisible(); await expect(page.getByText('Approved leave: Rest A', {exact:false}).first()).toBeVisible(); await page.getByRole('button',{name:'Holidays',exact:true}).click(); await expect(page.getByText('Company celebration')).toBeVisible(); await page.goto('/employee'); await expect(page.getByText('Rest A: 8.5 days available')).toBeVisible(); await expect(page.getByText('Next company holiday: Foundation Day', {exact:false})).toBeVisible();
});
test('company switch clears form and fences late balances', async ({page}) => {
  const {release}=await setup(page,{slow:true}); await page.goto('/employee/leaves'); await apply(page); await page.getByLabel('Active company').selectOption('B'); release(); await expect(page.getByText('Rest B',{exact:true}).first()).toBeVisible(); await expect(page.getByLabel('Reason',{exact:true})).toHaveCount(0); await expect(page.getByText('Rest A',{exact:true})).toHaveCount(0);
});
for(const own of [true,false]) test(`admin ownership ${own} uses certified boolean without employee/me`, async ({page}) => {
  const {calls}=await setup(page,{own,permissions:['leave.view','leave.approve']}); await page.goto('/hrm/leave'); await page.getByRole('button',{name:'Review request'}).click(); await expect(page.getByRole('button',{name:'approve',exact:true})).toHaveCount(own?0:1); expect(calls.some(call=>call.path.endsWith('/employee/me'))).toBeFalsy();
});
for(const action of ['approve','reject','approve cancellation','reject cancellation']) test(`admin ${action} uses dedicated decision and authoritative result`, async ({page}) => {
  const {calls}=await setup(page,{status:action.includes('cancellation')?'CANCELLATION_PENDING':'PENDING',permissions:['leave.view','leave.approve']}); await page.goto('/hrm/leave'); await page.getByRole('button',{name:'Review request'}).click(); await page.getByRole('button',{name:action,exact:true}).click(); if(action.startsWith('reject')) await page.getByLabel('Rejection reason').fill('Coverage needed'); await page.getByRole('button',{name:'Record decision',exact:true}).click(); await expect(page.getByRole('alertdialog')).toHaveCount(0); expect(calls.some(call=>call.method==='POST' && call.path.endsWith('/'+action.replaceAll(' ','-')))).toBeTruthy();
});
test('admin allocation adjustment and holiday lifecycle', async ({page}) => {
  const {calls}=await setup(page); await page.goto('/hrm/leave'); await page.getByLabel('Employee ID for entitlement').fill('employee-A'); await page.getByRole('button',{name:'Load entitlements'}).click(); await page.getByRole('button',{name:'Adjust allocation',exact:true}).click(); await page.getByLabel('Adjustment units (positive adds, negative removes)').fill('-2'); await page.getByLabel('Adjustment reason').fill('Correct entitlement'); await page.getByRole('button',{name:'Record adjustment',exact:true}).click(); await expect(page.getByText('Available 15 units',{exact:false})).toBeVisible(); await page.getByLabel('Paid leave type',{exact:true}).selectOption('type-A'); await page.getByLabel('Initial allocation (units)').fill('20'); await page.getByRole('button',{name:'Allocate',exact:true}).click(); await page.getByLabel('Holiday name',{exact:true}).fill('Local day'); await page.getByLabel('Company-local date').fill('2030-10-09'); await page.getByRole('button',{name:'Create holiday'}).click(); await expect(page.getByText('Local day · 2030-10-09', {exact:false})).toBeVisible(); await page.getByRole('button',{name:'Archive holiday'}).first().click(); await expect(page.getByText('Foundation Day · 2030-10-05 · Archived')).toBeVisible(); expect(calls.filter(call=>call.method==='POST'&&call.path.endsWith('/adjustments'))[0].key).toBeTruthy();
});
for(const width of [390,768,1440]) test(`responsive form and keyboard at ${width}`, async ({page}) => {
  await page.setViewportSize({width,height:900}); await setup(page); await page.goto('/employee/leaves'); await apply(page); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy(); await page.getByLabel('Reason',{exact:true}).focus(); await page.keyboard.press('Tab'); await expect(page.getByRole('button',{name:'Submit request',exact:true})).toBeFocused();
});

test('reserved balance conflict is kept authoritative', async ({page}) => {
  const {calls}=await setup(page,{fail:409,balance:true}); await page.goto('/employee/leaves'); await apply(page); await page.getByRole('button',{name:'Submit request',exact:true}).click();
  await expect(page.getByText('Overlap or insufficient available entitlement')).toBeVisible(); await expect(page.getByText('8.5 days available')).toBeVisible(); expect(calls.filter(call=>call.method==='POST')).toHaveLength(1);
});
test('uncertain request and sensitive contents clear on company switch', async ({page}) => {
  const {calls}=await setup(page,{uncertain:true}); await page.goto('/employee/leaves'); await apply(page); await page.getByRole('button',{name:'Submit request',exact:true}).click(); await expect(page.getByRole('button',{name:'Retry same request'})).toBeVisible(); await page.getByLabel('Active company').selectOption('B'); await expect(page.getByRole('button',{name:'Retry same request'})).toHaveCount(0); await apply(page); await page.getByRole('button',{name:'Submit request',exact:true}).click(); await expect(page.getByText('Family appointment')).toBeVisible(); const writes=calls.filter(call=>call.method==='POST'&&call.path.endsWith('/leave/requests')); expect(writes[1].company).toBe('B'); expect(writes[1].key).not.toBe(writes[0].key);
});
test('late detail cannot reappear after company switch', async ({page}) => {
  await setup(page); let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/v1/employee/leave/requests/request-A',async route=>{await gate;await route.fulfill({json:{id:'request-A',reason:'Private old-company reason',status:'PENDING',type_name:'Old company'}}).catch(()=>{});});
  await page.goto('/employee/leaves'); await page.getByRole('button',{name:'View request'}).click(); await page.getByLabel('Active company').selectOption('B'); release(); await expect(page.getByText('Rest B',{exact:true}).first()).toBeVisible(); await expect(page.getByText('Private old-company reason')).toHaveCount(0);
});
test('double-submit disabled while create is pending', async ({page}) => {
  const {calls}=await setup(page); let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
  let submitted=0;
  await page.route('**/api/v1/employee/leave/requests',async route=>{if(route.request().method()!=='POST')return route.fallback(); submitted++; await gate; return route.fallback();});
  await page.goto('/employee/leaves'); await apply(page); await page.getByRole('button',{name:'Submit request',exact:true}).click(); await expect(page.getByRole('button',{name:'Submitting…'})).toBeDisabled(); expect(submitted).toBe(1); release(); await expect(page.getByText('Family appointment')).toBeVisible(); expect(calls.filter(call=>call.method==='POST')).toHaveLength(1);
});
for(const status of [403,404,500]) test(`safe detail error ${status} does not render raw HTML`, async ({page}) => {
  await setup(page); await page.route('**/api/v1/employee/leave/requests/request-A',route=>route.fulfill({status,json:{message:'<img src=x onerror="window.leaveLeak=true">'}})); await page.goto('/employee/leaves'); await page.getByRole('button',{name:'View request'}).click(); await expect(page.getByRole('alert').filter({hasText:'<img'})).toBeVisible(); expect(await page.evaluate(()=>Reflect.get(window,'leaveLeak'))).toBeUndefined(); await expect(page.getByRole('button',{name:'Cancel pending request'})).toHaveCount(0);
});
test('401 clears the authenticated context', async ({page}) => {
  await setup(page); await page.route('**/api/v1/employee/leave/summary?*',route=>route.fulfill({status:401,json:{message:'Unauthenticated'}})); await page.goto('/employee/leaves'); await expect(page).toHaveURL(/\/login/); await expect(page.getByText('8.5 days available')).toHaveCount(0);
});
test('calendar retains approved leave while cancellation awaits a decision', async ({page}) => {
  await setup(page,{status:'CANCELLATION_PENDING'}); await page.goto('/employee/calendar'); await expect(page.getByText('Approved leave: Rest A (cancellation pending)',{exact:false})).toBeVisible();
});
for(const width of [390,768,1440]) test(`admin and calendar contain overflow at ${width}`, async ({page}) => {
  await page.setViewportSize({width,height:900}); await setup(page,{status:'APPROVED'}); await page.goto('/employee/calendar'); await expect(page.getByText('Company holiday: Foundation Day')).toBeVisible(); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy(); await page.goto('/hrm/leave'); await expect(page.getByRole('button',{name:'Review request'})).toBeVisible(); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('changing entitlement employee fences an outstanding allocation read', async ({page}) => {
  await setup(page); let release=()=>{}; const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/v1/leave/entitlements?*',async route=>{await gate;await route.fulfill({json:{data:[{id:'old-allocation',type_name:'Private old allocation',allocated_units:8,adjustment_units:0,pending_units:0,approved_units:0,available_units:8}]}}).catch(()=>{});});
  await page.goto('/hrm/leave'); await page.getByLabel('Employee ID for entitlement').fill('old-employee'); await page.getByRole('button',{name:'Load entitlements'}).click(); await page.getByLabel('Employee ID for entitlement').fill('new-employee'); release(); await expect(page.getByText('Private old allocation',{exact:false})).toHaveCount(0);
});

test('leave type create rename and archive use certified administrative payloads', async ({page}) => {
  await setup(page); const types=[{id:'type-A',name:'Rest A',is_paid:true,is_active:true}]; const payloads:unknown[]=[];
  await page.route('**/api/v1/leave/types**',async route=>{const req=route.request();if(req.method()==='GET')return route.fulfill({json:{data:types}});const body=req.postDataJSON() as {name?:string;is_paid?:boolean;is_active?:boolean};payloads.push(body);if(req.method()==='POST'){types.push({id:'new-type',name:body.name!,is_paid:body.is_paid!,is_active:true});return route.fulfill({status:201,json:types.at(-1)});}Object.assign(types[0],body);return route.fulfill({json:types[0]});});
  await page.goto('/hrm/leave'); await page.getByLabel('Type name',{exact:true}).fill('Special Rest'); await page.getByRole('button',{name:'Create type',exact:true}).click(); await expect(page.getByText('Special Rest · Paid · Active')).toBeVisible(); await page.getByRole('button',{name:'Rename',exact:true}).first().click(); await page.getByLabel('Type name',{exact:true}).fill('Renamed Rest'); await page.getByRole('button',{name:'Save type name'}).click(); await expect(page.getByText('Renamed Rest · Paid · Active')).toBeVisible(); await page.getByRole('button',{name:'Archive type'}).first().click(); await expect(page.getByText('Renamed Rest · Paid · Archived')).toBeVisible(); expect(payloads).toEqual([{name:'Special Rest',is_paid:true},{name:'Renamed Rest'},{is_active:false}]);
});
test('uncertain adjustment retains its original key and integer payload', async ({page}) => {
  await setup(page); const attempts:{key:string|undefined;body:unknown}[]=[];
  await page.route('**/api/v1/leave/entitlements/allocation/adjustments',route=>{attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});return attempts.length===1?route.abort('failed'):route.fulfill({status:200,json:{id:'adjustment',delta_units:-1,available_units:16}});});
  await page.goto('/hrm/leave'); await page.getByLabel('Employee ID for entitlement').fill('employee-A'); await page.getByRole('button',{name:'Load entitlements'}).click(); await page.getByRole('button',{name:'Adjust allocation',exact:true}).click(); await page.getByLabel('Adjustment units (positive adds, negative removes)').fill('-1'); await page.getByLabel('Adjustment reason').fill('Correct entitlement'); await page.getByRole('button',{name:'Record adjustment',exact:true}).click(); await expect(page.getByLabel('Adjustment reason')).toBeDisabled(); await page.getByRole('button',{name:'Retry same adjustment'}).click(); await expect(page.getByText('Adjustment recorded.',{exact:false})).toBeVisible(); expect(attempts).toHaveLength(2); expect(attempts[1]).toEqual(attempts[0]); expect(attempts[0].key).toBeTruthy();
});
