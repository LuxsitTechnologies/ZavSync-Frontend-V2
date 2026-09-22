/**
 * A5 — Inventory ledger, FIFO layers and COGS postings.
 *
 * FIFO valuation is authoritative on the backend. The preview adapter mirrors
 * the same algorithm only so the screens can be reviewed; the UI always renders
 * whatever the valuation service returns rather than recomputing it.
 */
import { ApiError, apiRequest, isApiConfigured, previewDelay } from "@/services/api/client";
import { cogsPostings, fifoLayers, inventoryLedger, inventoryValuation } from "@/services/mock/accounting-db";
import type {
  CogsPosting,
  FifoLayer,
  InventoryItemValuation,
  InventoryLedgerEntry,
  Money,
} from "@/types/accounting";

export interface InventoryLedgerQuery {
  item_id?: string | "all";
  from?: string;
  to?: string;
  search?: string;
}

export const inventoryRepository = {
  async items(companyId: string): Promise<InventoryItemValuation[]> {
    if (isApiConfigured()) {
      return apiRequest<InventoryItemValuation[]>("/accounting/inventory/valuation", { companyId });
    }
    return previewDelay(inventoryValuation.filter((i) => i.company_id === companyId));
  },

  async ledger(companyId: string, query: InventoryLedgerQuery = {}): Promise<InventoryLedgerEntry[]> {
    if (isApiConfigured()) {
      return apiRequest<InventoryLedgerEntry[]>("/accounting/inventory/ledger", { companyId, query: { ...query } });
    }
    const q = (query.search ?? "").trim().toLowerCase();
    return previewDelay(
      inventoryLedger
        .filter((e) => e.company_id === companyId)
        .filter((e) => {
          const matchesItem = !query.item_id || query.item_id === "all" || e.item_id === query.item_id;
          const matchesFrom = !query.from || e.date >= query.from;
          const matchesTo = !query.to || e.date <= query.to;
          const matchesSearch =
            !q || e.reference.toLowerCase().includes(q) || e.item_name.toLowerCase().includes(q) ||
            e.item_sku.toLowerCase().includes(q);
          return matchesItem && matchesFrom && matchesTo && matchesSearch;
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
  },

  async layers(companyId: string, itemId: string): Promise<FifoLayer[]> {
    if (isApiConfigured()) {
      return apiRequest<FifoLayer[]>(`/accounting/inventory/items/${itemId}/layers`, { companyId });
    }
    return previewDelay(
      fifoLayers
        .filter((l) => l.company_id === companyId && l.item_id === itemId && l.remaining > 0)
        .map((l) => ({
          id: l.id,
          item_id: l.item_id,
          received_date: l.date,
          reference: l.reference,
          original_quantity: l.original,
          remaining_quantity: l.remaining,
          unit_cost: l.unit_cost,
          remaining_value: l.unit_cost * l.remaining,
        }))
        .sort((a, b) => a.received_date.localeCompare(b.received_date)),
    );
  },

  async cogs(companyId: string, itemId?: string): Promise<CogsPosting[]> {
    if (isApiConfigured()) {
      return apiRequest<CogsPosting[]>("/accounting/inventory/cogs", { companyId, query: { item_id: itemId ?? "" } });
    }
    return previewDelay(
      cogsPostings
        .filter((c) => c.company_id === companyId && (!itemId || itemId === "all" || c.item_id === itemId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
  },

  /** Requests the backend to post Dr COGS / Cr Inventory for an unposted issue. */
  async postCogs(companyId: string, cogsId: string): Promise<CogsPosting> {
    if (isApiConfigured()) {
      return apiRequest<CogsPosting>(`/accounting/inventory/cogs/${cogsId}/post`, { companyId, method: "POST" });
    }
    const posting = cogsPostings.find((c) => c.id === cogsId && c.company_id === companyId);
    if (!posting) throw new ApiError("That inventory movement does not exist in this company.", "not_found");
    if (posting.posted) throw new ApiError("This movement is already posted to the ledger.", "conflict");
    posting.posted = true;
    return previewDelay(posting, 420);
  },

  async totals(companyId: string): Promise<{ value: Money; items: number; unposted: number }> {
    const items = await this.items(companyId);
    const cogs = await this.cogs(companyId);
    return {
      value: items.reduce((s, i) => s + i.value, 0),
      items: items.length,
      unposted: cogs.filter((c) => !c.posted).length,
    };
  },
};
