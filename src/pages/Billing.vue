<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { ApiError } from "@/services/api/client";
import { billingRepository } from "@/services/platform/billing.repository";
import { useCompanyStore } from "@/stores/company";
import type { BillingCatalogue, BillingComponentKind, BillingHistory, BillingInterval, BillingPlan, BillingQuote, BillingSummary, BillingUsage } from "@/types/billing";

setPageMeta("Billing", "Authoritative company plans, usage and provider-backed payments.");
const company = useCompanyStore();
const catalogue = ref<BillingCatalogue | null>(null), summary = ref<BillingSummary | null>(null);
const usage = ref<BillingUsage | null>(null), history = ref<BillingHistory | null>(null), quote = ref<BillingQuote | null>(null);
const plan = ref<BillingPlan>("professional"), interval = ref<BillingInterval>("monthly");
const country = ref("PK"), componentKind = ref<BillingComponentKind>("addon"), componentCode = ref("fbr"), quantity = ref(1);
const reduceTarget = ref<Record<string, number>>({});
const loading = ref(false), busy = ref(false), page = ref(1);
const loadError = ref<ApiError | null>(null), error = ref<ApiError | null>(null), notice = ref("");
const outbound = ref<string | null>(null), invoiceUrl = ref<string | null>(null), pdfUrl = ref<string | null>(null);
const keys = new Map<string, string>();
let generation = 0;
const manage = computed(() => summary.value?.capabilities.manage === true);
const plans = computed(() => Array.from(new Set((catalogue.value?.prices ?? [])
  .filter(row => row.kind === "plan" && row.billing_interval === interval.value)
  .map(row => row.code))) as BillingPlan[]);
