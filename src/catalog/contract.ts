import { productCatalogSchema } from "./schema";
import type { Product, ProductCatalog } from "./types";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Мінімальна runtime-перевірка, що відтворює правила поточної JCOS. */
export function parseCatalog(payload: unknown): ProductCatalog {
  if (!isRecord(payload) || !Array.isArray(payload.products)) {
    throw new Error("Контракт порушено: очікується об’єкт ProductCatalog з масивом products.");
  }

  const itemSchema = productCatalogSchema.properties.products.items;
  const properties = itemSchema.properties as Record<string, { type: string }>;

  const products = payload.products.map((value, index) => {
    if (!isRecord(value)) throw new Error(`Контракт порушено: products[${index}] не є об’єктом.`);

    for (const key of itemSchema.required) {
      const expected = properties[key].type;
      if (!(key in value) || typeof value[key] !== expected) {
        throw new Error(`Контракт порушено: products[${index}].${key} має бути ${expected}.`);
      }
    }

    if (value.images !== undefined && (!Array.isArray(value.images) || value.images.some((image) => typeof image !== "string"))) {
      throw new Error(`Контракт порушено: products[${index}].images має бути масивом URL.`);
    }
    if (value.descriptionImages !== undefined && (!Array.isArray(value.descriptionImages) || value.descriptionImages.some((image) => typeof image !== "string"))) {
      throw new Error(`Контракт порушено: products[${index}].descriptionImages має бути масивом URL.`);
    }
    if (value.descriptionHtml !== undefined && typeof value.descriptionHtml !== "string") {
      throw new Error(`Контракт порушено: products[${index}].descriptionHtml має бути рядком HTML.`);
    }
    if (value.shortDescription !== undefined && typeof value.shortDescription !== "string") {
      throw new Error(`Контракт порушено: products[${index}].shortDescription має бути рядком.`);
    }
    if (value.shortDescriptionHtml !== undefined && typeof value.shortDescriptionHtml !== "string") {
      throw new Error(`Контракт порушено: products[${index}].shortDescriptionHtml має бути рядком HTML.`);
    }
    if (value.published !== undefined && typeof value.published !== "boolean") {
      throw new Error(`Контракт порушено: products[${index}].published має бути boolean.`);
    }
    for (const key of ["barcode", "manufacturerCode", "brand", "supplier"] as const) {
      if (value[key] !== undefined && typeof value[key] !== "string") throw new Error(`Контракт порушено: products[${index}].${key} має бути рядком.`);
    }
    if (value.condition !== undefined && value.condition !== "new" && value.condition !== "used") throw new Error(`Контракт порушено: products[${index}].condition має бути new або used.`);
    for (const key of ["weightKg", "lengthCm", "widthCm", "heightCm"] as const) {
      if (value[key] !== undefined && (typeof value[key] !== "number" || value[key] < 0)) throw new Error(`Контракт порушено: products[${index}].${key} має бути невід'ємним числом.`);
    }
    if (value.badges !== undefined && (!Array.isArray(value.badges) || value.badges.some((badge) => typeof badge !== "string"))) throw new Error(`Контракт порушено: products[${index}].badges має бути масивом рядків.`);
    if (value.rating !== undefined && (typeof value.rating !== "number" || value.rating < 1 || value.rating > 5)) throw new Error(`Контракт порушено: products[${index}].rating має бути числом від 1 до 5.`);
    if (value.reviewCount !== undefined && (typeof value.reviewCount !== "number" || !Number.isInteger(value.reviewCount) || value.reviewCount < 0)) throw new Error(`Контракт порушено: products[${index}].reviewCount має бути цілим невід'ємним числом.`);
    if (value.sortOrder !== undefined && (typeof value.sortOrder !== "number" || !Number.isInteger(value.sortOrder) || value.sortOrder < 0)) throw new Error(`Контракт порушено: products[${index}].sortOrder має бути цілим невід'ємним числом.`);
    for (const key of ["metaTitle", "metaDescription"] as const) {
      if (value[key] !== undefined && typeof value[key] !== "string") throw new Error(`Контракт порушено: products[${index}].${key} має бути рядком.`);
    }
    if (value.seoKeywords !== undefined && (!Array.isArray(value.seoKeywords) || value.seoKeywords.some((keyword) => typeof keyword !== "string"))) throw new Error(`Контракт порушено: products[${index}].seoKeywords має бути масивом рядків.`);
    if (value.noIndex !== undefined && typeof value.noIndex !== "boolean") throw new Error(`Контракт порушено: products[${index}].noIndex має бути boolean.`);
    if (value.bundleProductIds !== undefined && (!Array.isArray(value.bundleProductIds) || value.bundleProductIds.some((id) => typeof id !== "string"))) throw new Error(`Контракт порушено: products[${index}].bundleProductIds має бути масивом ID.`);
    if (value.checkoutUpsellProductIds !== undefined && (!Array.isArray(value.checkoutUpsellProductIds) || value.checkoutUpsellProductIds.some((id) => typeof id !== "string"))) throw new Error(`Контракт порушено: products[${index}].checkoutUpsellProductIds має бути масивом ID.`);
    if (value.checkoutUpsellDiscountPercent !== undefined && (typeof value.checkoutUpsellDiscountPercent !== "number" || value.checkoutUpsellDiscountPercent < 0 || value.checkoutUpsellDiscountPercent > 99)) throw new Error(`Контракт порушено: products[${index}].checkoutUpsellDiscountPercent має бути числом від 0 до 99.`);
    if (value.checkoutUpsellOrderDiscountPercent !== undefined && (typeof value.checkoutUpsellOrderDiscountPercent !== "number" || value.checkoutUpsellOrderDiscountPercent < 0 || value.checkoutUpsellOrderDiscountPercent > 99)) throw new Error(`Контракт порушено: products[${index}].checkoutUpsellOrderDiscountPercent має бути числом від 0 до 99.`);
    if (value.bundleDiscountPercent !== undefined && (typeof value.bundleDiscountPercent !== "number" || value.bundleDiscountPercent < 0 || value.bundleDiscountPercent > 99)) throw new Error(`Контракт порушено: products[${index}].bundleDiscountPercent має бути числом від 0 до 99.`);
    if (value.bundleDiscounts !== undefined && (!isRecord(value.bundleDiscounts) || Object.values(value.bundleDiscounts).some((discount) => typeof discount !== "number" || discount < 0 || discount > 99))) throw new Error(`Контракт порушено: products[${index}].bundleDiscounts має містити знижки від 0 до 99.`);
    if (value.giftProductId !== undefined && typeof value.giftProductId !== "string") throw new Error(`Контракт порушено: products[${index}].giftProductId має бути рядком.`);
    if (value.attributes !== undefined && (!isRecord(value.attributes) || Object.values(value.attributes).some((attribute) => typeof attribute !== "string"))) {
      throw new Error(`Контракт порушено: products[${index}].attributes має бути об’єктом рядків.`);
    }
    return value as Product;
  });

  return { products };
}
