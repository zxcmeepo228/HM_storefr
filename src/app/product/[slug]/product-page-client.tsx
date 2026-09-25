"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCatalog } from "@/catalog/repository";
import { getCatalogMode } from "@/catalog/runtime-config";
import type { Product } from "@/catalog/types";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductTabs } from "@/components/catalog/product-tabs";
import { getUiCopy } from "@/lib/ui-copy";
import { flyToCart } from "@/lib/fly-to-cart";
import { StickyPurchaseBar } from "@/components/catalog/sticky-purchase-bar";
import { QuickOrderModal } from "@/components/catalog/quick-order-modal";
import { RelatedProducts } from "@/components/catalog/related-products";
import { ConversionStory } from "@/components/catalog/conversion-story";
import { BundleOffer } from "@/components/catalog/bundle-offer";
import { GiftOffer, withoutGiftHeading } from "@/components/catalog/gift-offer";
import { ProductHeader } from "@/components/catalog/product-header";
import { categoryLabels, displayCategoryLabel } from "@/catalog/category-label";
import { trackConversion } from "@/lib/conversion-pipeline";
import { SiteFooter } from "@/components/catalog/site-footer";
import { catalogUpdatedEvent, readCmsReviews } from "@/admin/local-cms";
import { withReviewStats } from "@/catalog/review-stats";

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function productLead(product: Product) {
  const source = product.shortDescriptionHtml ? plainText(withoutGiftHeading(product.shortDescriptionHtml) ?? "") : product.shortDescription ?? "";
  if (source.length <= 235) return source;
  return `${source.slice(0, 232).trimEnd()}…`;
}

