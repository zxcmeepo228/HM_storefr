"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCatalog } from "@/catalog/repository";
import { getCatalogMode } from "@/catalog/runtime-config";
import type { Product } from "@/catalog/types";
import { useStorefront } from "./storefront-provider";

type Props = { open: boolean; onClose: () => void };

export function FavoritesDrawer({ open, onClose }: Props) {
  const { favorites, locale, toggleFavorite, addToCart, openCart } = useStorefront();
  const [products, setProducts] = useState<Product[]>([]);
  const local = locale === "uk";
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));

  useEffect(() => {
    if (!open) return;
    let active = true;
    getCatalog(getCatalogMode(), locale)
      .then((catalog) => {
        if (active) setProducts(catalog.products.filter((product) => favorites.includes(product.id)));
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => { active = false; };
  }, [open, locale, favorites]);

  const addFavoriteToCart = (product: Product) => {
    addToCart(product);
    onClose();
    openCart();
  };

  return <div className={open ? "favorites-layer open" : "favorites-layer"} aria-hidden={!open}>
    <button className="favorites-backdrop" aria-label={local ? "Закрити обране" : "Закрыть избранное"} onClick={onClose} />
    <aside className="favorites-drawer" aria-label={local ? "Обране" : "Избранное"}>
      <header className="favorites-drawer-header"><div><span className="eyebrow">{local ? "Ваші товари" : "Ваши товары"}</span><h2>{local ? "Обране" : "Избранное"}</h2></div><button className="icon-button favorites-drawer-close" onClick={onClose} aria-label={local ? "Закрити" : "Закрыть"}>×</button></header>
      {!favorites.length ? <div className="favorites-empty"><span>♡</span><strong>{local ? "Тут поки порожньо" : "Здесь пока пусто"}</strong><p>{local ? "Натискайте на сердечко біля товару — він збережеться тут." : "Нажимайте на сердечко возле товара — он сохранится здесь."}</p><button onClick={onClose}>{local ? "Перейти до каталогу" : "Перейти в каталог"}</button></div> : <div className="favorites-lines">
        {favoriteProducts.map((product) => <article className="favorite-line" key={product.id}>
          <Link href={`/product/${encodeURIComponent(product.slug ?? product.id)}`} onClick={onClose}>{product.images?.[0] ? <img src={product.images[0]} alt="" /> : <span className="favorite-image-placeholder" />}</Link>
          <div><Link href={`/product/${encodeURIComponent(product.slug ?? product.id)}`} onClick={onClose}><h3>{product.title}</h3></Link><strong>{product.price.toLocaleString(local ? "uk-UA" : "ru-RU")} ₴</strong><button className="favorite-add-to-cart" disabled={!product.inStock} onClick={() => addFavoriteToCart(product)}>{product.inStock ? (local ? "До кошика" : "В корзину") : (local ? "Немає в наявності" : "Нет в наличии")}</button></div>
          <button className="favorite-remove" onClick={() => toggleFavorite(product.id)} aria-label={`${local ? "Прибрати з обраного" : "Удалить из избранного"}: ${product.title}`}>×</button>
        </article>)}
      </div>}
    </aside>
  </div>;
}
