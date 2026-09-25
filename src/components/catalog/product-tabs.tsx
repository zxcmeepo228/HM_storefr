"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Product } from "@/catalog/types";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { getUiCopy } from "@/lib/ui-copy";
import { withoutGiftHeading } from "@/components/catalog/gift-offer";
import { StorePolicies } from "@/components/catalog/store-policies";
import { catalogUpdatedEvent, readCmsReviews, reviewForProduct, type CmsReview, writeCmsReviews } from "@/admin/local-cms";

type Props = { product: Product; afterDescription?: ReactNode };
type Tab = "overview" | "specifications" | "description" | "policies" | "reviews";
type LocalReview = CmsReview;

// Legacy WooCommerce exports append a technical product_meta block (SKU,
// category and old tags) to the customer-facing description. Those fields
// already exist in our structured product data, so do not render the export.
function withoutLegacyMeta(html: string) {
  return html.replace(/<div\b[^>]*class=(["'])[^"']*\bproduct_meta\b[^"']*\1[^>]*>[\s\S]*?<\/div>\s*$/gi, "");
}

type ProductVideo = { src: string; title: string; portrait: boolean };

function separateProductVideos(html: string) {
  const videos: ProductVideo[] = [];
  const content = withoutLegacyMeta(html).replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, (embed) => {
    const src = embed.match(/\bsrc=(["'])(.*?)\1/i)?.[2];
    if (!src || !/^https:\/\/(www\.)?youtube(?:-nocookie)?\.com\/embed\//i.test(src)) return "";
    const title = embed.match(/\btitle=(["'])(.*?)\1/i)?.[2] ?? "Відеоогляд товару";
    const width = Number(embed.match(/\bwidth=(["']?)(\d+)\1/i)?.[2] ?? 16);
    const height = Number(embed.match(/\bheight=(["']?)(\d+)\1/i)?.[2] ?? 9);
    videos.push({ src, title, portrait: height > width * 1.15 });
    return "";
  });
  return { content, videos };
}

export function ProductTabs({ product, afterDescription }: Props) {
  const { locale } = useStorefront();
  const copy = getUiCopy(locale);
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSaved, setReviewSaved] = useState(false);
  const specifications = Object.entries(product.attributes ?? {}).filter(([key]) => !/^source(url)?$/i.test(key) && !/^(reviews|reviewCount)$/i.test(key));
  const descriptionMedia = product.descriptionImages?.length ? product.descriptionImages : product.images?.slice(1, 3);
  const description = product.descriptionHtml ? separateProductVideos(product.descriptionHtml) : null;
  // Показуємо фактичну кількість опублікованих записів, а не застарілий
  // aggregate з експорту товару. Так лічильник збігається з імпортом CMS.
  const displayedReviewCount = reviews.length;

  useEffect(() => {
    setReviews(reviewForProduct(product.id));
    setReviewSaved(false);
  }, [product.id]);

  useEffect(() => {
    const refreshReviews = () => setReviews(reviewForProduct(product.id));
    window.addEventListener(catalogUpdatedEvent, refreshReviews);
    return () => window.removeEventListener(catalogUpdatedEvent, refreshReviews);
  }, [product.id]);

  useEffect(() => {
    const openReviewsFromHash = () => { if (window.location.hash === "#reviews") setActiveTab("reviews"); };
    openReviewsFromHash();
    window.addEventListener("hashchange", openReviewsFromHash);
    return () => window.removeEventListener("hashchange", openReviewsFromHash);
  }, []);

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = reviewName.trim(); const text = reviewText.trim();
    if (!name || !text) return;
    const nextReview: LocalReview = { id: `${Date.now()}`, productId: product.id, name, rating: reviewRating, text, createdAt: new Date().toISOString(), status: "pending" };
    writeCmsReviews([nextReview, ...readCmsReviews()]);
    setReviewName(""); setReviewText(""); setReviewRating(5); setReviewSaved(true);
  };

  return <section className="product-tabs" id="product-details" data-sticky-purchase-trigger aria-label="Інформація про товар">
    <span id="reviews" className="product-reviews-anchor" aria-hidden="true" />
    <div className="product-tab-list" role="tablist" aria-label="Деталі товару">
      <button role="tab" aria-selected={activeTab === "description"} className={activeTab === "description" ? "active" : ""} onClick={() => setActiveTab("description")}>{locale === "uk" ? "Опис" : "Описание"}</button>
      <button role="tab" aria-selected={activeTab === "specifications"} className={activeTab === "specifications" ? "active" : ""} onClick={() => setActiveTab("specifications")}>{copy.specifications} <span>{specifications.length}</span></button>
      <button role="tab" aria-selected={activeTab === "policies"} className={activeTab === "policies" ? "active" : ""} onClick={() => setActiveTab("policies")}>{locale === "uk" ? "Доставка й оплата" : "Доставка и оплата"}</button>
      <button role="tab" aria-selected={activeTab === "reviews"} className={activeTab === "reviews" ? "active" : ""} onClick={() => setActiveTab("reviews")}>{copy.reviews} ({displayedReviewCount})</button>
    </div>
    <div className="product-tab-panel" role="tabpanel">
      {activeTab === "overview"
        ? <div className="description-content short-description-panel">{product.shortDescriptionHtml ? <div dangerouslySetInnerHTML={{ __html: withoutGiftHeading(product.shortDescriptionHtml) ?? "" }} /> : product.shortDescription ? <p>{product.shortDescription}</p> : <p>Опис товару тимчасово уточнюється.</p>}</div>
        : activeTab === "description"
        ? <><div className="description-content">{description ? <div dangerouslySetInnerHTML={{ __html: description.content }} /> : product.description ? <p>{product.description}</p> : <p>Опис товару тимчасово уточнюється.</p>}</div>{description?.videos.length ? <section className="product-video-overview" aria-label={locale === "uk" ? "Відеоогляди товару" : "Видеообзоры товара"}><header><span>{locale === "uk" ? "Відеоогляд" : "Видеообзор"}</span><h3>{locale === "uk" ? "Подивіться товар у дії" : "Посмотрите товар в действии"}</h3></header><div className="product-video-grid">{description.videos.map((video) => <div key={video.src} className={video.portrait ? "product-video-frame portrait" : "product-video-frame"}><iframe src={video.src} title={video.title} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>)}</div></section> : null}{!product.descriptionHtml && descriptionMedia?.length ? <div className="description-media">{descriptionMedia.map((image, index) => <img key={image} src={image} alt={`${product.title} - фото ${index + 1}`} loading="lazy" />)}</div> : null}</>
        : activeTab === "specifications"
        ? <dl className="specifications-list">{specifications.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
        : activeTab === "policies"
        ? <StorePolicies />
        : <div className="reviews-panel">
          {reviews.length > 0 && <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.id}><div><strong>{review.name}</strong><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString(locale === "uk" ? "uk-UA" : "ru-RU")}</time></div><p>{review.text}</p>{review.reply?.text && <section className="review-reply"><header><strong>{review.reply.author || "Heymom"}</strong><time dateTime={review.reply.createdAt}>{locale === "uk" ? "Відповідь магазину" : "Ответ магазина"} · {new Date(review.reply.createdAt).toLocaleDateString(locale === "uk" ? "uk-UA" : "ru-RU")}</time></header><p>{review.reply.text}</p></section>}</article>)}</div>}
          {reviews.length === 0 && <p className="reviews-empty">{locale === "ru" ? "Пока нет отзывов. Будьте первым!" : "Поки немає відгуків. Будьте першим!"}</p>}
          <form className="review-form" onSubmit={submitReview}><h3>{locale === "ru" ? "Оставить отзыв" : "Залишити відгук"}</h3><label>{locale === "ru" ? "Ваше имя" : "Ваше ім’я"}<input value={reviewName} onChange={(event) => setReviewName(event.target.value)} required /></label><label>{locale === "ru" ? "Оценка" : "Оцінка"}<select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} ★</option>)}</select></label><label>{locale === "ru" ? "Ваш отзыв" : "Ваш відгук"}<textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} required /></label><button type="submit">{locale === "ru" ? "Отправить на модерацию" : "Надіслати на модерацію"}</button>{reviewSaved && <p className="review-saved" role="status">{locale === "ru" ? "Отзыв принят и появится после модерации." : "Відгук прийнято і з’явиться після модерації."}</p>}</form>
        </div>}
      {afterDescription}
    </div>
  </section>;
}
