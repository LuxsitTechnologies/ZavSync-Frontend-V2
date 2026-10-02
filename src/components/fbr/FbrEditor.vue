<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { ApiError } from "@/services/api/client";
import { fbrRepository } from "@/services/fbr/repository";
import type { FbrDraft } from "@/types/fbr";
import { useFbrContext } from "./context";
import { blankDraft, blankLine, fromInvoice, toDraft } from "./form";
import FbrReferenceInput from "./FbrReferenceInput.vue";
import FbrError from "./FbrError.vue";
import Panel from "@/components/zs/Panel.vue";
import Field from "@/components/zs/Field.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ZButton from "@/components/zs/ZButton.vue";
const { company, companyId, current } = useFbrContext();
const route = useRoute(), router = useRouter();
const invoiceId = typeof route.params.id === "string" ? route.params.id : null;
const form = ref(blankDraft());
const locked = ref(false);
let key = crypto.randomUUID();
let pending: FbrDraft | null = null;
const { data: invoice, loading, error: loadError, refresh } = useAsyncData(() => invoiceId ? fbrRepository.detail(companyId, invoiceId) : Promise.resolve(null));
watch(invoice, value => { if (value) form.value = fromInvoice(value); });
const refs = useAsyncData(() => company.hasPermission("fbr.configuration.view") ? fbrRepository.references(companyId, form.value.invoice_date || undefined) : Promise.resolve([]), { watch: [() => form.value.invoice_date] });
const { saving, error, fieldErrors, run } = useMutation(async () => {
  if (!current()) return;
  try { pending ??= toDraft(form.value); } catch (cause) { throw new ApiError(cause instanceof Error ? cause.message : "Check the form.", "validation"); }
  locked.value = true;
  try {
    const result = invoiceId ? await fbrRepository.update(companyId, invoiceId, pending) : await fbrRepository.create(companyId, pending, key);
    if (current()) await router.push(`/fbr-invoicing/${result.id}`);
  } catch (cause) {
    if (cause instanceof ApiError && (cause.kind === "validation" || cause.kind === "permission" || cause.kind === "not_found")) {
      pending = null; locked.value = false; key = crypto.randomUUID();
    }
    throw cause;
  }
});
function save() { if (!saving.value && current()) void run(); }
const amountFields = [
  { key: "unit_price", label: "Unit price (PKR)", required: true },
  { key: "discount", label: "Discount (PKR)", required: true },
  { key: "sales_tax", label: "Exact sales tax (PKR)", required: false },
  { key: "extra_tax", label: "Extra tax (PKR)", required: true },
  { key: "further_tax", label: "Further tax (PKR)", required: true },
  { key: "st_withheld", label: "Withholding (PKR)", required: true },
] as const;
</script>
<template>
  <AsyncSection :loading="loading" :error="loadError" @retry="refresh">
    <div v-if="invoiceId && (!invoice?.editable || invoice.is_historical)" class="panel p-6" role="alert">This invoice is read-only. <RouterLink :to="`/fbr-invoicing/${invoiceId}`">View invoice</RouterLink></div>
    <form v-else class="space-y-4" @submit.prevent="save">
      <h2 class="text-lg font-semibold">{{ invoiceId ? 'Edit draft' : 'Create draft' }}</h2>
      <FbrError :error="error" />
      <p v-if="locked && !saving" class="text-sm text-warning" role="status">The save outcome is uncertain. Retry the same saved request below, or inspect the register before starting another draft. Fields remain locked to prevent duplicates.</p>
      <fieldset :disabled="saving || locked" class="space-y-4">
        <Panel title="Buyer and invoice" body-class="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          <Field v-model="form.buyer_snapshot.name" label="Buyer name" aria-label="Buyer name" required maxlength="255" :error="fieldErrors['buyer_snapshot.name']" />
          <Field v-model="form.buyer_snapshot.registration_number" label="NTN / CNIC" aria-label="NTN / CNIC" pattern="[0-9]{7}|[0-9]{13}" maxlength="13" hint="7 or 13 digits. Registration lookup is unavailable." :error="fieldErrors['buyer_snapshot.registration_number']" />
          <label class="block"><span class="label-caps">Buyer registration type</span><select v-model="form.buyer_snapshot.type" class="field mt-1.5"><option>Unregistered</option><option>Registered</option></select></label>
          <Field v-model="form.buyer_snapshot.address" label="Buyer address" aria-label="Buyer address" maxlength="2000" />
          <FbrReferenceInput v-model="form.buyer_snapshot.province" label="Buyer province" category="PROVINCE" :references="refs.data.value ?? []" required :error="fieldErrors['buyer_snapshot.province']" />
          <Field v-model="form.invoice_date" label="Invoice date" aria-label="Invoice date" type="date" required :error="fieldErrors['invoice_date']" />
          <Field v-model="form.due_date" label="Due date" aria-label="Due date" type="date" :min="form.invoice_date" :error="fieldErrors['due_date']" />
          <FbrReferenceInput v-model="form.invoice_type" label="Invoice / document type" category="DOCUMENT_TYPE" :references="refs.data.value ?? []" required />
          <FbrReferenceInput v-model="form.sale_type" label="Sales type" category="SALE_TYPE" :references="refs.data.value ?? []" required />
          <FbrReferenceInput v-model="form.origin_province" label="Origin province" category="PROVINCE" :references="refs.data.value ?? []" required />
          <FbrReferenceInput v-model="form.destination_province" label="Destination province" category="PROVINCE" :references="refs.data.value ?? []" required />
        </Panel>
        <p class="text-xs text-content-muted">Reference suggestions show server-provided codes and provenance. Certified regulatory catalogs and automatic registration verification are unavailable. Enter approved values where suggestions are unavailable.</p>
        <p v-if="refs.loading.value" role="status">Loading reference suggestions…</p>
        <FbrError :error="refs.error.value" />
        <ZButton v-if="refs.error.value" variant="outline" @click="refs.refresh">Retry reference data</ZButton>
        <p v-if="!company.hasPermission('fbr.configuration.view')" class="text-xs text-content-muted">Reference suggestions require reference-data viewing permission.</p>
        <Panel v-for="(line, index) in form.lines" :key="index" :title="`Line ${index + 1}`" body-class="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          <template #actions><ZButton variant="ghost" :disabled="form.lines.length === 1" :aria-label="`Remove line ${index + 1}`" @click="form.lines.splice(index, 1)">Remove line</ZButton></template>
          <Field v-model="line.description" label="Description" aria-label="Description" required maxlength="2000" :error="fieldErrors[`lines.${index}.description`]" />
          <FbrReferenceInput v-model="line.hs_code" label="HS code" category="HS_CODE" :references="refs.data.value ?? []" required />
          <FbrReferenceInput v-model="line.unit" label="UOM" category="UOM" :references="refs.data.value ?? []" required />
          <Field v-model="line.quantity" label="Quantity" aria-label="Quantity" inputmode="decimal" required hint="Up to 3 decimal places." :error="fieldErrors[`lines.${index}.quantity_milli`]" />
          <Field v-for="amount in amountFields" :key="amount.key" v-model="line[amount.key]" :label="amount.label" :aria-label="amount.label" inputmode="decimal" :required="amount.required" :error="fieldErrors[`lines.${index}.${amount.key}`]" :hint="amount.key === 'sales_tax' ? 'Positive amount overrides the rate. Blank or zero uses the backend rate calculation.' : amount.key === 'st_withheld' ? 'Reported separately; does not reduce the invoice total.' : 'Up to 2 decimal places.'" />
          <Field v-model="line.rate" label="Sales tax rate (%)" aria-label="Sales tax rate (%)" inputmode="decimal" required :error="fieldErrors[`lines.${index}.tax_rate_bps`]" />
          <FbrReferenceInput v-model="line.fbr_rate_id" label="FBR rate metadata" category="RATE" :references="refs.data.value ?? []" required />
          <FbrReferenceInput v-model="line.sro_schedule_id" label="SRO schedule" category="SRO_SCHEDULE" :references="refs.data.value ?? []" />
          <FbrReferenceInput v-model="line.sro_item_id" label="SRO item" category="SRO_ITEM" :references="refs.data.value ?? []" />
        </Panel>
        <ZButton variant="outline" :disabled="form.lines.length >= 500" @click="form.lines.push(blankLine())">Add line</ZButton>
        <Field v-model="form.notes" label="Notes" aria-label="Notes" maxlength="5000" />
      </fieldset>
      <p class="text-sm text-content-secondary">Save the draft to review backend-calculated values and totals. Submission is a separate confirmed action.</p>
      <div class="flex flex-wrap gap-3"><ZButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : locked ? 'Retry same save' : 'Save draft and review' }}</ZButton><RouterLink to="/fbr-invoicing" class="self-center text-sm text-content-brand">Back to register</RouterLink></div>
    </form>
  </AsyncSection>
</template>
