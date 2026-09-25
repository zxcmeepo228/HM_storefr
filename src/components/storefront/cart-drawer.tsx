"use client";

import Link from "next/link";
import { useState } from "react";
import { useStorefront } from "./storefront-provider";
import { getUiCopy } from "@/lib/ui-copy";

type Props = { open: boolean; onClose: () => void };
const freeDeliveryThreshold = 3000;

export function CartDrawer({ open, onClose }: Props) {
  const { cart, cartTotal, removeFromCart, updateQuantity, locale } = useStorefront();
  const [removing, setRemoving] = useState<string | null>(null);
  const copy = getUiCopy(locale);
  const local = locale === "uk";
  const remaining = Math.max(0, freeDeliveryThreshold - cartTotal);
  const progress = Math.min(100, Math.round((cartTotal / freeDeliveryThreshold) * 100));
  return <div className={open ? "cart-layer open" : "cart-layer"} aria-hidden={!open}>
    <button className="cart-backdrop" aria-label={local ? "Закрити кошик" : "Закрыть корзину"} onClick={onClose} />
    <aside className="cart-drawer" aria-label={copy.cart}>
      <div className="cart-drawer-header"><div><span className="eyebrow">{local ? "Ваш вибір" : "Ваш выбор"}</span><h2>{copy.cart}</h2></div><button className="icon-button cart-drawer-close" onClick={onClose} aria-label={local ? "Закрити" : "Закрыть"}>×</button></div>
      {!cart.length ? <div className="cart-empty"><span>🛒</span><strong>{local ? "Кошик поки порожній" : "Корзина пока пуста"}</strong><p>{local ? "Додайте товари з каталогу - вони залишаться тут навіть після оновлення сторінки." : "Добавьте товары из каталога - они останутся здесь даже после обновления страницы."}</p></div> : <>
        <div className="cart-lines">{cart.map((line) => <article className="cart-line" key={line.id}>{line.images?.[0] && <img src={line.images[0]} alt="" />}<div><h3>{line.title}</h3><strong>{line.price.toLocaleString(local ? "uk-UA" : "ru-RU")} ₴</strong><div className="quantity"><button onClick={() => updateQuantity(line.id, line.quantity - 1)} aria-label={local ? "Менше" : "Меньше"}>−</button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.id, line.quantity + 1)} aria-label={local ? "Більше" : "Больше"}>+</button></div></div><button className="line-remove" onClick={() => setRemoving(line.id)} aria-label={`${local ? "Прибрати" : "Убрать"} ${line.title}`}>×</button></article>)}</div>
        <div className="cart-total"><span>{local ? "Разом" : "Итого"}</span><strong>{cartTotal.toLocaleString(local ? "uk-UA" : "ru-RU")} ₴</strong></div>
        <section className={remaining ? "free-delivery-progress" : "free-delivery-progress reached"} aria-live="polite"><div><strong>{local ? "Безкоштовна доставка 🎁" : "Бесплатная доставка 🎁"}</strong><span>{remaining ? (local ? `Ще ${remaining.toLocaleString("uk-UA")} грн і доставка за наш рахунок` : `Ещё ${remaining.toLocaleString("ru-RU")} грн и доставка за наш счёт`) : (local ? "Від 3 000 грн доставку за наш рахунок" : "От 3 000 грн доставка за наш счёт")}</span></div><div className="free-delivery-track" role="progressbar" aria-valuemin={0} aria-valuemax={freeDeliveryThreshold} aria-valuenow={Math.min(cartTotal, freeDeliveryThreshold)}><i style={{ width: `${progress}%` }} /></div></section>
        <div className="cart-checkout-actions"><Link className="checkout-button" href="/checkout" onClick={onClose}>{local ? "Перейти до оформлення" : "Перейти к оформлению"}</Link><button className="continue-shopping" type="button" onClick={onClose}>{local ? "Продовжити покупки" : "Продолжить покупки"}</button></div>
      </>}
    </aside>
    {removing && <div className="cart-confirm-layer" role="dialog" aria-modal="true" aria-label={local ? "Підтвердження видалення" : "Подтверждение удаления"}><button className="cart-confirm-backdrop" onClick={() => setRemoving(null)} aria-label={local ? "Закрити" : "Закрыть"} /><section><span>🛒</span><h3>{local ? "Прибрати товар з кошика?" : "Убрать товар из корзины?"}</h3><p>{local ? "Його можна буде додати знову в будь-який момент." : "Его можно будет добавить снова в любой момент."}</p><footer><button onClick={() => setRemoving(null)}>{local ? "Залишити" : "Оставить"}</button><button className="confirm-remove" onClick={() => { removeFromCart(removing); setRemoving(null); }}>{local ? "Так, прибрати" : "Да, убрать"}</button></footer></section></div>}
  </div>;
}
