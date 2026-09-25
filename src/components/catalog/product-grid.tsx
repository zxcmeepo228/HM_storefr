import type { Product } from "@/catalog/types";
import { ProductCard } from "./product-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export function ProductGrid({ products, loading }: { products: Product[]; loading: boolean }) {
  if (loading) return <div className="product-grid">{Array.from({ length: 8 }, (_, index) => <div className="product-skeleton" key={index} />)}</div>;
  if (!products.length) return <p className="empty-state">За вашими параметрами товарів не знайдено.</p>;
  return <div className="product-grid">{products.map((product, index) => <ScrollReveal key={product.id} className="reveal-card" delay={(index % 3) * 75}><ProductCard product={product} /></ScrollReveal>)}</div>;
}
