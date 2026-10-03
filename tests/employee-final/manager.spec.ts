import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, options: { permissions?: string[]; modules?: string[]; hidden?: boolean; manager?: string | null } = {}) {
  const calls: { path: string; method: string; company: string; body: any }[] = [];
  const records: Record<string, {employee_id:string;manager_employee_id:string|null;version:number}> = {
    A: { employee_id: 'employee-A', manager_employee_id: options.manager === undefined ? 'manager-A' : options.manager, version: 7 },
    B: { employee_id: 'employee-B', manager_employee_id: 'manager-B', version: 11 },
  };
  const company = (id: string) => ({ id, name: `Company ${id}`, timezone: 'Asia/Karachi', modules: options.modules ?? ['payroll'], permissions: options.permissions ?? ['teams.view', 'teams.manage'], roles: [], effective_navigation: {visible_keys: options.hidden ? [] : ['hrm.teams'], items: [], catalog: []} });
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method(), id = request.headers()['x-company-id'] ?? 'A';
    const body = request.postData() ? request.postDataJSON() : {};
    calls.push({path, method, company:id, body});
    if (path.endsWith('/auth/me')) return route.fulfill({json:{user:{id:1,name:'Admin',email:'manager@example.invalid',is_platform_admin:true},companies:['A','B'].map(company)}});
    if (path.endsWith('/auth/switch-company')) return route.fulfill({json:{company:company(body.company_id)}});
    if (path.endsWith('/platform/notifications')) return route.fulfill({json:{unread_count:0,notifications:{data:[],total:0,current_page:1,last_page:1}}});
    if (path.endsWith('/hrm/teams')) return route.fulfill({json:{data:[],meta:{total:0,current_page:1,last_page:1}}});
    if (/\/hrm\/employees\/[^/]+\/manager$/.test(path)) {
      if (method === 'PATCH') records[id] = {employee_id:records[id]!.employee_id,manager_employee_id:body.manager_employee_id,version:records[id]!.version+1};
      return route.fulfill({json:{...records[id],salary:'PRIVATE_SENTINEL',address:'PRIVATE_SENTINEL',user:{email:'PRIVATE_SENTINEL'}}});
    }
    return route.fulfill({status:403,json:{message:'Unavailable'}});
  });
  return {calls,records};
}
async function load(page:Page, employee='employee-A') {
  await page.getByLabel('Employee UUID',{exact:true}).fill(employee);
  await page.getByRole('button',{name:'Load manager',exact:true}).click();
  await expect(page.getByRole('definition').filter({hasText:employee})).toBeVisible();
}
async function submit(page:Page, manager:string) {
  await page.getByLabel('Manager employee UUID (blank clears manager)',{exact:true}).fill(manager);
  await page.getByRole('button',{name:'Review manager change',exact:true}).click();
  await page.getByRole('button',{name:'Confirm manager change',exact:true}).click();
}
const current=(page:Page)=>page.getByRole('definition');
test('manager GET precedes editing, PATCH uses N and consumes returned version, clear uses next version',async({page})=>{
  const {calls}=await setup(page);await page.goto('/hrm/teams');
  await expect(page.getByLabel('Manager employee UUID (blank clears manager)',{exact:true})).toHaveCount(0);
  await load(page);await expect(current(page).filter({hasText:'manager-A'})).toBeVisible();await expect(page.getByText('PRIVATE_SENTINEL',{exact:false})).toHaveCount(0);
  await submit(page,'manager-new');await expect(page.getByText('Manager relationship saved.',{exact:true})).toBeVisible();await expect(current(page).filter({hasText:'manager-new'})).toBeVisible();
  await submit(page,'');await expect(current(page).filter({hasText:'No manager assigned'})).toBeVisible();
  const managerCalls=calls.filter(c=>c.path.endsWith('/manager'));expect(managerCalls.map(c=>c.method)).toEqual(['GET','PATCH','PATCH']);expect(managerCalls[1]!.body).toEqual({manager_employee_id:'manager-new',version:7});expect(managerCalls[2]!.body).toEqual({manager_employee_id:null,version:8});
  expect(calls.some(c=>c.path.includes('/employee/me')||c.path.includes('/directory')||c.path.includes('/payroll'))).toBe(false);
});
test('null manager has authoritative version and teams.view is read only',async({page})=>{
  const {calls}=await setup(page,{permissions:['teams.view'],manager:null});await page.goto('/hrm/teams');await load(page);await expect(current(page).filter({hasText:'No manager assigned'})).toBeVisible();await expect(current(page).filter({hasText:/^7$/})).toBeVisible();await expect(page.getByRole('button',{name:'Review manager change'})).toHaveCount(0);expect(calls.some(c=>c.method==='PATCH')).toBe(false);
});
for(const options of [{permissions:[]},{permissions:['teams.manage']},{modules:[]}])test(`manager platform admin has no permission/entitlement bypass ${JSON.stringify(options)}`,async({page})=>{
  const {calls}=await setup(page,options);await page.goto('/hrm/teams');await expect(page).not.toHaveURL(/\/hrm\/teams$/);expect(calls.some(c=>c.path.endsWith('/manager'))).toBe(false);
});
test('manager hidden presentation retains authorized direct route',async({page})=>{
  await setup(page,{hidden:true});
  await page.goto('/hrm/teams');
  await load(page);
  await expect(page).toHaveURL(/\/hrm\/teams$/);
  await expect(current(page).filter({hasText:'manager-A'})).toBeVisible();
  // Presentation visibility applies to the sidebar, not the current-page breadcrumb.
  const sidebar = page.getByRole('complementary').getByRole('navigation');
  await expect(sidebar.locator('a[href="/hrm/teams"]')).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Teams',exact:true})).toHaveAttribute('href','/hrm/teams');
});
test('manager conflict reloads GET without replay and fresh intent uses latest version',async({page})=>{
  const {records,calls}=await setup(page);let attempts=0;await page.route('**/hrm/employees/employee-A/manager',route=>{
    if(route.request().method()!=='PATCH')return route.fallback();attempts++;
    if(attempts>1)return route.fallback();records.A={employee_id:'employee-A',manager_employee_id:'competing-manager',version:19};return route.fulfill({status:409,json:{message:'Manager changed',error_code:'TEAM_VERSION_STALE'}});
  });await page.goto('/hrm/teams');await load(page);await submit(page,'proposed');await expect(page.getByRole('alert').filter({hasText:'Manager changed'})).toBeVisible();await expect(current(page).filter({hasText:'competing-manager'})).toBeVisible();await expect(page.getByText('Manager relationship saved.',{exact:true})).toHaveCount(0);expect(attempts).toBe(1);expect(calls.filter(c=>c.path.endsWith('/manager')&&c.method==='GET')).toHaveLength(2);
  await submit(page,'fresh-intent');await expect(current(page).filter({hasText:'fresh-intent'})).toBeVisible();expect(calls.find(c=>c.method==='PATCH')!.body.version).toBe(19);
});
for(const method of ['GET','PATCH'])test(`manager late ${method} and company clearing`,async({page})=>{
  await setup(page);
  const requests: {method:string;company:string|undefined;path:string}[]=[];
  page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if (/\/hrm\/employees\/[^/]+\/manager$/.test(path)) requests.push({method:request.method(),company:request.headers()['x-company-id'],path});
  });
  let release=()=>{},finish=()=>{},releaseSwitch=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const completed=new Promise<void>(resolve=>{finish=resolve;});
  const switchGate=new Promise<void>(resolve=>{releaseSwitch=resolve;});
  let started=false;
  if(method==='PATCH'){await page.goto('/hrm/teams');await load(page);}
  await page.route('**/hrm/employees/employee-A/manager',async route=>{
    if(route.request().method()!==method)return route.fallback();
    started=true;await gate;
    try{await route.fallback();}catch{/* Switching aborts the original browser request. */}finally{finish();}
  });
  await page.route('**/auth/switch-company',async route=>{await switchGate;await route.fallback();});
  if(method==='GET'){
    await page.goto('/hrm/teams');await page.getByLabel('Employee UUID',{exact:true}).fill('employee-A');await page.getByRole('button',{name:'Load manager',exact:true}).click();
  }else await submit(page,'old-intent');
  await expect.poll(()=>started).toBe(true);
  const company=page.getByLabel('Active company');
  await company.selectOption('B');
  // Prove clearing at switch start, before the new company response is accepted.
  await expect(company).toBeDisabled();
  await expect(page.getByLabel('Employee UUID',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Manager employee UUID (blank clears manager)',{exact:true})).toHaveCount(0);
  await expect(current(page)).toHaveCount(0);
  releaseSwitch();
  await expect(company).toBeEnabled();
  await expect(company).toHaveValue('B');
  // Establish B while A is still held, then deliver A's stale completion.
  const responseB=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/hrm/employees/employee-B/manager'&&response.request().method()==='GET');
  await load(page,'employee-B');
  const response=await responseB;
  expect(response.request().headers()['x-company-id']).toBe('B');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({employee_id:'employee-B',manager_employee_id:'manager-B',version:11});
  await expect(current(page).filter({hasText:/^manager-B$/})).toBeVisible();
  await expect(current(page).filter({hasText:/^11$/})).toBeVisible();
  release();await completed;
  await expect(page.getByLabel('Employee UUID',{exact:true})).toHaveValue('employee-B');
  await expect(page.getByLabel('Manager employee UUID (blank clears manager)',{exact:true})).toHaveValue('manager-B');
  await expect(current(page).filter({hasText:/^employee-B$/})).toBeVisible();
  await expect(current(page).filter({hasText:/^manager-B$/})).toBeVisible();
  await expect(current(page).filter({hasText:/^11$/})).toBeVisible();
  await expect(current(page).filter({hasText:/^(employee-A|7|8|manager-A|old-intent)$/})).toHaveCount(0);
  await expect(page.getByText('Manager relationship saved.',{exact:true})).toHaveCount(0);
  expect(requests).toEqual([
    {method:'GET',company:'A',path:'/api/v1/hrm/employees/employee-A/manager'},
    ...(method==='PATCH'?[{method:'PATCH',company:'A',path:'/api/v1/hrm/employees/employee-A/manager'}]:[]),
    {method:'GET',company:'B',path:'/api/v1/hrm/employees/employee-B/manager'},
  ]);
});
for(const width of [390,768,1440])test(`manager keyboard dialog focus and layout ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await setup(page);await page.goto('/hrm/teams');await load(page);
  await page.getByLabel('Manager employee UUID (blank clears manager)',{exact:true}).fill('next-manager');const review=page.getByRole('button',{name:'Review manager change',exact:true});await review.focus();await page.keyboard.press('Enter');await expect(page.getByRole('alertdialog')).toBeVisible();await page.keyboard.press('Escape');await expect(review).toBeFocused();await expect(current(page).filter({hasText:'manager-A'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
