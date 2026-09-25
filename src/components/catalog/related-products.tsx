import Link from "next/link";
import type { Product } from "@/catalog/types";

type Props = { product: Product; products: Product[]; locale: "uk" | "ru" };

export function RelatedProducts({ product, products, locale }: Props) {
  const isArhimed = /arhimed/i.test(product.title);
  const sameBrand = (item: Product) => isArhimed === /arhimed/i.test(item.title);
  const differentCategory = (item: Product) => item.category.toLowerCase() !== product.category.toLowerCase();

  // The block offers complementary categories rather than a duplicate of the
  // current one. ArhiMED devices are preferred when available.
  const crossCategory = products
    .filter((item) => item.id !== product.id && differentCategory(item))
    .sort((a, b) => Number(sameBrand(b)) - Number(sameBrand(a)) || (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 4);
  const related = crossCategory.length >= 4
    ? crossCategory
    : [...crossCategory, ...products
      .filter((item) => item.id !== product.id && !crossCategory.some((chosen) => chosen.id === item.id))
      .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || a.title.localeCompare(b.title, locale))]
      .slice(0, 4);

  if (!related.length) return null;
  const heading = locale === "uk" ? "Разом дешевше" : "Вместе дешевле";
  const eyebrow = locale === "uk" ? "Рекомендовані товари" : "Рекомендуемые товары";
  const button = locale === "uk" ? "Переглянути" : "Посмотреть";

  return <section className="related-products" aria-label={heading}>
    <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{heading}</h2></div>
    <div className="related-grid">{related.map((item) => <article className="related-card" key={item.id}>
      <Link href={`/product/${item.slug}`}><img src={item.images?.[0]} alt={item.title} /><h3>{item.title}</h3><strong>{item.price.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</strong>{item.oldPrice && <s>{item.oldPrice.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</s>}<span>{button} →</span></Link>
    </article>)}</div>
  </section>;
}
