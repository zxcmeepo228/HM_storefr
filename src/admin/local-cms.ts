import { parseCatalog } from "@/catalog/contract";
import type { Product, ProductCatalog } from "@/catalog/types";
import { verifiedHeymomReviews } from "@/catalog/data/heymom-reviews";

export const localCatalogKey = "heymom-cms-catalog-v1";
export const localReviewsKey = "heymom-cms-reviews-v1";
export const localCategoriesKey = "heymom-cms-categories-v1";
export const localHomepageBannersKey = "heymom-cms-homepage-banners-v1";
export const localOrderMetaKey = "heymom-cms-order-meta-v1";
export const catalogUpdatedEvent = "heymom-catalog-updated";

export type CmsReviewStatus = "draft" | "pending" | "published" | "hidden";

export type CmsReviewReply = {
  author: string;
  text: string;
  createdAt: string;
};

export type CmsReview = {
  id: string;
  productId: string;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
  status: CmsReviewStatus;
  sourceUrl?: string;
  reply?: CmsReviewReply;
};

export type CmsCategory = {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  hidden?: boolean;
  sortOrder?: number;
};

export type CmsHomepageBanner = {
  id: string;
  enabled?: boolean;
  sortOrder?: number;
  href?: string;
  category?: string;
  eyebrowUk?: string;
  titleUk?: string;
  textUk?: string;
  ctaUk?: string;
  eyebrowRu?: string;
  titleRu?: string;
  textRu?: string;
  ctaRu?: string;
};

export type CmsOrderStatus = "new" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";

export type CmsOrderMeta = {
  id: string;
  status: CmsOrderStatus;
  note?: string;
  updatedAt: string;
};

function cloneCatalog(catalog: ProductCatalog): ProductCatalog {
  return JSON.parse(JSON.stringify(catalog)) as ProductCatalog;
}

export function readLocalCatalog(fallback: ProductCatalog): ProductCatalog {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(localCatalogKey);
    return saved ? parseCatalog(JSON.parse(saved)) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalCatalog(catalog: ProductCatalog): ProductCatalog {
  const validCatalog = parseCatalog(cloneCatalog(catalog));
  window.localStorage.setItem(localCatalogKey, JSON.stringify(validCatalog));
  window.dispatchEvent(new Event(catalogUpdatedEvent));
  return validCatalog;
}

export function clearLocalCatalog(): void {
  window.localStorage.removeItem(localCatalogKey);
  window.dispatchEvent(new Event(catalogUpdatedEvent));
}

export function readCmsReviews(): CmsReview[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(localReviewsKey);
    const value = JSON.parse(saved ?? "null") as CmsReview[] | null;
    if (!Array.isArray(value)) return verifiedHeymomReviews;
    // Оригінальні відгуки оновлюються разом із фронтендом. Локально
    // зберігаємо лише їхній актуальний статус/редагування та нові відгуки
    // покупців, щоб старий seed не міг створити дублікати після оновлення.
    const savedById = new Map(value.map((review) => [review.id, review]));
    const sourceReviewIds = new Set(verifiedHeymomReviews.map((review) => review.id));
    return [
      ...verifiedHeymomReviews.map((review) => savedById.get(review.id) ?? review),
      ...value.filter((review) => !review.sourceUrl && !sourceReviewIds.has(review.id)),
    ];
  } catch {
    return verifiedHeymomReviews;
  }
}

export function writeCmsReviews(reviews: CmsReview[]): void {
  window.localStorage.setItem(localReviewsKey, JSON.stringify(reviews));
  window.dispatchEvent(new Event(catalogUpdatedEvent));
}

export function readCmsCategories(): CmsCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(localCategoriesKey) ?? "[]") as CmsCategory[];
    return Array.isArray(value) ? value.filter((category) => typeof category?.name === "string") : [];
  } catch { return []; }
}

export function writeCmsCategories(categories: CmsCategory[]): void {
  window.localStorage.setItem(localCategoriesKey, JSON.stringify(categories));
  window.dispatchEvent(new Event(catalogUpdatedEvent));
}

export function readCmsHomepageBanners(): CmsHomepageBanner[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(localHomepageBannersKey) ?? "[]") as CmsHomepageBanner[];
    return Array.isArray(value) ? value.filter((banner) => typeof banner?.id === "string") : [];
  } catch { return []; }
}

export function writeCmsHomepageBanners(banners: CmsHomepageBanner[]): void {
  window.localStorage.setItem(localHomepageBannersKey, JSON.stringify(banners));
  window.dispatchEvent(new Event(catalogUpdatedEvent));
}

export function readCmsOrderMeta(): CmsOrderMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(localOrderMetaKey) ?? "[]") as CmsOrderMeta[];
    return Array.isArray(value) ? value.filter((item) => typeof item?.id === "string" && typeof item?.status === "string") : [];
  } catch { return []; }
}

export function writeCmsOrderMeta(items: CmsOrderMeta[]): void {
  window.localStorage.setItem(localOrderMetaKey, JSON.stringify(items));
  window.dispatchEvent(new Event(catalogUpdatedEvent));
}

export function reviewForProduct(productId: string): CmsReview[] {
  return readCmsReviews().filter((review) => review.productId === productId && review.status === "published");
}

export function makeDraftProduct(): Product {
  const id = `local-${Date.now()}`;
  return {
    id,
    slug: `novyi-tovar-${Date.now()}`,
    title: "Новий товар",
    price: 0,
    category: "Без категорії",
    inStock: true,
    published: false,
    images: [],
    attributes: {},
  };
}
