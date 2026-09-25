import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { apiClient } from "../lib/api/client";
import { createMockCatalog } from "./mock";
import { productCatalogJCOS } from "./schema";
import type { CatalogMode, Product, ProductCatalog } from "./types";

export type CatalogAdapterOptions = {
  mode?: CatalogMode;
  /** Відносний URL у межах NEXT_PUBLIC_API_URL або абсолютний URL API. */
  apiEndpoint?: string;
  /** Перетворює контракт конкретного бекенду у наш ProductCatalog JCOS. */
  transform?: (payload: unknown) => unknown;
  /** Локальне джерело даних для автономного режиму. */
  mockFactory?: () => unknown;
};

/**
 * Універсальна межа між UI та джерелом каталогу.
 * Вона не дозволяє невалідним даним перетнути JCOS-контракт.
 */
export class CatalogAdapter {
  private readonly validateCatalog;
  private mode: CatalogMode;
  private apiEndpoint: string;
  private transform: (payload: unknown) => unknown;
  private mockFactory: () => unknown;

  constructor({ mode = "mock", apiEndpoint = "/catalog", transform = (payload) => payload, mockFactory = createMockCatalog }: CatalogAdapterOptions = {}) {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    this.validateCatalog = ajv.compile<ProductCatalog>(productCatalogJCOS);
    this.mode = mode;
    this.apiEndpoint = apiEndpoint;
    this.transform = transform;
    this.mockFactory = mockFactory;
  }

  /** Повертає true лише для даних, що повністю відповідають JCOS. */
  public validateData(data: unknown): data is ProductCatalog {
    const isValid = this.validateCatalog(data);
    if (!isValid) console.error("Помилка валідації JCOS контракту:", this.validationErrors);
    return isValid;
  }

  public get validationErrors(): ErrorObject[] | null {
    return this.validateCatalog.errors ?? null;
  }

  /** Локальні дані, які генеруються тільки зі структури JCOS. */
  private generateMockData(): unknown {
    return this.mockFactory();
  }

  /**
   * API Mode запитує endpoint, а при помилці мережі безпечно переходить на мок-дані.
   * Невалідна відповідь API не маскується: вона завершується помилкою контракту.
   */
  public async getProducts(): Promise<Product[]> {
    let rawData: unknown;

    if (this.mode === "mock") {
      rawData = this.generateMockData();
    } else {
      try {
        const response = await apiClient.get<unknown>(this.apiEndpoint);
        rawData = this.transform(response.data);
      } catch (error) {
        console.warn("[CatalogAdapter] API недоступний; використано Mock Mode.", error);
        rawData = this.generateMockData();
      }
    }

    if (!this.validateData(rawData)) {
      throw new Error("Дані каталогу не відповідають JSON Schema (JCOS) контракту.");
    }
    return rawData.products;
  }

  public async getCatalog(): Promise<ProductCatalog> {
    return { products: await this.getProducts() };
  }

  /** Змінює джерело даних без перевизначення UI-компонентів. */
  public setMode(mode: CatalogMode | boolean): void {
    this.mode = typeof mode === "boolean" ? (mode ? "mock" : "api") : mode;
  }

  public setApiEndpoint(apiEndpoint: string): void {
    this.apiEndpoint = apiEndpoint;
  }

  public setTransform(transform: (payload: unknown) => unknown): void {
    this.transform = transform;
  }

  public setMockFactory(mockFactory: () => unknown): void {
    this.mockFactory = mockFactory;
  }
}

/** Інстанс для компонентів; стандартно запускається автономний Mock Mode. */
export const catalogAdapter = new CatalogAdapter();
