import type { ProductCatalog } from "../types";

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null && !Array.isArray(value);

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Перетворює відповідь DummyJSON Products у незмінний контракт ProductCatalog JCOS. */
export function adaptDummyJsonCatalog(payload: unknown): ProductCatalog {
  if (!isRecord(payload) || !Array.isArray(payload.products)) {
    throw new Error("DummyJSON: очікується об’єкт з масивом products.");
  }

  return {
    products: payload.products.map((item, index) => {
      if (!isRecord(item) || typeof item.id !== "number" || typeof item.title !== "string" || typeof item.price !== "number" || typeof item.category !== "string") {
        throw new Error(`DummyJSON: products[${index}] не містить обов’язкових полів.`);
      }
      const discount = typeof item.discountPercentage === "number" ? item.discountPercentage : 0;
      const images = Array.isArray(item.images) ? item.images.filter((image): image is string => typeof image === "string") : [];
      const title = item.title;
      const oldPrice = discount > 0 && discount < 100 ? Number((item.price / (1 - discount / 100)).toFixed(2)) : undefined;

      return {
        id: String(item.id),
        title,
        slug: typeof item.slug === "string" ? item.slug : `${slugify(title)}-${item.id}`,
        price: item.price,
        ...(oldPrice ? { oldPrice } : {}),
        inStock: typeof item.stock === "number" ? item.stock > 0 : true,
        category: item.category,
        images,
        attributes: {
          ...(typeof item.brand === "string" ? { Бренд: item.brand } : {}),
          ...(typeof item.sku === "string" ? { Артикул: item.sku } : {}),
          ...(typeof item.warrantyInformation === "string" ? { Гарантія: item.warrantyInformation } : {}),
        },
      };
    }),
  };
}
