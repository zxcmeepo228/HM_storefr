"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/catalog/product-card";
import type { Product } from "@/catalog/types";

type Props = { products: Product[]; locale: "uk" | "ru" };

export function TopProducts({ products, locale }: Props) {
  const topProducts = useMemo(() => {
    const ratedProducts = products.filter((product) => product.inStock && (product.reviewCount ?? 0) > 0);
    return ratedProducts.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || (b.rating ?? 0) - (a.rating ?? 0) || (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
  }, [products]);
  if (!topProducts.length) return null;

  const labels = locale === "uk" ? { eyebrow: "ОБИРАЮТЬ НАЙЧАСТІШЕ", title: "Топ продажів" } : { eyebrow: "ВЫБИРАЮТ ЧАЩЕ ВСЕГО", title: "Топ продаж" };
  return <section className="top-products" aria-labelledby="top-products-title">
    <div className="top-products-head"><div><p>{labels.eyebrow}</p><h2 id="top-products-title">{labels.title}</h2></div></div>
    <div className="top-products-grid">{topProducts.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div>
  </section>;
}
