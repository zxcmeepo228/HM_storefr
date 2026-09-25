"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Product } from "@/catalog/types";
import type { StorefrontLocale } from "@/components/storefront/storefront-provider";
import { displayCategoryLabel } from "@/catalog/category-label";

type Props = { product: Product; locale: StorefrontLocale; open: boolean; onClose: () => void };

const text = {
  uk: { title: "Купити в 1 клік", intro: "Залиште номер — менеджер підтвердить наявність і деталі саме цього товару.", phone: "Номер телефону", phoneHint: "Лише номер телефону — решту уточнимо під час дзвінка.", submit: "Надіслати заявку", sending: "Надсилаємо…", consent: "Надсилаючи заявку, ви погоджуєтесь на обробку персональних даних.", success: "Дякуємо! Заявку надіслано. Ми зв’яжемось із вами найближчим часом.", local: "Заявку збережено в демо-режимі. Після підключення CRM вона надходитиме менеджеру.", error: "Не вдалося надіслати заявку. Спробуйте ще раз або зв’яжіться з нами телефоном.", invalidPhone: "Введіть номер у форматі +38 (0__) ___-__-__." },
  ru: { title: "Купить в 1 клик", intro: "Оставьте номер — менеджер подтвердит наличие и детали именно этого товара.", phone: "Номер телефона", phoneHint: "Только номер телефона — остальное уточним во время звонка.", submit: "Отправить заявку", sending: "Отправляем…", consent: "Отправляя заявку, вы соглашаетесь на обработку персональных данных.", success: "Спасибо! Заявка отправлена. Мы свяжемся с вами в ближайшее время.", local: "Заявка сохранена в демо-режиме. После подключения CRM она будет поступать менеджеру.", error: "Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами по телефону.", invalidPhone: "Введите номер в формате +38 (0__) ___-__-__." },
} as const;

function formatPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("380")) digits = digits.slice(3);
  else if (digits.startsWith("80")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  let result = "+38 (0";
  if (parts[0]) result += parts[0];
  if (digits.length >= 2) result += ")";
  if (parts[1]) result += ` ${parts[1]}`;
  if (parts[2]) result += `-${parts[2]}`;
  if (parts[3]) result += `-${parts[3]}`;
  return result;
}

export function QuickOrderModal({ product, locale, open, onClose }: Props) {
  const copy = text[locale];
  const closeLabel = locale === "uk" ? "Закрити" : "Закрыть";
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "local" | "error">("idle");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setPhone("");
      setPhoneError(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phone.replace(/\D/g, "").length !== 12) {
      setPhoneError(true);
      return;
    }
    setStatus("sending");
    const payload = {
      type: "quick-order",
      customer: { phone },
      product: { id: product.id, title: product.title, slug: product.slug, price: product.price, quantity: 1 },
    };
    const endpoint = process.env.NEXT_PUBLIC_QUICK_ORDER_ENDPOINT;
    if (!endpoint) {
      if (process.env.NODE_ENV === "production") {
        setStatus("error");
        return;
      }
      window.localStorage.setItem(`heymom-quick-order-${Date.now()}`, JSON.stringify(payload));
      setStatus("local");
      return;
    }
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return <div className="quick-order-layer" role="dialog" aria-modal="true" aria-labelledby="quick-order-title">
    <button className="quick-order-backdrop" onClick={onClose} aria-label={closeLabel} />
    <section className="quick-order-modal">
      <button className="quick-order-close" onClick={onClose} aria-label={closeLabel}>×</button>
      <p className="eyebrow">{displayCategoryLabel(product.category, locale)}</p><h2 id="quick-order-title">{copy.title}</h2><p>{copy.intro}</p>
      <div className="quick-order-product"><img src={product.images?.[0]} alt="" /><span>{product.title}<strong>{product.price.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</strong></span></div>
      {status === "success" || status === "local" ? <div className="quick-order-status success">{status === "success" ? copy.success : copy.local}</div> : <form onSubmit={submit}>
        <label>{copy.phone}<input name="phone" type="tel" required autoFocus autoComplete="tel" inputMode="numeric" value={phone} onChange={(event) => { setPhone(formatPhone(event.target.value)); setPhoneError(false); }} placeholder="+38 (0__) ___-__-__" aria-invalid={phoneError} aria-describedby={phoneError ? "quick-order-phone-error" : "quick-order-phone-hint"} /></label>
        <small id="quick-order-phone-hint" className="quick-order-phone-hint">{copy.phoneHint}</small>
        {phoneError && <p id="quick-order-phone-error" className="quick-order-status error">{copy.invalidPhone}</p>}
        {status === "error" && <p className="quick-order-status error">{copy.error}</p>}
        <button className="detail-buy" disabled={status === "sending"}>{status === "sending" ? copy.sending : copy.submit}</button>
        <small>{copy.consent}</small>
      </form>}
    </section>
  </div>;
}
