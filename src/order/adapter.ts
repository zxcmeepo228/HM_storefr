import type { Product } from "@/catalog/types";

export type OrderLine = Pick<Product, "id" | "title" | "slug" | "price"> & { quantity: number };
export type OrderDraft = {
  id: string;
  createdAt: string;
  customer: { fullName: string; phone: string; email: string; doNotCall: boolean };
  delivery: "nova-poshta-branch" | "nova-poshta-courier" | "taxi-kyiv";
  deliveryDetails?: { city?: string; branch?: string; address?: string };
  payment: "card" | "cash-on-delivery" | "installments";
  lines: OrderLine[];
  total: number;
};

export type OrderSubmission = { id: string; mode: "api" | "local" };

export async function submitOrder(order: OrderDraft): Promise<OrderSubmission> {
  const endpoint = process.env.NEXT_PUBLIC_ORDER_ENDPOINT;
  if (!endpoint) {
    // In a real deployment an order must never look accepted if no system can receive it.
    if (process.env.NODE_ENV === "production") throw new Error("Order endpoint is not configured");
    window.localStorage.setItem(`heymom-order-${order.id}`, JSON.stringify(order));
    return { id: order.id, mode: "local" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(order),
  });
  if (!response.ok) throw new Error("Order request failed");
  return { id: order.id, mode: "api" };
}
