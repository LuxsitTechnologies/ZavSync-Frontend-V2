<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ArrowRightLeft, PackagePlus, Plus, SlidersHorizontal, TriangleAlert, Warehouse as WarehouseIcon } from "lucide-vue-next";

import AccountSelect from "@/components/accounting/AccountSelect.vue";
import MoneyInput from "@/components/accounting/MoneyInput.vue";
import AppShell from "@/components/zs/AppShell.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { showToast } from "@/composables/useToast";
import { formatMoney, formatQuantity } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { inventoryRepository } from "@/services/accounting/inventory.repository";
import { useCompanyStore } from "@/stores/company";
import type { InventoryItem, InventoryItemInput, Warehouse, WarehouseInput } from "@/types/accounting";

setPageMeta("Inventory", "Stock on hand by warehouse with reorder levels and FIFO valuation.");

type PanelMode = "item" | "warehouses" | "transfer" | "adjustment" | null;
const company = useCompanyStore();
const query = ref("");
const warehouseFilter = ref("all");
const panel = ref<PanelMode>(null);
const editingItemId = ref<string | null>(null);

const itemsState = useAsyncData(() => inventoryRepository.masterItems(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const warehousesState = useAsyncData(() => inventoryRepository.warehouses(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const valuationState = useAsyncData(() => inventoryRepository.valuation(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const lowState = useAsyncData(() => inventoryRepository.lowStock(company.activeCompanyId), { watch: [() => company.activeCompanyId] });

const itemForm = reactive<InventoryItemInput>({
  sku: "", name: "", description: null, type: "inventory", track_inventory: true, unit: "unit",
  sales_unit: "unit", purchase_unit: "unit", category: null, barcode: null, is_active: true,
  sales_price: 0, default_purchase_cost: 0, reorder_level_milli: 0, reorder_quantity_milli: 0,
  inventory_asset_account_id: null, cogs_account_id: null, sales_account_id: null, inventory_adjustment_account_id: null,
});
const reorderLevelText = ref("0");
const reorderQuantityText = ref("0");
const warehouseForm = reactive<WarehouseInput>({ code: "", name: "", location: null, is_active: true, is_default: false });
const transferForm = reactive({ item_id: "", source_warehouse_id: "", destination_warehouse_id: "", quantity: "", transaction_date: today(), reason: "Warehouse transfer" });
const adjustmentForm = reactive({ item_id: "", warehouse_id: "", direction: "positive" as "positive" | "negative", quantity: "", unit_cost: 0, transaction_date: today(), reason: "Stock count adjustment" });

const itemMutation = useMutation(async () => {
  const input = { ...itemForm, reorder_level_milli: parseQuantityMilli(reorderLevelText.value), reorder_quantity_milli: parseQuantityMilli(reorderQuantityText.value) };
  return editingItemId.value
    ? inventoryRepository.updateItem(company.activeCompanyId, editingItemId.value, input)
    : inventoryRepository.createItem(company.activeCompanyId, input);
});
const warehouseMutation = useMutation(() => inventoryRepository.createWarehouse(company.activeCompanyId, { ...warehouseForm }));
const warehouseStatusMutation = useMutation((warehouse: Warehouse) => inventoryRepository.updateWarehouse(company.activeCompanyId, warehouse.id, { code: warehouse.code, name: warehouse.name, location: warehouse.location, is_active: !warehouse.is_active, is_default: warehouse.is_default }));
const transferMutation = useMutation(() => inventoryRepository.transfer(company.activeCompanyId, { ...transferForm, quantity_milli: parseQuantityMilli(transferForm.quantity) }));
const adjustmentMutation = useMutation(() => inventoryRepository.adjustment(company.activeCompanyId, { ...adjustmentForm, quantity_milli: parseQuantityMilli(adjustmentForm.quantity), unit_cost: adjustmentForm.direction === "positive" ? adjustmentForm.unit_cost : null }));

const rows = computed(() => (valuationState.data.value ?? []).filter((row) => {
  const search = query.value.trim().toLowerCase();
  return (!search || row.name.toLowerCase().includes(search) || row.sku.toLowerCase().includes(search)) && (warehouseFilter.value === "all" || row.warehouse_id === warehouseFilter.value);
}));
const totalValue = computed(() => rows.value.reduce((sum, row) => sum + row.inventory_value, 0));
const low = computed(() => lowState.data.value ?? []);

const columns: Column[] = [
  { key: "sku", header: "SKU", class: "num" }, { key: "name", header: "Item" }, { key: "category", header: "Category" },
  { key: "warehouse", header: "Warehouse" }, { key: "onhand", header: "On hand", align: "right", class: "num" },
  { key: "reorder", header: "Reorder at", align: "right", class: "num" }, { key: "cost", header: "FIFO unit cost", align: "right", class: "num" },
  { key: "status", header: "Status" }, { key: "actions", header: "", align: "right" },
];

function today() { return new Date().toISOString().slice(0, 10); }
function displayQuantity(milli: number) { return formatQuantity(milli / 1000); }
function milliInput(milli: number) { return `${Math.trunc(milli / 1000)}.${String(milli % 1000).padStart(3, "0")}`.replace(/\.0+$/, ""); }
function parseQuantityMilli(raw: string): number {
  const match = raw.trim().match(/^(\d+)(?:\.(\d{0,3}))?$/);
  if (!match) return 0;
  return Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
}
function itemFor(row: { item_id: string }) { return (itemsState.data.value ?? []).find((item) => item.id === row.item_id); }

function openNewItem() {
  editingItemId.value = null;
  Object.assign(itemForm, { sku: "", name: "", description: null, type: "inventory", track_inventory: true, unit: "unit", sales_unit: "unit", purchase_unit: "unit", category: null, barcode: null, is_active: true, sales_price: 0, default_purchase_cost: 0, reorder_level_milli: 0, reorder_quantity_milli: 0, inventory_asset_account_id: null, cogs_account_id: null, sales_account_id: null, inventory_adjustment_account_id: null });
  reorderLevelText.value = "0"; reorderQuantityText.value = "0"; itemMutation.reset(); panel.value = "item";
}
function openEditItem(item: InventoryItem | undefined) {
  if (!item) return;
  editingItemId.value = item.id; Object.assign(itemForm, item);
  reorderLevelText.value = milliInput(item.reorder_level_milli); reorderQuantityText.value = milliInput(item.reorder_quantity_milli);
  itemMutation.reset(); panel.value = "item";
}
async function saveItem() {
  if (!parseQuantityMilli(reorderLevelText.value) && reorderLevelText.value.trim() !== "0") return;
  const saved = await itemMutation.run(); if (!saved) return;
  showToast(editingItemId.value ? "Item updated" : "Item created"); panel.value = null;
  await Promise.all([itemsState.refresh(), valuationState.refresh(), lowState.refresh()]);
}
async function saveWarehouse() {
  const saved = await warehouseMutation.run(); if (!saved) return;
  showToast("Warehouse created"); Object.assign(warehouseForm, { code: "", name: "", location: null, is_active: true, is_default: false });
  await warehousesState.refresh();
}
async function toggleWarehouse(warehouse: Warehouse) {
  const saved = await warehouseStatusMutation.run(warehouse); if (!saved) return;
  showToast(saved.is_active ? "Warehouse activated" : "Warehouse deactivated"); await warehousesState.refresh();
}
async function saveTransfer() {
  const saved = await transferMutation.run(); if (!saved) return;
  showToast(`Transfer ${saved.number} recorded`); panel.value = null; await refreshInventory();
}
async function saveAdjustment() {
  const saved = await adjustmentMutation.run(); if (!saved) return;
  showToast(`Adjustment ${saved.number} posted`); panel.value = null; await refreshInventory();
}
async function refreshInventory() { await Promise.all([itemsState.refresh(), valuationState.refresh(), lowState.refresh(), warehousesState.refresh()]); }
</script>

<template>
  <AppShell>
    <PageHeader title="Inventory" description="Stock on hand by warehouse with reorder levels and FIFO valuation.">
      <template #actions>
        <ZButton variant="outline" @click="panel = 'warehouses'"><WarehouseIcon class="size-4" /> Warehouses</ZButton>
        <ZButton variant="outline" @click="panel = 'transfer'"><ArrowRightLeft class="size-4" /> Transfer</ZButton>
        <ZButton variant="outline" @click="panel = 'adjustment'"><SlidersHorizontal class="size-4" /> Adjust</ZButton>
        <ZButton @click="openNewItem"><Plus class="size-4" /> New item</ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="SKUs tracked" :value="String((itemsState.data.value ?? []).filter((item) => item.track_inventory).length)" tone="brand" />
      <StatCard label="FIFO stock value" :value="formatMoney(totalValue)" hint="Backend valuation" />
      <StatCard label="Below reorder" :value="String(low.length)" hint="Raise purchase orders" :tone="low.length ? 'danger' : 'neutral'" />
      <StatCard label="Warehouses" :value="String((warehousesState.data.value ?? []).length)" />
    </div>

    <div v-if="low.length" class="mb-4 flex items-start gap-2 rounded-md border border-danger-subtle bg-danger-subtle p-3 text-sm text-danger-strong">
      <TriangleAlert class="mt-0.5 size-4 shrink-0" />
      <p>{{ low.length }} items are at or below reorder level: {{ low.map((item) => item.name).join(", ") }}.</p>
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search item or SKU" />
        <select v-model="warehouseFilter" class="field w-48" aria-label="Filter by warehouse">
          <option value="all">All warehouses</option>
          <option v-for="warehouse in warehousesState.data.value ?? []" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option>
        </select>
      </Toolbar>
      <AsyncSection :loading="valuationState.loading.value" :error="valuationState.error.value" :empty="valuationState.isEmpty.value" empty-title="No stock movements" empty-message="Receive or adjust an inventory item to establish its FIFO valuation." @retry="refreshInventory">
        <DataTable :columns="columns" :rows="rows" :min-width="1120">
          <template #sku="{ row }">{{ row.sku }}</template>
          <template #name="{ row }"><span class="font-medium text-content">{{ row.name }}</span></template>
          <template #category="{ row }">{{ row.category || "—" }}</template>
          <template #warehouse="{ row }">{{ row.warehouse }}</template>
          <template #onhand="{ row }">{{ displayQuantity(row.quantity_on_hand_milli) }}</template>
          <template #reorder="{ row }">{{ displayQuantity(itemFor(row)?.reorder_level_milli ?? 0) }}</template>
          <template #cost="{ row }">{{ formatMoney(row.average_unit_cost) }}</template>
          <template #status="{ row }"><span :class="`zs-badge ${row.quantity_on_hand_milli <= (itemFor(row)?.reorder_level_milli ?? 0) ? 'badge-danger' : 'badge-success'}`">{{ row.quantity_on_hand_milli <= 0 ? "Out of stock" : row.quantity_on_hand_milli <= (itemFor(row)?.reorder_level_milli ?? 0) ? "Low stock" : "In stock" }}</span></template>
          <template #actions="{ row }"><ZButton variant="ghost" @click="openEditItem(itemFor(row))">Edit</ZButton></template>
          <template #footer><span>{{ rows.length }} item / warehouse balances</span><span class="num font-medium">{{ formatMoney(totalValue) }}</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <SidePanel :open="panel === 'item'" :title="editingItemId ? 'Edit item' : 'New item'" description="Inventory quantities use thousandths; money uses integer minor units." width="lg" @close="panel = null">
      <div class="grid gap-4 sm:grid-cols-2">
        <label><span class="label-caps">SKU</span><input v-model="itemForm.sku" class="field mt-1.5" /></label>
        <label><span class="label-caps">Name</span><input v-model="itemForm.name" class="field mt-1.5" /></label>
        <label><span class="label-caps">Type</span><select v-model="itemForm.type" class="field mt-1.5"><option value="inventory">Inventory item</option><option value="non_inventory">Non-inventory item</option><option value="service">Service</option></select></label>
        <label><span class="label-caps">Category</span><input v-model="itemForm.category" class="field mt-1.5" /></label>
        <label><span class="label-caps">Unit</span><input v-model="itemForm.unit" class="field mt-1.5" /></label>
        <label><span class="label-caps">Barcode</span><input v-model="itemForm.barcode" class="field mt-1.5" /></label>
        <MoneyInput v-model="itemForm.sales_price" label="Sales price" />
        <MoneyInput v-model="itemForm.default_purchase_cost" label="Default purchase cost" />
        <label><span class="label-caps">Reorder level (units)</span><input v-model="reorderLevelText" inputmode="decimal" class="field mt-1.5 num" /></label>
        <label><span class="label-caps">Reorder quantity (units)</span><input v-model="reorderQuantityText" inputmode="decimal" class="field mt-1.5 num" /></label>
        <AccountSelect v-if="itemForm.type === 'inventory'" v-model="itemForm.inventory_asset_account_id" label="Inventory asset account" :types="['asset']" />
        <AccountSelect v-if="itemForm.type === 'inventory'" v-model="itemForm.cogs_account_id" label="COGS account" :types="['expense']" />
        <AccountSelect v-model="itemForm.sales_account_id" label="Sales account" :types="['revenue']" />
        <AccountSelect v-if="itemForm.type === 'inventory'" v-model="itemForm.inventory_adjustment_account_id" label="Adjustment / return clearing" :types="['expense', 'revenue']" />
        <label class="flex items-center gap-2"><input v-model="itemForm.is_active" type="checkbox" /> <span class="text-sm">Active</span></label>
      </div>
      <ValidationMessage :message="itemMutation.error.value?.message" />
      <template #footer><ZButton variant="outline" @click="panel = null">Cancel</ZButton><ZButton :disabled="itemMutation.saving.value" @click="saveItem">{{ editingItemId ? "Save changes" : "Create item" }}</ZButton></template>
    </SidePanel>

    <SidePanel :open="panel === 'warehouses'" title="Warehouses" description="Every stock movement belongs to one company warehouse." @close="panel = null">
      <div class="space-y-3">
        <div v-for="warehouse in warehousesState.data.value ?? []" :key="warehouse.id" class="flex items-center justify-between rounded-md border border-line p-3"><div><p class="font-medium">{{ warehouse.code }} · {{ warehouse.name }}</p><p class="text-xs text-content-muted">{{ warehouse.location || "No location" }}{{ warehouse.is_default ? " · Default" : "" }}</p></div><ZButton variant="ghost" @click="toggleWarehouse(warehouse)">{{ warehouse.is_active ? "Deactivate" : "Activate" }}</ZButton></div>
      </div>
      <div class="mt-5 grid gap-3"><p class="label-caps">Add warehouse</p><input v-model="warehouseForm.code" class="field" placeholder="Code" /><input v-model="warehouseForm.name" class="field" placeholder="Name" /><input v-model="warehouseForm.location" class="field" placeholder="Location" /><label class="flex items-center gap-2 text-sm"><input v-model="warehouseForm.is_default" type="checkbox" /> Default warehouse</label><ValidationMessage :message="warehouseMutation.error.value?.message" /><ZButton :disabled="warehouseMutation.saving.value" @click="saveWarehouse"><PackagePlus class="size-4" /> Add warehouse</ZButton></div>
    </SidePanel>

    <SidePanel :open="panel === 'transfer'" title="Warehouse transfer" description="Cost basis and FIFO traceability are preserved." @close="panel = null">
      <div class="grid gap-4"><label><span class="label-caps">Item</span><select v-model="transferForm.item_id" class="field mt-1.5"><option value="">Select item</option><option v-for="item in (itemsState.data.value ?? []).filter((row) => row.track_inventory && row.is_active)" :key="item.id" :value="item.id">{{ item.sku }} · {{ item.name }}</option></select></label><label><span class="label-caps">Source warehouse</span><select v-model="transferForm.source_warehouse_id" class="field mt-1.5"><option value="">Select warehouse</option><option v-for="warehouse in (warehousesState.data.value ?? []).filter((row) => row.is_active)" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></label><label><span class="label-caps">Destination warehouse</span><select v-model="transferForm.destination_warehouse_id" class="field mt-1.5"><option value="">Select warehouse</option><option v-for="warehouse in (warehousesState.data.value ?? []).filter((row) => row.is_active)" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></label><label><span class="label-caps">Quantity (units)</span><input v-model="transferForm.quantity" inputmode="decimal" class="field mt-1.5 num" /></label><label><span class="label-caps">Date</span><input v-model="transferForm.transaction_date" type="date" class="field mt-1.5" /></label><label><span class="label-caps">Reason</span><input v-model="transferForm.reason" class="field mt-1.5" /></label><ValidationMessage :message="transferMutation.error.value?.message" /></div>
      <template #footer><ZButton variant="outline" @click="panel = null">Cancel</ZButton><ZButton :disabled="transferMutation.saving.value" @click="saveTransfer">Record transfer</ZButton></template>
    </SidePanel>

    <SidePanel :open="panel === 'adjustment'" title="Inventory adjustment" description="Adjustments post through the accounting ledger and require a reason." @close="panel = null">
      <div class="grid gap-4"><label><span class="label-caps">Item</span><select v-model="adjustmentForm.item_id" class="field mt-1.5"><option value="">Select item</option><option v-for="item in (itemsState.data.value ?? []).filter((row) => row.track_inventory && row.is_active)" :key="item.id" :value="item.id">{{ item.sku }} · {{ item.name }}</option></select></label><label><span class="label-caps">Warehouse</span><select v-model="adjustmentForm.warehouse_id" class="field mt-1.5"><option value="">Select warehouse</option><option v-for="warehouse in (warehousesState.data.value ?? []).filter((row) => row.is_active)" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></label><label><span class="label-caps">Direction</span><select v-model="adjustmentForm.direction" class="field mt-1.5"><option value="positive">Positive adjustment</option><option value="negative">Negative adjustment</option></select></label><label><span class="label-caps">Quantity (units)</span><input v-model="adjustmentForm.quantity" inputmode="decimal" class="field mt-1.5 num" /></label><MoneyInput v-if="adjustmentForm.direction === 'positive'" v-model="adjustmentForm.unit_cost" label="Unit cost" /><label><span class="label-caps">Date</span><input v-model="adjustmentForm.transaction_date" type="date" class="field mt-1.5" /></label><label><span class="label-caps">Reason</span><input v-model="adjustmentForm.reason" class="field mt-1.5" /></label><ValidationMessage :message="adjustmentMutation.error.value?.message" /></div>
      <template #footer><ZButton variant="outline" @click="panel = null">Cancel</ZButton><ZButton :disabled="adjustmentMutation.saving.value" @click="saveAdjustment">Post adjustment</ZButton></template>
    </SidePanel>
  </AppShell>
</template>