const availablePrice = computed(() => catalogue.value?.prices.find(row => row.kind === "plan" && row.code === plan.value && row.billing_interval === interval.value));
const componentPrices = computed(() => catalogue.value?.prices.filter(row => row.kind === componentKind.value && row.billing_interval === (componentKind.value === "seat" ? "monthly" : interval.value)) ?? []);
const providerReady = computed(() => catalogue.value?.provider_ready === true && summary.value?.provider_ready === true);
function current(id: string, version: number, token: number): boolean {
  return !company.switching && company.activeCompanyId === id && company.contextVersion === version && generation === token;
}
function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try { const url = new URL(raw); return url.protocol === "https:" && (url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com")) ? url.toString() : null; }
  catch { return null; }
}
function amount(minor: number | null | undefined, currency = catalogue.value?.billing_currency ?? "PKR"): string {
  return minor === null || minor === undefined ? "provider to calculate" : formatMoney(minor, currency);
}
function keyFor(action: string, payload: unknown): string {
  const identity = JSON.stringify([company.activeCompanyId, action, payload]);
  let key = keys.get(identity);
  if (!key) { key = crypto.randomUUID(); keys.set(identity, key); }
  return key;
}
async function load(): Promise<void> {
  const id = company.activeCompanyId, version = company.contextVersion, token = ++generation;
  catalogue.value = null; summary.value = null; usage.value = null; history.value = null; quote.value = null;
  error.value = null; loadError.value = null; notice.value = ""; outbound.value = null; invoiceUrl.value = null; pdfUrl.value = null; keys.clear();
  if (!id || company.switching) { loading.value = false; return; }
  loading.value = true;
  try {
    const [c, s, u, h] = await Promise.all([billingRepository.catalogue(id), billingRepository.summary(id), billingRepository.usage(id), billingRepository.history(id)]);
    if (current(id, version, token)) {
      catalogue.value = c; summary.value = s; usage.value = u; history.value = h; page.value = 1; country.value = c.country_code ?? "PK";
      interval.value = s.subscription?.billing_interval === "annual" ? "annual" : "monthly";
      const availablePlans = c.prices.filter(row => row.kind === "plan" && row.billing_interval === interval.value).map(row => row.code);
      if (s.subscription?.plan && availablePlans.includes(s.subscription.plan)) plan.value = s.subscription.plan as BillingPlan;
      else if (!availablePlans.includes(plan.value) && availablePlans.length) plan.value = availablePlans[0] as BillingPlan;
      const availableComponents = c.prices.filter(row => row.kind === componentKind.value && row.billing_interval === (componentKind.value === "seat" ? "monthly" : interval.value));
      if (!availableComponents.some(row => row.code === componentCode.value)) componentCode.value = availableComponents[0]?.code ?? "";
    }
  } catch (cause) { if (current(id, version, token)) loadError.value = cause instanceof ApiError ? cause : new ApiError("Could not load billing."); }
  finally { if (current(id, version, token)) loading.value = false; }
}
async function refresh(id: string, version: number, token: number): Promise<void> {
  const [c, s, u, h] = await Promise.all([billingRepository.catalogue(id), billingRepository.summary(id), billingRepository.usage(id), billingRepository.history(id, page.value)]);
  if (current(id, version, token)) { catalogue.value = c; summary.value = s; usage.value = u; history.value = h; }
}
async function run(label: string, request: (id: string) => Promise<unknown>, onResult?: (result: any) => void): Promise<void> {
  if (!manage.value || busy.value) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  busy.value = true; error.value = null; notice.value = "";
  try {
    try {
      const result = await request(id);
      if (!current(id, version, token)) return;
      onResult?.(result);
      notice.value = label + " accepted by server. Payment and entitlement states remain provider-authoritative.";
    } catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError(label + " failed."); }
    if (current(id, version, token) && notice.value) {
      try { await refresh(id, version, token); }
      catch { if (current(id, version, token)) notice.value += " Latest billing details could not reload. Refresh before another change."; }
    }
  }
  finally { busy.value = false; }
}
async function preview(): Promise<void> {
  if (busy.value) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  quote.value = null; error.value = null; busy.value = true;
  try { const result = await billingRepository.quote(id, plan.value, interval.value); if (current(id, version, token)) quote.value = result; }
  catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("Quote unavailable."); }
  finally { busy.value = false; }
}
function checkout(): void {
  const selected = { plan: plan.value, billing_interval: interval.value };
  void run("Plan checkout", id => billingRepository.checkout(id, selected.plan, selected.billing_interval, keyFor("checkout", selected)), result => { outbound.value = safeUrl(result.checkout_url); });
}
function changePlan(): void {
  const selected = { plan: plan.value, billing_interval: interval.value };
  void run("Plan change", id => billingRepository.changePlan(id, selected.plan, selected.billing_interval, keyFor("plan-change", selected)));
}
function buyComponent(): void {
  const selected = { kind: componentKind.value, code: componentCode.value, quantity: componentKind.value === "addon" ? 1 : quantity.value };
  if (!componentPrices.value.some(row => row.code === selected.code && row.checkout_available) || !Number.isInteger(selected.quantity) || selected.quantity < 1 || selected.quantity > 10000) return;
  void run("Component checkout", id => billingRepository.componentCheckout(id, selected.kind, selected.code, selected.quantity, keyFor("component", selected)), result => { outbound.value = safeUrl(result.checkout_url); });
}
function reduceSeats(component: string): void {
  const selected = { component, target_quantity: reduceTarget.value[component] };
  if (!Number.isInteger(selected.target_quantity) || selected.target_quantity < 1) return;
  void run("Seat reduction", id => billingRepository.reduceSeats(id, component, selected.target_quantity, keyFor("reduce-seats", selected)));
}
async function changePage(target: number): Promise<void> {
  if (!history.value || target < 1 || target > history.value.documents.last_page || busy.value) return;
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  busy.value = true; error.value = null;
  try { const result = await billingRepository.history(id, target); if (current(id, version, token)) { history.value = result; page.value = target; } }
  catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("History unavailable."); }
  finally { busy.value = false; }
}
async function documentLinks(document: string): Promise<void> {
  const id = company.activeCompanyId, version = company.contextVersion, token = generation;
  invoiceUrl.value = null; pdfUrl.value = null; error.value = null;
  try { const result = await billingRepository.documentAccess(id, document); if (current(id, version, token)) { invoiceUrl.value = safeUrl(result.hosted_invoice_url); pdfUrl.value = safeUrl(result.pdf_url); } }
  catch (cause) { if (current(id, version, token)) error.value = cause instanceof ApiError ? cause : new ApiError("Document unavailable."); }
}
watch([() => company.contextVersion, () => company.switching], () => { void load(); }, { immediate: true, flush: "sync" });
watch([plan, interval], () => { quote.value = null; outbound.value = null; });
watch([componentKind, interval], () => { componentCode.value = componentPrices.value[0]?.code ?? ""; });
onBeforeUnmount(() => { generation++; keys.clear(); });
</script>

