import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { permissionForPath, moduleForPath } from '../../src/lib/nav';
test('identity permissions are independent of payroll and commercial modules',()=>{
  expect(permissionForPath('/users/12/employee-link')).toBe('employee.links.manage');
  expect(moduleForPath('/profile')).toBeNull();
  expect(moduleForPath('/users/12/employee-link')).toBeNull();
  expect(permissionForPath('/profile')).toBeNull();
});
test('identity privacy forbids payroll enrichment, browser persistence and raw HTML',()=>{
  const files=['src/services/identity.repository.ts',...readdirSync('src/components/identity').map(f=>`src/components/identity/${f}`)];
  for(const file of files) expect(readFileSync(file,'utf8'),file).not.toMatch(/\/payroll|services\/payroll|localStorage|sessionStorage|console\.|v-html/);
  const profile=readFileSync('src/components/identity/ProfileContent.vue','utf8');
  expect(profile).not.toMatch(/base_salary|bank_reference|tax_identifier|payroll_profile/);
  expect(profile).toContain("company.hasPermission('employee.self.view')");
});
test('identity repository uses exact contracts and narrow write payloads',async()=>{
  const {createServer}=await import('vite');const server=await createServer({server:{middlewareMode:true},appType:'custom'});
  const oldFetch=globalThis.fetch,oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const calls:{path:string;query:string;method:string;headers:any;body:any}[]=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin:'http://identity.invalid'}}});
  globalThis.fetch=async(input,init)=>{const url=new URL(String(input));calls.push({path:url.pathname,query:url.search,method:init?.method??'GET',headers:init?.headers,body:init?.body?JSON.parse(String(init.body)):null});return new Response(JSON.stringify({name:'Server name'}));};
  try {
    const {identityRepository:r}=await server.ssrLoadModule('/src/services/identity.repository.ts');
    expect(await r.profile()).toEqual({name:'Server name'});await r.saveName('Name');
    await r.employee('A');await r.options('A','Code',2,10);await r.link('A','7');await r.setLink('A','7','employee');await r.unlink('A','7');
    await r.password({current_password:'synthetic',password:'synthetic-new',password_confirmation:'synthetic-new'});
    expect(calls[1]!.body).toEqual({name:'Name'});
    expect(calls[3]!.query).toContain('search=Code');expect(calls[3]!.query).toContain('page=2');expect(calls[3]!.query).toContain('per_page=10');
    expect(calls[5]!.body).toEqual({employee_id:'employee'});expect(calls[6]!.method).toBe('DELETE');
    expect(calls.slice(2,7).every(c=>c.headers['X-Company-Id']==='A')).toBe(true);
    expect(calls.every(c=>!c.path.includes('/payroll'))).toBe(true);
    expect(calls[7]!.path).toBe('/api/v1/auth/change-password');
  }finally{globalThis.fetch=oldFetch;if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');await server.close();}
});
