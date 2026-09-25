"use client";

import Link from "next/link";
import { useState } from "react";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { CallbackModal } from "@/components/catalog/callback-modal";
import { HeymomLogoMark } from "@/components/ui/heymom-logo-mark";

export function SiteFooter() {
  const { locale } = useStorefront();
  const [callbackOpen, setCallbackOpen] = useState(false);
  const uk = locale === "uk";
  return <footer className="site-footer">
    <div className="site-footer-main">
      <div className="site-footer-brand"><Link className="heymom-logo" href="/" aria-label="HeyMOM"><span className="heymom-logo-word"><b>Hey</b><em>MOM</em></span><HeymomLogoMark /></Link><p>{uk ? "Турботливі рішення для здоров'я й комфорту всієї родини." : "Заботливые решения для здоровья и комфорта всей семьи."}</p><a href="tel:+380951854041">+38 (095) 185 40 41</a><small>{uk ? "Пн–Пт: 10:00–19:00 · Сб: 10:00–18:00" : "Пн–Пт: 10:00–19:00 · Сб: 10:00–18:00"}</small></div>
      <nav aria-label={uk ? "Каталог" : "Каталог"}><h2>{uk ? "Каталог" : "Каталог"}</h2><Link href="/?category=Аспіратори#catalog">{uk ? "Аспіратори" : "Аспираторы"}</Link><Link href="/?category=Небулайзери%20(інгалятори)#catalog">{uk ? "Небулайзери" : "Небулайзеры"}</Link><Link href="/?category=Термометри#catalog">{uk ? "Термометри" : "Термометры"}</Link><Link href="/?category=Фотоепілятори#catalog">{uk ? "Фотоепілятори" : "Фотоэпиляторы"}</Link></nav>
      <nav aria-label={uk ? "Покупцю" : "Покупателю"}><h2>{uk ? "Покупцю" : "Покупателю"}</h2><Link href="/delivery">{uk ? "Доставка й оплата" : "Доставка и оплата"}</Link><Link href="/returns">{uk ? "Обмін і повернення" : "Обмен и возврат"}</Link><Link href="/delivery#warranty">{uk ? "Гарантія" : "Гарантия"}</Link><Link href="/checkout">{uk ? "Оформлення замовлення" : "Оформление заказа"}</Link></nav>
      <nav aria-label={uk ? "Допомога" : "Помощь"}><h2>{uk ? "Допомога" : "Помощь"}</h2><button className="site-footer-callback" type="button" onClick={() => setCallbackOpen(true)}>{uk ? "Замовити дзвінок" : "Заказать звонок"}</button><a href="mailto:info@heymom.com.ua">info@heymom.com.ua</a><span>{uk ? "Пишіть або телефонуйте — допоможемо з вибором." : "Пишите или звоните — поможем с выбором."}</span></nav>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Heymom</span><span>{uk ? "Безпечна оплата · Офіційна гарантія · 14 днів на повернення" : "Безопасная оплата · Официальная гарантия · 14 дней на возврат"}</span></div>
    <CallbackModal open={callbackOpen} onClose={() => setCallbackOpen(false)} />
  </footer>;
}
