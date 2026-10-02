import {test,expect} from '@playwright/test';
test('Stage 16C real profile, selector, linkage, company identity and password contract',async({request})=>{
 const origin='http://127.0.0.1:8080';await request.get('/sanctum/csrf-cookie',{headers:{Origin:origin,Accept:'application/json'}});
 const csrf=async()=>decodeURIComponent((await request.storageState()).cookies.find(c=>c.name==='XSRF-TOKEN')?.value??'');
 const auth=()=>({Origin:origin,Accept:'application/json'});
 const login=await request.post('/api/v1/auth/login',{headers:{...auth(),'X-XSRF-TOKEN':await csrf()},data:{email:'identity@example.invalid',password:'password'}});expect(login.status()).toBe(200);
 const payload=await login.json(),companies=payload.companies;
 const company=(letter:string)=>companies.find((c:{name:string})=>c.name===`Identity Company ${letter}`);
 const headers=async(letter='A')=>({...auth(),'X-XSRF-TOKEN':await csrf(),'X-Company-Id':company(letter).id});
 const profile=await request.get('/api/v1/auth/profile',{headers:await headers()});expect(profile.status()).toBe(200);expect(Object.keys(await profile.json()).sort()).toEqual(['email','email_verified','id','name']);
 const patch=await request.patch('/api/v1/auth/profile',{headers:await headers(),data:{name:'Updated Identity'}});expect(patch.status()).toBe(200);expect((await patch.json()).name).toBe('Updated Identity');
 const forbidden=await request.patch('/api/v1/auth/profile',{headers:await headers(),data:{name:'Name',email:'new@example.invalid'}});expect(forbidden.status()).toBe(422);
 for(const letter of ['A','B','C']) {
  expect(company(letter).permissions).not.toContain('payroll.view');
  const switched=await request.post('/api/v1/auth/switch-company',{headers:await headers(letter),data:{company_id:company(letter).id}});expect(switched.status()).toBe(200);
  const me=await request.get('/api/v1/employee/me',{headers:await headers(letter)});expect(me.status()).toBe(200);const body=await me.json();expect(body.self_editable).toBe(false);expect(body.linked).toBe(letter!=='C');
  if(letter!=='C'){expect(body.employee.full_name).toBe(`Identity Employee ${letter}`);expect(body.employee.status).toBe(letter==='A'?'terminated':'resigned');for(const key of ['payroll_profile','base_salary','tax_identifier','employee_bank_reference'])expect(body.employee).not.toHaveProperty(key);}
 }
 const selector=await request.get('/api/v1/platform/employee-link-options?search=IDENTITY-A&per_page=1&page=1',{headers:await headers()});expect(selector.status()).toBe(200);const selected=await selector.json();expect(selected.data).toHaveLength(1);expect(selected.data[0].full_name).toBe('Identity Employee A');expect(selected.data[0].available).toBe(false);expect(Object.keys(selected.data[0]).sort()).toEqual(['available','employee_code','full_name','id','linked','status']);expect(selected.meta.per_page).toBe(1);
 const second=await request.get('/api/v1/platform/employee-link-options?per_page=1&page=2',{headers:await headers()});expect((await second.json()).meta.current_page).toBe(2);
 const optionsC=await request.get('/api/v1/platform/employee-link-options',{headers:await headers('C')});expect((await optionsC.json()).data.every((row:{full_name:string})=>row.full_name.endsWith(' C'))).toBe(true);const candidate=(await optionsC.json()).data[0];expect(candidate.available).toBe(true);
 const members=await request.get('/api/v1/platform/users',{headers:await headers('C')});expect(members.status()).toBe(200);const membership=(await members.json()).data.find((m:{user_id:number})=>m.user_id===payload.user.id);expect(membership).toBeTruthy();
 const path=`/api/v1/platform/users/${membership.id}/employee-link`;
 const linked=await request.put(path,{headers:await headers('C'),data:{employee_id:candidate.id}});expect(linked.status()).toBe(200);expect((await linked.json()).linked).toBe(true);
 const conflict=await request.put(path,{headers:await headers('C'),data:{employee_id:(await optionsC.json()).data[1].id}});expect(conflict.status()).toBe(409);
 const foreign=await request.put(path,{headers:await headers('C'),data:{employee_id:selected.data[0].id}});expect(foreign.status()).toBe(404);
 const unlinked=await request.delete(path,{headers:await headers('C')});expect(unlinked.status()).toBe(200);expect((await unlinked.json()).linked).toBe(false);
 const wrong=await request.post('/api/v1/auth/change-password',{headers:await headers(),data:{current_password:'wrong',password:'Synthetic-New-Password-123',password_confirmation:'Synthetic-New-Password-123'}});expect(wrong.status()).toBe(422);
 const short=await request.post('/api/v1/auth/change-password',{headers:await headers(),data:{current_password:'password',password:'short',password_confirmation:'short'}});expect(short.status()).toBe(422);
 const changed=await request.post('/api/v1/auth/change-password',{headers:await headers(),data:{current_password:'password',password:'Synthetic-New-Password-123',password_confirmation:'Synthetic-New-Password-123'}});expect(changed.status()).toBe(200);
 expect((await request.get('/api/v1/auth/profile',{headers:await headers()})).status()).toBe(200);
 await request.post('/api/v1/auth/logout',{headers:await headers()});
 await request.get('/sanctum/csrf-cookie',{headers:auth()});
 const reader=await request.post('/api/v1/auth/login',{headers:{...auth(),'X-XSRF-TOKEN':await csrf()},data:{email:'identity-reader@example.invalid',password:'password'}});expect(reader.status()).toBe(200);
 const readerCompany=(await reader.json()).companies[0].id;
 const readerHeaders={...auth(),'X-XSRF-TOKEN':await csrf(),'X-Company-Id':readerCompany};
 expect((await request.get('/api/v1/platform/employee-link-options',{headers:readerHeaders})).status()).toBe(403);
 expect((await request.put(path,{headers:readerHeaders,data:{employee_id:candidate.id}})).status()).toBe(403);
});
