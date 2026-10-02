import { test, expect, type Page } from '@playwright/test';
import type { EffectiveNavigation, NavigationItem, NavigationReason } from '../../src/types/navigation';
const base = (key: string, label: string, override: boolean | null, reason: NavigationReason | null = null): NavigationItem => ({key,label,group:'Finance',order:0,module_key:'invoicing',required_permission:key==='fbr.invoicing'?'pakistan_fbr.view':'accounting.view',platform_active:reason!=='PLATFORM_INACTIVE',entitled:reason!=='NOT_ENTITLED',authorized:reason!=='NOT_AUTHORIZED',visibility_override:override,presentation_visible:override!==false,effective_visible:!reason&&override!==false,unavailable_reason:reason??(override===false?'HIDDEN_BY_COMPANY':null)});
async function setup(page: Page, options: {manage?:boolean;reason?:NavigationReason;late?:boolean;fail?:boolean;admin?:boolean}={}) {
  const overrides: Record<string, boolean|null> = {A:null,B:false,C:true};
  let accounting: boolean|null=null;
  const calls: {method:string;company:string;key:string;body:any}[]=[];
  let release=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const state=(id:string):EffectiveNavigation=> {
    const items=[base('fbr.invoicing','FBR Invoicing',overrides[id]!,options.reason),base('accounting.invoices','Accounting Invoices',accounting)];
    return {catalog:[{key:'invoicing',name:'Invoicing',is_active:true,entitled:true}],items,visible_keys:items.filter(i=>i.effective_visible).map(i=>i.key)};
  };
  const company=(id:string)=>({id,name:`Company ${id}`,currency:'PKR',timezone:'UTC',roles:[id==='B'?'reader':'manager'],permissions:['accounting.view','pakistan_fbr.view',...(options.manage===false||id==='B'?[]:['platform.settings.manage'])],modules:['invoicing'],effective_navigation:state(id)});
  await page.route('**/api/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method(),id=req.headers()['x-company-id']??'A';
    const respond=(json:unknown,status=200)=>route.fulfill({json,status});
    if(path.endsWith('/auth/me'))return respond({user:{id:1,name:'Test',email:'test@example.invalid',is_platform_admin:options.admin??false},companies:['A','B','C'].map(company)});
    if(path.endsWith('/auth/switch-company'))return respond({company:company(req.postDataJSON().company_id)});
    if(path.includes('/notifications'))return respond({notifications:{data:[]},unread_count:0});
    if(path.includes('/platform/navigation')) {
      const key=decodeURIComponent(path.split('/').at(-1)!);
      calls.push({method,company:id,key,body:req.postDataJSON()});
      if(method!=='GET') {
        if(options.late)await gate;
        if(options.fail)return respond({message:'Save failed'},503);
        const value=method==='DELETE'?null:req.postDataJSON().is_visible;
        if(key==='fbr.invoicing')overrides[id]=value;else accounting=value;
      }
      return respond(state(id));
    }
    if(path.endsWith('/pakistan-fbr/invoices'))return respond({data:[],meta:{current_page:1,last_page:1,total:0}});
    return respond({message:'Unexpected request'},500);
  });
  await page.goto('/settings/navigation');
  await expect(page.getByRole('article',{name:'FBR Invoicing',exact:true})).toBeVisible();
  return {calls,release};
}
const fbr=(page:Page)=>page.getByRole('article',{name:'FBR Invoicing',exact:true});
async function expectNav(page: Page, path: string, count: number) {
  const branch = page.locator('aside').getByRole('button', {name: path === '/fbr-invoicing' ? 'FBR Invoicing' : 'Accounting', exact: true});
  if (count && await branch.count() && await branch.getAttribute('aria-expanded') === 'false') await branch.click();
  await expect(page.locator(`aside a[href="${path}"]`)).toHaveCount(count);
}
test('default, show, reload, hide and DELETE reset retain independent states',async({page})=>{
  const {calls}=await setup(page);
  await expect(fbr(page)).toContainText('Default (inherited)');
  await expectNav(page,'/fbr-invoicing',1);
  await expectNav(page,'/accounting/invoices',1);
  await page.getByRole('button',{name:'Show FBR Invoicing',exact:true}).click();
  await expect(fbr(page)).toContainText('Visible (explicit show)');
  await page.reload(); await expect(fbr(page)).toContainText('Visible (explicit show)');
  await page.getByRole('button',{name:'Hide FBR Invoicing',exact:true}).click();
  await expect(fbr(page)).toContainText('Hidden (explicit hide)');
  await expectNav(page,'/fbr-invoicing',0);
  await expectNav(page,'/accounting/invoices',1);
  await page.getByRole('button',{name:'Reset FBR Invoicing to default',exact:true}).click();
  await expect(fbr(page)).toContainText('Default (inherited)');
  expect(calls.some(c=>c.method==='DELETE'&&c.key==='fbr.invoicing')).toBe(true);
  await page.getByRole('button',{name:'Hide Accounting Invoices',exact:true}).click();
  await page.getByRole('button',{name:'Show FBR Invoicing',exact:true}).click();
  await expectNav(page,'/accounting/invoices',0);
  await expectNav(page,'/fbr-invoicing',1);
});
for(const reason of ['NOT_ENTITLED','NOT_AUTHORIZED','PLATFORM_INACTIVE'] as const)test(`explicit show cannot overcome ${reason}, including platform admin`,async({page})=>{
  await setup(page,{reason,admin:true});
  await page.getByLabel('Active company').selectOption('C');
  await expect(fbr(page)).toContainText('Visible (explicit show)');
  await expect(fbr(page)).toContainText(reason==='NOT_ENTITLED'?'Not entitled':reason==='NOT_AUTHORIZED'?'Not authorized':'platform inactive');
  await expectNav(page,'/fbr-invoicing',0);
});
test('company switching preserves default/hide/show and different roles without refresh',async({page})=>{
  await setup(page); await expect(fbr(page)).toContainText('Default (inherited)');
  await page.getByLabel('Active company').selectOption('B');
  await expect(fbr(page)).toContainText('Hidden (explicit hide)');
  await expect(page.getByRole('button',{name:'Show FBR Invoicing',exact:true})).toHaveCount(0);
  await expectNav(page,'/fbr-invoicing',0);
  await page.getByLabel('Active company').selectOption('C');
  await expect(fbr(page)).toContainText('Visible (explicit show)');
  await expectNav(page,'/fbr-invoicing',1);
});
test('late mutation cannot overwrite new company state',async({page})=>{
  const {release,calls}=await setup(page,{late:true});
  await page.getByRole('button',{name:'Hide FBR Invoicing',exact:true}).click();
  await expect.poll(()=>calls.some(c=>c.method==='PUT')).toBe(true);
  await page.getByLabel('Active company').selectOption('C');
  await expect(fbr(page)).toContainText('Visible (explicit show)');
  release(); await expect(fbr(page)).toContainText('Visible (explicit show)');
  await expectNav(page,'/fbr-invoicing',1);
});
test('ordinary member sees read-only state with no mutation controls',async({page})=>{
  const {calls}=await setup(page,{manage:false});
  await expect(page.getByText('Read-only navigation preferences.')).toBeVisible();
  await expect(page.getByRole('button',{name:/^(Show|Hide|Reset) /})).toHaveCount(0);
  expect(calls.every(c=>c.method==='GET')).toBe(true);
});
test('failed mutation reloads authoritative state',async({page})=>{
  const {calls}=await setup(page,{fail:true});
  await page.getByRole('button',{name:'Hide FBR Invoicing',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Save failed');
  await expect(fbr(page)).toContainText('Default (inherited)');
  await expect.poll(()=>calls.filter(c=>c.method==='GET').length).toBe(2);
});
test('presentation hidden direct route remains authorized',async({page})=>{
  await setup(page); await page.getByRole('button',{name:'Hide FBR Invoicing',exact:true}).click();
  await expect(fbr(page)).toContainText('Hidden (explicit hide)');
  await page.goto('/fbr-invoicing');
  await expect(page.getByText('No FBR invoices',{exact:true})).toBeVisible();
  await expectNav(page,'/fbr-invoicing',0);
});
for(const width of [390,768,1440])test(`navigation administration keyboard and responsive ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await setup(page);
  const hide=page.getByRole('button',{name:'Hide FBR Invoicing',exact:true});
  await hide.focus();await expect(hide).toBeFocused();await page.keyboard.press('Enter');
  await expect(fbr(page)).toContainText('Hidden (explicit hide)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
