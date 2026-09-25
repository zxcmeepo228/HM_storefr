import { afterEach, describe, expect, it } from "vitest";
import { CatalogAdapter } from "./adapter";
import { apiClient } from "../lib/api/client";
import { adaptDummyJsonCatalog } from "./providers/dummyjson";
import heymomSnapshot from "./data/heymom-products.json";

const validCatalog = {
  products: [{
    id: "test-1",
    title: "Тестовий термометр",
    slug: "test-termometr",
    price: 1499,
    oldPrice: 1699,
    inStock: true,
    category: "Термометри",
    images: ["https://cdn.example.com/thermometer.jpg"],
    attributes: { Гарантія: "12 місяців" },
  }],
};

const originalAdapter = apiClient.defaults.adapter;
const originalBaseURL = apiClient.defaults.baseURL;
afterEach(() => { apiClient.defaults.adapter = originalAdapter; apiClient.defaults.baseURL = originalBaseURL; });

describe("CatalogAdapter", () => {
  it("генерує валідний автономний каталог у Mock Mode", async () => {
    const adapter = new CatalogAdapter({ mode: "mock" });
    const products = await adapter.getProducts();

    expect(products).toHaveLength(18);
    expect(adapter.validateData({ products })).toBe(true);
  });

  it("приймає валідну відповідь у API Mode", async () => {
    apiClient.defaults.adapter = async (config) => ({ data: validCatalog, status: 200, statusText: "OK", headers: {}, config });
    const adapter = new CatalogAdapter({ mode: "api" });

    await expect(adapter.getProducts()).resolves.toEqual(validCatalog.products);
  });

  it("відхиляє API-відповідь, що порушує JCOS", async () => {
    apiClient.defaults.adapter = async (config) => ({ data: { products: [{ id: "broken" }] }, status: 200, statusText: "OK", headers: {}, config });
    const adapter = new CatalogAdapter({ mode: "api" });

    await expect(adapter.getProducts()).rejects.toThrow("не відповідають JSON Schema");
  });

  it("переходить на Mock Mode, коли API недоступний", async () => {
    apiClient.defaults.adapter = async () => { throw new Error("Network unavailable"); };
    const adapter = new CatalogAdapter({ mode: "api" });

    await expect(adapter.getProducts()).resolves.toHaveLength(18);
  });

  it("нормалізує сторонній контракт DummyJSON у наш JCOS", () => {
    const catalog = adaptDummyJsonCatalog({ products: [{ id: 7, title: "Demo product", price: 19.99, category: "beauty", stock: 3, discountPercentage: 20, images: ["https://cdn.example.com/demo.jpg"], brand: "Demo", sku: "SKU-7" }] });
    const adapter = new CatalogAdapter();

    expect(adapter.validateData(catalog)).toBe(true);
    expect(catalog.products[0]).toMatchObject({ id: "7", inStock: true, oldPrice: 24.99, attributes: { Бренд: "Demo", Артикул: "SKU-7" } });
  });

  it("містить повний імпортований snapshot Heymom з галереями", () => {
    const adapter = new CatalogAdapter({ mockFactory: () => heymomSnapshot });

    expect(heymomSnapshot.products).toHaveLength(89);
    expect(heymomSnapshot.products.every((product) => product.images.length > 0)).toBe(true);
    expect(heymomSnapshot.products.every((product) => product.images.every((image) => image.startsWith("/media/products/")))).toBe(true);
    expect(heymomSnapshot.products.every((product) => product.description.trim().length > 0)).toBe(true);
    expect(adapter.validateData(heymomSnapshot)).toBe(true);
  });

  it.runIf(process.env.RUN_LIVE_INTEGRATION === "true")("отримує й валідовує реальні товари DummyJSON", async () => {
    apiClient.defaults.baseURL = "https://dummyjson.com";
    const adapter = new CatalogAdapter({ mode: "api", apiEndpoint: "/products?limit=24", transform: adaptDummyJsonCatalog });

    const products = await adapter.getProducts();
    expect(products).toHaveLength(24);
    expect(adapter.validateData({ products })).toBe(true);
  });
});
