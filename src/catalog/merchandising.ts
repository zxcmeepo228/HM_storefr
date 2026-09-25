import type { Product } from "@/catalog/types";

// Стартова вітрина: пріоритет власним товарам ArhiMED, але з кількома
// перевіреними товарами інших брендів для різноманітного першого екрана.
// Ручний sortOrder з CMS завжди має вищий пріоритет.
export const starterMerchandisingOrder = new Map([
  ["119541", 1], ["61811", 2], ["10", 3], ["124311", 4],
  ["37369", 5], ["111791", 6], ["73361", 7], ["237", 8],
  ["120473", 9], ["121107", 10], ["55517", 11], ["120198", 12],
]);

export function merchandisingOrder(product: Product): number {
  return product.sortOrder ?? starterMerchandisingOrder.get(product.id) ?? Number.MAX_SAFE_INTEGER;
}
