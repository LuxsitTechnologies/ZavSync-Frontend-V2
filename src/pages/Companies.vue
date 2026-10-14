<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import AppShell from "@/components/zs/AppShell.vue";
import Field from "@/components/zs/Field.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import { ApiError } from "@/services/api/client";
import { authRepository } from "@/services/auth.repository";
import { companyRepository } from "@/services/platform/company.repository";
import { useCompanyStore } from "@/stores/company";
import type { CompanyProfile, CompanyProfileInput, CompanyProfilePage, NewCompanyInput, OnboardingPlans } from "@/types/companyProfile";

setPageMeta("Companies", "Company onboarding, profile and authorized administration.");
const company = useCompanyStore();
const plans = ref<OnboardingPlans | null>(null), admin = ref<CompanyProfilePage | null>(null), profile = ref<CompanyProfile | null>(null);
const profileMode = ref<"own" | "pending" | "admin">("own"), search = ref(""), adminPage = ref(1);
const create = reactive<NewCompanyInput>({ name: "", company_size: null, province_code: null, email: null, phone: null, address: null, tax_identifier: null, currency: "PKR", timezone: "Asia/Karachi", country_code: "PK", plan_id: 0, fbr_token: "", fbr_environment: "SANDBOX" });
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = Array.from({ length: 26 * 26 }, (_, index) => String.fromCharCode(65 + Math.floor(index / 26), 65 + index % 26))
  .map(code => ({ code, name: regionNames.of(code) ?? code })).filter(item => item.name !== item.code)
  .sort((a, b) => a.name.localeCompare(b.name));
const pakistanProvinces = [{ code: "SINDH", name: "Sindh" }, { code: "PUNJAB", name: "Punjab" }, { code: "KPK", name: "Khyber Pakhtunkhwa" }, { code: "BALOCHISTAN", name: "Balochistan" }];
const timezones = Intl.supportedValuesOf("timeZone").map(code => ({ code, name: code.replaceAll("_", " ").replaceAll("/", " — ") }));
watch(() => create.country_code, code => { create.currency = code === "PK" ? "PKR" : "USD"; });
const edit = reactive<CompanyProfileInput>({ name: "", company_size: null, province_code: null, email: null, phone: null, address: null, tax_identifier: null });
const creating = ref(false), loading = ref(false), saving = ref(false), error = ref<ApiError | null>(null), message = ref("");
const planError = ref<ApiError | null>(null);
let generation = 0;
let createKey: { payload: string; key: string } | null = null;
const canAdmin = computed(() => !company.switching && company.isPlatformAdmin && company.activeCompany?.approval_status !== "PENDING" && company.hasPermission("platform.companies.view"));
const canEdit = computed(() => profileMode.value === "pending" ? true : profileMode.value === "own"
  ? company.hasPermission("platform.settings.manage")
  : company.companies.some(item => item.id === profile.value?.id && (item.permissions?.includes("platform.settings.manage") || item.permissions?.includes("*"))));
const highRisk = computed(() => profileMode.value === "pending" || (profileMode.value === "admin"
  ? company.companies.some(item => item.id === profile.value?.id && item.permissions?.includes("platform.settings.high-risk"))
  : company.hasPermission("platform.settings.high-risk")));
