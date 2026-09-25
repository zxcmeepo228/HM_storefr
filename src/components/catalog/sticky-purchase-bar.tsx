"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/catalog/types";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { getUiCopy } from "@/lib/ui-copy";
import { displayCategoryLabel } from "@/catalog/category-label";

export function StickyPurchaseBar({ product }: { product: Product }) {
  const { addToCart, openCart, locale } = useStorefront();
  const copy = getUiCopy(locale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Показуємо панель щойно основна кнопка покупки зникла вище екрана.
    // Після цього вона не залежить від висоти опису й залишається на екрані
    // до кінця сторінки.
    const trigger = document.querySelector("[data-primary-purchase]");
    if (!trigger) return;
    // На мобільному головний блок може бути вищим за екран, тому не чекаємо,
    // поки його кнопка повністю пройде верхній край. Після короткої прокрутки
    // панель завжди фіксується разом з екраном.
    const updateVisibility = () => setVisible(window.scrollY > 160 || trigger.getBoundingClientRect().bottom < 0);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [product.id]);

  return <aside className={visible ? "sticky-purchase visible" : "sticky-purchase"} aria-hidden={!visible}>
    {product.images?.[0] && <img className="sticky-purchase-image" src={product.images[0]} alt="" />}
    <div className="sticky-purchase-copy"><span>{displayCategoryLabel(product.category, locale)}</span><strong>{product.title}</strong></div>
    <div className="sticky-purchase-price"><strong>{product.price.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</strong>{product.oldPrice && <s>{product.oldPrice.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</s>}</div>
    <button tabIndex={visible ? 0 : -1} disabled={!product.inStock} onClick={() => { addToCart(product); openCart(); }}>{product.inStock ? copy.buy : copy.outOfStock}</button>
  </aside>;
}
