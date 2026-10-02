<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ApiError } from "@/services/api/client";
import { identityRepository as api } from "@/services/identity.repository";
import type { AccountProfile, EmployeeSelf, PasswordChange } from "@/types/identity";
import { useIdentityContext } from "./context";
import IdentityError from "./IdentityError.vue";
import Panel from "@/components/zs/Panel.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
const {company, companyId, signal, current} = useIdentityContext();
const profile = ref<AccountProfile|null>(null), employee = ref<EmployeeSelf|null>(null);
const name = ref(''), loading = ref(true), employeeLoading = ref(false), saving = ref(false), changing = ref(false);
const accountError = ref<ApiError|null>(null), employeeError = ref<ApiError|null>(null), passwordError = ref<ApiError|null>(null);
const accountNotice = ref(''), passwordNotice = ref('');
const emptyPasswords = (): PasswordChange => ({current_password:'', password:'', password_confirmation:''});
const passwords = ref(emptyPasswords());
onBeforeUnmount(() => { passwords.value = emptyPasswords(); });
const asError = (cause: unknown) => cause instanceof ApiError ? cause : new ApiError('The request could not be completed.');
function acceptProfile(value: AccountProfile) { if(current()) { profile.value=value;name.value=value.name;company.currentUser.name=value.name; } }
async function loadProfile() {
  loading.value=true;accountError.value=null;
  try { acceptProfile(await api.profile(signal)); } catch(cause) {if(current())accountError.value=asError(cause);}
  finally {if(current())loading.value=false;}
}
async function loadEmployee() {
  employee.value=null;employeeError.value=null;
  if(!companyId || !company.hasPermission('employee.self.view'))return;
  employeeLoading.value=true;
  try {const value=await api.employee(companyId,signal);if(current())employee.value=value;}
  catch(cause){if(current())employeeError.value=asError(cause);}
  finally{if(current())employeeLoading.value=false;}
}
async function saveName() {
  if(saving.value || !current())return;
  saving.value=true;accountError.value=null;accountNotice.value='';
  try {acceptProfile(await api.saveName(name.value,signal));if(current())accountNotice.value='Account name saved.';}
  catch(cause){if(current()){accountError.value=asError(cause);if(profile.value)name.value=profile.value.name;}}
  finally{if(current())saving.value=false;}
}
async function changePassword() {
  if(changing.value || !current())return;
  changing.value=true;passwordError.value=null;passwordNotice.value='';
  try {acceptProfile(await api.password({...passwords.value},signal));if(current())passwordNotice.value='Password changed. Your current browser session remains signed in. API tokens have been revoked; other database sessions must sign in again.';}
  catch(cause){if(current())passwordError.value=asError(cause);}
  finally{passwords.value=emptyPasswords();if(current())changing.value=false;}
}
const employeeFields = [ ['employee_code','Employee code'],['full_name','Name'],['status','Employment status'],['department','Department'],['designation','Designation'],['employment_type','Employment type'],['email','Work email'],['phone','Work phone'],['location','Location'],['joining_date','Joining date'],['leaving_date','Leaving date'] ] as const;
onMounted(() => {void loadProfile();void loadEmployee();});
</script>
<template>
  <div class="space-y-5">
    <Panel title="Account" body-class="space-y-4 p-4">
      <p class="text-sm text-content-secondary">Your account is shared across your company memberships.</p>
      <IdentityError :error="accountError" />
      <p v-if="loading" role="status">Loading account…</p>
      <ZButton v-if="accountError && !profile" variant="outline" @click="loadProfile">Retry account</ZButton>
      <form v-if="profile" class="space-y-4" @submit.prevent="saveName">
        <Field v-model="name" label="Account name" aria-label="Account name" required maxlength="255" :disabled="saving" :error="accountError?.fields.name" />
        <dl class="text-sm"><dt class="text-content-muted">Email (read-only)</dt><dd class="break-all">{{ profile.email }}</dd><dt class="mt-2 text-content-muted">Email verification</dt><dd>{{ profile.email_verified ? 'Verified' : 'Not verified' }}</dd></dl>
        <p v-if="accountNotice" role="status">{{ accountNotice }}</p>
        <ZButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save account name' }}</ZButton>
      </form>
    </Panel>
    <Panel title="Employee profile" body-class="space-y-4 p-4">
      <p class="text-sm">{{ company.activeCompany?.name ?? 'No active company' }} · Read-only employee information</p>
      <p v-if="!companyId">Select a company to view your employee profile.</p>
      <p v-else-if="!company.hasPermission('employee.self.view')">You do not have permission to view an employee self-profile in this company.</p>
      <template v-else>
        <IdentityError :error="employeeError" />
        <ZButton v-if="employeeError" variant="outline" @click="loadEmployee">Retry employee profile</ZButton>
        <p v-if="employeeLoading" role="status">Loading employee profile…</p>
        <p v-else-if="employee && !employee.linked">No employee profile linked. Contact your company administrator.</p>
        <template v-else-if="employee?.employee">
          <p v-if="['terminated','resigned'].includes(employee.employee.status)" class="text-sm">This employment record remains readable. Its status does not disable your account or other company memberships.</p>
          <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><div v-for="[key,label] in employeeFields" :key="key" class="min-w-0"><dt class="text-content-muted">{{ label }}</dt><dd class="break-words">{{ employee.employee[key] ?? '—' }}</dd></div></dl>
        </template>
      </template>
    </Panel>
    <Panel title="Security" body-class="space-y-4 p-4">
      <h2 class="font-semibold">Change password</h2>
      <IdentityError :error="passwordError" />
      <p v-if="passwordNotice" role="status">{{ passwordNotice }}</p>
      <form class="space-y-4" @submit.prevent="changePassword">
        <Field v-model="passwords.current_password" label="Current password" aria-label="Current password" type="password" autocomplete="current-password" required :disabled="changing" :error="passwordError?.fields.current_password" />
        <Field v-model="passwords.password" label="New password" aria-label="New password" type="password" autocomplete="new-password" required minlength="12" :disabled="changing" :error="passwordError?.fields.password" hint="At least 12 characters; different from your current password." />
        <Field v-model="passwords.password_confirmation" label="Confirm new password" aria-label="Confirm new password" type="password" autocomplete="new-password" required minlength="12" :disabled="changing" />
        <ZButton type="submit" :disabled="changing">{{ changing ? 'Changing password…' : 'Change password' }}</ZButton>
      </form>
    </Panel>
  </div>
</template>