function current(id: string, version: number, token: number): boolean {
  return generation === token && company.activeCompanyId === id && company.contextVersion === version && !company.switching;
}
function accept(value: CompanyProfile, mode: "own" | "pending" | "admin"): void {
  profile.value = value; profileMode.value = mode;
  edit.name = value.name; edit.company_size = value.company_size; edit.province_code = value.province_code;
  edit.email = value.email; edit.phone = value.phone; edit.address = value.address; edit.tax_identifier = value.tax_identifier;
}
async function load(): Promise<void> {
  const id = company.activeCompanyId, version = company.contextVersion, token = ++generation;
  profile.value = null; admin.value = null; error.value = null; planError.value = null; message.value = ""; loading.value = true;
  const planRequest = companyRepository.onboardingPlans().then(next => {
    if (current(id, version, token)) {
      plans.value = next;
      if (!create.plan_id && next.plans.length) create.plan_id = next.plans[0]!.id;
    }
  }).catch(cause => { if (current(id, version, token)) planError.value = cause instanceof ApiError ? cause : new ApiError("Onboarding plans unavailable."); });
  try {
    const membership = company.activeCompany;
    if (membership?.approval_status === "PENDING" || membership?.approval_status === "REJECTED") {
      const next = await companyRepository.pendingProfile(membership.id);
      if (current(id, version, token)) accept(next, "pending");
    } else if (id) {
      if (company.hasPermission("platform.settings.view")) {
        const next = await companyRepository.ownProfile(id);
        if (current(id, version, token)) accept(next, "own");
      }
      if (canAdmin.value) {
        const next = await companyRepository.adminList(id, search.value, adminPage.value);
        if (current(id, version, token)) admin.value = next;
      }
    }
  } catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("Could not load companies."); }
  finally { await planRequest; if (current(id, version, token)) loading.value = false; }
}
async function createCompany(): Promise<void> {
  if (creating.value || !company.currentUser.email_verified || !create.name.trim() || !create.plan_id) return;
  creating.value = true; error.value = null; message.value = "";
  const input = { ...create };
  if (!input.fbr_token?.trim()) { delete input.fbr_token; delete input.fbr_environment; }
  const payload = JSON.stringify(input);
  if (!createKey || createKey.payload !== payload) createKey = { payload, key: crypto.randomUUID() };
  try {
    const result = await companyRepository.create(input, createKey.key);
    createKey = null;
    create.fbr_token = "";
    message.value = "Company created and pending approval. The 14-day trial begins only after the first approval.";
    create.name = "";
    create.plan_id = 0;
    try { company.hydrate(await authRepository.me()); }
    catch { message.value += " Membership could not reload; refresh before creating another company."; }
    if (result.company.id === company.activeCompanyId) await load();
  } catch (cause) { error.value = cause instanceof ApiError ? cause : new ApiError("Company creation failed."); }
  finally { creating.value = false; }
}
async function save(): Promise<void> {
  if (!profile.value || !canEdit.value || saving.value) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  const target = profile.value.id, expected = profile.value.profile_version, mode = profileMode.value;
  saving.value = true; error.value = null; message.value = "";
  try {
    const response = mode === "pending" ? await companyRepository.updatePendingProfile(target, expected, { ...edit })
      : mode === "own" ? await companyRepository.updateOwnProfile(id, expected, { ...edit })
      : await companyRepository.adminUpdate(id, target, expected, { ...edit });
    if (current(id, version, token)) { accept(response, mode); message.value = "Authoritative company profile saved."; }
  } catch (cause) {
    if (current(id, version, token)) {
      error.value = cause instanceof ApiError ? cause : new ApiError("Profile update failed.");
      if (error.value.errorCode === "COMPANY_PROFILE_VERSION_STALE") await openProfile(target, mode);
    }
  } finally { saving.value = false; }
}
async function openProfile(target: string, mode: "own" | "pending" | "admin"): Promise<void> {
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  error.value = null;
  try {
    const response = mode === "pending" ? await companyRepository.pendingProfile(target)
      : mode === "own" ? await companyRepository.ownProfile(id)
      : await companyRepository.adminDetail(id, target);
    if (current(id, version, token)) accept(response, mode);
  } catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("Company profile unavailable."); }
}
async function transition(kind: "approval" | "activity", value: boolean): Promise<void> {
  if (!profile.value || !canAdmin.value || saving.value) return;
  if (kind === "approval" && !company.hasPermission("platform.companies.approve")) return;
  if (kind === "activity" && !company.hasPermission("platform.companies.activate")) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  const target = profile.value.id, expected = profile.value.profile_version;
  saving.value = true; error.value = null; message.value = "";
  try {
    const response = kind === "approval"
      ? await companyRepository.approve(id, target, expected, value ? "APPROVED" : "REJECTED")
      : await companyRepository.activity(id, target, expected, value);
    if (current(id, version, token)) {
      accept(response, "admin"); message.value = "Company state updated by server.";
      try {
        const next = await companyRepository.adminList(id, search.value, adminPage.value);
        if (current(id, version, token)) admin.value = next;
      } catch { if (current(id, version, token)) message.value += " The company list could not reload; refresh before another change."; }
    }
  } catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("Company transition failed."); }
  finally { saving.value = false; }
}
async function list(page: number): Promise<void> {
  if (!canAdmin.value) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  error.value = null;
  try { const result = await companyRepository.adminList(id, search.value, page); if (current(id, version, token)) { admin.value = result; adminPage.value = page; } }
  catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("Company list unavailable."); }
}
watch([() => company.contextVersion, () => company.switching], () => { void load(); }, { immediate: true, flush: "sync" });
onBeforeUnmount(() => { generation++; createKey = null; create.fbr_token = ""; });
</script>

