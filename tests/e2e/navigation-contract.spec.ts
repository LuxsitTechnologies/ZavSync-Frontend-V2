import { test, expect } from '@playwright/test';
import type { EffectiveNavigation } from '../../src/types/navigation';
test('Stage 16A real navigation contract preserves overrides, auth/me and API boundary', async ({ request }) => {
  const origin='http://127.0.0.1:8080';
  await request.get('/sanctum/csrf-cookie',{headers:{Origin:origin,Accept:'application/json'}});
  const csrf=async()=>decodeURIComponent((await request.storageState()).cookies.find(c=>c.name==='XSRF-TOKEN')?.value??'');
  const login=await request.post('/api/v1/auth/login',{headers:{Origin:origin,Accept:'application/json','X-XSRF-TOKEN':await csrf()},data:{email:'finance@example.com',password:'password'}});
  expect(login.status()).toBe(200);
  const company=(await login.json()).companies[0];
  const headers={Origin:origin,Accept:'application/json','X-XSRF-TOKEN':await csrf(),'X-Company-Id':company.id};
  const path='/api/v1/platform/navigation';
  const item=(state:EffectiveNavigation,key='fbr.invoicing')=>state.items.find(i=>i.key===key)!;
  const initial=await request.get(path,{headers});expect(initial.status()).toBe(200);
  expect(item(await initial.json()).visibility_override).toBeNull();
  expect(company.effective_navigation).toEqual(await initial.json());
  try {
    for(const value of [true,false]) {
      const write=await request.put(`${path}/fbr.invoicing`,{headers,data:{is_visible:value}});expect(write.status()).toBe(200);
      expect(item(await write.json()).visibility_override).toBe(value);
      const me=await request.get('/api/v1/auth/me',{headers});expect(me.status()).toBe(200);
      const active=(await me.json()).companies.find((c:{id:string})=>c.id===company.id);
      expect(item(active.effective_navigation).visibility_override).toBe(value);
      expect(active.modules).toEqual(company.modules);
      expect(item(await write.json(),'accounting.invoices').visibility_override).toBeNull();
    }
    expect((await request.get('/api/v1/pakistan-fbr/invoices',{headers})).status()).toBe(200);
    const switched=await request.post('/api/v1/auth/switch-company',{headers,data:{company_id:company.id}});
    expect(item((await switched.json()).company.effective_navigation).visibility_override).toBe(false);
  } finally {
    const reset=await request.delete(`${path}/fbr.invoicing`,{headers});expect(reset.status()).toBe(200);
    expect(item(await reset.json()).visibility_override).toBeNull();
  }
});
