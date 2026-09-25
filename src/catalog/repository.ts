import { catalogAdapter } from "./adapter";
import heymomSnapshotRu from "./data/heymom-products.json";
import heymomSnapshotUk from "./data/heymom-products.uk.json";
import { createMockCatalog } from "./mock";
import { adaptDummyJsonCatalog } from "./providers/dummyjson";
import type { CatalogMode, ProductCatalog } from "./types";
import { readCmsCategories, readLocalCatalog } from "@/admin/local-cms";
import { categoryLabels } from "@/catalog/category-label";

export async function getCatalog(mode: CatalogMode, locale: "uk" | "ru" = "uk"): Promise<ProductCatalog> {
  await new Promise((resolve) => setTimeout(resolve, mode === "mock" ? 450 : 0));
  const usesDummyJson = process.env.NEXT_PUBLIC_CATALOG_PROVIDER === "dummyjson";
  const usesHeymomSnapshot = process.env.NEXT_PUBLIC_CATALOG_PROVIDER === "heymom-snapshot";
  catalogAdapter.setApiEndpoint(process.env.NEXT_PUBLIC_CATALOG_ENDPOINT ?? (usesDummyJson ? "/products?limit=24" : "/catalog"));
  catalogAdapter.setTransform(usesDummyJson ? adaptDummyJsonCatalog : (payload) => payload);
  catalogAdapter.setMockFactory(usesHeymomSnapshot ? () => readLocalCatalog((locale === "uk" ? heymomSnapshotUk : heymomSnapshotRu) as unknown as ProductCatalog) : createMockCatalog);
  catalogAdapter.setMode(mode);
  const catalog = await catalogAdapter.getCatalog();
  const hiddenCategories = new Set(readCmsCategories().filter((category) => category.hidden).map((category) => category.name));
  return { products: catalog.products.filter((product) => product.published !== false && !categoryLabels(product.category).some((category) => hiddenCategories.has(category))) };
}
