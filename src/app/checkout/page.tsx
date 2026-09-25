"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { submitOrder } from "@/order/adapter";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { trackConversion } from "@/lib/conversion-pipeline";
import { SiteFooter } from "@/components/catalog/site-footer";
import type { Product, ProductCatalog } from "@/catalog/types";
import { catalogUpdatedEvent } from "@/admin/local-cms";
import { getCatalog } from "@/catalog/repository";
import { getCatalogMode } from "@/catalog/runtime-config";

type CompletedOrder = {
  id: string;
  mode: "api" | "local";
  doNotCall: boolean;
  items: string[];
  fullName: string;
  phone: string;
  delivery: string;
  payment: string;
  total: number;
};

type NovaOption = { value: string; ref: string };

function useNovaPoshtaOptions(type: "city" | "branch" | "street", query: string, cityRef = "") {
  const [items, setItems] = useState<NovaOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalizedQuery = query.trim();
    const needsQuery = type === "city" || type === "street";
    if ((needsQuery && normalizedQuery.length < 2) || ((type === "branch" || type === "street") && !cityRef)) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ type, q: normalizedQuery });
        if (cityRef) params.set("cityRef", cityRef);
        const response = await fetch(`/api/nova-poshta?${params.toString()}`);
        const result = await response.json() as { items?: NovaOption[] };
        if (!cancelled) setItems(Array.isArray(result.items) ? result.items : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [type, query, cityRef]);

  return { items, loading };
}

const defaultCheckoutUpsells: Record<string, string[]> = {
  "61811": ["10"],
  "89528": ["124090"],
  "120198": ["120227"],
};

const copy = {
  uk: {
    back: "Повернутися до каталогу", title: "Оформлення замовлення", contact: "Контактні дані", fullName: "ПІБ", phone: "Номер телефону", email: "Електронна пошта", invalidPhone: "Невірно вказаний номер. Почніть номер з 0.", invalidEmail: "Вкажіть коректну електронну пошту з символом @.", delivery: "Спосіб доставки", chooseDelivery: "Виберіть спосіб доставки", payment: "Спосіб оплати", choosePayment: "Виберіть спосіб оплати", branch: "Нова пошта - у відділення", courier: "Нова пошта - кур'єром", taxi: "Таксі по Києву за 60 хвилин", city: "Місто", branchOffice: "Номер відділення", card: "Оплата карткою онлайн", cod: "Післяплата", installments: "Оплата частинами", doNotCall: "Не телефонувати для підтвердження", callInfo: "Передзвонимо лише, якщо виникнуть питання. Інформація про замовлення надходитиме в SMS. Статус можна уточнити за номером замовлення.", summary: "Ваше замовлення", orderDetails: "Деталі замовлення", products: "Товари", total: "Разом", saved: "Ви заощаджуєте", submit: "Підтвердити замовлення", sending: "Надсилаємо…", loadingCart: "Завантажуємо кошик…", empty: "Кошик порожній", emptyText: "Додайте товари з каталогу, щоб перейти до оформлення.", success: "Дякуємо за замовлення!", call: "Менеджер скоро зателефонує.", noCall: "Підтвердження надішлемо в SMS.", orderNumber: "Номер замовлення", local: "Демо-режим: замовлення збережено лише у цьому браузері.", error: "Не вдалося надіслати замовлення. Спробуйте ще раз.", quantity: "Кількість", remove: "Прибрати", office: "Відділення", upsellEyebrow: "Бажаєте додати до замовлення?", upsellHeading: "Часто додають до цього товару", upsellPending: "Ще не у замовленні", upsellDiscount: "Знижка", upsellBenefit: "Після додавання знижка на все замовлення", addUpsell: "Додати за" },
  ru: {
    back: "Вернуться в каталог", title: "Оформление заказа", contact: "Контактные данные", fullName: "ФИО", phone: "Номер телефона", email: "Электронная почта", invalidPhone: "Номер указан неверно. Начните номер с 0.", invalidEmail: "Укажите корректную электронную почту с символом @.", delivery: "Способ доставки", chooseDelivery: "Выберите способ доставки", payment: "Способ оплаты", choosePayment: "Выберите способ оплаты", branch: "Новая почта - в отделение", courier: "Новая почта - курьером", taxi: "Такси по Киеву за 60 минут", city: "Город", branchOffice: "Номер отделения", card: "Оплата картой онлайн", cod: "Наложенный платёж", installments: "Оплата частями", doNotCall: "Не звонить для подтверждения", callInfo: "Перезвоним только, если возникнут вопросы. Информация о заказе придёт в SMS. Статус можно уточнить по номеру заказа.", summary: "Ваш заказ", orderDetails: "Детали заказа", products: "Товары", total: "Итого", saved: "Вы экономите", submit: "Подтвердить заказ", sending: "Отправляем…", loadingCart: "Загружаем корзину…", empty: "Корзина пуста", emptyText: "Добавьте товары из каталога, чтобы перейти к оформлению.", success: "Спасибо за заказ!", call: "Менеджер скоро позвонит.", noCall: "Подтверждение отправим в SMS.", orderNumber: "Номер заказа", local: "Демо-режим: заказ сохранён только в этом браузере.", error: "Не удалось отправить заказ. Попробуйте ещё раз.", quantity: "Количество", remove: "Удалить", office: "Отделение", upsellEyebrow: "Хотите добавить к заказу?", upsellHeading: "Часто добавляют к этому товару", upsellPending: "Ещё не в заказе", upsellDiscount: "Скидка", upsellBenefit: "После добавления скидка на весь заказ", addUpsell: "Добавить за" },
} as const;

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const rawNumber = digits.startsWith("38") ? digits.slice(2) : digits;
  const localNumber = rawNumber.slice(0, 10);
  const parts = [localNumber.slice(0, 3), localNumber.slice(3, 6), localNumber.slice(6, 8), localNumber.slice(8, 10)];
  let formatted = "+38";
  if (parts[0]) formatted += ` (${parts[0]}`;
  if (localNumber.length >= 2) formatted += ")";
  if (parts[1]) formatted += ` ${parts[1]}`;
  if (parts[2]) formatted += `-${parts[2]}`;
  if (parts[3]) formatted += `-${parts[3]}`;
  return formatted;
}

