export const conversionStages = [
  "product_view",
  "add_to_cart",
  "cart_open",
  "checkout_started",
  "order_completed",
] as const;

export type ConversionStage = (typeof conversionStages)[number];
type ConversionEvent = { stage: ConversionStage; at: string; productId?: string };

const STORAGE_KEY = "heymom-conversion-events";

export function trackConversion(stage: ConversionStage, productId?: string) {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as ConversionEvent[];
    const next = [...stored, { stage, productId, at: new Date().toISOString() }].slice(-500);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* Analytics must never block a purchase. */ }
}

export function readConversionFunnel(): Record<ConversionStage, number> {
  const result = Object.fromEntries(conversionStages.map((stage) => [stage, 0])) as Record<ConversionStage, number>;
  if (typeof window === "undefined") return result;
  try {
    const events = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as ConversionEvent[];
    events.forEach((event) => { if (event.stage in result) result[event.stage] += 1; });
  } catch { /* A broken local value simply means an empty funnel. */ }
  return result;
}
