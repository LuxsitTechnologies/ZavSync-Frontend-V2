<script setup lang="ts">
import { computed, ref } from "vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useWorkContext } from "@/composables/useWorkContext";
import { payrollRepository } from "@/services/payroll/payroll.repository";
import { useCompanyStore } from "@/stores/company";
import type { EmployeeBeneficiaryAccount, EmployeeBeneficiaryInput } from "@/types/payroll";

const props = defineProps<{ employeeId: string }>();
const company = useCompanyStore();
const allowed = computed(() => company.hasModule("payroll") && company.hasPermission("payroll.configure"));
const account = ref<EmployeeBeneficiaryAccount | null>(null);
const validVersion = computed(() => Number.isSafeInteger(account.value?.version) && Number(account.value?.version) >= 1);
const missing = ref(false);
const editing = ref(false);
const confirmingDelete = ref(false);
const notice = ref("");
const localError = ref("");
const emptyForm = (): EmployeeBeneficiaryInput => ({ account_holder_name: "", account_number: "", bank_name: "", branch_name: "", swift_code: null });
const form = ref<EmployeeBeneficiaryInput>(emptyForm());

function resetForm() {
  form.value = emptyForm();
  editing.value = false;
  confirmingDelete.value = false;
}
function reset() {
  account.value = null;
  missing.value = false;
  notice.value = "";
  localError.value = "";
  resetForm();
}
const context = useWorkContext(reset, load);
function load() {
  if (!allowed.value) return;
  account.value = null;
  missing.value = false;
  void context.run("read", (companyId, signal) => payrollRepository.beneficiary(companyId, props.employeeId, signal), value => {
    account.value = value;
  }, error => {
    if (error.status === 404) missing.value = true;
  });
}
function startEdit() {
  if (!account.value || !allowed.value || !validVersion.value) return;
  context.invalidate("mutation");
  form.value = { account_holder_name: account.value.account_holder_name, account_number: "", bank_name: account.value.bank_name, branch_name: account.value.branch_name, swift_code: null };
  localError.value = "";
  notice.value = "";
  editing.value = true;
}
function save() {
  if (!allowed.value || context.busy.mutation || (account.value && (!editing.value || !validVersion.value))) return;
  localError.value = "";
  if (form.value.account_number.replace(/[^A-Za-z0-9]/g, "").length < 4) {
    localError.value = "Account number must contain at least four letters or digits.";
    return;
  }
  const input = { ...form.value, swift_code: form.value.swift_code?.trim() || null };
  const current = account.value;
  void context.run("mutation", (companyId, signal) => current
    ? payrollRepository.updateBeneficiary(companyId, props.employeeId, current.id, input, current.version, signal)
    : payrollRepository.createBeneficiary(companyId, props.employeeId, input, signal), value => {
    account.value = value;
    missing.value = false;
    resetForm();
    notice.value = "Beneficiary account saved.";
  }, error => {
    if (error.status === 409 || error.kind === "network" || error.kind === "server") {
      resetForm();
      notice.value = error.status === 409 ? "Account changed. The latest server record is loading; enter replacement details before trying again." : "The outcome is uncertain. Refresh the account before another change; no change was replayed.";
      load();
    }
  });
}
function remove() {
  const current = account.value;
  if (!current || !allowed.value || !validVersion.value || context.busy.mutation) return;
  confirmingDelete.value = false;
  void context.run("mutation", (companyId, signal) => payrollRepository.deleteBeneficiary(companyId, props.employeeId, current.id, current.version, signal), () => {
    account.value = null;
    missing.value = true;
    resetForm();
    notice.value = "Beneficiary account removed.";
  }, error => {
    if (error.status === 409 || error.kind === "network" || error.kind === "server") {
      resetForm();
      notice.value = "The removal was not confirmed. The latest server record is loading.";
      load();
    }
  });
}
load();
</script>