function removePhoneDigitBeforeCursor(value: string, cursor: number) {
  const digits = value.replace(/\D/g, "");
  const rawNumber = digits.startsWith("38") ? digits.slice(2) : digits;
  const localNumber = rawNumber.slice(0, 10);
  const localDigitsBeforeCursor = value.slice(0, cursor).replace(/\D/g, "").replace(/^38/, "").length;
  if (!localDigitsBeforeCursor) return "+38";
  const removedAt = localDigitsBeforeCursor - 1;
  return formatPhone(`+38${localNumber.slice(0, removedAt)}${localNumber.slice(removedAt + 1)}`);
}

export default function CheckoutPage() {
  const { cart, cartTotal, locale, isReady, updateQuantity, removeFromCart, clearCart, addToCart, syncCartProducts } = useStorefront();
  const text = copy[locale];
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [doNotCall, setDoNotCall] = useState(false);
  const [callInfoPinned, setCallInfoPinned] = useState(false);
  const [isCallInfoHovered, setIsCallInfoHovered] = useState(false);
  const [delivery, setDelivery] = useState<"nova-poshta-branch" | "nova-poshta-courier" | "taxi-kyiv">("nova-poshta-branch");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryCityRef, setDeliveryCityRef] = useState("");
  const [branch, setBranch] = useState("");
  const [courierAddress, setCourierAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderDiscountJustApplied, setOrderDiscountJustApplied] = useState(false);
  const [error, setError] = useState(false);
  const [complete, setComplete] = useState<CompletedOrder | null>(null);
  const [catalog, setCatalog] = useState<ProductCatalog>({ products: [] });
  const checkoutTracked = useRef(false);
  const successSectionRef = useRef<HTMLElement | null>(null);
  const orderDiscountAnimationTimer = useRef<number | undefined>(undefined);
  const showCallInfo = callInfoPinned || isCallInfoHovered;
  const money = (value: number) => value.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU");
  const steps = locale === "uk" ? ["Контакти", "Доставка", "Оплата"] : ["Контакты", "Доставка", "Оплата"];
  const lineCount = cart.reduce((total, line) => total + line.quantity, 0);
  const cityLookup = useNovaPoshtaOptions("city", deliveryCity);
  const branchLookup = useNovaPoshtaOptions("branch", branch, deliveryCityRef);
  const streetLookup = useNovaPoshtaOptions("street", courierAddress, deliveryCityRef);
  const novaHint = locale === "uk" ? "Почніть вводити — підкажемо з Нової пошти" : "Начните вводить — подскажем из Новой почты";
  const selectCityRef = (value: string) => {
    setDeliveryCity(value);
    const match = cityLookup.items.find((item) => item.value.localeCompare(value, locale === "uk" ? "uk-UA" : "ru-RU", { sensitivity: "base" }) === 0);
    setDeliveryCityRef(match?.ref ?? "");
    setBranch("");
    setCourierAddress("");
  };
  const checkoutUpsell = useMemo(() => {
    const cartIds = new Set(cart.map((line) => line.id));
    const productById = new Map(catalog.products.map((product) => [product.id, product]));
    for (const line of cart) {
      const source = productById.get(line.id);
      const candidateIds = source?.checkoutUpsellProductIds ?? defaultCheckoutUpsells[line.id] ?? [];
      const candidate = candidateIds.map((id) => productById.get(id)).find((product): product is Product => Boolean(product && product.inStock && product.published !== false && !cartIds.has(product.id)));
      if (candidate) return { product: candidate, orderDiscountPercent: Math.max(0, Math.min(99, source?.checkoutUpsellOrderDiscountPercent ?? 1)) };
    }
    return null;
  }, [cart, catalog]);
  const cartSubtotal = cart.reduce((total, line) => total + line.price * line.quantity, 0);
  const checkoutSavings = cartSubtotal - cartTotal;
  const handlePhoneBackspace = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace") return;
    event.preventDefault();
    setPhone(removePhoneDigitBeforeCursor(phone, event.currentTarget.selectionStart ?? phone.length));
  };
  const isValidPhone = /^\+38 \(0\d{2}\) \d{3}-\d{2}-\d{2}$/.test(phone);
  const isValidEmail = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const addCheckoutUpsell = () => {
    if (!checkoutUpsell) return;
    addToCart(checkoutUpsell.product, { checkoutUpsellOrderDiscountPercent: checkoutUpsell.orderDiscountPercent });
    if (checkoutUpsell.orderDiscountPercent <= 0) return;
    window.clearTimeout(orderDiscountAnimationTimer.current);
    setOrderDiscountJustApplied(true);
    orderDiscountAnimationTimer.current = window.setTimeout(() => setOrderDiscountJustApplied(false), 900);
  };

  useEffect(() => {
    if (cart.length && !checkoutTracked.current) { trackConversion("checkout_started"); checkoutTracked.current = true; }
  }, [cart.length]);

  useEffect(() => {
    let cancelled = false;
    const syncCatalog = () => getCatalog(getCatalogMode(), locale).then((nextCatalog) => {
      if (cancelled) return;
      setCatalog(nextCatalog);
      syncCartProducts(nextCatalog.products);
    }).catch(() => undefined);
    syncCatalog();
    window.addEventListener(catalogUpdatedEvent, syncCatalog);
    return () => { cancelled = true; window.removeEventListener(catalogUpdatedEvent, syncCatalog); };
  }, [locale, syncCartProducts]);

  useEffect(() => {
    const match = cityLookup.items.find((item) => item.value.localeCompare(deliveryCity, locale === "uk" ? "uk-UA" : "ru-RU", { sensitivity: "base" }) === 0);
    if (match) setDeliveryCityRef(match.ref);
  }, [cityLookup.items, deliveryCity, locale]);

  useEffect(() => {
    if (!complete) return;
    const frame = requestAnimationFrame(() => successSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [complete]);

  useEffect(() => () => window.clearTimeout(orderDiscountAnimationTimer.current), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length) return;
    if (!isValidPhone || !isValidEmail) {
      setPhoneError(!isValidPhone);
      setEmailError(!isValidEmail);
      return;
    }
    setSubmitting(true);
    setError(false);
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName"));
    const orderPhone = String(form.get("phone"));
    const payment = String(form.get("payment")) as "card" | "cash-on-delivery" | "installments";
    const deliveryLabel = delivery === "nova-poshta-branch" ? text.branch : delivery === "nova-poshta-courier" ? text.courier : text.taxi;
    const paymentLabel = payment === "card" ? text.card : payment === "cash-on-delivery" ? text.cod : text.installments;
    const id = `HM-${Date.now().toString(36).toUpperCase()}`;
    try {
      const result = await submitOrder({
        id, createdAt: new Date().toISOString(),
        customer: { fullName, phone: orderPhone, email: String(form.get("email")), doNotCall },
        delivery,
        deliveryDetails: delivery === "nova-poshta-branch" ? { city: String(form.get("city")), branch: String(form.get("branch")) } : delivery === "nova-poshta-courier" ? { city: String(form.get("city")), address: String(form.get("address")) } : delivery === "taxi-kyiv" ? { city: "kyiv", address: String(form.get("address")) } : undefined,
        payment,
        lines: cart.map(({ id: productId, title, slug, price, quantity }) => ({ id: productId, title, slug, price, quantity })), total: cartTotal,
      });
      clearCart();
      trackConversion("order_completed");
      setComplete({ ...result, doNotCall, items: cart.map((line) => `${line.title} × ${line.quantity}`), fullName, phone: orderPhone, delivery: deliveryLabel, payment: paymentLabel, total: cartTotal });
    } catch { setError(true); } finally { setSubmitting(false); }
  }

  if (complete) return <><main className="checkout-page checkout-complete-page"><section ref={successSectionRef} className="checkout-success" aria-live="polite">
    <div className="order-success-mark" aria-hidden="true"><svg viewBox="0 0 64 64" role="presentation"><circle cx="32" cy="32" r="28" /><path d="M19 33.5 27.5 42 45.5 23" /></svg></div>
    <p className="eyebrow">Heymom</p><h1>{text.success}</h1><p className="checkout-success-message">{complete.doNotCall ? text.noCall : `${text.call.replace(/\.$/, "")} Вам.`}</p><strong>{text.orderNumber}: {complete.id}</strong><section className="checkout-success-summary" aria-label={text.orderDetails}><h2>{text.orderDetails}</h2><dl><div><dt>{text.products}</dt><dd>{complete.items.join(", ")}</dd></div><div><dt>{text.fullName}</dt><dd>{complete.fullName}</dd></div><div><dt>{text.phone}</dt><dd>{complete.phone}</dd></div><div><dt>{text.delivery}</dt><dd>{complete.delivery}</dd></div><div><dt>{text.payment}</dt><dd>{complete.payment}</dd></div><div className="checkout-success-total"><dt>{text.total}</dt><dd>{money(complete.total)} ₴</dd></div></dl></section>{complete.mode === "local" && <small>{text.local}</small>}<Link className="detail-buy" href="/">{text.back}</Link>
  </section></main><SiteFooter /></>;
  if (!isReady) return <><main className="checkout-page"><section className="checkout-empty" aria-live="polite"><p>{text.loadingCart}</p></section></main><SiteFooter /></>;
  if (!cart.length) return <><main className="checkout-page"><section className="checkout-empty"><h1>{text.empty}</h1><p>{text.emptyText}</p><Link className="detail-buy" href="/">{text.back}</Link></section></main><SiteFooter /></>;

  return <><main className="checkout-page page-enter">
    <Link className="back-link" href="/">← {text.back}</Link>
    <div className="checkout-heading"><p className="eyebrow">Heymom</p><h1>{text.title}</h1><p className="checkout-lead">{locale === "uk" ? "Без реєстрації — лише контакти, доставка та спосіб оплати." : "Без регистрации — только контакты, доставка и способ оплаты."}</p></div>
    <ol className="checkout-steps" aria-label={locale === "uk" ? "Кроки оформлення" : "Шаги оформления"}>{steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
    <form className="checkout-layout" onSubmit={handleSubmit}>
      <div className="checkout-form">
        <section className="checkout-section">
          <div className="checkout-section-heading"><span>01</span><h2>{text.contact}</h2></div>
          <div className="checkout-fields">
            <label htmlFor="checkout-full-name">{text.fullName}<input id="checkout-full-name" name="fullName" autoComplete="name" required /></label>
            <label htmlFor="checkout-phone">{text.phone}<input id="checkout-phone" name="phone" type="tel" autoComplete="tel" inputMode="numeric" value={phone} onChange={(event) => { setPhone(formatPhone(event.target.value)); setPhoneError(false); }} onKeyDown={handlePhoneBackspace} onFocus={() => setPhone((value) => value || "+38 (")} onInvalid={(event) => { event.currentTarget.setCustomValidity(text.invalidPhone); setPhoneError(true); }} onInput={(event) => event.currentTarget.setCustomValidity("")} placeholder="+38 (__) ___-__-__" pattern="\+38 \(0\d{2}\) \d{3}-\d{2}-\d{2}" required aria-describedby={phoneError ? "checkout-phone-error" : undefined} /></label>
            {phoneError && <p id="checkout-phone-error" className="checkout-field-error" role="alert">{text.invalidPhone}</p>}
            <label htmlFor="checkout-email">{text.email} <small>{locale === "uk" ? "(необов’язково)" : "(необязательно)"}</small><input id="checkout-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(false); }} onInvalid={(event) => { event.currentTarget.setCustomValidity(text.invalidEmail); setEmailError(true); }} onInput={(event) => event.currentTarget.setCustomValidity("")} pattern="[^\s@]+@[^\s@]+\.[^\s@]+" aria-describedby={emailError ? "checkout-email-error" : undefined} /></label>
            {emailError && <p id="checkout-email-error" className="checkout-field-error" role="alert">{text.invalidEmail}</p>}
          </div>
          <div className="call-preference" onMouseEnter={() => setIsCallInfoHovered(true)} onMouseLeave={() => setIsCallInfoHovered(false)}>
            <label className="do-not-call"><input type="checkbox" checked={doNotCall} onChange={(event) => setDoNotCall(event.target.checked)} /><span><b>{text.doNotCall}</b></span></label>
            <button className="call-info-button" type="button" aria-label="Інформація про підтвердження замовлення" aria-expanded={showCallInfo} onClick={() => setCallInfoPinned((value) => !value)}>i</button>
            {showCallInfo && <p className="call-info-popover" role="status">{text.callInfo}</p>}
          </div>
        </section>
        <section className="checkout-section checkout-selection-section">
          <label className="checkout-select-field" htmlFor="checkout-delivery"><span>{text.chooseDelivery}</span><select id="checkout-delivery" name="delivery" value={delivery} onChange={(event) => setDelivery(event.target.value as typeof delivery)}><option value="nova-poshta-branch">{text.branch}</option><option value="nova-poshta-courier">{text.courier}</option><option value="taxi-kyiv">{locale === "uk" ? "Таксі по Києву за 60 хвилин" : "Такси по Киеву за 60 минут"}</option></select></label>
          {delivery === "nova-poshta-branch" && <div className="delivery-details">
            <label htmlFor="checkout-city">{text.city}<input id="checkout-city" name="city" list="nova-cities" autoComplete="address-level2" value={deliveryCity} onChange={(event) => selectCityRef(event.target.value)} placeholder={locale === "uk" ? "Почніть вводити місто" : "Начните вводить город"} required /><small>{cityLookup.loading ? (locale === "uk" ? "Шукаємо місто…" : "Ищем город…") : novaHint}</small></label>
            <datalist id="nova-cities">{cityLookup.items.map((item) => <option key={item.ref} value={item.value} />)}</datalist>
            <label htmlFor="checkout-branch">{text.branchOffice}<input id="checkout-branch" name="branch" list="nova-branches" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder={locale === "uk" ? "Номер або назва відділення" : "Номер или название отделения"} required disabled={!deliveryCityRef} /><small>{!deliveryCityRef ? (locale === "uk" ? "Спочатку оберіть місто зі списку" : "Сначала выберите город из списка") : branchLookup.loading ? (locale === "uk" ? "Шукаємо відділення…" : "Ищем отделение…") : (locale === "uk" ? "Відділення підтягуються автоматично" : "Отделения подгружаются автоматически")}</small></label>
            <datalist id="nova-branches">{branchLookup.items.map((item) => <option key={item.ref} value={item.value} />)}</datalist>
          </div>}
          {delivery === "nova-poshta-courier" && <div className="delivery-details">
            <label htmlFor="checkout-courier-city">{text.city}<input id="checkout-courier-city" name="city" list="nova-cities" autoComplete="address-level2" value={deliveryCity} onChange={(event) => selectCityRef(event.target.value)} placeholder={locale === "uk" ? "Почніть вводити місто" : "Начните вводить город"} required /><small>{cityLookup.loading ? (locale === "uk" ? "Шукаємо місто…" : "Ищем город…") : novaHint}</small></label>
            <datalist id="nova-cities">{cityLookup.items.map((item) => <option key={item.ref} value={item.value} />)}</datalist>
            <label htmlFor="checkout-courier-address">{locale === "uk" ? "Вулиця та номер будинку" : "Улица и номер дома"}<input id="checkout-courier-address" name="address" list="nova-streets" autoComplete="street-address" value={courierAddress} onChange={(event) => setCourierAddress(event.target.value)} placeholder={locale === "uk" ? "Почніть вводити вулицю" : "Начните вводить улицу"} required disabled={!deliveryCityRef} /><small>{!deliveryCityRef ? (locale === "uk" ? "Спочатку оберіть місто зі списку" : "Сначала выберите город из списка") : streetLookup.loading ? (locale === "uk" ? "Шукаємо вулицю…" : "Ищем улицу…") : novaHint}</small></label>
            <datalist id="nova-streets">{streetLookup.items.map((item) => <option key={item.ref} value={item.value} />)}</datalist>
          </div>}
          {delivery === "taxi-kyiv" && <div className="delivery-details delivery-taxi-details">
            <p>{locale === "uk" ? "Доставимо по Києву на таксі орієнтовно за 60 хвилин після оформлення." : "Доставим по Киеву на такси ориентировочно за 60 минут после оформления."}</p>
            <label htmlFor="checkout-taxi-address">{locale === "uk" ? "Адреса в Києві" : "Адрес в Киеве"}<input id="checkout-taxi-address" name="address" autoComplete="street-address" placeholder={locale === "uk" ? "Вулиця, будинок, квартира" : "Улица, дом, квартира"} required /></label>
          </div>}
        </section>
        <section className="checkout-section checkout-selection-section"><label className="checkout-select-field" htmlFor="checkout-payment"><span>{text.choosePayment}</span><select id="checkout-payment" name="payment" defaultValue="card"><option value="card">{text.card}</option><option value="cash-on-delivery">{text.cod}</option><option value="installments">{text.installments}</option></select></label></section>
        {error && <p className="checkout-error">{text.error}</p>}
      </div>
      <aside className="order-summary"><div className="order-summary-heading"><h2>{text.summary}</h2><span>{locale === "uk" ? `Товарів: ${lineCount}` : `Товаров: ${lineCount}`}</span></div><div className="order-lines">{cart.map((line) => <article key={line.id}><img src={line.images?.[0]} alt="" /><div><h3>{line.title}</h3><div className="order-line-price"><strong>{money(line.price)} ₴</strong></div><div className="order-line-actions"><label>{text.quantity}<select value={line.quantity} onChange={(event) => updateQuantity(line.id, Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button type="button" onClick={() => removeFromCart(line.id)}>{text.remove}</button></div></div></article>)}</div>{checkoutUpsell && <section className="checkout-upsell" aria-label={text.upsellHeading}><div className="checkout-upsell-heading"><div><p>{text.upsellEyebrow}</p><h3>{text.upsellHeading}</h3></div></div><div className="checkout-upsell-product"><img src={checkoutUpsell.product.images?.[0]} alt="" /><div><strong>{checkoutUpsell.product.title}</strong><b>{money(checkoutUpsell.product.price)} ₴</b></div><button type="button" onClick={addCheckoutUpsell}>+ {text.addUpsell} {money(checkoutUpsell.product.price)} ₴</button></div></section>}<div className={`order-total${orderDiscountJustApplied ? " order-total-discount-applied" : ""}`}><span>{text.total}</span><div>{checkoutSavings > 0 && <del>{money(cartSubtotal)} ₴</del>}<strong>{money(cartTotal)} ₴</strong></div></div>{checkoutSavings > 0 && <p className={`checkout-total-savings${orderDiscountJustApplied ? " checkout-total-savings-visible" : ""}`}>{text.saved}: {money(checkoutSavings)} ₴</p>}<button className="checkout-button" disabled={submitting}>{submitting ? text.sending : text.submit}</button></aside>
    </form>
  </main><SiteFooter /></>;
}
