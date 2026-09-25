/** JCOS — єдине джерело правди для контракту каталогу. */
export const productCatalogSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "ProductCatalog",
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          descriptionHtml: { type: "string" },
          shortDescription: { type: "string" },
          shortDescriptionHtml: { type: "string" },
          slug: { type: "string" },
          price: { type: "number" },
          oldPrice: { type: "number" },
          published: { type: "boolean" },
          barcode: { type: "string" },
          manufacturerCode: { type: "string" },
          brand: { type: "string" },
          supplier: { type: "string" },
          condition: { type: "string", enum: ["new", "used"] },
          weightKg: { type: "number", minimum: 0 },
          lengthCm: { type: "number", minimum: 0 },
          widthCm: { type: "number", minimum: 0 },
          heightCm: { type: "number", minimum: 0 },
          badges: { type: "array", items: { type: "string" } },
          rating: { type: "number", minimum: 1, maximum: 5 },
          reviewCount: { type: "integer", minimum: 0 },
          sortOrder: { type: "integer", minimum: 0 },
          metaTitle: { type: "string" },
          metaDescription: { type: "string" },
          seoKeywords: { type: "array", items: { type: "string" } },
          noIndex: { type: "boolean" },
          bundleProductIds: { type: "array", items: { type: "string" } },
          bundleDiscountPercent: { type: "number", minimum: 0, maximum: 99 },
          bundleDiscounts: { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 99 } },
          checkoutUpsellProductIds: { type: "array", items: { type: "string" } },
          checkoutUpsellDiscountPercent: { type: "number", minimum: 0, maximum: 99 },
          checkoutUpsellOrderDiscountPercent: { type: "number", minimum: 0, maximum: 99 },
          giftProductId: { type: "string" },
          warrantyMonths: { type: "integer", minimum: 0 },
          inStock: { type: "boolean" },
          category: { type: "string" },
          images: {
            type: "array",
            // Абсолютні URL з CDN/API або локальні URI reference з public/media.
            items: { type: "string", anyOf: [{ format: "uri" }, { format: "uri-reference" }] },
          },
          descriptionImages: {
            type: "array",
            items: { type: "string", anyOf: [{ format: "uri" }, { format: "uri-reference" }] },
          },
          attributes: { type: "object", additionalProperties: { type: "string" } },
        },
        required: ["id", "title", "price", "category", "inStock"],
      },
    },
  },
  required: ["products"],
} as const;

/** Назва, що відповідає термінології контракту (JSON Contract Object Schema). */
export const productCatalogJCOS = productCatalogSchema;
