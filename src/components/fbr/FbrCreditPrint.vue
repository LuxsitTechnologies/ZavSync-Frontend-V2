<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { ApiError } from "@/services/api/client";
import { fbrRepository } from "@/services/fbr/repository";
import { money } from "./form";
import { useFbrContext } from "./context";

type CreditPrintData = {
  document_type: string; watermark: string | null; credit_note_number: string; state: string; issued_on: string; reason: string;
  original_invoice_number: string; original_fbr_reference_number: string | null; fbr_reference_number: string | null;
  seller_snapshot: Record<string, string | null> | null; buyer_snapshot: Record<string, string | null> | null;
  lines: Array<{ id: string; source_snapshot: Record<string, unknown>; taxable_amount: number; sales_tax: number; total: number }>;
  taxable_amount: number; sales_tax: number; extra_tax: number; further_tax: number; st_withheld: number; total: number;
  verification: { fbr_reference_number: string | null; qr_content: string | null };
};
const route = useRoute(), invoiceId = String(route.params.id), creditId = String(route.params.credit);
const { companyId, current } = useFbrContext();
const data = ref<CreditPrintData | null>(null), loading = ref(false), error = ref<ApiError | null>(null);
async function load(): Promise<void> {
  data.value = null; loading.value = true; error.value = null;
  try { const result = await fbrRepository.creditPrintData(companyId, invoiceId, creditId); if (current()) data.value = result as unknown as CreditPrintData; }
  catch (cause) { if (current()) error.value = cause instanceof ApiError ? cause : new ApiError("Credit note print data unavailable."); }
  finally { if (current()) loading.value = false; }
}
const printDocument = () => window.print();
void load();
</script>
<template>
  <div class="space-y-4">
    <div class="print:hidden flex gap-3"><RouterLink :to="`/fbr-invoicing/${invoiceId}`" class="underline">Back to Source Invoice</RouterLink><ZButton v-if="data" variant="outline" @click="printDocument">Print / Save as PDF</ZButton></div>
    <p v-if="loading" role="status">Loading preserved credit note data…</p>
    <p v-if="error" role="alert">{{ error.message }} <ZButton variant="outline" @click="load">Retry</ZButton></p>
    <Panel v-if="data" title="FBR CREDIT NOTE" body-class="space-y-4 p-6 print:p-0">
      <p v-if="data.watermark" class="font-bold text-warning">{{ data.watermark }}</p>
      <p>Credit Note: {{ data.credit_note_number }} · {{ data.state }} · {{ data.issued_on }}</p>
      <p>Original Invoice: {{ data.original_invoice_number }} · Original FBR Reference: {{ data.original_fbr_reference_number ?? 'Unavailable' }}</p>
      <p>Credit FBR Reference: {{ data.verification.fbr_reference_number ?? 'Not assigned' }}</p>
      <div class="grid gap-4 sm:grid-cols-2"><section><h2 class="font-semibold">Seller</h2><p>{{ data.seller_snapshot?.business_name ?? 'Unavailable' }}</p><p>{{ data.seller_snapshot?.address ?? '' }}</p><p>NTN / CNIC {{ data.seller_snapshot?.tax_identifier ?? 'Unavailable' }}</p></section><section><h2 class="font-semibold">Buyer</h2><p>{{ data.buyer_snapshot?.name ?? 'Unavailable' }}</p><p>{{ data.buyer_snapshot?.address ?? '' }}</p><p>NTN / CNIC {{ data.buyer_snapshot?.registration_number ?? 'Unavailable' }}</p></section></div>
      <p>Reason: {{ data.reason }}</p>
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th>Original Line</th><th>HS Code / Description</th><th>Taxable Amount</th><th>Sales Tax</th><th>Total Reversal</th></tr></thead><tbody><tr v-for="line in data.lines" :key="line.id"><td>{{ line.source_snapshot.position ?? '—' }}</td><td>{{ line.source_snapshot.hs_code ?? '—' }} · {{ line.source_snapshot.description ?? '—' }}</td><td>{{ money(line.taxable_amount) }}</td><td>{{ money(line.sales_tax) }}</td><td>{{ money(line.total) }}</td></tr></tbody></table></div>
      <p>Taxable {{ money(data.taxable_amount) }} · Sales tax {{ money(data.sales_tax) }} · Extra tax {{ money(data.extra_tax) }} · Further tax {{ money(data.further_tax) }} · Withheld {{ money(data.st_withheld) }}</p>
      <p class="font-semibold">Full Reversal Total: {{ money(data.total) }}</p>
      <p v-if="!data.verification.qr_content">No certified FBR QR was returned.</p>
      <p class="text-xs">Private copy — this is not an FBR-certified PDF.</p>
    </Panel>
  </div>
</template>
