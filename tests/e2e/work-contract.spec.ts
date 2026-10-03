import { expect, test, type APIRequestContext } from '@playwright/test';
test('Stage 16B.5.1 real work HTTP contract labels navigation lifecycle files and tenancy',async({request,playwright})=>{
  const origin='http://127.0.0.1:8080', admin=await playwright.request.newContext({baseURL:origin}),denied=await playwright.request.newContext({baseURL:origin});
  async function headers(client:APIRequestContext,company?:string,key?:string){const token=(await client.storageState()).cookies.find(c=>c.name==='XSRF-TOKEN')?.value??'';return {Origin:origin,Accept:'application/json','X-XSRF-TOKEN':decodeURIComponent(token),...(company?{'X-Company-Id':company}:{}),...(key?{'Idempotency-Key':key}:{})};}
  async function login(client:APIRequestContext,email:string){await client.get('/sanctum/csrf-cookie',{headers:await headers(client)});const response=await client.post('/api/v1/auth/login',{headers:await headers(client),data:{email,password:'password'}});expect(response.status()).toBe(200);return response.json();}
  const identity=await login(request,'work@example.invalid');await login(admin,'work-admin@example.invalid');await login(denied,'work-denied@example.invalid');
  const company=(letter:string)=>(identity.companies as {id:string;name:string}[]).find(c=>c.name===`Work Company ${letter}`)!.id;
  const A=company('A'),B=company('B'),C=company('C');
  const get=async(client:APIRequestContext,path:string,id=A)=>client.get('/api/v1'+path,{headers:await headers(client,id)});
  const post=async(client:APIRequestContext,path:string,data:unknown,key?:string,id=A)=>client.post('/api/v1'+path,{headers:await headers(client,id,key),data});
  const result=async(response:Awaited<ReturnType<typeof get>>,status=200)=>{expect(response.status()).toBe(status);return response.json();};
  try {
    const list=await result(await get(request,'/employee/tasks?per_page=1'));expect(list.meta.total).toBe(1);const task=list.data[0];expect(task.creator_name).toBe('Work Administrator');expect(task.assignee_name).toBe('Work Employee A');expect(task.assigned_employee_id).toBeNull();expect(task).not.toHaveProperty('employee');expect(task).not.toHaveProperty('creator');
    const management=await result(await get(admin,`/tasks/${task.id}`));expect(management.assigned_employee_id).toBeTruthy();
    expect((await get(admin,'/employee/me')).status()).toBe(403);
    const selfNav=await result(await get(request,'/platform/navigation'));expect(selfNav.visible_keys).toEqual(expect.arrayContaining(['employee.tasks','employee.tickets']));expect(selfNav.visible_keys).not.toContain('hrm.tasks');
    const adminNav=await result(await get(admin,'/platform/navigation'));expect(adminNav.visible_keys).toEqual(expect.arrayContaining(['hrm.tasks','hrm.tickets']));expect(adminNav.visible_keys).not.toContain('crm.tasks');
    const input={assigned_employee_id:management.assigned_employee_id,title:'HTTP created task',description:'Synthetic task',priority:'HIGH',due_date:'2030-10-05'};
    const created=await result(await post(admin,'/tasks',input,'work-task-create'),201);expect((await result(await post(admin,'/tasks',input,'work-task-create'))).id).toBe(created.id);expect((await post(admin,'/tasks',{...input,title:'Changed content'},'work-task-create')).status()).toBe(409);
    const updated=await result(await admin.patch(`/api/v1/tasks/${created.id}`,{headers:await headers(admin,A),data:{version:1,title:'Updated synthetic title'}}));expect(updated.version).toBe(2);
    for(const [kind,id] of [['tasks',task.id],['tickets',(await result(await get(request,'/employee/tickets'))).data[0].id]]){
      const path=`/employee/${kind}/${id}`;
      const comment=await result(await post(request,`${path}/comments`,{body:'Shared HTTP evidence'},`work-comment-${kind}`),201);expect(comment.author).toBe('Work Employee');expect((await result(await post(request,`${path}/comments`,{body:'Shared HTTP evidence'},`work-comment-${kind}`))).id).toBe(comment.id);expect((await post(request,`${path}/comments`,{body:'Changed'},`work-comment-${kind}`)).status()).toBe(409);
      const upload=async(key:string)=>request.post(`/api/v1${path}/attachments`,{headers:await headers(request,A,key),multipart:{file:{name:'proof.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic work evidence')}}});
      const file=await result(await upload(`work-file-${kind}`),201);expect((await result(await upload(`work-file-${kind}`))).id).toBe(file.id);expect(file).not.toHaveProperty('storage_key');expect((await get(request,`${path}/attachments/${file.id}`)).status()).toBe(200);expect((await get(request,`${path}/attachments/${file.id}`,B)).status()).toBe(404);expect((await get(request,`${path}`,B)).status()).toBe(404);
      expect((await result(await get(admin,`/${kind}/${id}/comments`))).data).toHaveLength(1);expect((await result(await get(admin,`/${kind}/${id}/attachments`))).data).toHaveLength(1);
    }
    expect((await post(request,`/employee/tasks/${task.id}/complete`,{version:1})).status()).toBe(409);
    expect((await result(await post(request,`/employee/tasks/${task.id}/start`,{version:1}))).status).toBe('IN_PROGRESS');
    expect((await result(await post(request,`/employee/tasks/${task.id}/complete`,{version:1}),409)).error_code).toBe('WORK_VERSION_STALE');
    expect((await result(await post(request,`/employee/tasks/${task.id}/complete`,{version:2}))).status).toBe('COMPLETED');
    expect((await post(request,`/employee/tasks/${task.id}/comments`,{body:'Closed'},'closed-task-comment')).status()).toBe(409);
    await result(await post(admin,`/tasks/${task.id}/reopen`,{version:3}));expect((await result(await post(admin,`/tasks/${task.id}/cancel`,{version:4}))).status).toBe('CANCELLED');
    const ticketInput={subject:'HTTP ticket',description:'Synthetic support request',category:'Access',priority:'NORMAL'};
    const ticket=await result(await post(request,'/employee/tickets',ticketInput,'work-ticket-create'),201);expect((await result(await post(request,'/employee/tickets',ticketInput,'work-ticket-create'))).id).toBe(ticket.id);
    await result(await post(admin,`/tickets/${ticket.id}/start`,{version:1}));await result(await post(admin,`/tickets/${ticket.id}/resolve`,{version:2}));expect((await result(await post(request,`/employee/tickets/${ticket.id}/close`,{version:3}))).status).toBe('CLOSED');expect((await post(request,`/employee/tickets/${ticket.id}/comments`,{body:'Closed'},'closed-ticket-comment')).status()).toBe(409);await result(await post(admin,`/tickets/${ticket.id}/reopen`,{version:4}));
    const former=(await result(await get(request,'/employee/tasks',B))).data[0];expect((await post(request,`/employee/tasks/${former.id}/start`,{version:1},undefined,B)).status()).toBe(403);expect((await post(request,'/employee/tickets',ticketInput,'former-ticket-create',B)).status()).toBe(403);
    expect((await result(await get(request,'/employee/tasks',C),409)).error_code).toBe('EMPLOYEE_IDENTITY_NOT_LINKED');expect((await get(denied,'/employee/tasks')).status()).toBe(403);expect((await get(denied,'/tasks')).status()).toBe(403);
  }finally{await admin.dispose();await denied.dispose();}
});
