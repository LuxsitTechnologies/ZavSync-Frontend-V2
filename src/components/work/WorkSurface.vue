<script setup lang="ts">
import { computed, ref } from 'vue';
import PageHeader from '@/components/zs/PageHeader.vue';
import Panel from '@/components/zs/Panel.vue';
import Field from '@/components/zs/Field.vue';
import ZButton from '@/components/zs/ZButton.vue';
import ConfirmDialog from '@/components/zs/ConfirmDialog.vue';
import WorkEvidence from './WorkEvidence.vue';
import { useCompanyStore } from '@/stores/company';
import { useWorkContext } from '@/composables/useWorkContext';
import { employeeWorkRepository } from '@/services/employeeWork.repository';
import { adminWorkRepository } from '@/services/adminWork.repository';
import { workActions, workStatuses, workWritable } from '@/lib/work';
import type { WorkKind, WorkItem, WorkPage, WorkAction, Priority, TaskInput, TicketInput } from '@/types/work';
const props = defineProps<{ kind: WorkKind; admin?: boolean; activeEmployee?: boolean }>();
const company = useCompanyStore();
const repository = props.admin ? adminWorkRepository : employeeWorkRepository;
const permitted = (permission: string) => company.hasModule('payroll') && company.hasPermission(permission);
const prefix = computed(() => `${props.admin ? '' : 'employee.'}${props.kind}`);
const canRead = computed(() => permitted(`${prefix.value}.view`));
const canWrite = (permission: string) => canRead.value && (props.admin || props.activeEmployee) && permitted(permission);
const canCreate = computed(() => props.admin ? props.kind === 'tasks' && canWrite('tasks.manage') && permitted('tasks.assign') : props.kind === 'tickets' && canWrite('employee.tickets.create'));
const canTransition = computed(() => canWrite(props.admin ? `${props.kind}.manage` : props.kind === 'tasks' ? 'employee.tasks.update' : 'employee.tickets.comment'));
const canComment = computed(() => !!detail.value && workWritable(props.kind,detail.value.status) && canWrite(props.admin ? `${props.kind}.manage` : `${prefix.value}.comment`));
const canEdit = computed(() => props.admin && props.kind === 'tasks' && !!detail.value && workWritable('tasks',detail.value.status) && canWrite('tasks.manage'));
const canAssign = computed(() => props.admin && props.kind === 'tasks' && !!detail.value && workWritable('tasks',detail.value.status) && canWrite('tasks.assign'));
const list = ref<WorkPage | null>(null), detail = ref<WorkItem | null>(null), selected = ref(''), status = ref(''), filter = ref('');
const mode = ref<'create'|'edit'|null>(null), notice = ref(''), action = ref<WorkAction | null>(null), assignee = ref('');
const empty = () => ({title:'',subject:'',description:'',category:'',priority:'NORMAL' as Priority,due_date:'',assigned_employee_id:''});
const form = ref(empty());
const pending = ref<{key: string; body: TaskInput | TicketInput} | null>(null);
function reset() { list.value = null; detail.value = null; selected.value = ''; status.value = ''; filter.value = ''; mode.value = null; notice.value = ''; action.value = null; assignee.value = ''; form.value = empty(); pending.value = null; }
const context = useWorkContext(reset, load);
const locked = computed(() => context.busy.mutation || !!pending.value);
const actions = computed(() => canTransition.value && detail.value ? workActions(props.kind,detail.value.status,!!props.admin) : []);
function load(page = 1) { if (!canRead.value) return; list.value = null; void context.run('list',(id,signal) => repository.list(id,props.kind,page,status.value,filter.value,signal), value => { list.value = value; }); }
function open(id: string) {
  if (locked.value || !canRead.value) return;
  selected.value = id; detail.value = null; mode.value = null; action.value = null; assignee.value = ''; form.value = empty();
  void context.run('detail',(companyId,signal) => repository.detail(companyId,props.kind,id,signal), value => { detail.value = value; });
}
function refresh() { if (selected.value) open(selected.value); load(list.value?.meta.current_page ?? 1); }
function showCreate() { mode.value = 'create'; form.value = empty(); }
function showEdit() { if (!detail.value) return; mode.value = 'edit'; form.value = {...empty(),title:detail.value.title ?? '',description:detail.value.description ?? '',priority:detail.value.priority,due_date:detail.value.due_date ?? ''}; }
function accepted(value: WorkItem) { context.invalidate('detail'); selected.value = value.id; detail.value = value; action.value = null; mode.value = null; pending.value = null; form.value = empty(); assignee.value = ''; notice.value = 'Server state updated.'; load(); }
function submit() {
  if (context.busy.mutation || !(mode.value === 'create' ? canCreate.value : canEdit.value)) return;
  if (mode.value === 'edit' && detail.value) {
    const body = {title:form.value.title,description:form.value.description,priority:form.value.priority,due_date:form.value.due_date,version:detail.value.version};
    const id = detail.value.id;
    void context.run('mutation',(companyId,signal) => adminWorkRepository.update(companyId,id,body,signal), accepted, reloadFailure); return;
  }
  pending.value ??= {key:crypto.randomUUID(),body:props.admin ? {assigned_employee_id:form.value.assigned_employee_id,title:form.value.title,description:form.value.description,priority:form.value.priority,due_date:form.value.due_date} : {subject:form.value.subject,description:form.value.description,category:form.value.category,priority:form.value.priority}};
  const attempt = pending.value;
  void context.run('mutation',(id,signal) => props.admin ? adminWorkRepository.create(id,attempt.body as TaskInput,attempt.key,signal) : employeeWorkRepository.create(id,attempt.body as TicketInput,attempt.key,signal), accepted, error => {
    if (error.kind !== 'network' && error.kind !== 'server') pending.value = null;
    if (error.status === 409) { notice.value = 'Conflict: reload the register before submitting new content.'; load(); }
  });
}
function reloadFailure() {
  action.value = null; mode.value = null; notice.value = 'The outcome was not confirmed. Authoritative detail has been reloaded; check it before taking another action.';
  // Runs only inside the current context's failure callback.
  if (selected.value) { detail.value = null; void context.run('detail',(id,signal) => repository.detail(id,props.kind,selected.value,signal), value => { detail.value = value; }); }
  load();
}
function transition() {
  if (!detail.value || !action.value || !actions.value.includes(action.value) || locked.value) return;
  const item = detail.value, command = action.value;
  void context.run('mutation',(id,signal) => props.admin ? adminWorkRepository.transition(id,props.kind,item.id,command,item.version,signal) : employeeWorkRepository.transition(id,props.kind,item.id,command as 'start'|'complete'|'close',item.version,signal),accepted,reloadFailure);
}
function assign() {
  if (!canAssign.value || !detail.value || locked.value) return;
  const item = detail.value, employeeId = assignee.value;
  void context.run('mutation',(id,signal) => adminWorkRepository.assign(id,item.id,employeeId,item.version,signal),accepted,reloadFailure);
}
load();
</script>
<template>
  <PageHeader :title="`${admin ? 'Company' : 'My'} ${kind}`" :description="kind === 'tasks' ? 'Assigned work, comments and private evidence.' : 'Support requests and shared responses.'"><template #actions><ZButton v-if="canCreate" :disabled="locked" @click="showCreate">{{ kind === 'tasks' ? 'Create task' : 'Create ticket' }}</ZButton></template></PageHeader>
  <p v-if="company.switching" role="status">Switching company…</p>
  <p v-else-if="!canRead" role="status">{{ kind === 'tasks' ? 'Tasks' : 'Tickets' }} are unavailable in this company.</p>
  <template v-else>
    <p v-if="!admin && !activeEmployee" class="mb-4 text-sm">Historical reads remain available when authorized. Mutation controls require a verified active employee identity.</p>
    <Panel v-if="mode" :title="mode === 'edit' ? 'Edit task' : kind === 'tasks' ? 'New task' : 'New ticket'" body-class="p-4">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
        <Field v-if="kind === 'tasks'" v-model="form.title" label="Task title" required minlength="3" maxlength="255" :disabled="locked" />
        <Field v-else v-model="form.subject" label="Subject" required minlength="3" maxlength="255" :disabled="locked" />
        <Field v-if="kind === 'tickets'" v-model="form.category" label="Category" maxlength="120" :disabled="locked" />
        <div><label for="work-priority" class="label-caps">Priority</label><select id="work-priority" v-model="form.priority" class="field mt-1" :disabled="locked"><option>LOW</option><option>NORMAL</option><option>HIGH</option></select></div>
        <Field v-if="kind === 'tasks'" v-model="form.due_date" label="Due date" type="date" required :disabled="locked" />
        <Field v-if="admin && mode === 'create'" v-model="form.assigned_employee_id" label="Assignee employee UUID" required :disabled="locked" />
        <div class="sm:col-span-2"><label for="work-description" class="label-caps">Description</label><textarea id="work-description" v-model="form.description" class="field" :required="kind === 'tickets'" :minlength="kind === 'tickets' ? 3 : undefined" maxlength="10000" :disabled="locked" /></div>
        <p v-if="pending" class="text-sm">Original content and key retained. Retry submits the same request.</p>
        <div class="flex gap-2"><ZButton type="submit" :disabled="context.busy.mutation">{{ pending ? 'Retry same creation' : mode === 'edit' ? 'Save task' : 'Submit creation' }}</ZButton><ZButton variant="outline" :disabled="locked" @click="mode = null">Dismiss form</ZButton></div>
      </form>
    </Panel>
    <Panel title="Register" class="mt-4" body-class="p-4">
      <form class="mb-4 flex flex-wrap items-end gap-3" @submit.prevent="load()"><div><label for="work-status" class="label-caps">Status filter</label><select id="work-status" v-model="status" class="field mt-1"><option value="">All statuses</option><option v-for="value in workStatuses[kind]" :key="value" :value="value">{{ value.replaceAll('_',' ') }}</option></select></div><Field v-if="admin" v-model="filter" label="Employee UUID filter" /><ZButton variant="outline" type="submit">Filter</ZButton></form>
      <p v-if="context.busy.list" role="status">Loading {{ kind }}…</p>
      <p v-else-if="context.errors.list" role="alert">{{ context.errors.list.errorCode === 'EMPLOYEE_IDENTITY_NOT_LINKED' ? 'No employee identity is linked to this company membership.' : context.errors.list.message }} <button class="underline" @click="load()">Retry list</button></p>
      <template v-else-if="list"><p class="mb-3 text-xs text-content-muted">{{ list.meta.total }} matching records</p><ul class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><li v-for="item in list.data" :key="item.id" class="min-w-0 break-words rounded-lg border border-line p-4"><div class="mb-2 flex flex-wrap gap-2"><span class="zs-badge badge-neutral">{{ item.status.replaceAll('_',' ') }}</span><span class="zs-badge badge-neutral">{{ item.priority }}</span></div><h2 class="font-semibold">{{ item.title ?? item.subject }}</h2><template v-if="kind === 'tasks'"><p class="mt-2 text-xs">Due {{ item.due_date }}</p><p class="text-xs">Created by {{ item.creator_name ?? 'Label unavailable' }}</p><p class="text-xs">Assigned to {{ item.assignee_name ?? 'Label unavailable' }}</p></template><p v-else class="text-xs">{{ item.category ?? 'No category' }}</p><ZButton class="mt-3" variant="outline" :disabled="locked" @click="open(item.id)">View {{ kind === 'tasks' ? 'task' : 'ticket' }}</ZButton></li></ul><p v-if="!list.data.length">No matching {{ kind }}.</p><div class="mt-4 flex flex-wrap items-center gap-3"><ZButton variant="outline" :disabled="list.meta.current_page <= 1" @click="load(list.meta.current_page - 1)">Previous</ZButton><span class="text-sm">Page {{ list.meta.current_page }} of {{ list.meta.last_page }}</span><ZButton variant="outline" :disabled="list.meta.current_page >= list.meta.last_page" @click="load(list.meta.current_page + 1)">Next</ZButton></div></template>
    </Panel>
    <p v-if="context.busy.detail" role="status" class="mt-4">Loading detail…</p><p v-if="context.errors.detail" role="alert" class="mt-4">{{ context.errors.detail.message }} <button class="underline" @click="open(selected)">Retry detail</button></p>
    <Panel v-if="detail" title="Work detail" class="mt-4" body-class="p-4">
      <div class="min-w-0 space-y-3 break-words"><h2 class="text-lg font-semibold">{{ detail.title ?? detail.subject }}</h2><p data-testid="work-detail-status" class="zs-badge badge-neutral">{{ detail.status.replaceAll('_',' ') }}</p><p class="text-sm">Priority: {{ detail.priority }}</p><template v-if="kind === 'tasks'"><p>Created by {{ detail.creator_name ?? 'Label unavailable' }} · Assigned to {{ detail.assignee_name ?? 'Label unavailable' }}</p><p>Due {{ detail.due_date }}</p></template><p v-else>Category: {{ detail.category ?? 'No category' }}</p><p class="whitespace-pre-wrap">{{ detail.description }}</p>
        <div class="flex flex-wrap gap-2"><ZButton v-for="command in actions" :key="command" variant="outline" :disabled="locked" @click="action = command">{{ command }}</ZButton><ZButton v-if="canEdit" variant="outline" :disabled="locked" @click="showEdit">Edit task</ZButton><ZButton variant="outline" :disabled="locked" @click="refresh">Reload detail</ZButton></div>
        <form v-if="canAssign" class="flex flex-wrap items-end gap-3" @submit.prevent="assign"><Field v-model="assignee" label="New assignee employee UUID" required :disabled="locked" /><ZButton type="submit" :disabled="locked">Reassign task</ZButton></form>
      </div>
      <WorkEvidence :key="detail.id" :id="detail.id" :kind="kind" :repository="repository" :writable="canComment" @conflict="refresh" />
    </Panel>
    <p v-if="notice" role="status" class="mt-3">{{ notice }}</p><p v-if="context.errors.mutation" role="alert" class="mt-3">{{ context.errors.mutation.message }} <span v-for="(message,field) in context.errors.mutation.fields" :key="field" class="block">{{ field }}: {{ message }}</span></p>
    <ConfirmDialog :open="!!action" :title="`Confirm ${action ?? ''}`" message="The server will validate and record this transition." confirm-label="Record action" :busy="context.busy.mutation" @cancel="action = null" @confirm="transition" />
  </template>
</template>