export function ProductPageClient() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, openCart, isFavorite, toggleFavorite, locale, syncCartProducts } = useStorefront();
  const copy = getUiCopy(locale);
  const [product, setProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(0);

  useEffect(() => {
    const refreshReviews = () => setReviewVersion((version) => version + 1);
    window.addEventListener(catalogUpdatedEvent, refreshReviews);
    return () => window.removeEventListener(catalogUpdatedEvent, refreshReviews);
  }, []);

  useEffect(() => {
    setError(false);
    getCatalog(getCatalogMode(), locale)
      .then(({ products: catalogProducts }) => {
        syncCartProducts(catalogProducts);
        const productsWithReviews = withReviewStats(catalogProducts, readCmsReviews());
        setProducts(productsWithReviews);
        setProduct(productsWithReviews.find((item) => item.slug === slug) ?? null);
      })
      .catch(() => setError(true));
  }, [slug, locale, reviewVersion, syncCartProducts]);

  useEffect(() => { if (product) trackConversion("product_view", product.id); }, [product]);

  if (error) return <main className="product-page"><p>Не вдалося завантажити товар.</p></main>;
  if (!product) return <main className="product-page"><p>Завантаження товару…</p></main>;

  const warranty = product.warrantyMonths ? `${product.warrantyMonths} ${locale === "uk" ? "міс." : "мес."}` : locale === "uk" ? "Офіційна гарантія" : "Официальная гарантия";
  const installment = Math.ceil(product.price / 4);
  const primaryCategory = categoryLabels(product.category)[0] ?? product.category;
  const primaryCategoryLabel = displayCategoryLabel(primaryCategory, locale);
  const numberLocale = locale === "uk" ? "uk-UA" : "ru-RU";
  const lead = productLead(product);

  return <>
    <ProductHeader />
    <main className="product-page page-enter">
    <nav className="breadcrumbs product-breadcrumbs" aria-label={locale === "uk" ? "Навігація по сторінці" : "Навигация по странице"}>
      <Link href="/" aria-label={locale === "uk" ? "Головна" : "Главная"}>⌂</Link><span>›</span>
      <Link href="/#catalog">{locale === "uk" ? "Магазин медтехніки" : "Магазин медтехники"}</Link><span>›</span>
      <Link href={`/?category=${encodeURIComponent(primaryCategoryLabel)}#catalog`}>{primaryCategoryLabel}</Link><span>›</span>
      <span className="current">{product.title}</span>
    </nav>
    <section className="product-detail">
      <div className="product-left-column">
        <ProductGallery images={product.images} title={product.title} locale={locale} />
      </div>
      <div className="product-summary">
        <p><Link href={`/?category=${encodeURIComponent(primaryCategoryLabel)}#catalog`}>{primaryCategoryLabel}</Link></p><h1>{product.title}</h1><GiftOffer product={product} products={products} locale={locale} />
        {lead && <div className="product-summary-lead"><p>{lead}</p><a href="#product-details">{locale === "uk" ? "Повний опис і характеристики" : "Полное описание и характеристики"} ↓</a></div>}
        {(product.reviewCount ?? 0) > 0 && <a className="detail-review-summary" href="#reviews">★ {product.rating?.toFixed(1)} <span>{product.reviewCount} {locale === "uk" ? "відгуків" : "отзывов"}</span><b>{locale === "uk" ? "Читати" : "Читать"} →</b></a>}
        <div className={/arhimed/i.test(product.title) ? "detail-price arhimed-price" : "detail-price"}><strong>{product.price.toLocaleString(numberLocale)} ₴</strong>{product.oldPrice && <s>{product.oldPrice.toLocaleString(numberLocale)} ₴</s>}</div>
        <span className={product.inStock ? "stock in-stock" : "stock"}>{product.inStock ? copy.inStock : copy.outOfStock}</span>
        <div className="trust-grid trust-grid-before-purchase">
          <div><b>↗</b><span>{locale === "uk" ? "Відправимо сьогодні" : "Отправим сегодня"}<small>{locale === "uk" ? "Для замовлень до 19:00" : "Для заказов до 19:00"}</small></span></div>
          <Link className="trust-return-link" href="/returns"><b>↺</b><span>{locale === "uk" ? "Обмін і повернення" : "Обмен и возврат"}<small>{locale === "uk" ? "Протягом 14 діб" : "В течение 14 дней"}</small></span></Link>
          <div><b>✓</b><span>{locale === "uk" ? "Гарантія" : "Гарантия"}<small>{warranty}</small></span></div>
        </div>
        <div className="detail-actions"><button className="detail-buy" data-primary-purchase disabled={!product.inStock} onClick={(event) => { flyToCart(product.images?.[0], event.currentTarget); addToCart(product); openCart(); }}>{product.inStock ? copy.addCart : copy.outOfStock}</button><button className={isFavorite(product.id) ? "detail-favorite active" : "detail-favorite"} onClick={() => toggleFavorite(product.id)} aria-label={isFavorite(product.id) ? (locale === "uk" ? "Прибрати з обраного" : "Удалить из избранного") : (locale === "uk" ? "Додати в обране" : "Добавить в избранное")}>{isFavorite(product.id) ? "♥" : "♡"}</button></div>
        <div className="conversion-actions">
          <button className="quick-order-trigger" disabled={!product.inStock} onClick={() => setQuickOrderOpen(true)}>{locale === "uk" ? "Купити в 1 клік" : "Купить в 1 клик"}</button>
          <button className="installment-trigger" onClick={() => setInstallmentOpen((open) => !open)}>{locale === "uk" ? "Оплата частинами" : "Оплата частями"}<span>{locale === "uk" ? `4 платежі по ${installment.toLocaleString("uk-UA")} ₴` : `4 платежа по ${installment.toLocaleString("ru-RU")} ₴`}</span></button>
        </div>
        {installmentOpen && <div className="installment-note" role="status">{locale === "uk" ? `Орієнтовно 4 платежі по ${installment.toLocaleString("uk-UA")} ₴. Доступність і умови підтверджуються під час оформлення замовлення.` : `Ориентировочно 4 платежа по ${installment.toLocaleString("ru-RU")} ₴. Доступность и условия подтверждаются при оформлении заказа.`}</div>}
        <BundleOffer product={product} products={products} locale={locale} />
      </div>
    </section>
    <RelatedProducts product={product} products={products} locale={locale} />
    <ProductTabs product={product} afterDescription={<ConversionStory product={product} locale={locale} />} />
    </main>
    <StickyPurchaseBar product={product} />
    <QuickOrderModal product={product} locale={locale} open={quickOrderOpen} onClose={() => setQuickOrderOpen(false)} />
    <SiteFooter />
  </>;
}