<template>
  <section aria-label="Employee beneficiary banking" class="space-y-4">
    <p class="text-sm text-content-secondary">Payroll administrators only. This beneficiary record is stored separately from payroll profiles and does not change posting or payment instructions.</p>
    <p v-if="!allowed" role="status">Payroll configuration permission and entitlement are required.</p>
    <template v-else>
      <p v-if="notice" role="status" class="text-sm">{{ notice }}</p>
      <p v-if="context.busy.read" role="status">Loading beneficiary account…</p>
      <div v-else-if="context.errors.read && !missing && !account" role="alert" class="space-y-2 text-sm text-danger"><p>{{ context.errors.read.message }}</p><ZButton variant="outline" @click="load">Retry account</ZButton></div>
      <div v-else-if="account" class="rounded-md border border-line p-3 text-sm">
        <p class="font-medium">{{ account.account_holder_name }}</p>
        <p>{{ account.bank_name }} · {{ account.branch_name }}</p>
        <p>Account {{ account.masked_account_number }}</p>
        <p>SWIFT {{ account.swift_configured ? "configured" : "not configured" }}</p>
        <p v-if="!validVersion" role="alert">The account version could not be verified. Refresh before changing it.</p>
        <div class="mt-3 flex gap-2"><ZButton variant="outline" :disabled="context.busy.mutation||!validVersion" @click="startEdit">Edit bank details</ZButton><ZButton variant="outline" :disabled="context.busy.mutation||!validVersion" @click="confirmingDelete=true">Remove bank details</ZButton><ZButton v-if="!validVersion" variant="outline" @click="load">Refresh account</ZButton></div>
      </div>
      <p v-else-if="missing" class="text-sm">No beneficiary account is saved for this employee.</p>
      <form v-if="missing || editing" autocomplete="off" class="space-y-3 rounded-md border border-line p-3" @submit.prevent="save">
        <h3 class="font-semibold">{{ editing ? "Replace beneficiary details" : "Add beneficiary details" }}</h3>
        <p v-if="editing" class="text-xs text-content-secondary">For privacy, the saved account number and SWIFT code cannot be retrieved. Enter the complete replacement values. Leaving SWIFT blank removes it.</p>
        <label class="block text-sm">Account holder<input v-model="form.account_holder_name" class="field mt-1 w-full" maxlength="255" required autocomplete="off" /></label>
        <label class="block text-sm">Account number<input v-model="form.account_number" class="field mt-1 w-full" maxlength="50" minlength="4" required autocomplete="off" spellcheck="false" /></label>
        <label class="block text-sm">Bank name<input v-model="form.bank_name" class="field mt-1 w-full" maxlength="255" required autocomplete="off" /></label>
        <label class="block text-sm">Branch<input v-model="form.branch_name" class="field mt-1 w-full" maxlength="255" required autocomplete="off" /></label>
        <label class="block text-sm">SWIFT (optional)<input v-model="form.swift_code" class="field mt-1 w-full" maxlength="11" autocomplete="off" spellcheck="false" /></label>
        <p v-for="(message, field) in context.errors.mutation?.fields" :key="field" role="alert" class="text-sm text-danger">{{ field }}: {{ message }}</p>
        <p v-if="localError" role="alert" class="text-sm text-danger">{{ localError }}</p>
        <p v-if="context.errors.mutation && !Object.keys(context.errors.mutation.fields).length" role="alert" class="text-sm text-danger">{{ context.errors.mutation.message }}</p>
        <div class="flex gap-2"><ZButton type="submit" :disabled="context.busy.mutation">{{ context.busy.mutation ? "Saving…" : editing ? "Save replacement" : "Add account" }}</ZButton><ZButton v-if="editing" variant="outline" :disabled="context.busy.mutation" @click="resetForm">Cancel</ZButton></div>
      </form>
    </template>
    <ConfirmDialog :open="confirmingDelete" title="Remove beneficiary account" message="Remove this employee's beneficiary account from the selected company? This does not reverse any payroll payment." confirm-label="Remove account" tone="danger" :busy="context.busy.mutation" @confirm="remove" @cancel="confirmingDelete=false" />
  </section>
</template>
