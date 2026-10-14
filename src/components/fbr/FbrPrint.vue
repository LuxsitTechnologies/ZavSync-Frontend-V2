<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { formatMoney } from "@/lib/money";
import { ApiError } from "@/services/api/client";
import { fbrRepository } from "@/services/fbr/repository";
import type { FbrPrintData } from "@/types/fbrPrint";
import { useFbrContext } from "./context";

const { companyId, current } = useFbrContext();
const invoiceId = String(useRoute().params.id);
const data = ref<FbrPrintData | null>(null), loading = ref(false), error = ref<ApiError | null>(null);
async function load(): Promise<void> {
  loading.value = true; error.value = null; data.value = null;
  try { const response = await fbrRepository.printData(companyId, invoiceId); if (current()) data.value = response; }
  catch (cause) { if (current()) error.value = cause instanceof ApiError ? cause : new ApiError("Invoice print data unavailable."); }
  finally { if (current()) loading.value = false; }
}
const money = (value: number) => formatMoney(value, data.value?.currency ?? "PKR");
const printDocument = () => window.print();
void load();
</script>
<template>
  <div class="space-y-4">
    <div class="print:hidden flex flex-wrap gap-3"><RouterLink :to="`/fbr-invoicing/${invoiceId}`" class="text-content-brand underline">Back to Invoice</RouterLink><ZButton v-if="data" variant="outline" @click="printDocument">Print / Save as PDF</ZButton></div>
    <p v-if="loading" role="status">Loading preserved invoice print data…</p>
    <p v-if="error" role="alert">{{ error.message }} <ZButton variant="outline" @click="load">Retry</ZButton></p>
    <Panel v-if="data" title="TAX INVOICE" body-class="space-y-6 p-6 print:p-0">
      <p v-if="data.watermark" class="text-center font-bold text-warning">{{ data.watermark }}</p>
      <p v-if="data.snapshot_status" role="alert" class="text-warning">{{ data.snapshot_status }}. This print view is not a preserved submitted snapshot.</p>
      <p class="text-lg font-semibold">{{ data.seller?.business_name ?? "Seller unavailable" }}</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <section><h2 class="font-semibold">FROM / Seller</h2><p>{{ data.seller?.business_name ?? 'Unavailable' }}</p><p v-if="data.portal?.show_seller_address !== false">{{ data.seller?.address ?? 'Address unavailable' }}</p><p>CNIC / NTN: {{ data.seller?.tax_identifier ?? 'Unavailable' }}</p><p v-if="data.portal?.show_seller_email !== false && data.seller?.email">{{ data.seller.email }}</p><p v-if="data.portal?.show_seller_phone !== false && data.seller?.phone">{{ data.seller.phone }}</p></section>
        <section><h2 class="font-semibold">TO / Buyer</h2><p>{{ data.buyer.name }}</p><p>{{ data.buyer.address ?? 'Address unavailable' }}</p><p v-if="data.buyer.email">{{ data.buyer.email }}</p><p v-if="data.buyer.phone">{{ data.buyer.phone }}</p><p>CNIC / NTN: {{ data.buyer.registration_number ?? 'Unavailable' }}</p><p>Registration: {{ data.buyer_verification.status }}</p></section>
      </div>
      <dl class="grid gap-2 sm:grid-cols-3"><div><dt>Invoice Number</dt><dd>{{ data.invoice_number }}</dd></div><div><dt>Issue Date</dt><dd>{{ data.invoice_date }}</dd></div><div><dt>FBR Status</dt><dd>{{ data.verification.fbr_status }}</dd></div><div><dt>FBR Invoice Number</dt><dd>{{ data.verification.fbr_reference_number ?? 'Not assigned' }}</dd></div></dl>
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th>Sr#</th><th>HS Code / Product Description</th><th>Sale Type</th><th>Qty/UoM</th><th>S.T. Rate</th><th>Price/Unit</th><th>Exclusive S.T. Value</th><th>S.T. Value</th><th>Total Value</th></tr></thead><tbody><tr v-for="line in data.lines" :key="line.position"><td>{{ line.position }}</td><td>{{ line.hs_code }}<br />{{ line.description }}</td><td>{{ line.sales_type }}</td><td>{{ line.quantity_milli / 1000 }} {{ line.unit }}</td><td>{{ line.tax_rate_bps / 100 }}%</td><td>{{ money(line.unit_price) }}</td><td>{{ money(line.taxable_amount) }}</td><td>{{ money(line.tax_amount) }}</td><td>{{ money(line.total) }}</td></tr></tbody></table></div>
      <dl class="ml-auto grid max-w-sm grid-cols-2 gap-2 text-sm"><dt>Subtotal Exclusive of Tax</dt><dd>{{ money(data.taxable_amount) }}</dd><dt>Sales Tax</dt><dd>{{ money(data.sales_tax) }}</dd><dt>Extra Tax</dt><dd>{{ money(data.extra_tax) }}</dd><dt>Further Tax</dt><dd>{{ money(data.further_tax) }}</dd><dt>Sales Tax Withheld</dt><dd>{{ money(data.st_withheld) }}</dd><dt>Net Value Inclusive of Sales Tax</dt><dd>{{ money(data.total) }}</dd><dt class="font-semibold">Grand Total Due</dt><dd class="font-semibold">{{ money(data.total) }}</dd></dl>
      <p v-if="data.notes" class="whitespace-pre-wrap">{{ data.notes }}</p>
      <section><h2 class="font-semibold">FBR Verification</h2><p v-if="!data.verification.qr_content">No certified FBR QR was returned. No QR is displayed.</p><p v-else>Provider verification content is available in the certified response.</p></section>
      <p v-if="data.portal?.declaration">{{ data.portal.declaration }}</p><p v-if="data.portal?.footer">{{ data.portal.footer }}</p><p class="text-xs">Computer-generated document · ZavSync</p>
    </Panel>
  </div>
</template>
