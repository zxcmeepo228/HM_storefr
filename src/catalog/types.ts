export type Primitive = string | number | boolean;

export type Product = {
  id: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  shortDescription?: string;
  shortDescriptionHtml?: string;
  price: number;
  category: string;
  inStock: boolean;
  slug?: string;
  oldPrice?: number;
  warrantyMonths?: number;
  published?: boolean;
  barcode?: string;
  manufacturerCode?: string;
  brand?: string;
  supplier?: string;
  condition?: "new" | "used";
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  badges?: string[];
  /** Verified rating and number of published reviews, entered in CMS or received from API. */
  rating?: number;
  reviewCount?: number;
  /** Manual merchandising priority. Lower value appears earlier across storefront lists. */
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
  noIndex?: boolean;
  bundleProductIds?: string[];
  bundleDiscountPercent?: number;
  /** Individual percentage discount for each item in a manual bundle, keyed by product ID. */
  bundleDiscounts?: Record<string, number>;
  /** One optional relevant product shown before order confirmation. */
  checkoutUpsellProductIds?: string[];
  /** Configurable discount for the checkout upsell offered with this product. */
  checkoutUpsellDiscountPercent?: number;
  /** Discount applied to the whole checkout order after the upsell is added. */
  checkoutUpsellOrderDiscountPercent?: number;
  giftProductId?: string;
  images?: string[];
  descriptionImages?: string[];
  attributes?: Record<string, string>;
  [key: string]: unknown;
};

export type ProductCatalog = { products: Product[] };
export type CatalogMode = "mock" | "api";

export type Filter = { key: string; value: string };
