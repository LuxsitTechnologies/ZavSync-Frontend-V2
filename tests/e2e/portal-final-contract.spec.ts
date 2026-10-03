import {test,expect,type APIRequestContext} from '@playwright/test';
test('final portal real HTTP contract: profile files publication teams schedules consent claims and firewalls',async({playwright})=>{
  const origin='http://127.0.0.1:8080';const self=await playwright.request.newContext({baseURL:origin}),peer=await playwright.request.newContext({baseURL:origin}),admin=await playwright.request.newContext({baseURL:origin}),denied=await playwright.request.newContext({baseURL:origin});
  const reader=await playwright.request.newContext({baseURL:origin});
  const clients=[self,peer,admin,denied,reader];
  async function headers(c:APIRequestContext,company?:string,key?:string){const token=(await c.storageState()).cookies.find(x=>x.name==='XSRF-TOKEN')?.value??'';return {Origin:origin,Accept:'application/json','X-XSRF-TOKEN':decodeURIComponent(token),...(company?{'X-Company-Id':company}:{}),...(key?{'Idempotency-Key':key}:{})};}
  async function login(c:APIRequestContext,email:string){await c.get('/sanctum/csrf-cookie');const r=await c.post('/api/v1/auth/login',{headers:await headers(c),data:{email,password:'password'}});expect(r.status()).toBe(200);return r.json();}
  try{
    const identity=await login(self,'final-employee@example.invalid');await login(peer,'final-peer@example.invalid');await login(admin,'final-admin@example.invalid');await login(denied,'final-denied@example.invalid');await login(reader,'final-reader@example.invalid');
    const company=(letter:string)=>(identity.companies as {id:string;name:string}[]).find(c=>c.name==='Final Company '+letter)!.id;const A=company('A'),B=company('B'),C=company('C');
    const get=async(c:APIRequestContext,path:string,company=A)=>c.get('/api/v1'+path,{headers:await headers(c,company)});
    const send=async(c:APIRequestContext,path:string,data:unknown,method='POST',key?:string,company=A)=>c.fetch('/api/v1'+path,{method,headers:await headers(c,company,key),data});
    const json=async(r:Awaited<ReturnType<typeof get>>,status=200)=>{expect(r.status(),await r.text()).toBe(status);return r.json();};
    const upload=async(c:APIRequestContext,path:string,key:string,fields:Record<string,string|number>={})=>c.post('/api/v1'+path,{headers:await headers(c,A,key),multipart:{...fields,file:{name:'proof.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic final portal evidence')}}});
    const me=await json(await get(self,'/employee/me')),other=await json(await get(peer,'/employee/me'));
    expect(me.self_editable).toBe(true);expect((await get(admin,'/employee/me')).status()).toBe(403);
    const profile=await json(await send(self,'/employee/me',{address:'Synthetic address',version:me.employee.self_profile_version},'PATCH'));expect(profile.employee.address).toBe('Synthetic address');
    expect((await send(self,'/employee/me',{address:'Stale',version:me.employee.self_profile_version},'PATCH')).status()).toBe(409);
    expect((await send(self,'/employee/me',{department:'Forbidden',version:profile.employee.self_profile_version},'PATCH')).status()).toBe(422);
    const contactInput={name:'Emergency person',relationship:'Sibling',phone:'555-0100'};const contact=await json(await send(self,'/employee/emergency-contacts',contactInput,'POST','final-contact-key'),201);
    expect((await json(await send(self,'/employee/emergency-contacts',contactInput,'POST','final-contact-key'))).id).toBe(contact.id);expect((await get(peer,'/employee/emergency-contacts/'+contact.id)).status()).toBe(404);
    const editedContact=await json(await send(self,'/employee/emergency-contacts/'+contact.id,{...contactInput,phone:'555-0101',version:contact.version},'PATCH'));expect((await json(await send(self,'/employee/emergency-contacts/'+contact.id,{version:editedContact.version},'DELETE'))).status).toBe('REMOVED');
    const personal=await json(await upload(self,'/employee/documents','final-personal-key'),201);expect((await json(await upload(self,'/employee/documents','final-personal-key'))).id).toBe(personal.id);expect(personal).not.toHaveProperty('storage_key');expect((await get(peer,`/employee/documents/${personal.id}/download`)).status()).toBe(404);
    const issued=await json(await upload(admin,'/hrm/employee-documents','final-issued-key',{employee_id:me.employee.id}),201);expect(issued.released_at).toBeNull();expect((await get(self,`/employee/documents/${issued.id}`)).status()).toBe(404);
    const released=await json(await send(admin,`/hrm/employee-documents/${issued.id}/release`,{}));expect(released.released_at).toBeTruthy();expect((await get(self,`/employee/documents/${issued.id}/download`)).status()).toBe(200);expect((await get(self,`/employee/documents/${issued.id}/download`,B)).status()).toBe(404);
    const announcement=await json(await send(admin,'/hrm/announcements',{title:'Synthetic announcement',description:'Company notice',priority:'NORMAL'},'POST','final-announcement-key'),201);expect((await get(self,`/employee/announcements/${announcement.id}`)).status()).toBe(404);
    const attachment=await json(await upload(admin,`/hrm/announcements/${announcement.id}/attachment`,'final-announcement-file',{version:announcement.version}));
    const published=await json(await send(admin,`/hrm/announcements/${announcement.id}/publish`,{version:attachment.version}));expect(published.status).toBe('PUBLISHED');expect((await get(self,`/employee/announcements/${announcement.id}/attachment`)).status()).toBe(200);
    const directory=await json(await get(self,'/employee/directory?search=Final&per_page=1'));expect(directory.data).toHaveLength(1);expect(Object.keys(directory.data[0]).sort()).toEqual(['id','full_name','department','designation','location'].sort());
    let team=await json(await send(admin,'/hrm/teams',{name:'Synthetic team'},'POST','final-team-key'),201);team=await json(await send(admin,`/hrm/teams/${team.id}/members`,{employee_id:me.employee.id,version:team.version}));team=await json(await send(admin,`/hrm/teams/${team.id}/lead`,{employee_id:me.employee.id,version:team.version},'PATCH'));expect(team.lead.id).toBe(me.employee.id);expect((await json(await get(self,'/employee/my-teams'))).data.some((t:any)=>t.id===team.id)).toBe(true);expect((await get(peer,`/employee/my-teams/${team.id}`)).status()).toBe(404);
    const managerPath=`/hrm/employees/${me.employee.id}/manager`;
    const managerN=await json(await get(admin,managerPath));
    expect(Object.keys(managerN).sort()).toEqual(['employee_id','manager_employee_id','version']);
    expect(managerN.manager_employee_id).toBeNull();expect(managerN.version).toBeGreaterThan(0);
    expect(await json(await get(reader,managerPath))).toEqual(managerN);
    expect((await send(reader,managerPath,{manager_employee_id:other.employee.id,version:managerN.version},'PATCH')).status()).toBe(403);
    const changedManager=await json(await send(admin,managerPath,{manager_employee_id:other.employee.id,version:managerN.version},'PATCH'));
    expect(changedManager).toEqual({employee_id:me.employee.id,manager_employee_id:other.employee.id,version:managerN.version+1});
    const competingManager=await json(await send(admin,managerPath,{manager_employee_id:null,version:changedManager.version},'PATCH'));
    expect(competingManager.version).toBe(changedManager.version+1);
    const staleManager=await json(await send(admin,managerPath,{manager_employee_id:other.employee.id,version:changedManager.version},'PATCH'),409);
    expect(staleManager.error_code).toBe('TEAM_VERSION_STALE');
    expect(await json(await get(admin,managerPath))).toEqual(competingManager);
    expect((await get(denied,managerPath)).status()).toBe(403);
    expect((await get(admin,managerPath,B)).status()).toBe(404);
    expect((await send(admin,managerPath,{manager_employee_id:other.employee.id,version:competingManager.version},'PATCH',undefined,B)).status()).toBe(404);
    const noEntitlement=await json(await get(admin,managerPath,company('D')),403);expect(noEntitlement.error_code).toBe('MODULE_NOT_ENTITLED');
    expect((await send(admin,managerPath,{manager_employee_id:null,version:competingManager.version},'PATCH',undefined,company('D'))).status()).toBe(403);
    const shift=await json(await send(admin,'/hrm/shifts',{name:'Day shift',start_time:'09:00',end_time:'17:00'},'POST','final-shift-key'),201);
    expect((await send(admin,'/hrm/shifts',{name:'Overnight',start_time:'22:00',end_time:'06:00'},'POST','final-overnight-key')).status()).toBe(422);
    const future=new Date(Date.now()+7*86400000),start=future.toISOString().slice(0,10);future.setUTCDate(future.getUTCDate()+1);const end=future.toISOString().slice(0,10);
    const rota=await json(await send(admin,'/hrm/rotas',{name:'Synthetic rota',start_date:start,end_date:end},'POST','final-rota-key'),201);
    const slot1=await json(await send(admin,`/hrm/rotas/${rota.id}/slots`,{shift_id:shift.id,shift_date:start,required_coverage:1},'POST','final-slot-1'),201),slot2=await json(await send(admin,`/hrm/rotas/${rota.id}/slots`,{shift_id:shift.id,shift_date:end,required_coverage:1},'POST','final-slot-2'),201);
    const a1=await json(await send(admin,`/hrm/rota-slots/${slot1.id}/assignments`,{employee_id:me.employee.id},'POST','final-assignment-1'),201),a2=await json(await send(admin,`/hrm/rota-slots/${slot2.id}/assignments`,{employee_id:other.employee.id},'POST','final-assignment-2'),201);
    expect((await json(await get(self,`/employee/schedule?from_date=${start}&to_date=${end}`))).data).toHaveLength(0);await json(await send(admin,`/hrm/rotas/${rota.id}/publish`,{version:rota.version}));const schedule=await json(await get(self,`/employee/schedule?from_date=${start}&to_date=${end}`));expect(schedule.data[0].id).toBe(a1.id);expect(schedule.data[0].timezone).toBe('Asia/Karachi');
    const swap=await json(await send(self,'/employee/shift-swaps',{from_assignment_id:a1.id,to_assignment_id:a2.id,reason:'Synthetic exchange'},'POST','final-swap-key'),201);expect(swap.status).toBe('PENDING_TARGET');expect((await send(admin,`/hrm/shift-swaps/${swap.id}/approve`,{version:swap.version})).status()).toBe(409);
    const accepted=await json(await send(peer,`/employee/shift-swaps/${swap.id}/accept`,{version:swap.version}));expect(accepted.status).toBe('PENDING_ADMIN');const approved=await json(await send(admin,`/hrm/shift-swaps/${swap.id}/approve`,{version:accepted.version}));expect(approved.status).toBe('APPROVED');expect((await json(await get(self,`/employee/schedule?from_date=${start}&to_date=${end}`))).data[0].id).toBe(a2.id);
    const equipment=await json(await send(self,'/employee/asset-requests',{type:'NEW_EQUIPMENT',item_description:'Keyboard',reason:'Synthetic equipment request'},'POST','final-asset-key'),201);const decision=await json(await send(admin,`/hrm/asset-requests/${equipment.id}/approve`,{version:equipment.version}));expect(decision.status).toBe('APPROVED');expect(decision).not.toHaveProperty('issued_at');expect(decision).not.toHaveProperty('inventory_movement_id');
    const category=await json(await send(admin,'/hrm/expense-categories',{name:'Travel'},'POST','final-category-key'),201);const claim=await json(await send(self,'/employee/expense-claims',{category_id:category.id,title:'Train',amount_minor:12345,expense_date:new Date().toISOString().slice(0,10)},'POST','final-claim-key'),201);expect(claim.status).toBe('DRAFT');
    const receipt=await json(await upload(self,`/employee/expense-claims/${claim.id}/receipt`,'final-receipt-key',{version:claim.version}));const submitted=await json(await send(self,`/employee/expense-claims/${claim.id}/submit`,{version:receipt.version}));expect(submitted.status).toBe('SUBMITTED');const approvedClaim=await json(await send(admin,`/hrm/expense-claims/${claim.id}/approve`,{version:submitted.version}));expect(approvedClaim.status).toBe('APPROVED');expect(approvedClaim.amount_minor).toBe(12345);expect(approvedClaim).not.toHaveProperty('payment_id');expect(approvedClaim).not.toHaveProperty('journal_id');expect((await get(admin,`/hrm/expense-claims/${claim.id}/receipt`)).status()).toBe(200);expect((await get(peer,`/employee/expense-claims/${claim.id}/receipt`)).status()).toBe(404);
    for(const path of ['/employee/documents','/employee/announcements','/employee/directory','/employee/my-teams','/employee/asset-requests','/employee/expense-claims']){expect((await get(denied,path)).status()).toBe(403);expect((await get(self,path,C)).status()).toBe(409);}
    expect((await get(self,'/employee/directory',B)).status()).toBe(403);expect((await get(self,'/employee/documents',B)).status()).toBe(200);expect((await send(self,'/employee/asset-requests',{type:'NEW_EQUIPMENT',item_description:'Keyboard',reason:'Former'},'POST','final-former-key',B)).status()).toBe(403);
  }finally{for(const c of clients)await c.dispose();}
});