<template>
  <AppShell>
    <PageHeader title="Companies" :description="`Selected company: ${company.activeCompany?.name ?? 'None'}`" />
    <p class="mb-4 text-sm text-content-secondary">Create a company, then complete its profile before approval.</p>
    <p v-if="error" role="alert" class="panel mb-4 p-4 text-danger">{{ error.message }} <ZButton variant="outline" @click="load">Reload</ZButton></p>
    <p v-if="message" role="status" class="panel mb-4 p-4">{{ message }}</p>
    <p v-if="loading" role="status">Loading company information…</p>
    <div class="grid gap-4 lg:grid-cols-2">
      <Panel title="New Company" body-class="space-y-3 p-4">
        <p v-if="planError" role="alert">{{ planError.message }} <ZButton variant="outline" @click="load">Retry Plans</ZButton></p>
        <p v-if="!company.currentUser.email_verified" role="status">Verify your account email before creating a company. <ZButton variant="outline" @click="companyRepository.resendVerification().then(() => { message = 'If verification is pending, a new email has been sent.' }).catch(cause => { error = cause instanceof ApiError ? cause : new ApiError('Could not resend verification.') })">Resend Verification Email</ZButton></p>
        <form class="space-y-3" @submit.prevent="createCompany">
          <Field v-model="create.name" label="Company name" required :error="error?.fields.name" />
          <div class="grid gap-3 sm:grid-cols-2"><label class="block">Country<select v-model="create.country_code" class="field mt-1 block w-full" required><option v-for="item in countries" :key="item.code" :value="item.code">{{ item.name }}</option></select></label><label class="block">Base currency<input class="field mt-1 block w-full" :value="create.currency === 'PKR' ? 'PKR — Pakistani Rupee' : 'USD — US Dollar'" readonly /><span class="mt-1 block text-xs text-content-muted">Based on the selected billing country.</span></label></div>
          <p v-if="error?.fields.country_code || error?.fields.currency" role="alert" class="text-xs text-danger">{{ error?.fields.country_code ?? error?.fields.currency }}</p>
          <label class="block">Company timezone<select v-model="create.timezone" class="field mt-1 block w-full" required><option v-for="item in timezones" :key="item.code" :value="item.code">{{ item.name }}</option></select></label>
          <Field v-model="create.company_size" label="Company size" :error="error?.fields.company_size" />
          <label class="block">Plan <select v-model.number="create.plan_id" class="field mt-1 block w-full" required><option v-for="item in plans?.plans ?? []" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
          <p v-if="error?.fields.plan_id" role="alert" class="text-xs text-danger">{{ error.fields.plan_id }}</p>
          <Field v-model="create.email" label="Company contact email" type="email" :error="error?.fields.email" />
          <Field v-model="create.phone" label="Phone" :error="error?.fields.phone" />
          <label v-if="create.country_code === 'PK'" class="block">Province<select v-model="create.province_code" class="field mt-1 block w-full"><option :value="null">Select province</option><option v-for="item in pakistanProvinces" :key="item.code" :value="item.code">{{ item.name }}</option></select></label>
          <Field v-else v-model="create.province_code" label="Province or region" :error="error?.fields.province_code" />
          <Field v-model="create.tax_identifier" label="NTN / CNIC" :error="error?.fields.tax_identifier" />
          <label class="block">Registered address <textarea v-model="create.address" class="field mt-1 block w-full" :aria-invalid="!!error?.fields.address"></textarea></label>
          <details><summary class="cursor-pointer">Optional FBR credential at creation</summary><div class="mt-2 space-y-2"><p class="text-xs">Requires a numeric 7- or 13-digit NTN/CNIC, an active province code and seller address. The credential is write-only and starts unverified.</p><label class="block">FBR environment <select v-model="create.fbr_environment" class="field mt-1 block"><option value="SANDBOX">Sandbox</option><option value="PRODUCTION">Production</option></select></label><label class="block">FBR token <input v-model="create.fbr_token" class="field mt-1 block w-full" type="password" autocomplete="off" /></label><p v-if="error?.fields.fbr_token" role="alert" class="text-xs text-danger">{{ error.fields.fbr_token }}</p></div></details>
          <p class="text-xs">Trial: {{ plans ? `${plans.trial_days_after_approval} days` : 'duration loading' }} after first approval. Provider checkout is unavailable during public onboarding.</p>
          <ZButton type="submit" :disabled="creating || !company.currentUser.email_verified || !plans?.plans.length || !create.name.trim() || !create.plan_id">{{ creating ? 'Submitting…' : 'Create Pending Company' }}</ZButton>
        </form>
      </Panel>
      <Panel title="Company Profile" body-class="space-y-3 p-4">
        <p v-if="!profile">Select an accessible approved or pending company to see its profile.</p>
        <template v-else>
          <div class="flex flex-wrap gap-2"><span class="zs-badge badge-neutral">{{ profile.approval_status === 'APPROVED' ? 'Approved' : profile.approval_status === 'PENDING' ? 'Pending approval' : 'Rejected' }}</span><span class="zs-badge" :class="profile.is_active ? 'badge-success' : 'badge-neutral'">{{ profile.is_active ? 'Active' : 'Inactive' }}</span></div>
          <form class="space-y-3" @submit.prevent="save">
            <Field v-model="edit.name" label="Company name" required :disabled="!canEdit" :error="error?.fields.name" />
            <Field v-model="edit.company_size" label="Company size" :disabled="!canEdit" />
            <label v-if="profile.currency === 'PKR'" class="block">Province<select v-model="edit.province_code" class="field mt-1 block w-full" :disabled="!canEdit"><option :value="null">Select province</option><option v-for="item in pakistanProvinces" :key="item.code" :value="item.code">{{ item.name }}</option><option v-if="edit.province_code && !pakistanProvinces.some(item => item.code === edit.province_code)" :value="edit.province_code">{{ edit.province_code }}</option></select></label>
            <Field v-else v-model="edit.province_code" label="Province or region" :disabled="!canEdit" :error="error?.fields.province_code" />
            <Field v-model="edit.email" label="Company contact email" type="email" :disabled="!canEdit" :error="error?.fields.email" />
            <Field v-model="edit.phone" label="Phone" :disabled="!canEdit" />
            <label class="block">Registered address <textarea v-model="edit.address" class="field mt-1 block w-full" :disabled="!canEdit"></textarea></label>
            <Field v-model="edit.tax_identifier" label="NTN / CNIC" :disabled="!canEdit || !highRisk" :error="error?.fields.tax_identifier" />
            <ZButton v-if="canEdit" type="submit" :disabled="saving">Save Profile</ZButton>
          </form>
          <div v-if="profileMode === 'admin' && canAdmin" class="flex flex-wrap gap-2 border-t border-line pt-3">
            <ZButton v-if="company.hasPermission('platform.companies.approve') && profile.approval_status !== 'APPROVED'" :disabled="saving" @click="transition('approval', true)">Approve</ZButton>
            <ZButton v-if="company.hasPermission('platform.companies.approve') && profile.approval_status !== 'REJECTED'" variant="outline" :disabled="saving" @click="transition('approval', false)">Reject</ZButton>
            <ZButton v-if="company.hasPermission('platform.companies.activate') && profile.id !== company.activeCompanyId" variant="outline" :disabled="saving" @click="transition('activity', !profile.is_active)">{{ profile.is_active ? 'Deactivate' : 'Reactivate' }}</ZButton>
          </div>
        </template>
      </Panel>
    </div>
    <Panel v-if="company.companies.some(item => item.approval_status === 'PENDING' || item.approval_status === 'REJECTED')" title="My Pending Companies" body-class="space-y-2 p-4" class="mt-4">
      <div v-for="item in company.companies.filter(entry => entry.approval_status === 'PENDING' || entry.approval_status === 'REJECTED')" :key="item.id" class="flex flex-wrap justify-between gap-2 border-b border-line py-2">
        <p>{{ item.name }} · {{ item.approval_status === 'PENDING' ? 'Pending approval' : 'Rejected' }}. You can review and correct this company's profile.</p>
        <ZButton variant="outline" @click="openProfile(item.id, 'pending')">View Pending Profile</ZButton>
      </div>
    </Panel>
    <Panel v-if="canAdmin" title="Platform Company Administration" body-class="space-y-3 p-4" class="mt-4">
      <form class="flex gap-2" @submit.prevent="list(1)"><label>Search <input v-model="search" class="field ml-2" /></label><ZButton type="submit">Search</ZButton></form>
      <article v-for="item in admin?.data ?? []" :key="item.id" :aria-label="item.name" class="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2"><div class="flex flex-wrap items-center gap-2"><strong>{{ item.name }}</strong><span class="zs-badge badge-neutral">{{ item.approval_status === 'APPROVED' ? 'Approved' : item.approval_status === 'PENDING' ? 'Pending approval' : 'Rejected' }}</span><span class="zs-badge" :class="item.is_active ? 'badge-success' : 'badge-neutral'">{{ item.is_active ? 'Active' : 'Inactive' }}</span></div><ZButton variant="outline" @click="openProfile(item.id, 'admin')">View Profile</ZButton></article>
      <div class="flex gap-2"><ZButton variant="outline" :disabled="adminPage <= 1" @click="list(adminPage - 1)">Previous</ZButton><span>Page {{ adminPage }} of {{ admin?.last_page ?? 1 }}</span><ZButton variant="outline" :disabled="adminPage >= (admin?.last_page ?? 1)" @click="list(adminPage + 1)">Next</ZButton></div>
    </Panel>
  </AppShell>
</template>
