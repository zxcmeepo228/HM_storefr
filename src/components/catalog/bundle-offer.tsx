"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/catalog/types";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { flyToCart } from "@/lib/fly-to-cart";

type Props = { product: Product; products: Product[]; locale: "uk" | "ru" };

export function BundleOffer({ product, products, locale }: Props) {
  const { addBundleToCart, openCart } = useStorefront();
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [slideVersion, setSlideVersion] = useState(0);
  const companions = (product.bundleProductIds ?? [])
    .map((id) => products.find((item) => item.id === id))
    .filter((item): item is Product => Boolean(item?.inStock));

  if (!companions.length || !product.inStock) return null;

  const local = locale === "uk";
  const money = (value: number) => value.toLocaleString(local ? "uk-UA" : "ru-RU");
  const companion = companions[active % companions.length];
  const discounts = product.bundleDiscounts ?? {};
  const mainDiscount = discounts[product.id] ?? 0;
  const companionDiscount = discounts[companion.id] ?? product.bundleDiscountPercent ?? 0;
  const oldPrice = product.price + companion.price;
  const price = Math.round(product.price * (100 - mainDiscount) / 100) + Math.round(companion.price * (100 - companionDiscount) / 100);
  const saving = oldPrice - price;
  const move = (step: -1 | 1) => { setDirection(step > 0 ? "left" : "right"); setSlideVersion((version) => version + 1); setActive((current) => (current + step + companions.length) % companions.length); };
  const title = local ? `Разом: ${product.title} + ${companion.title}` : `Вместе: ${product.title} + ${companion.title}`;

  return <section className="bundle-offer bundle-carousel-offer" aria-label={local ? "Разом дешевше" : "Вместе дешевле"}>
    <div className="bundle-carousel-head"><h2>{local ? "Разом дешевше" : "Вместе дешевле"}</h2>{companions.length > 1 && <div className="bundle-dots">{companions.map((item, index) => <button key={item.id} className={index === active ? "active" : ""} onClick={() => { setDirection(index > active ? "left" : "right"); setSlideVersion((version) => version + 1); setActive(index); }} aria-label={`${local ? "Варіант" : "Вариант"} ${index + 1}`} />)}</div>}</div>
    <div className={`bundle-slide bundle-slide-in-${direction}`} key={`${companion.id}-${slideVersion}`}>
      {companions.length > 1 && <button className="bundle-slide-nav previous" onClick={() => move(-1)} aria-label={local ? "Попередній варіант" : "Предыдущий вариант"}>‹</button>}
      <div className="bundle-slide-product"><Link href={`/product/${product.slug}`}><img src={product.images?.[0]} alt={product.title} /><span>{product.title}</span></Link></div>
      <b className="bundle-slide-plus">+</b>
      <div className="bundle-slide-product"><Link href={`/product/${companion.slug}`}><img src={companion.images?.[0]} alt={companion.title} /><span>{companion.title}<small>{companionDiscount > 0 ? `−${companionDiscount}%` : local ? "Спеціальна ціна" : "Специальная цена"}</small></span></Link></div>
      {companions.length > 1 && <button className="bundle-slide-nav next" onClick={() => move(1)} aria-label={local ? "Наступний варіант" : "Следующий вариант"}>›</button>}
    </div>
    <footer><div><span>{local ? "Ціна комплекту" : "Цена комплекта"}</span><s>{money(oldPrice)} ₴</s><strong>{money(price)} ₴</strong>{saving > 0 && <em>−{money(saving)} ₴</em>}</div><button onClick={(event) => { flyToCart(companion.images?.[0], event.currentTarget); addBundleToCart([product, companion], title, price); openCart(); }}>{local ? "Купити разом" : "Купить вместе"}</button></footer>
  </section>;
}
