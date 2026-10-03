import { expect, test, type APIRequestContext } from '@playwright/test';

test('Stage 16B.4.1 real leave HTTP contract, ownership and tenant boundaries', async ({ request, playwright }) => {
  const origin = 'http://127.0.0.1:8080';
  const admin = await playwright.request.newContext({ baseURL: origin });
  const denied = await playwright.request.newContext({ baseURL: origin });
  async function headers(client: APIRequestContext, company?: string, key?: string) {
    const token = (await client.storageState()).cookies.find(cookie => cookie.name === 'XSRF-TOKEN')?.value ?? '';
    return { Origin: origin, Accept:'application/json', 'X-XSRF-TOKEN':decodeURIComponent(token), ...(company ? {'X-Company-Id':company} : {}), ...(key ? {'Idempotency-Key':key} : {}) };
  }
  async function login(client: APIRequestContext, email: string) {
    await client.get('/sanctum/csrf-cookie', { headers: await headers(client) });
    const response = await client.post('/api/v1/auth/login', { headers: await headers(client), data:{email,password:'password'} });
    expect(response.status()).toBe(200); return response.json();
  }
  const identity = await login(request,'leave@example.invalid');
  await login(admin,'leave-admin@example.invalid'); await login(denied,'leave-denied@example.invalid');
  const companies = identity.companies as {id:string;name:string}[];
  const company = (letter: string) => companies.find(item=>item.name===`Leave Company ${letter}`)!.id;
  const A=company('A'), B=company('B'), C=company('C');
  const self = '/api/v1/employee/leave', management='/api/v1/leave';
  const get = async (client:APIRequestContext,path:string,id=A) => client.get(path,{headers:await headers(client,id)});
  const post = async (client:APIRequestContext,path:string,data:unknown={},key?:string,id=A) => client.post(path,{headers:await headers(client,id,key),data});
  try {
    expect((await get(request,'/api/v1/employee/me')).status()).toBe(200);
    expect((await get(admin,'/api/v1/employee/me')).status()).toBe(403);
    const typesResponse=await get(request,`${self}/types`); expect(typesResponse.status()).toBe(200);
    const type=(await typesResponse.json()).data.find((item:{name:string})=>item.name==='Certified Rest');
    const date=new Date(); date.setUTCDate(date.getUTCDate()+10); const future=date.toISOString().slice(0,10), year=future.slice(0,4);
    const input={leave_type_id:type.id,start_date:future,end_date:future,day_portion:'FIRST_HALF',reason:'Synthetic medical appointment'};
    const summary=async()=>{const response=await get(request,`${self}/summary?year=${year}`);expect(response.status()).toBe(200);return (await response.json()).data[0];};
    expect((await summary()).available_units).toBe(20);
    const first=await post(request,`${self}/requests`,input,'first');expect(first.status()).toBe(201);const leave=await first.json();expect(leave.units).toBe(1);
    const replay=await post(request,`${self}/requests`,input,'first');expect(replay.status()).toBe(200);expect((await replay.json()).id).toBe(leave.id);
    expect((await post(request,`${self}/requests`,{...input,reason:'Different contents'},'first')).status()).toBe(409);
    const second=await post(request,`${self}/requests`,{...input,day_portion:'SECOND_HALF'},'second');expect(second.status()).toBe(201);const secondId=(await second.json()).id;
    expect((await summary()).pending_units).toBe(2);
    expect((await post(request,`${self}/requests`,input,'overlap')).status()).toBe(409);
    const end=new Date(date);end.setUTCDate(end.getUTCDate()+1);
    expect((await post(request,`${self}/requests`,{...input,end_date:end.toISOString().slice(0,10)},'range')).status()).toBe(422);
    expect((await post(request,`${self}/requests`,{...input,start_date:'2000-01-01',end_date:'2000-01-01'},'past')).status()).toBe(422);
    expect((await get(request,`${self}/requests`)).status()).toBe(200);
    const detail=await get(request,`${self}/requests/${leave.id}`);expect((await detail.json()).events[0].action).toBe('SUBMITTED');
    const uploaded=await request.post(`${self}/requests/${leave.id}/attachments`,{headers:await headers(request,A),multipart:{file:{name:'note.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic evidence')}}});expect(uploaded.status()).toBe(201);const document=(await uploaded.json()).id;
    expect((await get(request,`${self}/requests/${leave.id}/attachments/${document}`)).status()).toBe(200);
    expect((await get(request,`${self}/requests/${leave.id}`,B)).status()).toBe(404);
    expect((await get(request,`${self}/requests/${leave.id}/attachments/${document}`,B)).status()).toBe(404);
    const adminDetail=await get(admin,`${management}/requests/${leave.id}`);expect((await adminDetail.json()).is_own_request).toBe(false);
    const own=(await (await get(admin,`${management}/requests`)).json()).data.find((item:{is_own_request:boolean})=>item.is_own_request);
    expect(own).toBeTruthy();expect((await post(admin,`${management}/requests/${own.id}/approve`)).status()).toBe(403);
    const approved=await post(admin,`${management}/requests/${leave.id}/approve`);expect(approved.status()).toBe(200);expect((await approved.json()).is_own_request).toBe(false);
    const cancellation=await post(request,`${self}/requests/${leave.id}/cancel`);expect((await cancellation.json()).status).toBe('CANCELLATION_PENDING');
    expect((await post(admin,`${management}/requests/${leave.id}/reject-cancellation`)).status()).toBe(422);
    expect((await post(admin,`${management}/requests/${leave.id}/reject-cancellation`,{reason:'Coverage required'})).status()).toBe(200);
    expect((await post(request,`${self}/requests/${leave.id}/cancel`)).status()).toBe(200);
    expect((await post(admin,`${management}/requests/${leave.id}/approve-cancellation`)).status()).toBe(200);
    expect((await post(request,`${self}/requests/${secondId}/cancel`)).status()).toBe(200);
    expect((await summary()).available_units).toBe(20);
    const entitlements = await get(admin,`${management}/entitlements?employee_id=${leave.employee_id}&year=${year}`);
    expect(entitlements.status()).toBe(200); const entitlement = (await entitlements.json()).data[0];
    expect((await post(admin,`${management}/entitlements/${entitlement.id}/adjustments`,{delta_units:-19,reason:'Test low available entitlement'},'reduce')).status()).toBe(201);
    const insufficient = await post(request,`${self}/requests`,{...input,day_portion:'FULL_DAY'},'insufficient');
    expect(insufficient.status()).toBe(409); expect((await insufficient.json()).error_code).toBe('LEAVE_BALANCE_INSUFFICIENT');
    expect((await post(admin,`${management}/entitlements/${entitlement.id}/adjustments`,{delta_units:19,reason:'Restore test entitlement'},'restore')).status()).toBe(201);
    const full=await post(request,`${self}/requests`,{...input,day_portion:'FULL_DAY'},'full');expect(full.status()).toBe(201);const fullLeave=await full.json();expect(fullLeave.units).toBe(2);
    expect((await post(admin,`${management}/requests/${fullLeave.id}/reject`,{reason:'Operational requirements'})).status()).toBe(200);
    const unpaidType=await post(admin,`${management}/types`,{name:'Unpaid HTTP',is_paid:false});expect(unpaidType.status()).toBe(201);
    const unpaid=await post(request,`${self}/requests`,{...input,leave_type_id:(await unpaidType.json()).id,end_date:end.toISOString().slice(0,10),day_portion:'FULL_DAY'},'unpaid');expect(unpaid.status()).toBe(201);expect((await unpaid.json()).units).toBe(4);expect((await summary()).available_units).toBe(20);
    expect((await (await get(request,`${self}/holidays`)).json()).data[0].name).toBe('Local Day A');
    const formerTypes=(await (await get(request,`${self}/types`,B)).json()).data;
    expect((await get(request,`${self}/requests`,B)).status()).toBe(200);
    expect((await post(request,`${self}/requests`,{...input,leave_type_id:formerTypes[0].id},'former',B)).status()).toBe(403);
    expect((await get(request,`${self}/summary`,C)).status()).toBe(409);
    expect((await get(denied,`${self}/summary`)).status()).toBe(403);
    expect((await post(denied,`${management}/requests/${leave.id}/approve`)).status()).toBe(403);
  } finally { await admin.dispose(); await denied.dispose(); }
});
