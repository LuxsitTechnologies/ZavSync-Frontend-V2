import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { decimalToMinor, minorToDecimal, portalDefinition } from '../../src/lib/portalFinal';
import { permissionForPath,moduleForPath,presentationKeyForRoute,navigationForModules } from '../../src/lib/nav';
import type { PortalDomain } from '../../src/types/portalFinal';
test('exact PKR conversion rejects rounding, exponent and overflow',()=>{
  for(const [input,expected] of [['0.01',1],['123.45',12345],['9999999999999.99',999999999999999]] as const){expect(decimalToMinor(input)).toBe(expected);expect(minorToDecimal(expected)).toBe(input);}
  for(const input of ['0','-1','1.001','1e3','Infinity','10000000000000','NaN'])expect(()=>decimalToMinor(input)).toThrow();
  expect(minorToDecimal(Number.MAX_SAFE_INTEGER+1)).toBe('Unavailable');
});
test('final administrative navigation uses exact independent identities and permissions',()=>{
  const rows=[['employee-documents','employee_documents','employee.documents.admin.view'],['announcements','announcements','announcements.view'],['teams','teams','teams.view'],['shifts','shifts','schedules.view'],['rotas','rotas','schedules.view'],['shift-swaps','shift_swaps','schedules.view'],['asset-requests','asset_requests','assets.view'],['expenses','expenses','expenses.view'],['expense-categories','expense_categories','expenses.categories.manage']];
  for(const [route,key,permission] of rows){const path='/hrm/'+route;expect(permissionForPath(path)).toBe(permission);expect(moduleForPath(path)).toBe('payroll');expect(presentationKeyForRoute[path]).toBe('hrm.'+key);expect(JSON.stringify(navigationForModules(['payroll'],true,[],{catalog:[],items:[],visible_keys:['hrm.'+key]}))).not.toContain(path);expect(JSON.stringify(navigationForModules(['payroll'],true,[permission!],{catalog:[],items:[],visible_keys:[]}))).not.toContain(path);}
  expect(permissionForPath('/profile')).toBeNull();expect(moduleForPath('/employee/profile')).toBeNull();
});
test('domain lifecycle and consent actions are restricted to certified states',()=>{
  expect(portalDefinition('expenses',false).actions.map(a=>[a.command,a.states])).toEqual([['edit',['DRAFT']],['receipt',['DRAFT']],['submit',['DRAFT']]]);
  expect(portalDefinition('swaps',false).actions.every(a=>a.targetOnly&&a.states?.[0]==='PENDING_TARGET')).toBeTruthy();
  expect(portalDefinition('swaps',true).actions.every(a=>a.states?.[0]==='PENDING_ADMIN')).toBeTruthy();
  expect(portalDefinition('assets',false).create?.fields.map(f=>f.key)).toEqual(['item_description','reason']);
  expect(portalDefinition('documents',true).actions.map(a=>a.command)).toEqual(['release']);
  for(const d of ['documents','announcements','contacts','teams','swaps','assets','expenses','categories','shifts','rotas'] as PortalDomain[])for(const admin of [false,true]){const def=portalDefinition(d,admin);if(def.create)expect(def.create.keyed).toBe(true);}
});
test('private allowlists exclude payroll banking tax and raw employee resources',()=>{
  for(const d of ['documents','announcements','directory','teams','contacts','schedule','swaps','assets','expenses','categories','shifts','rotas'] as PortalDomain[])for(const admin of [false,true])expect(portalDefinition(d,admin).fields.map(f=>f[0]).join(' ')).not.toMatch(/salary|bank|tax|address|storage|checksum|password/);
  const files=['src/services/portalFinal.repository.ts','src/lib/portalFinal.ts',...readdirSync('src/components/portal-final').map(f=>'src/components/portal-final/'+f)];
  for(const file of files)expect(readFileSync(file,'utf8'),file).not.toMatch(/v-html|localStorage|sessionStorage|console\.|mock-data|employee-data|storage_path|storage_key|public_url/);
  expect(readFileSync('src/services/portalFinal.repository.ts','utf8')).not.toMatch(/\/accounting|\/banking|\/inventory|\/attendance|\/payroll|\/leave|\/crm|\/platform\/documents|\/employee\/me/);
  expect(readFileSync('src/pages/HrmPortalResources.vue','utf8')).not.toMatch(/employeePortal|identityRepository|employee\/me/);
});
test('repository exact paths and payloads use scoped private authority',async()=>{
  const {createServer}=await import('vite');const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  const oldFetch=globalThis.fetch,oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const calls:{path:string;method:string;body:unknown;headers:Record<string,string>}[]=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin:'http://portal.invalid'}}});
  globalThis.fetch=async(input,init)=>{calls.push({path:new URL(String(input)).pathname,method:init?.method??'GET',body:typeof init?.body==='string'?JSON.parse(init.body):init?.body,headers:init?.headers as Record<string,string>});return new Response('{}');};
  try{const {portalFinalRepository:r}=await server.ssrLoadModule('/src/services/portalFinal.repository.ts');const signal=new AbortController().signal;
    await r('documents').list('A',{page:2},signal);await r('documents',true).mutate('A','release','doc',{},undefined,signal);
    await r('teams',true).mutate('A','remove-member','team',{version:4},undefined,signal,'member');
    await r('rotas',true).mutate('A','assignment','rota',{employee_id:'explicit'},'same-key',signal,'slot');
    await r('expenses').mutate('A','create','',{amount_minor:123},'same-key',signal);
    expect(calls.map(c=>c.path)).toEqual(['/api/v1/employee/documents','/api/v1/hrm/employee-documents/doc/release','/api/v1/hrm/teams/team/members/member','/api/v1/hrm/rota-slots/slot/assignments','/api/v1/employee/expense-claims']);expect(calls[2]!.method).toBe('DELETE');expect(calls[3]!.headers['Idempotency-Key']).toBe('same-key');expect(calls.every(c=>c.headers['X-Company-Id']==='A')).toBeTruthy();
    expect(()=>r('directory',true)).toThrow();expect(()=>r('shifts')).toThrow();
  }finally{globalThis.fetch=oldFetch;if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');await server.close();}
});
test('manager repository narrows response and sends only explicit relationship version payload',async()=>{
  const {createServer}=await import('vite');const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  const original=globalThis.fetch,oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const calls:{path:string;method:string;body:unknown;headers:Record<string,string>}[]=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin:'http://portal.invalid'}}});
  let response:unknown={employee_id:'explicit',manager_employee_id:null,version:17,salary:'private',user:{}};
  globalThis.fetch=async(input,init)=>{calls.push({path:new URL(String(input)).pathname,method:init?.method??'GET',body:typeof init?.body==='string'?JSON.parse(init.body):undefined,headers:init?.headers as Record<string,string>});return new Response(JSON.stringify(response));};
  try{
    const {employeeManagerRepository:r}=await server.ssrLoadModule('/src/services/employeeManager.repository.ts');const signal=new AbortController().signal;
    const current=await r.read('A','explicit',signal);expect(current).toEqual({employee_id:'explicit',manager_employee_id:null,version:17});
    response={employee_id:'explicit',manager_employee_id:'manager',version:18,address:'private'};
    expect(await r.save('A','explicit','manager',current.version,signal)).toEqual({employee_id:'explicit',manager_employee_id:'manager',version:18});
    expect(calls.map(c=>[c.path,c.method])).toEqual([['/api/v1/hrm/employees/explicit/manager','GET'],['/api/v1/hrm/employees/explicit/manager','PATCH']]);expect(calls[1]!.body).toEqual({manager_employee_id:'manager',version:17});expect(calls.every(c=>c.headers['X-Company-Id']==='A')).toBe(true);
    response={employee_id:'explicit',manager_employee_id:null};await expect(r.read('A','explicit',signal)).rejects.toThrow('Invalid manager relationship response');
  }finally{globalThis.fetch=original;if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');await server.close();}
});
test('manager UI uses independent read/write authority, shared fencing and no enrichment or persistence',()=>{
  const ui=readFileSync('src/components/portal-final/EmployeeManager.vue','utf8');const repo=readFileSync('src/services/employeeManager.repository.ts','utf8');
  expect(ui).toContain("company.hasPermission('teams.view')");expect(ui).toContain("canRead.value && company.hasPermission('teams.manage')");expect(ui).toContain("company.hasModule('payroll')");expect(ui).toContain('useWorkContext');expect(ui).toContain("error.errorCode === 'TEAM_VERSION_STALE'");
  expect(ui+repo).not.toMatch(/employee\/me|identityRepository|employeePortal|directory|department|designation|localStorage|sessionStorage|console\.|v-html|salary|bank|tax|emergency|\/payroll|\/inventory|\/accounting|\/banking/);
});