<template>
  <AppShell>
    <PageHeader title="Billing" :description="`Selected company: ${company.activeCompany?.name ?? 'None'}`" />
    <p class="mb-4 text-sm text-content-secondary">Prices, usage and commercial states are server-owned. A successful Stripe return URL never proves payment or activates a module.</p>
    <p v-if="!company.activeCompanyId" role="status" class="panel p-4">Select an approved company.</p>
    <p v-else-if="loading" role="status" class="panel p-4">Loading company billing…</p>
    <div v-else-if="loadError" role="alert" class="panel p-4">{{ loadError.message }} <ZButton variant="outline" @click="load">Retry</ZButton></div>
    <div v-else-if="summary && catalogue && usage && history" class="space-y-4">
      <div v-if="error" role="alert" class="panel p-4 text-danger">{{ error.message }}<p v-if="error.kind === 'network' || error.kind === 'server'" class="text-sm">Outcome may be uncertain. The same selection keeps its idempotency key; reconcile any pending attempt before starting another purchase.</p></div>
      <p v-if="notice" role="status" class="panel p-4">{{ notice }} <ZButton v-if="notice.includes('could not reload')" variant="outline" :disabled="busy" @click="load">Reload Billing</ZButton></p>
      <p v-if="summary.commercial.state === 'READ_ONLY' || summary.commercial.state === 'PAST_DUE_GRACE'" role="status" class="panel p-4">Commercial state: {{ summary.commercial.state }}. Backend entitlements govern write access.</p>
      <div class="grid gap-4 lg:grid-cols-2">
        <Panel title="Current Plan" body-class="space-y-2 p-4">
          <p>State: <strong>{{ summary.commercial.state }}</strong></p>
          <p v-if="summary.subscription">{{ summary.subscription.plan ?? 'Legacy' }} · {{ summary.subscription.billing_interval }} · {{ summary.subscription.status }}</p><p v-else>No base subscription is recorded.</p>
          <p v-if="summary.commercial.trial_ends_at">Trial ends: {{ summary.commercial.trial_ends_at }}</p>
          <p v-if="summary.commercial.paid_period_ends_at">Paid through: {{ summary.commercial.paid_period_ends_at }}</p>
          <p v-if="summary.subscription?.cancel_at_period_end_at">Cancellation scheduled: {{ summary.subscription.cancel_at_period_end_at }}</p>
          <p v-if="summary.latest_checkout">Latest checkout: {{ summary.latest_checkout.status }}</p>
          <ZButton v-if="manage && summary.latest_checkout && summary.latest_checkout.status !== 'ACTIVE'" variant="outline" :disabled="busy" @click="run('Checkout reconciliation', id => billingRepository.reconcileCheckout(id, summary!.latest_checkout!.id))">Reconcile Latest Checkout</ZButton>
          <ZButton v-if="manage && providerReady && summary.subscription && !summary.subscription.cancel_at_period_end_at" variant="outline" :disabled="busy" @click="run('Cancellation', id => billingRepository.cancel(id))">Cancel at Period End</ZButton>
        </Panel>
        <Panel title="Usage and Limits" body-class="space-y-2 p-4">
          <p>Users: {{ usage.users.reserved_total }} reserved ({{ usage.users.pending_invitations }} invited) / {{ usage.users.capacity ?? 'unlimited' }} <strong v-if="usage.users.over_limit">· Over limit</strong></p>
          <p>Employees: {{ usage.employees.active }} / {{ usage.employees.capacity ?? 'unlimited' }} <strong v-if="usage.employees.over_limit">· Over limit</strong></p>
          <p>Storage: {{ usage.storage.used_bytes.toLocaleString() }} / {{ usage.storage.included_bytes?.toLocaleString() ?? 'unlimited' }} bytes <strong v-if="usage.storage.over_limit">· Over limit</strong></p>
          <p>AI {{ usage.ai.period }}: {{ usage.ai.used_tokens }} used + {{ usage.ai.reserved_tokens }} reserved / {{ usage.ai.included_tokens ?? 'not available' }} tokens; {{ usage.ai.remaining_tokens ?? 'not available' }} remaining.</p>
          <p class="text-xs text-content-secondary">Additional storage and paid AI overage are currently unavailable.</p>
        </Panel>
      </div>
      <Panel title="Plans and Pricing" body-class="space-y-3 p-4">
        <div v-if="catalogue.country_confirmation_required">
          <p>Confirm this company's billing country to see prices.</p>
          <label>Country code <input v-model="country" class="field ml-2" maxlength="2" :disabled="!manage || busy" /></label>
          <ZButton v-if="manage" :disabled="busy || !/^[A-Z]{2}$/.test(country)" @click="run('Country confirmation', id => billingRepository.confirmCountry(id, country))">Confirm Country</ZButton>
        </div>
        <template v-else>
          <p>{{ catalogue.country_code }} · {{ catalogue.billing_currency }} · Provider {{ providerReady ? 'configured' : 'unavailable' }} · Prices exclude provider-calculated tax.</p>
          <div class="grid gap-3 sm:grid-cols-3"><article v-for="candidate in plans" :key="candidate" class="rounded-md border border-line p-3"><h2 class="font-semibold capitalize">{{ candidate }}</h2><p>{{ amount(catalogue.prices.find(row => row.kind === 'plan' && row.code === candidate && row.billing_interval === interval)?.unit_amount_minor) }} / {{ interval }}</p><p class="text-xs">{{ catalogue.included_limits[candidate].users }} users · {{ catalogue.included_limits[candidate].employees }} employees · {{ catalogue.included_limits[candidate].storage_mb }} MB</p></article></div>
          <div class="flex flex-wrap gap-2"><label>Plan <select v-model="plan" class="field ml-1"><option v-for="candidate in plans" :key="candidate" :value="candidate">{{ candidate }}</option></select></label><label>Interval <select v-model="interval" class="field ml-1"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label></div>
          <div class="flex flex-wrap gap-2"><ZButton variant="outline" :disabled="busy" @click="preview">Get Server Quote</ZButton><ZButton v-if="manage && summary.subscription?.status !== 'ACTIVE' && availablePrice?.checkout_available" :disabled="busy" @click="checkout">Start Plan Checkout</ZButton><ZButton v-if="manage && summary.subscription?.status === 'ACTIVE' && availablePrice?.checkout_available && summary.subscription.plan !== plan" :disabled="busy" @click="changePlan">Request Plan Change</ZButton></div>
          <div v-if="quote" role="status" class="rounded-md border border-line p-3"><p>Server quote: {{ quote.plan }} / {{ quote.billing_interval }}</p><p v-for="line in quote.lines" :key="line.kind + line.code">{{ line.kind }} {{ line.code }} × {{ line.quantity }}: {{ amount(line.total_minor, quote.currency) }}</p><p>Subtotal {{ amount(quote.subtotal_minor, quote.currency) }} · Discount {{ amount(quote.discount_minor, quote.currency) }} · Tax {{ amount(quote.tax_minor, quote.currency) }} · Total before final provider tax {{ amount(quote.total_minor, quote.currency) }}</p></div>
          <p v-if="!providerReady">Checkout is unavailable until the provider is configured.</p>
        </template>
      </Panel>
      <Panel title="Add-ons and Seats" body-class="space-y-3 p-4">
        <div v-for="item in summary.components" :key="item.id" class="rounded-md border border-line p-3"><p>{{ item.kind }} · {{ item.code }} × {{ item.quantity }} · {{ item.status }}</p><p>Paid through {{ item.paid_through_at }}<span v-if="item.scheduled_quantity !== null"> · Next cycle {{ item.scheduled_quantity }}</span></p><div v-if="manage && providerReady" class="flex flex-wrap gap-2"><ZButton v-if="!item.cancel_at_period_end_at" variant="outline" :disabled="busy" @click="run('Component cancellation', id => billingRepository.cancelComponent(id, item.id))">Cancel at Paid-Term End</ZButton><template v-if="item.kind === 'seat' && item.quantity > 1"><label>Next-cycle seats <input v-model.number="reduceTarget[item.id]" type="number" min="1" :max="item.quantity - 1" class="field w-24" /></label><ZButton variant="outline" :disabled="busy || !Number.isInteger(reduceTarget[item.id]) || reduceTarget[item.id] < 1 || reduceTarget[item.id] >= item.quantity" @click="reduceSeats(item.id)">Reduce Seats</ZButton></template></div></div>
        <div v-if="manage && providerReady && !catalogue.country_confirmation_required" class="flex flex-wrap gap-2"><label>Kind <select v-model="componentKind" class="field ml-1"><option value="addon">Add-on</option><option value="seat">Seat</option></select></label><label>Item <select v-model="componentCode" class="field ml-1"><option v-for="item in componentPrices" :key="item.code" :value="item.code">{{ item.code }} · {{ amount(item.unit_amount_minor) }}</option></select></label><label v-if="componentKind === 'seat'">Quantity <input v-model.number="quantity" type="number" min="1" max="10000" class="field w-24" /></label><ZButton :disabled="busy || !componentPrices.some(row => row.code === componentCode && row.checkout_available)" @click="buyComponent">Start Separate Checkout</ZButton></div>
      </Panel>
      <Panel title="Plan Changes" body-class="space-y-2 p-4"><p v-if="!summary.plan_changes.length">No recent changes.</p><div v-for="change in summary.plan_changes" :key="change.id"><p>{{ change.source_plan ?? 'No plan' }} → {{ change.target_plan }} · {{ change.operation }} · {{ change.status }} <span v-if="change.effective_at">· {{ change.effective_at }}</span></p><ZButton v-if="manage && change.status !== 'APPLIED'" variant="outline" :disabled="busy" @click="run('Plan reconciliation', id => billingRepository.reconcilePlanChange(id, change.id))">Reconcile</ZButton></div></Panel>
      <Panel title="Billing History" body-class="space-y-2 p-4"><p v-if="!history.documents.data.length">No provider documents recorded.</p><div v-for="document in history.documents.data" :key="document.id" class="flex flex-wrap justify-between gap-2 border-b border-line py-2"><p>{{ document.document_type }} · {{ document.provider_status }} · {{ amount(document.total_minor, document.currency) }} · Paid {{ amount(document.paid_minor, document.currency) }} · {{ document.issued_at ?? 'Date unavailable' }}</p><ZButton variant="outline" :disabled="busy" @click="documentLinks(document.id)">Get Document Links</ZButton></div><div class="flex gap-2"><ZButton variant="outline" :disabled="busy || page <= 1" @click="changePage(page - 1)">Previous</ZButton><span>Page {{ page }} of {{ history.documents.last_page }}</span><ZButton variant="outline" :disabled="busy || page >= history.documents.last_page" @click="changePage(page + 1)">Next</ZButton></div><p v-if="invoiceUrl"><a :href="invoiceUrl" target="_blank" rel="noopener noreferrer" class="underline">Open Stripe Invoice</a></p><p v-if="pdfUrl"><a :href="pdfUrl" target="_blank" rel="noopener noreferrer" class="underline">Open Stripe PDF</a></p></Panel>
      <Panel title="Payment Methods" body-class="space-y-2 p-4"><p>Manage cards only in the provider-hosted payment-method portal. ZavSync never handles card numbers.</p><ZButton v-if="manage && providerReady" variant="outline" :disabled="busy" @click="run('Payment-method portal', id => billingRepository.paymentMethodPortal(id), result => { outbound = safeUrl(result.url); })">Get Portal Link</ZButton><p v-if="outbound"><a :href="outbound" target="_blank" rel="noopener noreferrer" class="underline">Continue to Stripe</a> · Return here and reconcile; do not infer success from the redirect.</p></Panel>
    </div>
  </AppShell>
</template>
