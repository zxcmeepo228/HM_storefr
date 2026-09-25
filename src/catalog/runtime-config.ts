import type { CatalogMode } from "./types";

/**
 * Єдине перемикання джерела каталогу для будь-якого хостингу.
 * Значення з NEXT_PUBLIC_ доступні і в браузері, тому їх задають у dashboard хостингу.
 */
export function getCatalogMode(): CatalogMode {
  return process.env.NEXT_PUBLIC_CATALOG_MODE === "api" ? "api" : "mock";
}
