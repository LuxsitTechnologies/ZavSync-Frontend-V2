<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { fbrRepository } from "@/services/fbr/repository";
import { useFbrContext } from "./context";
import { money, decimal } from "./form";
import FbrError from "./FbrError.vue";
import Panel from "@/components/zs/Panel.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
const { company, companyId, current } = useFbrContext();
const invoiceId = String(useRoute().params.id);
const { data: invoice, loading, error, refresh } = useAsyncData(() => fbrRepository.detail(companyId, invoiceId));
const attempts = useAsyncData(() => invoice.value && !invoice.value.is_historical ? fbrRepository.attempts(companyId, invoiceId) : Promise.resolve([]), { watch: [invoice] });
const evidence = useAsyncData(() => invoice.value?.is_historical && company.hasPermission("migration.view") ? fbrRepository.evidence(companyId, invoiceId) : Promise.resolve([]), { watch: [invoice] });
const action = ref<"submit" | "retry" | null>(null);
const submissionKey = crypto.randomUUID();
const uncertain = ref(false);
const { saving, error: mutationError, run } = useMutation(async () => {
  if (!current() || !action.value) return;
  const requested = action.value;
  try {
    await (requested === "retry" ? fbrRepository.retry(companyId, invoiceId) : fbrRepository.submit(companyId, invoiceId, submissionKey));
    uncertain.value = false;
  } catch (cause) {
    uncertain.value = true;
    throw cause;
  } finally {
    if (current()) { action.value = null; await refresh(); }
  }
});
const canSubmit = computed(() => !!invoice.value && !invoice.value.is_historical && !invoice.value.submission_blocked && invoice.value.fbr_reference_number === null && ["not_submitted", "rejected"].includes(invoice.value.fbr_status) && invoice.value.capabilities.provider_submission_enabled && company.hasPermission("pakistan_fbr.submit"));
const canRetry = computed(() => !!invoice.value && !invoice.value.is_historical && invoice.value.fbr_reference_number === null && invoice.value.capabilities.retry_recovery && invoice.value.capabilities.provider_submission_enabled && company.hasPermission("pakistan_fbr.submit"));
const totals = [ ["subtotal", "Subtotal"], ["discount", "Discount"], ["taxable_amount", "Taxable value"], ["sales_tax", "Sales tax"], ["extra_tax", "Extra tax"], ["further_tax", "Further tax"], ["withholding_tax", "Withholding (reported separately)"], ["total", "Invoice total"] ] as const;
function confirm() { if (!saving.value && current() && (action.value === "retry" ? canRetry.value : canSubmit.value)) void run(); }
</script>
<template>
  <div class="space-y-4">
    <FbrError :error="mutationError" />
    <AsyncSection :loading="loading" :error="error" @retry="refresh">
      <template v-if="invoice">
        <Panel :title="invoice.invoice_number" body-class="space-y-3 p-4">
          <template #actions><div class="flex flex-wrap items-center gap-3">
            <RouterLink v-if="invoice.editable && !invoice.is_historical && company.hasPermission('pakistan_fbr.manage') && !saving && !uncertain" :to="`/fbr-invoicing/${invoice.id}/edit`" class="text-sm text-content-brand">Edit draft</RouterLink>
            <ZButton v-if="canSubmit" :disabled="saving" @click="action = 'submit'">Submit to FBR</ZButton>
            <ZButton v-if="canRetry" :disabled="saving" @click="action = 'retry'">Retry submission</ZButton>
            <ZButton variant="outline" :disabled="saving || loading" @click="refresh">Refresh status</ZButton>
          </div></template>
          <p v-if="invoice.is_historical" class="text-sm text-warning">Historical V1 invoice · Read-only. Original header and line values are preserved independently. Submission and recalculation are unavailable.</p>
          <dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div><dt class="text-content-muted">Document state</dt><dd>{{ invoice.document_state }}</dd></div>
            <div><dt class="text-content-muted">FBR status</dt><dd data-testid="fbr-status">{{ invoice.fbr_status }}</dd></div>
            <div><dt class="text-content-muted">FBR reference</dt><dd>{{ invoice.fbr_reference_number ?? 'Not returned' }}</dd></div>
            <div><dt class="text-content-muted">Invoice date / due date</dt><dd>{{ invoice.invoice_date }} / {{ invoice.due_date ?? '—' }}</dd></div>
            <div><dt class="text-content-muted">Buyer</dt><dd>{{ invoice.buyer_snapshot.name }}</dd></div>
            <div><dt class="text-content-muted">NTN / CNIC</dt><dd>{{ invoice.buyer_snapshot.registration_number ?? '—' }}</dd></div>
            <div><dt class="text-content-muted">Buyer registration type</dt><dd>{{ invoice.buyer_snapshot.type }} · not independently verified</dd></div>
            <div><dt class="text-content-muted">Buyer province / address</dt><dd>{{ invoice.buyer_snapshot.province }} / {{ invoice.buyer_snapshot.address ?? '—' }}</dd></div>
            <div><dt class="text-content-muted">Origin / destination</dt><dd>{{ invoice.origin_province }} / {{ invoice.destination_province }}</dd></div>
            <div><dt class="text-content-muted">Document / sales type</dt><dd>{{ invoice.invoice_type }} / {{ invoice.sale_type }}</dd></div>
            <div v-if="invoice.scenario_id"><dt class="text-content-muted">Backend-derived scenario</dt><dd>{{ invoice.scenario_id }}<span v-if="invoice.is_historical"> · derived display, not original submission evidence</span></dd></div>
            <div><dt class="text-content-muted">Created / updated</dt><dd class="break-words">{{ invoice.created_at }} / {{ invoice.updated_at }}</dd></div>
          </dl>
          <p v-if="invoice.notes" class="whitespace-pre-wrap text-sm">{{ invoice.notes }}</p>
          <p v-if="!invoice.capabilities.provider_submission_enabled" class="text-sm text-warning">Provider submission is unavailable pending certification and enablement.</p>
          <p v-if="!company.hasPermission('pakistan_fbr.submit')" class="text-sm text-content-muted">You do not have permission to submit or retry.</p>
          <p v-if="invoice.fbr_status === 'pending'" class="text-sm text-content-secondary">Submission is pending. Refresh for the current state. Recovery during an active server lease may remain pending without sending again.</p>
          <p v-if="uncertain" class="text-sm text-warning">The submission outcome could not be confirmed. Refresh status and use server recovery when available. Do not assume acceptance.</p>
        </Panel>
        <Panel title="Stored invoice lines" body-class="divide-y divide-line">
          <article v-for="line in invoice.lines" :key="line.id" class="p-4">
            <h3 class="font-semibold">{{ line.position }}. {{ line.description }}</h3>
            <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt class="text-content-muted">HS code / UOM</dt><dd>{{ line.hs_code }} / {{ line.unit }}</dd></div>
              <div><dt class="text-content-muted">Quantity / unit price</dt><dd class="num">{{ decimal(line.quantity_milli, 3) }} / {{ money(line.unit_price) }}</dd></div>
              <div><dt class="text-content-muted">Rate / FBR metadata</dt><dd>{{ decimal(line.tax_rate_bps) }}% / {{ line.fbr_rate_id }}</dd></div>
              <div><dt class="text-content-muted">SRO schedule / item</dt><dd>{{ line.sro_schedule_id ?? '—' }} / {{ line.sro_item_id ?? '—' }}</dd></div>
              <div><dt class="text-content-muted">Subtotal / discount</dt><dd class="num">{{ money(line.subtotal) }} / {{ money(line.discount) }}</dd></div>
              <div><dt class="text-content-muted">Taxable value</dt><dd class="num">{{ money(line.taxable_amount) }}</dd></div>
              <div><dt class="text-content-muted">Sales tax</dt><dd class="num">{{ money(line.sales_tax ?? 0) }}</dd></div>
              <div><dt class="text-content-muted">Extra / further tax</dt><dd class="num">{{ money(line.extra_tax) }} / {{ money(line.further_tax) }}</dd></div>
              <div><dt class="text-content-muted">Withholding</dt><dd class="num">{{ money(line.st_withheld) }}</dd></div>
              <div><dt class="text-content-muted">Stored line total</dt><dd class="num">{{ money(line.total) }}</dd></div>
            </dl>
          </article>
        </Panel>
        <Panel title="Backend-authoritative totals" body-class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="[key, label] in totals" :key="key"><p class="text-xs text-content-muted">{{ label }}</p><p class="num font-semibold" :data-testid="`total-${key}`">{{ money(invoice[key]) }}</p></div>
          <div v-if="invoice.historical_amount_paid !== null"><p class="text-xs text-content-muted">Historical paid amount · evidence only</p><p class="num">{{ money(invoice.historical_amount_paid) }}</p></div>
        </Panel>
        <Panel v-if="!invoice.is_historical" title="Submission attempts" body-class="p-4">
          <AsyncSection :loading="attempts.loading.value" :error="attempts.error.value" :empty="!attempts.data.value?.length" empty-title="No submission attempts" @retry="attempts.refresh">
            <article v-for="attempt in attempts.data.value" :key="attempt.id" class="border-b border-line py-3 text-sm">
              <p>{{ attempt.status }} · {{ attempt.created_at }} · {{ attempt.reference_number ?? 'No reference' }}</p>
              <p v-if="attempt.error_message" class="text-danger">{{ attempt.error_message }}</p>
              <details><summary class="cursor-pointer">Sanitized response</summary><pre class="mt-2 whitespace-pre-wrap break-all text-xs">{{ JSON.stringify(attempt.response_metadata, null, 2) }}</pre></details>
            </article>
          </AsyncSection>
        </Panel>
        <Panel v-else title="Historical evidence and reconciliation" body-class="space-y-3 p-4">
          <p class="text-sm">Original status: {{ invoice.historical?.legacy_status ?? '—' }} · Accounting state: {{ invoice.historical?.accounting_state ?? '—' }} · Reconciliation: {{ invoice.historical?.reconciliation_state ?? '—' }}</p>
          <template v-if="company.hasPermission('migration.view')">
            <details v-if="invoice.migration_metadata"><summary class="cursor-pointer">Original values and migration metadata</summary><pre class="whitespace-pre-wrap break-all text-xs">{{ JSON.stringify(invoice.migration_metadata, null, 2) }}</pre></details>
            <AsyncSection :loading="evidence.loading.value" :error="evidence.error.value" :empty="!evidence.data.value?.length" empty-title="No historical FBR evidence returned" @retry="evidence.refresh">
              <article v-for="record in evidence.data.value" :key="record.id" class="border-b border-line py-3 text-sm">
                <p>{{ record.original_status }} / {{ record.normalized_status }} · {{ record.fbr_reference_number ?? 'No reference preserved' }}</p>
                <p v-if="record.requires_review" class="text-warning">Requires review. A historical success without a reference is not confirmed acceptance.</p>
                <p>Retries: {{ record.retry_count }} · Last attempt: {{ record.last_attempt_at ?? '—' }}</p>
                <details><summary class="cursor-pointer">Sanitized historical response</summary><pre class="whitespace-pre-wrap break-all text-xs">{{ JSON.stringify(record.sanitized_response, null, 2) }}</pre></details>
              </article>
            </AsyncSection>
          </template>
          <p v-else>Historical evidence requires migration viewing permission.</p>
        </Panel>
        <Panel title="Unavailable capabilities" body-class="p-4 text-sm text-content-muted">Regulatory printing, QR codes, buyer registration lookup and certified regulatory catalogs are unavailable. This review is not an FBR-certified printout. Real provider certification has not been executed.</Panel>
      </template>
    </AsyncSection>
    <ConfirmDialog :open="action !== null" :title="action === 'retry' ? 'Recover FBR submission?' : 'Submit this FBR invoice?'" :message="action === 'retry' ? 'The server will recover the unresolved attempt using its original identity. An active lease may keep the status pending.' : 'Submit the saved backend-authoritative invoice. Submitted or uncertain records cannot be edited.'" :confirm-label="action === 'retry' ? 'Confirm retry' : 'Confirm submission'" :busy="saving" @cancel="action = null" @confirm="confirm" />
  </div>
</template>
