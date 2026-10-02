import type { FbrDraft, FbrInvoice } from "@/types/fbr";

// Conversion only. Financial calculations belong exclusively to the backend.
export function parseExact(raw: string, scale: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(raw.trim())) throw new Error(`Use a non-negative decimal with at most ${scale} decimal places.`);
  const [whole, fraction = ""] = raw.trim().split(".");
  const result = BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
  if (result > BigInt(maximum)) throw new Error("Value exceeds the supported range.");
  return Number(result);
}
export function decimal(value: number, scale = 2): string {
  const digits = BigInt(Math.abs(value)).toString().padStart(scale + 1, "0");
  return `${value < 0 ? "-" : ""}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
export function money(value: number): string { return `PKR ${decimal(value)}`; }
export const blankLine = () => ({ description: "", hs_code: "", unit: "", quantity: "1", unit_price: "", discount: "0", rate: "", fbr_rate_id: "", sales_tax: "", extra_tax: "0", further_tax: "0", st_withheld: "0", sro_schedule_id: "", sro_item_id: "" });
export type LineForm = ReturnType<typeof blankLine>;
export const blankDraft = () => ({ invoice_date: new Date().toLocaleDateString("en-CA"), due_date: "", invoice_type: "", sale_type: "", origin_province: "", destination_province: "", buyer_snapshot: { name: "", registration_number: "", type: "Unregistered" as "Registered" | "Unregistered", province: "", address: "" }, notes: "", lines: [blankLine()] });
export type DraftForm = ReturnType<typeof blankDraft>;
export function fromInvoice(invoice: FbrInvoice): DraftForm {
  return { invoice_date: invoice.invoice_date, due_date: invoice.due_date ?? "", invoice_type: invoice.invoice_type, sale_type: invoice.sale_type, origin_province: invoice.origin_province, destination_province: invoice.destination_province, buyer_snapshot: { ...invoice.buyer_snapshot, registration_number: invoice.buyer_snapshot.registration_number ?? "", address: invoice.buyer_snapshot.address ?? "" }, notes: invoice.notes ?? "", lines: (invoice.lines ?? []).map(line => ({ ...blankLine(), description: line.description, hs_code: line.hs_code, unit: line.unit, quantity: decimal(line.quantity_milli, 3), unit_price: decimal(line.unit_price), discount: decimal(line.discount), rate: decimal(line.tax_rate_bps), fbr_rate_id: line.fbr_rate_id, sales_tax: decimal(line.sales_tax ?? 0), extra_tax: decimal(line.extra_tax), further_tax: decimal(line.further_tax), st_withheld: decimal(line.st_withheld), sro_schedule_id: line.sro_schedule_id ?? "", sro_item_id: line.sro_item_id ?? "" })) };
}
export function toDraft(form: DraftForm): FbrDraft {
  return { ...form, due_date: form.due_date || null, buyer_snapshot: { ...form.buyer_snapshot, registration_number: form.buyer_snapshot.registration_number || null }, lines: form.lines.map((line, index) => {
    try {
      const quantity = parseExact(line.quantity, 3, 1000000000);
      if (!quantity) throw new Error("Quantity must be greater than zero.");
      return { description: line.description, hs_code: line.hs_code, unit: line.unit, quantity_milli: quantity, unit_price: parseExact(line.unit_price, 2), discount: parseExact(line.discount, 2), tax_rate_bps: parseExact(line.rate, 2, 10000), fbr_rate_id: line.fbr_rate_id, sales_tax: line.sales_tax.trim() === "" ? null : parseExact(line.sales_tax, 2), extra_tax: parseExact(line.extra_tax, 2), further_tax: parseExact(line.further_tax, 2), st_withheld: parseExact(line.st_withheld, 2), sro_schedule_id: line.sro_schedule_id || null, sro_item_id: line.sro_item_id || null };
    } catch (error) { throw new Error(`Line ${index + 1}: ${error instanceof Error ? error.message : 'Invalid amount.'}`); }
  }) };
}
