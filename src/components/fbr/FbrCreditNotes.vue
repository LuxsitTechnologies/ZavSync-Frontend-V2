<script setup lang="ts">
import { ref } from "vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { ApiError } from "@/services/api/client";
import { fbrRepository } from "@/services/fbr/repository";
import type { FbrCreditNote, FbrInvoice } from "@/types/fbr";
import { useFbrContext } from "./context";
import { money } from "./form";

const props = defineProps<{ invoice: FbrInvoice }>();
const { company, companyId, current } = useFbrContext();
const notes = ref<FbrCreditNote[]>([]), eligible = ref(false), amount = ref<number | null>(null);
const reason = ref(""), changedReason = ref<Record<string, string>>({});
const loading = ref(false), busy = ref(false), error = ref<ApiError | null>(null), message = ref("");
const confirming = ref<{ action: "delete" | "submit"; credit: string } | null>(null);
const outcome = ref<"ACCEPTED" | "REJECTED">("REJECTED"), evidence = ref(""), reference = ref("");
const attempts = ref<Record<string, Array<{ id: string; status: string; reference_number: string | null; error_message: string | null }>>>({});
const createKeys = new Map<string, string>(), submitKeys = new Map<string, string>(), reconcileKeys = new Map<string, string>();
let generation = 0;
async function load(): Promise<void> {
  const token = ++generation;
  loading.value = true; error.value = null;
  try {
    const result = await fbrRepository.creditNotes(companyId, props.invoice.id);
    if (current() && token === generation) {
      notes.value = result.data; eligible.value = result.eligible; amount.value = result.full_reversal_total;
      for (const item of result.data) changedReason.value[item.id] = item.reason;
    }
  } catch (cause) { if (current() && token === generation) error.value = cause instanceof ApiError ? cause : new ApiError("Credit notes unavailable."); }
  finally { if (current() && token === generation) loading.value = false; }
}
async function act(operation: () => Promise<unknown>, notice: string): Promise<void> {
  if (!current() || busy.value) return;
  const token = generation;
  busy.value = true; error.value = null; message.value = "";
  try {
    await operation();
    if (current() && token === generation) { message.value = notice; await load(); }
  } catch (cause) { if (current() && token === generation) error.value = cause instanceof ApiError ? cause : new ApiError("Credit note action failed."); }
  finally { busy.value = false; }
}
function create(): void {
  const text = reason.value.trim();
  if (!eligible.value || text.length < 3) return;
  let key = createKeys.get(text);
  if (!key) { key = crypto.randomUUID(); createKeys.set(text, key); }
  void act(() => fbrRepository.createCreditNote(companyId, props.invoice.id, text, key), "Full credit note draft created from the original preserved invoice.").then(() => { if (!error.value) { reason.value = ""; createKeys.delete(text); } });
}
function confirm(): void {
  const selected = confirming.value; confirming.value = null;
  if (!selected) return;
  if (selected.action === "delete") void act(() => fbrRepository.deleteCreditNote(companyId, props.invoice.id, selected.credit), "Draft credit note deleted.");
  else {
    let key = submitKeys.get(selected.credit);
    if (!key) { key = crypto.randomUUID(); submitKeys.set(selected.credit, key); }
    void act(() => fbrRepository.submitCreditNote(companyId, props.invoice.id, selected.credit, key), "Credit note submission result received. Refresh evidence before treating it as accepted.");
  }
}
function reconcile(credit: FbrCreditNote): void {
  if (evidence.value.trim().length < 10 || (outcome.value === "ACCEPTED" && !reference.value.trim())) return;
  const body = { outcome: outcome.value, evidence_note: evidence.value.trim(), fbr_reference_number: outcome.value === "ACCEPTED" ? reference.value.trim() : null };
  const identity = JSON.stringify([credit.id, body]);
  let key = reconcileKeys.get(identity);
  if (!key) { key = crypto.randomUUID(); reconcileKeys.set(identity, key); }
  void act(() => fbrRepository.reconcileCreditNote(companyId, props.invoice.id, credit.id, body, key), "Manual reconciliation recorded as audit evidence, not proof of a provider call.");
}
async function showAttempts(credit: string): Promise<void> {
  error.value = null;
  try { const result = await fbrRepository.creditAttempts(companyId, props.invoice.id, credit); if (current()) attempts.value[credit] = result.data; }
  catch (cause) { if (current()) error.value = cause instanceof ApiError ? cause : new ApiError("Attempt evidence unavailable."); }
}
void load();
</script>
<template>
  <Panel title="Full Credit Note" body-class="space-y-4 p-4">
    <p>At most one full reversal may be created for an accepted live source invoice. Original lines, parties and tax values come only from the backend snapshot. No Accounting journal or payment is created.</p>
    <p v-if="error" role="alert" class="text-danger">{{ error.message }} <ZButton variant="outline" @click="load">Reload</ZButton></p>
    <p v-if="message" role="status">{{ message }}</p>
    <AsyncSection :loading="loading" :error="error" :empty="false" @retry="load">
      <div v-if="eligible && company.hasPermission('pakistan_fbr.manage')" class="space-y-2">
        <p>Eligible full reversal: {{ amount === null ? 'Unavailable' : money(amount) }}</p>
        <label class="block">Credit reason <textarea v-model="reason" class="field mt-1 block w-full" minlength="3" maxlength="2000" :disabled="busy"></textarea></label>
        <ZButton :disabled="busy || reason.trim().length < 3" @click="create">Create Full Credit Note Draft</ZButton>
      </div>
      <p v-else-if="!notes.length">No credit note is available for this invoice.</p>
      <article v-for="credit in notes" :key="credit.id" class="space-y-2 border-t border-line pt-3">
        <h3 class="font-semibold">{{ credit.credit_note_number }} · {{ credit.state }}</h3>
        <p>Original {{ credit.original_invoice_number }} · Original FBR reference {{ credit.original_fbr_reference_number ?? 'Unavailable' }} · Total reversal {{ money(credit.total) }}</p>
        <p>Credit FBR reference: {{ credit.fbr_reference_number ?? 'Not assigned' }} · Provider: {{ credit.provider_submission }} · Accounting: {{ credit.accounting_integration }}</p>
        <label class="block">Reason <textarea v-model="changedReason[credit.id]" class="field mt-1 block w-full" :disabled="busy || !credit.capabilities.edit_reason || !company.hasPermission('pakistan_fbr.manage')"></textarea></label>
        <div class="flex flex-wrap gap-2">
          <ZButton v-if="credit.capabilities.edit_reason && company.hasPermission('pakistan_fbr.manage')" variant="outline" :disabled="busy || (changedReason[credit.id]?.trim().length ?? 0) < 3" @click="act(() => fbrRepository.updateCreditNote(companyId, invoice.id, credit.id, changedReason[credit.id]!.trim()), 'Credit reason updated.')">Save Reason</ZButton>
          <ZButton v-if="credit.capabilities.delete && company.hasPermission('pakistan_fbr.manage')" variant="outline" :disabled="busy" @click="confirming = { action: 'delete', credit: credit.id }">Delete Draft</ZButton>
          <ZButton v-if="credit.capabilities.submit && invoice.capabilities.provider_submission_enabled && company.hasPermission('pakistan_fbr.submit')" :disabled="busy" @click="confirming = { action: 'submit', credit: credit.id }">Submit Credit Note</ZButton>
          <ZButton variant="outline" :disabled="busy" @click="showAttempts(credit.id)">Show Attempts</ZButton>
          <RouterLink :to="`/fbr-invoicing/${invoice.id}/credit-notes/${credit.id}/print`" class="self-center text-content-brand underline">View / Print Credit Note</RouterLink>
        </div>
        <p v-if="credit.capabilities.submit && !invoice.capabilities.provider_submission_enabled" class="text-warning">Provider transport is disabled pending certification.</p>
        <div v-if="attempts[credit.id]" class="space-y-1"><p v-for="attempt in attempts[credit.id]" :key="attempt.id">{{ attempt.status }} · {{ attempt.reference_number ?? 'No reference' }} · {{ attempt.error_message ?? '' }}</p></div>
        <div v-if="credit.capabilities.reconcile && company.hasPermission('fbr.reconcile')" class="space-y-2 rounded-md border border-line p-3">
          <p>Manual outcome reconciliation requires external evidence. This records audit evidence; it does not call the FBR provider.</p>
          <label>Outcome <select v-model="outcome" class="field ml-1"><option value="REJECTED">Rejected</option><option value="ACCEPTED">Accepted</option></select></label>
          <label class="block">Evidence note <textarea v-model="evidence" class="field mt-1 block w-full" minlength="10"></textarea></label>
          <label v-if="outcome === 'ACCEPTED'" class="block">Accepted FBR reference <input v-model="reference" class="field mt-1 block w-full" /></label>
          <ZButton :disabled="busy || evidence.trim().length < 10 || (outcome === 'ACCEPTED' && !reference.trim())" @click="reconcile(credit)">Record Evidence and Reconcile</ZButton>
        </div>
      </article>
    </AsyncSection>
    <ConfirmDialog :open="confirming !== null" :title="confirming?.action === 'delete' ? 'Delete draft credit note?' : 'Submit credit note?'" :message="confirming?.action === 'delete' ? 'Only an unattempted draft can be deleted. The original invoice remains unchanged.' : 'This may create an external submission. An uncertain result must be reconciled before another attempt.'" :busy="busy" @cancel="confirming = null" @confirm="confirm" />
  </Panel>
</template>
