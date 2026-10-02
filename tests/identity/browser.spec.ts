import { test,expect,type Page } from '@playwright/test';
const observed=new WeakMap<Page,{path:string}[]>();
const account={id:1,name:'Account name',email:'account@example.invalid',email_verified:true};
const employee=(id:string,status='active')=>({id,employee_code:`CODE-${id}`,full_name:`Employee ${id}`,email:`${id}@example.invalid`,phone:'123',department:'Operations',designation:'Analyst',employment_type:'full_time',status,joining_date:'2020-01-01',leaving_date:null,location:'Lahore',base_salary:'SENSITIVE-SALARY',employee_bank_reference:'SENSITIVE-BANK'});
async function setup(page:Page, opts:{permissions?:string[];status?:string;failName?:boolean;failLink?:boolean;lateEmployee?:boolean;lateOptions?:boolean;passwordError?:boolean;passwordValidation?:boolean;slowPassword?:boolean}={}) {
 const calls:{path:string;method:string;company:string;body:any;query:URLSearchParams}[]=[];
 observed.set(page,calls);
 const permissions=opts.permissions??['employee.self.view','employee.links.manage','platform.users.view'];
 const company=(id:string)=>({id,name:`Company ${id}`,roles:[],permissions,modules:[],effective_navigation:{catalog:[],items:[],visible_keys:[]}});
 let profile={...account},linked=false,release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method(),id=req.headers()['x-company-id']??'A';
  calls.push({path,method,company:id,body:req.postDataJSON(),query:url.searchParams});
  const respond=(json:unknown,status=200)=>route.fulfill({json,status});
  if(path.endsWith('/auth/me'))return respond({user:{...profile,is_platform_admin:true},companies:['A','B','C'].map(company)});
  if(path.endsWith('/auth/switch-company'))return respond({company:company(req.postDataJSON().company_id)});
  if(path.includes('notifications'))return respond({notifications:{data:[]},unread_count:0});
  if(path.endsWith('/auth/profile')) {
   if(method==='PATCH'){if(opts.failName)return respond({message:'Name invalid',errors:{name:['Choose a valid name']}},422);profile.name=req.postDataJSON().name;}
   return respond(profile);
  }
  if(path.endsWith('/auth/change-password')) {
   if(opts.slowPassword)await gate;
   if(opts.passwordValidation)return respond({message:'Password validation failed',errors:{password:['The password confirmation does not match.']}},422);
   return opts.passwordError?respond({message:'Check password',errors:{current_password:['The current password is incorrect.']}},422):respond(profile);
  }
  if(path.endsWith('/employee/me')) {
   if(opts.lateEmployee&&id==='A')await gate;
   return respond({linked:id!=='C',employee:id==='C'?null:employee(id,opts.status),self_editable:false});
  }
  if(path.endsWith('/employee-link-options')) {
   if(opts.lateOptions&&id==='A')await gate;
   const n=url.searchParams.get('page')??'1',search=url.searchParams.get('search')??'';
   return respond({data:[{id:`${id}-candidate`,employee_code:`${id}-${n}`,full_name:search||`Candidate ${id}`,status:'terminated',linked,available:!linked},{id:`${id}-used`,employee_code:'USED',full_name:'Already assigned',status:'resigned',linked:true,available:false}],meta:{current_page:Number(n),last_page:2,total:26}});
  }
  if(path.endsWith('/employee-link')) {
   if(method==='PUT'){if(opts.failLink)return respond({message:'Unlink the current employee before linking another.'},409);linked=true;}
   if(method==='DELETE')linked=false;
   return respond({membership_id:1,employee_id:linked?`${id}-candidate`:null,linked});
  }
  return respond({message:'Unexpected request'},500);
 });
 return {calls,release};
}
test.afterEach(async({page})=>{expect((observed.get(page)??[]).filter(c=>c.path.includes('/payroll')),'Identity screens must never call Payroll APIs').toEqual([]);});
async function openProfile(page:Page){await page.goto('/profile');await expect(page.getByLabel('Account name',{exact:true})).toHaveValue('Account name');}
async function fillPasswords(page:Page){await page.getByLabel('Current password',{exact:true}).fill('current-synthetic');await page.getByLabel('New password',{exact:true}).fill('new-synthetic-password');await page.getByLabel('Confirm new password',{exact:true}).fill('new-synthetic-password');}
test('account name update is narrow; email and employee fields are read-only and private',async({page})=>{
 const {calls}=await setup(page);await openProfile(page);
 await expect(page.getByText('Employee A',{exact:true})).toBeVisible();
 await page.getByLabel('Account name',{exact:true}).fill('Updated account');await page.getByRole('button',{name:'Save account name',exact:true}).click();
 await expect(page.getByText('Account name saved.')).toBeVisible();
 expect(calls.find(c=>c.method==='PATCH')?.body).toEqual({name:'Updated account'});
 await expect(page.locator('input[type=email]')).toHaveCount(0);
 await expect(page.getByText(/SENSITIVE-/)).toHaveCount(0);
 expect(calls.some(c=>c.path.includes('/payroll'))).toBe(false);
});
test('failed name update restores last authoritative name',async({page})=>{
 await setup(page,{failName:true});await openProfile(page);await page.getByLabel('Account name',{exact:true}).fill('Changed');await page.getByRole('button',{name:'Save account name'}).click();
 await expect(page.getByRole('alert').first()).toContainText('Name invalid');await expect(page.getByLabel('Account name',{exact:true})).toHaveValue('Account name');
});
for(const status of ['terminated','resigned'])test(`${status} identity stays readable without global suspension`,async({page})=>{
 await setup(page,{status});await openProfile(page);await expect(page.getByText(status,{exact:true})).toBeVisible();await expect(page.getByText('This employment record remains readable.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:/edit employee|save employee/i})).toHaveCount(0);
});
test('A to B to C clears identity and shows unlinked state without reload',async({page})=>{
 await setup(page);await openProfile(page);await expect(page.getByText('Employee A',{exact:true})).toBeVisible();await page.getByLabel('Active company').selectOption('B');await expect(page.getByText('Employee B',{exact:true})).toBeVisible();await expect(page.getByText('Employee A',{exact:true})).toHaveCount(0);await page.getByLabel('Active company').selectOption('C');await expect(page.getByText('No employee profile linked.',{exact:false})).toBeVisible();await expect(page.getByText('Employee B',{exact:true})).toHaveCount(0);
});
test('late self response cannot overwrite new company',async({page})=>{
 const {release}=await setup(page,{lateEmployee:true});await openProfile(page);await page.getByLabel('Active company').selectOption('B');await expect(page.getByText('Employee B',{exact:true})).toBeVisible();release();await expect(page.getByText('Employee A',{exact:true})).toHaveCount(0);
});
test('platform admin lacks self identity and link capabilities without permissions',async({page})=>{
 const {calls}=await setup(page,{permissions:[]});await openProfile(page);await expect(page.getByText('You do not have permission to view an employee self-profile in this company.')).toBeVisible();expect(calls.some(c=>c.path.endsWith('/employee/me'))).toBe(false);
 await page.goto('/users/1/employee-link');expect(calls.some(c=>c.path.includes('employee-link'))).toBe(false);
});
test('password semantics, wrong current error and clearing',async({page})=>{
 await setup(page,{passwordError:true});await openProfile(page);await expect(page.getByLabel('Current password',{exact:true})).toHaveAttribute('autocomplete','current-password');await expect(page.getByLabel('New password',{exact:true})).toHaveAttribute('autocomplete','new-password');await fillPasswords(page);await page.getByRole('button',{name:'Change password',exact:true}).click();await expect(page.getByRole('alert').first()).toContainText('current password is incorrect');await expect(page.getByLabel('Current password',{exact:true})).toHaveValue('');await expect(page.getByLabel('New password',{exact:true})).toHaveValue('');
});
test('password success preserves browser session and prevents double submit',async({page})=>{
 const {calls,release}=await setup(page,{slowPassword:true});await openProfile(page);await fillPasswords(page);await page.getByRole('button',{name:'Change password',exact:true}).evaluate((b:HTMLButtonElement)=>{b.click();b.click();});await expect.poll(()=>calls.filter(c=>c.path.endsWith('change-password')).length).toBe(1);release();await expect(page.getByText('Password changed.',{exact:false})).toBeVisible();await expect(page.getByLabel('New password',{exact:true})).toHaveValue('');await expect(page).toHaveURL(/\/profile$/);
});
test('password values clear across company switch',async({page})=>{
 await setup(page);await openProfile(page);await fillPasswords(page);await page.getByLabel('Active company').selectOption('B');await expect(page.getByLabel('Current password',{exact:true})).toHaveValue('');
});
test('selector search pagination available/link/conflict-free explicit unlink without payroll',async({page})=>{
 const {calls}=await setup(page);await page.goto('/users/1/employee-link');await expect(page.getByText('Candidate A',{exact:false})).toBeVisible();
 await expect(page.getByRole('radio',{name:/Already assigned/})).toBeDisabled();
 await page.getByLabel('Employee code or name',{exact:true}).fill('Chosen');await page.getByRole('button',{name:'Search employees'}).click();await expect(page.getByRole('radio',{name:/Chosen/})).toBeVisible();
 await page.getByRole('button',{name:'Next page'}).click();await expect(page.getByText('Page 2 of 2')).toBeVisible();
 expect(calls.some(c=>c.query.get('search')==='Chosen'&&c.query.get('page')==='2')).toBe(true);
 await page.getByRole('radio',{name:/Chosen/}).check();await page.getByRole('button',{name:'Link selected employee'}).click();await expect(page.getByText('Employee linked.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Link selected employee'})).toBeDisabled();await page.getByRole('button',{name:'Unlink employee',exact:true}).click();await expect(page.getByRole('alertdialog')).toBeVisible();expect(calls.some(c=>c.method==='DELETE')).toBe(false);await page.getByRole('button',{name:'Confirm unlink',exact:true}).click();await expect(page.getByText('Employee unlinked.',{exact:true})).toBeVisible();expect(calls.some(c=>c.path.includes('/payroll'))).toBe(false);
});
test('409 conflict reloads authoritative link and candidates',async({page})=>{
 const {calls}=await setup(page,{failLink:true});await page.goto('/users/1/employee-link');await page.getByRole('radio',{name:/Candidate A/}).check();await page.getByRole('button',{name:'Link selected employee'}).click();await expect(page.getByRole('alert').first()).toContainText('Unlink the current employee');await expect.poll(()=>calls.filter(c=>c.method==='GET'&&c.path.endsWith('/employee-link')).length).toBe(2);await expect(page.getByRole('radio',{name:/Candidate A/})).not.toBeChecked();
});
test('stale selector response cannot cross company context',async({page})=>{
 const {release}=await setup(page,{lateOptions:true});await page.goto('/users/1/employee-link');await expect(page.getByText('Loading employee options…')).toBeVisible();await page.getByLabel('Active company').selectOption('B');await expect(page.getByRole('radio',{name:/Candidate B/})).toBeVisible();release();await expect(page.getByRole('radio',{name:/Candidate A/})).toHaveCount(0);
});
for(const width of [390,768,1440])test(`profile and link keyboard responsive ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page);await openProfile(page);await page.getByLabel('Account name',{exact:true}).focus();await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/users/1/employee-link');await page.getByRole('radio',{name:/Candidate A/}).check();await page.getByRole('button',{name:'Link selected employee'}).click();await page.getByRole('button',{name:'Unlink employee',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('alertdialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Unlink employee',exact:true})).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('password validation feedback is safe and fields clear',async({page})=>{
 await setup(page,{passwordValidation:true});await openProfile(page);await fillPasswords(page);await page.getByLabel('Confirm new password',{exact:true}).fill('different-password-value');await page.getByRole('button',{name:'Change password',exact:true}).click();await expect(page.getByRole('alert').first()).toContainText('confirmation does not match');await expect(page.getByLabel('New password',{exact:true})).toHaveValue('');
});
test('ordinary employee cannot load selector or mutate links',async({page})=>{
 const {calls}=await setup(page,{permissions:['employee.self.view']});await openProfile(page);await page.goto('/users/1/employee-link');await expect(page).not.toHaveURL(/employee-link$/);expect(calls.some(c=>c.path.includes('/employee-link'))).toBe(false);await expect(page.getByRole('button',{name:'Link selected employee'})).toHaveCount(0);
});
