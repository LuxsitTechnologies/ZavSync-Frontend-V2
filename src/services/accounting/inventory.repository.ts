/** Stage 5 inventory API contracts. All stock, FIFO and valuation figures are backend-authoritative. */
import { apiRequest } from "@/services/api/client";
import type {
  CogsPosting,
  FifoLayer,
  InventoryItem,
  InventoryItemInput,
  InventoryItemValuation,
  InventoryLedgerEntry,
  InventoryReconciliation,
  InventoryTransaction,
  LowStockItem,
  Warehouse,
  WarehouseInput,
} from "@/types/accounting";

export interface InventoryLedgerQuery {
  item_id?: string;
  warehouse_id?: string;
  from?: string;
  to?: string;
  type?: string;
  search?: string;
}

export interface InventoryActionInput {
  item_id: string;
  quantity_milli: number;
  transaction_date: string;
  reason: string;
  notes?: string;
  reference?: string;
}

function key(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export const inventoryRepository = {
  masterItems(companyId: string, query: Record<string, string> = {}): Promise<InventoryItem[]> {
    return apiRequest<InventoryItem[]>("/inventory/items", { companyId, query });
  },

  createItem(companyId: string, input: InventoryItemInput): Promise<InventoryItem> {
    return apiRequest<InventoryItem>("/inventory/items", { companyId, method: "POST", body: input });
  },

  updateItem(companyId: string, itemId: string, input: InventoryItemInput): Promise<InventoryItem> {
    return apiRequest<InventoryItem>(`/inventory/items/${itemId}`, { companyId, method: "PUT", body: input });
  },

  warehouses(companyId: string): Promise<Warehouse[]> {
    return apiRequest<Warehouse[]>("/inventory/warehouses", { companyId });
  },

  createWarehouse(companyId: string, input: WarehouseInput): Promise<Warehouse> {
    return apiRequest<Warehouse>("/inventory/warehouses", { companyId, method: "POST", body: input });
  },

  updateWarehouse(companyId: string, warehouseId: string, input: WarehouseInput): Promise<Warehouse> {
    return apiRequest<Warehouse>(`/inventory/warehouses/${warehouseId}`, { companyId, method: "PUT", body: input });
  },

  valuation(companyId: string, query: Record<string, string> = {}): Promise<InventoryItemValuation[]> {
    return apiRequest<InventoryItemValuation[]>("/accounting/inventory/valuation", { companyId, query });
  },

  ledger(companyId: string, query: InventoryLedgerQuery = {}): Promise<InventoryLedgerEntry[]> {
    return apiRequest<InventoryLedgerEntry[]>("/accounting/inventory/ledger", { companyId, query: { ...query } });
  },

  layers(companyId: string, itemId?: string, warehouseId?: string): Promise<FifoLayer[]> {
    return apiRequest<FifoLayer[]>("/accounting/inventory/layers", {
      companyId,
      query: { item_id: itemId ?? "", warehouse_id: warehouseId ?? "" },
    });
  },

  cogs(companyId: string, itemId?: string): Promise<CogsPosting[]> {
    return apiRequest<CogsPosting[]>("/accounting/inventory/cogs", { companyId, query: { item_id: itemId ?? "" } });
  },

  lowStock(companyId: string): Promise<LowStockItem[]> {
    return apiRequest<LowStockItem[]>("/accounting/inventory/low-stock", { companyId });
  },

  reconciliation(companyId: string, asOf?: string): Promise<InventoryReconciliation> {
    return apiRequest<InventoryReconciliation>("/accounting/inventory/reconciliation", { companyId, query: { as_of: asOf ?? "" } });
  },

  transfer(companyId: string, input: InventoryActionInput & { source_warehouse_id: string; destination_warehouse_id: string }): Promise<InventoryTransaction> {
    return apiRequest<InventoryTransaction>("/inventory/transfers", { companyId, method: "POST", body: input, idempotencyKey: key("inventory-transfer") });
  },

  adjustment(companyId: string, input: InventoryActionInput & { warehouse_id: string; direction: "positive" | "negative"; unit_cost?: number | null }): Promise<InventoryTransaction> {
    return apiRequest<InventoryTransaction>("/inventory/adjustments", { companyId, method: "POST", body: input, idempotencyKey: key("inventory-adjustment") });
  },
};
