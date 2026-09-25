import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/catalog/types";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { getUiCopy } from "@/lib/ui-copy";
import { flyToCart } from "@/lib/fly-to-cart";

type Props = { product: Product };

export function ProductCard({ product }: Props) {
  const image = product.images?.[0];
  const details = Object.entries(product.attributes ?? {}).filter(([key]) => !/^source(url)?$/i.test(key)).slice(0, 1);
  const href = `/product/${encodeURIComponent(product.slug ?? product.id)}`;
  const { addToCart, openCart, isFavorite, toggleFavorite, locale } = useStorefront();
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<number | undefined>(undefined);
  const drawerTimer = useRef<number | undefined>(undefined);
  const copy = getUiCopy(locale);
  const favorite = isFavorite(product.id);
  const numberLocale = locale === "uk" ? "uk-UA" : "ru-RU";
  const isArhimed = /arhimed/i.test(product.title);
  const discountPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;
  // A crossed-out price alone is enough for ordinary discounts. A badge should
  // keep its signal value, so it is reserved for an editor-set label or a real
  // deep discount of 30%+.
  const badge = product.badges?.[0] ?? (discountPercent >= 30 ? `−${discountPercent}%` : null);
  const hasGift = Boolean(product.giftProductId) || /подар(?:унок|ок)?|gift/iu.test(`${product.title} ${product.shortDescription ?? ""}`);
  const hasReviews = typeof product.rating === "number" && typeof product.reviewCount === "number" && product.reviewCount > 0;
  const favoriteLabel = favorite
    ? (locale === "uk" ? "Прибрати з обраного" : "Удалить из избранного")
    : (locale === "uk" ? "Додати в обране" : "Добавить в избранное");
  useEffect(() => () => {
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    if (drawerTimer.current) window.clearTimeout(drawerTimer.current);
  }, []);
  const addProductToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    flyToCart(image, event.currentTarget);
    addToCart(product);
    setJustAdded(true);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    if (drawerTimer.current) window.clearTimeout(drawerTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded(false), 1300);
    drawerTimer.current = window.setTimeout(openCart, 420);
  };

  return <article className="product-card">
    <Link className="product-image-wrap" href={href}>
      {image ? <img className="product-image" src={image} alt={product.title} loading="lazy" /> : <div className="product-image placeholder" />}
      {(badge || hasGift) && <span className="product-labels">{badge && <span className="product-badge">{badge}</span>}{hasGift && <span className="product-gift-badge">{locale === "uk" ? "Гель у подарунок" : "Гель в подарок"}</span>}</span>}
    </Link>
    <button className={favorite ? "card-favorite active" : "card-favorite"} onClick={() => toggleFavorite(product.id)} aria-label={favoriteLabel}>{favorite ? "♥" : "♡"}</button>
    <div className="product-content">
      <p className="product-category">{hasReviews ? <><b className="product-rating">★ {product.rating!.toFixed(1)}</b><span className="product-review-count">{product.reviewCount} {locale === "uk" ? "відгуків" : "отзывов"}</span></> : <span>{product.inStock ? copy.inStock : copy.outOfStock}</span>}</p>
      <h2><Link href={href}>{product.title}</Link></h2>
      {details.length > 0 && <p className="product-details">{details.map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>}
      <div className={`price-row${product.oldPrice ? " has-sale" : ""}${isArhimed && product.oldPrice ? " arhimed-sale" : ""}`}>
        <div className="price-stack">
          {product.oldPrice && <s>{product.oldPrice.toLocaleString(numberLocale)} ₴</s>}
          <strong>{product.price.toLocaleString(numberLocale)} ₴</strong>
        </div>
        <button className={`add-to-cart${justAdded ? " is-added" : ""}`} disabled={!product.inStock} onClick={addProductToCart} aria-label={`${copy.addCart}: ${product.title}`}>{product.inStock ? (justAdded ? (locale === "uk" ? "Додано ✓" : "Добавлено ✓") : copy.buy) : copy.unavailable}</button>
      </div>
    </div>
  </article>;
}
