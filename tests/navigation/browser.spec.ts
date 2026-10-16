import { test, expect, type Page } from '@playwright/test';
import type { EffectiveNavigation, NavigationItem, NavigationReason } from '../../src/types/navigation';
const base = (key: string, label: string, override: boolean | null, reason: NavigationReason | null = null): NavigationItem => ({key,label,group:'Finance',order:0,module_key:'invoicing',required_permission:key==='fbr.invoicing'?'pakistan_fbr.view':'accounting.view',platform_active:reason!=='PLATFORM_INACTIVE',entitled:reason!=='NOT_ENTITLED',authorized:reason!=='NOT_AUTHORIZED',visibility_override:override,presentation_visible:override!==false,effective_visible:!reason&&override!==false,unavailable_reason:reason??(override===false?'HIDDEN_BY_COMPANY':null)});
async function setup(page: Page, options: {manage?:boolean;manageB?:boolean;withoutB?:boolean;reason?:NavigationReason;late?:boolean;lateRead?:boolean;fail?:boolean;failOnceKey?:string;admin?:boolean}={}) {
  const overrides: Record<string, boolean|null> = {A:null,B:false,C:true};
  const accounting: Record<string, Record<string, boolean|null>> = Object.fromEntries(['A','B','C'].map(id => [id, {'accounting.invoices':null,'accounting.fbr_status':null}]));
  const calls: {method:string;company:string;key:string;body:any}[]=[];
  let failedOnce = false;
  let release=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let releaseRead=()=>{};
  const readGate=new Promise<void>(resolve=>{releaseRead=resolve;});
  const state=(id:string):EffectiveNavigation=> {
    const items=[base('fbr.invoicing','FBR Invoicing',overrides[id]!,options.reason),{...base('accounting.invoices','Accounting Invoices',accounting[id]['accounting.invoices']),parent_key:'finance.accounting'},{...base('accounting.fbr_status','Accounting FBR Status',accounting[id]['accounting.fbr_status']),parent_key:'finance.accounting'}];
    return {catalog:[{key:'invoicing',name:'Invoicing',is_active:true,entitled:true}],items,parents:[{key:'finance.accounting',label:'Accounting',child_keys:['accounting.invoices','accounting.fbr_status'],visible_child_keys:items.filter(i=>i.parent_key==='finance.accounting'&&i.effective_visible).map(i=>i.key),effective_visible:items.some(i=>i.parent_key==='finance.accounting'&&i.effective_visible)}],visible_keys:items.filter(i=>i.effective_visible).map(i=>i.key)};
  };
  const company=(id:string)=>({id,name:`Company ${id}`,currency:'PKR',timezone:'UTC',roles:[id==='B'&&!options.manageB?'reader':'manager'],permissions:['accounting.view','pakistan_fbr.view',...(options.manage===false||(id==='B'&&!options.manageB)?[]:['platform.settings.manage'])],modules:['invoicing'],effective_navigation:state(id)});
  await page.route('**/api/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method(),id=req.headers()['x-company-id']??'A';
    const respond=(json:unknown,status=200)=>route.fulfill({json,status});
    if(path.endsWith('/auth/me'))return respond({user:{id:1,name:'Test',email:'test@example.invalid',is_platform_admin:options.admin??false},companies:(options.withoutB?['A','C']:['A','B','C']).map(company)});
    if(path.endsWith('/auth/switch-company'))return respond({company:company(req.postDataJSON().company_id)});
    if(path.includes('/notifications'))return respond({notifications:{data:[]},unread_count:0});
    if(path.includes('/platform/navigation')) {
      const key=decodeURIComponent(path.split('/').at(-1)!);
      calls.push({method,company:id,key,body:req.postDataJSON()});
      if(method==='GET' && id==='A' && options.lateRead) await readGate;
      if(method!=='GET') {
        if(options.late)await gate;
        if(options.fail)return respond({message:'Save failed'},503);
        if(key===options.failOnceKey&&!failedOnce){failedOnce=true;return respond({message:'Save failed'},503);}
        const value=method==='DELETE'?null:req.postDataJSON().is_visible;
        if(key==='fbr.invoicing')overrides[id]=value;else accounting[id][key]=value;
      }
      return respond(state(id));
    }
    if(path.endsWith('/pakistan-fbr/invoices'))return respond({data:[],meta:{current_page:1,last_page:1,total:0}});
    return respond({message:'Unexpected request'},500);
  });
  await page.goto('/settings/navigation');
  if (!options.lateRead) await expect(page.getByRole('article',{name:'FBR Invoice',exact:true})).toBeVisible();
  return {calls,release,releaseRead};
}
const fbr=(page:Page)=>page.getByRole('article',{name:'FBR Invoice',exact:true});
const visibility=(page:Page, name:string)=>page.getByRole('article',{name,exact:true}).getByRole('status',{name:`${name} visibility status`,exact:true});
async function expectNav(page: Page, path: string, count: number) {
  const branch = page.locator('aside').getByRole('button', {name: path === '/fbr-invoicing' ? 'FBR Invoice' : 'Accounting', exact: true});
  if (count && await branch.count() && await branch.getAttribute('aria-expanded') === 'false') await branch.click();
  await expect(page.locator(`aside a[href="${path}"]`)).toHaveCount(count);
}
test('default, show, reload, hide and DELETE reset retain independent states',async({page})=>{
  const {calls}=await setup(page);
  await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  await expectNav(page,'/fbr-invoicing',1);
  await expectNav(page,'/accounting/invoices',1);
  await page.getByRole('button',{name:'Show FBR Invoice',exact:true}).click();
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  expect(calls.filter(c=>c.key==='fbr.invoicing'&&c.method!=='GET')).toEqual([{method:'PUT',company:'A',key:'fbr.invoicing',body:{is_visible:true}}]);
  await page.reload(); await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await page.getByRole('button',{name:'Hide FBR Invoice',exact:true}).click();
  await expect(visibility(page,'FBR Invoice')).toHaveText('Hidden');
  await expectNav(page,'/fbr-invoicing',0);
  await expectNav(page,'/accounting/invoices',1);
  expect(calls.filter(c=>c.key==='fbr.invoicing'&&c.method!=='GET').slice(0,2)).toEqual([
    {method:'PUT',company:'A',key:'fbr.invoicing',body:{is_visible:true}},
    {method:'PUT',company:'A',key:'fbr.invoicing',body:{is_visible:false}},
  ]);
  await page.getByRole('button',{name:'Reset FBR Invoice to default',exact:true}).click();
  await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  expect(calls.some(c=>c.method==='DELETE'&&c.company==='A'&&c.key==='fbr.invoicing')).toBe(true);
  await page.reload(); await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  await page.getByRole('button',{name:'Hide Accounting Invoices',exact:true}).click();
  await page.getByRole('button',{name:'Show FBR Invoice',exact:true}).click();
  await expectNav(page,'/accounting/invoices',0);
  await expectNav(page,'/fbr-invoicing',1);
});
test('authorized target B persists independently while workspace A remains active',async({page})=>{
  const {calls}=await setup(page,{manageB:true});
  await expect(page.getByLabel('Active company')).toHaveValue('A');
  await page.getByLabel('Company to configure').selectOption('B');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Hidden');
  await page.getByRole('button',{name:'Show FBR Invoice',exact:true}).click();
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await expect(page.getByLabel('Active company')).toHaveValue('A');
  await expectNav(page,'/fbr-invoicing',1);
  await page.getByLabel('Company to configure').selectOption('A');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  await page.getByRole('button',{name:'Hide FBR Invoice',exact:true}).click();
  await expectNav(page,'/fbr-invoicing',0);
  await page.getByLabel('Company to configure').selectOption('B');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await page.reload();
  await page.getByLabel('Company to configure').selectOption('B');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await expect(page.getByLabel('Active company')).toHaveValue('A');
  await page.getByLabel('Company to configure').selectOption('A');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Hidden');
  expect(calls.filter(c=>c.method==='PUT').map(c=>({company:c.company,key:c.key,value:c.body.is_visible}))).toEqual([
    {company:'B',key:'fbr.invoicing',value:true},
    {company:'A',key:'fbr.invoicing',value:false},
  ]);
});
for(const reason of ['NOT_ENTITLED','NOT_AUTHORIZED','PLATFORM_INACTIVE'] as const)test(`explicit show cannot overcome ${reason}, including platform admin`,async({page})=>{
  await setup(page,{reason,admin:true});
  await page.getByLabel('Company to configure').selectOption('C');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await expect(fbr(page)).toContainText(reason==='NOT_ENTITLED'?'Not entitled':reason==='NOT_AUTHORIZED'?'Not authorized':'platform inactive');
  await expectNav(page,'/fbr-invoicing',0);
});
test('target-company configuration does not switch active workspace or grant navigation',async({page})=>{
  const {calls}=await setup(page); await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  await expect(page.getByLabel('Company to configure').locator('option[value="B"]')).toHaveCount(0);
  await page.getByLabel('Company to configure').selectOption('C');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await expect(page.getByLabel('Active company')).toHaveValue('A');
  await page.getByRole('button',{name:'Hide FBR Invoice',exact:true}).click();
  await expect(visibility(page,'FBR Invoice')).toHaveText('Hidden');
  expect(calls.some(call => call.method === 'PUT' && call.company === 'C' && call.key === 'fbr.invoicing')).toBe(true);
  await expectNav(page,'/fbr-invoicing',1);
  await page.getByLabel('Active company').selectOption('B');
  await expect(page.getByLabel('Company to configure')).toHaveValue('C');
  await expectNav(page,'/fbr-invoicing',0);
});
test('platform admin cannot target a company without membership',async({page})=>{
  const {calls}=await setup(page,{admin:true,withoutB:true});
  await expect(page.getByLabel('Company to configure').locator('option[value="B"]')).toHaveCount(0);
  await expect(page.getByLabel('Active company')).toHaveValue('A');
  expect(calls.every(call=>call.company!=='B')).toBe(true);
});
test('hierarchical parent controls write individual child preferences without granting access',async({page})=>{
  const {calls}=await setup(page);
  const accounting=page.getByRole('region',{name:'Accounting navigation'});
  await expect(accounting.getByRole('article')).toHaveCount(2);
  await accounting.getByRole('button',{name:'Hide all Accounting'}).click();
  await expect(visibility(page,'Accounting Invoices')).toHaveText('Hidden');
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Hidden');
  const parentWrites=calls.filter(call=>call.method==='PUT');
  expect(parentWrites).toHaveLength(2);
  expect(parentWrites.map(call=>({company:call.company,key:call.key,value:call.body?.is_visible})).sort((a,b)=>a.key.localeCompare(b.key))).toEqual([
    {company:'A',key:'accounting.fbr_status',value:false},
    {company:'A',key:'accounting.invoices',value:false},
  ]);
  await expectNav(page,'/accounting/invoices',0);
  await expectNav(page,'/fbr-invoicing',1);
  await accounting.getByRole('button',{name:'Show Accounting Invoices',exact:true}).click();
  await expect(visibility(page,'Accounting Invoices')).toHaveText('Shown');
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Hidden');
  await expectNav(page,'/accounting/invoices',1);
  await accounting.getByRole('button',{name:'Show all Accounting'}).click();
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Shown');
  await accounting.getByRole('button',{name:'Reset all Accounting'}).click();
  await expect(visibility(page,'Accounting Invoices')).toHaveText('Default');
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Default');
  await page.reload();
  await expect(visibility(page,'Accounting Invoices')).toHaveText('Default');
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Default');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  expect(calls.filter(c=>c.method==='DELETE').map(c=>c.key).sort()).toEqual(['accounting.fbr_status','accounting.invoices']);
});
test('partial parent failure reloads persisted leaves and retry completes safely',async({page})=>{
  const {calls}=await setup(page,{failOnceKey:'accounting.invoices'});
  const accounting=page.getByRole('region',{name:'Accounting navigation'});
  await accounting.getByRole('button',{name:'Hide all Accounting'}).click();
  await expect(page.getByRole('alert')).toContainText('1 of 2 navigation preferences saved');
  await expect(page.getByRole('alert')).toContainText('Current settings have been reloaded');
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Hidden');
  await expect(visibility(page,'Accounting Invoices')).toHaveText('Default');
  await expectNav(page,'/accounting/invoices',1);
  await expectNav(page,'/accounting/fbr',0);
  await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  await accounting.getByRole('button',{name:'Hide all Accounting'}).click();
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Hidden');
  await expect(visibility(page,'Accounting Invoices')).toHaveText('Hidden');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(visibility(page,'Accounting FBR Status')).toHaveText('Hidden');
  await expect(visibility(page,'Accounting Invoices')).toHaveText('Hidden');
  expect(calls.filter(c=>c.method==='PUT').map(c=>({company:c.company,key:c.key,value:c.body.is_visible}))).toEqual([
    {company:'A',key:'accounting.fbr_status',value:false},
    {company:'A',key:'accounting.invoices',value:false},
    {company:'A',key:'accounting.fbr_status',value:false},
    {company:'A',key:'accounting.invoices',value:false},
  ]);
  expect(calls.filter(c=>c.method==='PUT').every(c=>c.company==='A'&&['accounting.fbr_status','accounting.invoices'].includes(c.key))).toBe(true);
});
test('late mutation cannot overwrite new company state',async({page})=>{
  const {release,calls}=await setup(page,{late:true});
  await page.getByRole('button',{name:'Hide FBR Invoice',exact:true}).click();
  await expect.poll(()=>calls.some(c=>c.method==='PUT')).toBe(true);
  await page.getByLabel('Company to configure').selectOption('C');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  release(); await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await expect(page.getByLabel('Active company')).toHaveValue('A');
});
test('late target-company read cannot replace a newly selected target',async({page})=>{
  const {calls,releaseRead}=await setup(page,{lateRead:true});
  await expect.poll(()=>calls.some(call=>call.method==='GET'&&call.company==='A')).toBe(true);
  await page.getByLabel('Company to configure').selectOption('C');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  releaseRead();
  await expect(visibility(page,'FBR Invoice')).toHaveText('Shown');
  await expect(page.getByLabel('Active company')).toHaveValue('A');
});
test('ordinary member sees read-only state with no mutation controls',async({page})=>{
  const {calls}=await setup(page,{manage:false});
  await expect(page.getByText('Read-only navigation preferences.')).toBeVisible();
  await expect(page.getByRole('button',{name:/^(Show|Hide|Reset) /})).toHaveCount(0);
  expect(calls.every(c=>c.method==='GET')).toBe(true);
});
test('failed mutation reloads authoritative state',async({page})=>{
  const {calls}=await setup(page,{fail:true});
  await page.getByRole('button',{name:'Hide FBR Invoice',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Save failed');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Default');
  await expect.poll(()=>calls.filter(c=>c.method==='GET').length).toBe(2);
});
test('presentation hidden direct route remains authorized',async({page})=>{
  await setup(page); await page.getByRole('button',{name:'Hide FBR Invoice',exact:true}).click();
  await expect(visibility(page,'FBR Invoice')).toHaveText('Hidden');
  await page.goto('/fbr-invoicing');
  await expect(page.getByText('No FBR invoices',{exact:true})).toBeVisible();
  await expectNav(page,'/fbr-invoicing',0);
});
for(const width of [390,768,1440])test(`navigation administration keyboard and responsive ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await setup(page);
  const hide=page.getByRole('button',{name:'Hide FBR Invoice',exact:true});
  await hide.focus();await expect(hide).toBeFocused();await page.keyboard.press('Enter');
  await expect(visibility(page,'FBR Invoice')).toHaveText('Hidden');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
