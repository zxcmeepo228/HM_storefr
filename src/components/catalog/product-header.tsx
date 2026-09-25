"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { getUiCopy } from "@/lib/ui-copy";
import { SearchAutocomplete } from "@/components/catalog/search-autocomplete";
import type { Product } from "@/catalog/types";
import { CallbackModal } from "@/components/catalog/callback-modal";
import { HeymomLogoMark } from "@/components/ui/heymom-logo-mark";

type ProductHeaderProps = { searchValue?: string; onSearchChange?: (value: string) => void; searchProducts?: Product[]; onCatalogClick?: () => void; onCategorySelect?: (category: string, keyword?: string) => void; hideSearch?: boolean };
type MenuCategory = { label: string; category: string; children?: { label: string; keyword: string }[] };

export function ProductHeader({ searchValue, onSearchChange, searchProducts, onCatalogClick, onCategorySelect, hideSearch = false }: ProductHeaderProps) {
  const { locale, setLocale, favorites, cartCount, cartTotal, openCart, openFavorites } = useStorefront();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const phoneCopyTimer = useRef<number | undefined>(undefined);
  const copy = getUiCopy(locale);
  const money = cartTotal.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU");

  useEffect(() => {
    if (!categoriesOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) setCategoriesOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoriesOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [categoriesOpen]);

  useEffect(() => {
    const openCategoryMenu = () => setCategoriesOpen(true);
    window.addEventListener("heymom:open-categories", openCategoryMenu);
    return () => window.removeEventListener("heymom:open-categories", openCategoryMenu);
  }, []);
  const categories: MenuCategory[] = locale === "uk"
    ? [{ label: "Термометри", category: "Термометри", children: [{ label: "Безконтактні", keyword: "безконтактний" }] }, { label: "Аспіратори", category: "Аспіратори", children: [{ label: "Електронні", keyword: "електронний" }] }, { label: "Фотоепілятори", category: "Фотоепілятори" }, { label: "Небулайзери", category: "Небулайзери", children: [{ label: "МЕШ-небулайзери", keyword: "меш" }, { label: "Компактні", keyword: "компакт" }] }, { label: "Ультразвукові скрабери", category: "Ультразвукові скрабери" }, { label: "Пульсоксиметри", category: "Пульсоксиметри" }, { label: "Фетальні доплери", category: "Фетальні доплери" }, { label: "Молоковідсмоктувачі", category: "Молоковідсмоктувачі" }]
    : [{ label: "Термометры", category: "Термометры", children: [{ label: "Бесконтактные", keyword: "бесконтакт" }] }, { label: "Аспираторы", category: "Аспираторы", children: [{ label: "Электронные", keyword: "электрон" }] }, { label: "Фотоэпиляторы", category: "Фотоэпиляторы" }, { label: "Небулайзеры", category: "Небулайзеры", children: [{ label: "МЕШ-небулайзеры", keyword: "меш" }, { label: "Компактные", keyword: "компакт" }] }, { label: "Ультразвуковые скраберы", category: "Ультразвуковые скраберы" }, { label: "Пульсоксиметры", category: "Пульсоксиметры" }, { label: "Фетальные допплеры", category: "Фетальные допплеры" }, { label: "Молокоотсосы", category: "Молокоотсосы" }];

  const searchControl = onSearchChange && !hideSearch && (searchProducts
    ? <SearchAutocomplete products={searchProducts} query={searchValue ?? ""} locale={locale} onChange={onSearchChange} />
    : <label className="product-header-search"><input value={searchValue ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={copy.search} aria-label={copy.search} /><span>⌕</span></label>);

  const selectCategory = (event: MouseEvent<HTMLAnchorElement>, category: string, keyword?: string) => {
    event.preventDefault();
    event.stopPropagation();
    setCategoriesOpen(false);
    if (onCategorySelect) onCategorySelect(category, keyword);
    else window.location.assign(`/?category=${encodeURIComponent(category)}${keyword ? `&search=${encodeURIComponent(keyword)}` : ""}#catalog`);
  };
  const toggleCategories = () => setCategoriesOpen((open) => !open);
  const copyPhoneNumber = async () => {
    const phone = "+380951854041";
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(phone);
        copied = true;
      } catch {
        // Local-network preview pages can block the Clipboard API; use the
        // browser fallback below in that case.
      }
    }
    if (!copied) {
      const field = document.createElement("textarea");
      field.value = phone;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      copied = document.execCommand("copy");
      document.body.removeChild(field);
    }
    if (copied) {
      setPhoneCopied(true);
      if (phoneCopyTimer.current) window.clearTimeout(phoneCopyTimer.current);
      phoneCopyTimer.current = window.setTimeout(() => setPhoneCopied(false), 1600);
    }
  };

  return <>
    <header className="product-site-header">
      <Link className="brand heymom-logo" href="/" onClick={onCatalogClick} aria-label="HeyMOM - на головну"><span className="heymom-logo-word"><b>Hey</b><em>MOM</em></span><HeymomLogoMark /></Link>
      <div className="product-header-utility">
        <div className="product-contact">{phoneCopied && <span className="phone-copied-message" role="status">{locale === "uk" ? "Скопійовано" : "Скопировано"}</span>}<button className="product-phone-copy" type="button" onClick={copyPhoneNumber} title={locale === "uk" ? "Натисніть, щоб скопіювати номер" : "Нажмите, чтобы скопировать номер"}><span className="phone-symbol" aria-hidden="true">☎</span> +38 (095) 185 40 41</button><span>{locale === "uk" ? "Пн–Пт: 10:00–19:00" : "Пн–Пт: 10:00–19:00"}</span><span>{locale === "uk" ? "Сб: 10:00–18:00" : "Сб: 10:00–18:00"}</span></div>
        <button className="callback-button" type="button" onClick={() => setCallbackOpen(true)}><span>{locale === "uk" ? "Замовити дзвінок" : "Заказать звонок"}</span></button>
        <div className="product-header-actions">
          <div className="language-switcher" aria-label={locale === "uk" ? "Мова" : "Язык"}>
            <button className={locale === "uk" ? "active" : ""} onClick={() => setLocale("uk")}>UA</button>
            <button className={locale === "ru" ? "active" : ""} onClick={() => setLocale("ru")}>RU</button>
          </div>
          <button className="product-favorite-link" type="button" onClick={openFavorites} aria-label={`${copy.favorites} ${favorites.length}`}>♡{favorites.length > 0 && <b>{favorites.length}</b>}</button>
          <button className="product-cart-link" data-cart-target onClick={openCart} aria-label={copy.cart}>🛒 <span>{cartCount ? `${cartCount} · ${money} ₴` : copy.cart}</span></button>
        </div>
      </div>
      <nav className="product-nav" aria-label={locale === "uk" ? "Навігація" : "Навигация"}>
        <div ref={categoryMenuRef} className="category-menu" onMouseEnter={() => {
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setCategoriesOpen(true);
        }} onMouseLeave={() => {
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setCategoriesOpen(false);
        }}>
          <button className="product-category-trigger" type="button" aria-expanded={categoriesOpen} aria-haspopup="menu" onClick={toggleCategories}>
            <span className="category-trigger-icon" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="category-label">{copy.categories}</span>
            <span className="category-chevron" aria-hidden="true" />
          </button>
          {categoriesOpen && <div className="category-dropdown">{categories.map((category) => <div className="category-dropdown-group" key={category.label}><Link href="/#catalog" onClick={(event) => selectCategory(event, category.category)}>{category.label}<span>›</span></Link></div>)}</div>}
        </div>
        {searchControl}
        <Link href="/#catalog" onClick={onCatalogClick}>{copy.catalog}</Link>
        <Link href="/delivery">{locale === "uk" ? "Доставка й оплата" : "Доставка и оплата"}</Link>
        <Link href="/returns">{locale === "uk" ? "Умови повернення" : "Условия возврата"}</Link>
      </nav>
      <div className="mobile-header-contact">
        <button className="mobile-header-phone" type="button" onClick={copyPhoneNumber} title={locale === "uk" ? "Натисніть, щоб скопіювати номер" : "Нажмите, чтобы скопировать номер"}>
          <span className="phone-symbol" aria-hidden="true">☎</span>
          <strong>+38 (095) 185 40 41</strong>
          {phoneCopied && <span className="mobile-phone-copied" role="status">{locale === "uk" ? "Скопійовано" : "Скопировано"}</span>}
        </button>
        <button className="mobile-callback-button" type="button" onClick={() => setCallbackOpen(true)}>{locale === "uk" ? "Замовити дзвінок" : "Заказать звонок"}</button>
      </div>
    </header>
    <CallbackModal open={callbackOpen} onClose={() => setCallbackOpen(false)} />
  </>;
}
