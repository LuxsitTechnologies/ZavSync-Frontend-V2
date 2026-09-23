<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { procurementRepository } from "@/services/accounting/procurement.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney } from "@/lib/money";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import type { PurchaseOrder } from "@/types/operations";

setPageMeta("Purchase Order Detail", "Review approval, receiving and accounting impact for a purchase order.");
type Action = "submit" | "approve" | "receive" | "bill";
const company = useCompanyStore();
const route = useRoute();
const orderId = computed(() => String(route.params["id"] ?? ""));
const state = useAsyncData(() => procurementRepository.get(company.activeCompanyId, orderId.value), { watch: [() => company.activeCompanyId, orderId] });
const item = computed(() => state.data.value);
const confirm = ref<Action | null>(null);
const columns: Column[] = [
  { key: "description", header: "Description" }, { key: "quantity", header: "Quantity", align: "right" },
  { key: "unit_cost", header: "Unit cost", align: "right" }, { key: "total", header: "Line total", align: "right" },
];
const actionMutation = useMutation(async (order: PurchaseOrder, action: Action) => {
  if (action === "submit") return procurementRepository.submit(company.activeCompanyId, order.id);
  if (action === "approve") return procurementRepository.approve(company.activeCompanyId, order.id);
  if (action === "receive") return procurementRepository.receiveRemaining(company.activeCompanyId, order);
  return procurementRepository.convertToBill(company.activeCompanyId, order);
});

async function run() {
  if (!item.value || !confirm.value) return;
  const action = confirm.value;
  const result = await actionMutation.run(item.value, action);
  if (!result) return;
  showToast(action === "bill" ? "Supplier bill draft created" : action === "receive" ? "Receipt recorded" : action === "approve" ? "Purchase order approved" : "Purchase order submitted");
  confirm.value = null;
  await state.refresh();
}
</script>

<template>
  <AppShell>
    <AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="!item" empty-title="Purchase order unavailable" empty-message="The purchase order could not be found in this company." @retry="state.refresh">
      <template v-if="item">
        <PageHeader :title="item.number" :description="`${item.supplier} · Ordered ${item.date}`">
          <template #actions>
            <StatusBadge :status="item.status" />
            <ZButton v-if="item.status === 'draft' || item.status === 'rejected'" @click="confirm = 'submit'">Submit</ZButton>
            <ZButton v-if="item.status === 'pending'" @click="confirm = 'approve'">Approve</ZButton>
            <ZButton v-if="item.status === 'approved' || item.status === 'partially_received'" variant="outline" @click="confirm = 'receive'">Record remaining receipt</ZButton>
            <ZButton v-if="item.lines.some((line) => line.received_quantity_milli > line.billed_quantity_milli)" @click="confirm = 'bill'">Convert to bill</ZButton>
          </template>
        </PageHeader>
        <ValidationMessage :message="actionMutation.error.value?.message ?? null" />
        <div class="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <Panel title="Order lines">
            <DataTable :columns="columns" :rows="item.lines" :min-width="620">
              <template #description="{ row }">{{ row.description }}</template>
              <template #quantity="{ row }">{{ row.quantity_milli / 1000 }}</template>
              <template #unit_cost="{ row }">{{ formatMoney(row.unit_price) }}</template>
              <template #total="{ row }">{{ formatMoney(row.total) }}</template>
            </DataTable>
          </Panel>
          <div class="space-y-4">
            <Panel title="Order summary"><dl class="space-y-3 p-4 text-sm">
              <div class="flex justify-between"><dt class="text-content-muted">Owner</dt><dd>{{ item.created_by }}</dd></div>
              <div class="flex justify-between"><dt class="text-content-muted">Expected</dt><dd>{{ item.expected_date || "—" }}</dd></div>
              <div class="flex justify-between"><dt class="text-content-muted">Received</dt><dd>{{ item.received }}%</dd></div>
              <div class="flex justify-between border-t border-line pt-3 font-semibold"><dt>Total</dt><dd>{{ formatMoney(item.total) }}</dd></div>
            </dl></Panel>
            <Panel title="Accounting impact" description="No accounting effect until supplier bill posting"><div class="p-4 text-xs text-content-secondary"><p>Debit Expense / Asset</p><p class="mt-2">Credit Accounts Payable</p><p class="mt-3 text-content-muted">The backend validates tax, period status and account mappings.</p></div></Panel>
          </div>
        </div>
        <ConfirmDialog :open="!!confirm" :title="confirm === 'approve' ? 'Approve purchase order' : confirm === 'receive' ? 'Record remaining receipt' : confirm === 'bill' ? 'Create supplier bill draft' : 'Submit purchase order'" message="The backend validates the current workflow state and records this action in the audit log." confirm-label="Confirm" @cancel="confirm = null" @confirm="run" />
      </template>
    </AsyncSection>
  </AppShell>
</template>
