import type { CmsReview } from "@/admin/local-cms";
import type { Product } from "@/catalog/types";

export type ReviewStats = { rating: number; reviewCount: number };

export function reviewStatsByProduct(reviews: CmsReview[]): Map<string, ReviewStats> {
  const totals = new Map<string, { sum: number; count: number }>();
  reviews.filter((review) => review.status === "published").forEach((review) => {
    const current = totals.get(review.productId) ?? { sum: 0, count: 0 };
    totals.set(review.productId, { sum: current.sum + review.rating, count: current.count + 1 });
  });
  return new Map([...totals].map(([productId, total]) => [productId, { rating: Math.round((total.sum / total.count) * 10) / 10, reviewCount: total.count }]));
}

export function withReviewStats(products: Product[], reviews: CmsReview[]): Product[] {
  const stats = reviewStatsByProduct(reviews);
  return products.map((product) => {
    const reviewStats = stats.get(product.id);
    return reviewStats ? { ...product, ...reviewStats } : product;
  });
}
