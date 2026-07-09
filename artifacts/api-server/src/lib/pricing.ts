export interface LineItemInput {
  qty: number;
  laborUnitPrice: number;
  materialUnitPrice: number;
  markupPct: number;
  discountPct?: number;
  isOptional?: boolean;
}

export interface EstimateSettings {
  taxRate: number;       // percent, e.g. 8.5
  markupPct: number;     // default markup if item has none
  depositPct: number;    // percent of grand total
  discountAmount?: number; // flat discount off subtotal
}

export interface LineTotals {
  laborTotal: number;
  materialTotal: number;
  lineSubtotal: number;  // before item-level discount
  lineTotal: number;     // after item-level discount
}

export interface EstimateTotals {
  subtotal: number;        // sum of all non-optional line totals
  discountAmount: number;  // flat estimate-level discount
  taxableAmount: number;   // subtotal - discount
  taxAmount: number;
  grandTotal: number;
  depositAmount: number;
  // internal visibility
  laborCost: number;
  materialCost: number;
  profit: number;
}

export function computeLineTotals(item: LineItemInput): LineTotals {
  const labor = round2(item.qty * item.laborUnitPrice);
  const material = round2(item.qty * item.materialUnitPrice);
  const lineSubtotal = round2((labor + material) * (1 + item.markupPct / 100));
  const discountFactor = item.discountPct ? 1 - item.discountPct / 100 : 1;
  const lineTotal = round2(lineSubtotal * discountFactor);
  return { laborTotal: labor, materialTotal: material, lineSubtotal, lineTotal };
}

export function computeEstimateTotals(
  items: LineItemInput[],
  settings: EstimateSettings
): EstimateTotals {
  const included = items.filter((i) => !i.isOptional);

  let laborCost = 0;
  let materialCost = 0;
  let subtotal = 0;

  for (const item of included) {
    const t = computeLineTotals(item);
    laborCost += t.laborTotal;
    materialCost += t.materialTotal;
    subtotal += t.lineTotal;
  }

  laborCost = round2(laborCost);
  materialCost = round2(materialCost);
  subtotal = round2(subtotal);

  const discountAmount = round2(settings.discountAmount ?? 0);
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));
  const taxAmount = round2(taxableAmount * (settings.taxRate / 100));
  const grandTotal = round2(taxableAmount + taxAmount);
  const depositAmount = round2(grandTotal * (settings.depositPct / 100));
  const rawCost = round2(laborCost + materialCost);
  const profit = round2(grandTotal - rawCost);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    depositAmount,
    laborCost,
    materialCost,
    profit,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
