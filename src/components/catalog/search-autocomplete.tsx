"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Product } from "@/catalog/types";
import type { StorefrontLocale } from "@/components/storefront/storefront-provider";
import { displayCategoryLabel } from "@/catalog/category-label";

type Props = {
  products: Product[];
  query: string;
  locale: StorefrontLocale;
  onChange: (value: string) => void;
};

export function SearchAutocomplete({ products, query, locale, onChange }: Props) {
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale === "uk" ? "uk-UA" : "ru-RU");
    if (needle.length < 2) return [];
    const primaryMatches = products.filter((product) => {
      const searchable = [product.title, product.slug, product.category]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase(locale === "uk" ? "uk-UA" : "ru-RU");
      return searchable.includes(needle);
    });
    if (primaryMatches.length) return primaryMatches.slice(0, 7);
    return products.filter((product) => [product.description, product.shortDescription]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase(locale === "uk" ? "uk-UA" : "ru-RU")
      .includes(needle)).slice(0, 7);
  }, [products, query, locale]);

  return <div className="search-autocomplete">
    <label className="home-search-box">
      <span className="search-autocomplete-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="10.5" cy="10.5" r="5.75" />
          <path d="m15 15 4.25 4.25" />
        </svg>
      </span>
      <input value={query} onChange={(event) => onChange(event.target.value)} placeholder={locale === "uk" ? "Знайти товар або бренд" : "Найти товар или бренд"} aria-label={locale === "uk" ? "Пошук товарів" : "Поиск товаров"} />
      <span className="search-autocomplete-enter" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="m9 10-4 4 4 4" />
          <path d="M5 14h9a4 4 0 0 0 4-4V6" />
        </svg>
      </span>
    </label>
    {query.trim().length >= 2 && <div className="search-suggestions" role="listbox" aria-label={locale === "uk" ? "Результати пошуку" : "Результаты поиска"}>
      {matches.length ? matches.map((product) => <Link key={product.id} href={`/product/${encodeURIComponent(product.slug ?? product.id)}`} role="option" onClick={() => onChange("")}>
        {product.images?.[0] ? <img src={product.images[0]} alt="" /> : <span className="search-suggestion-placeholder" />}
        <span className="search-suggestion-copy"><strong>{product.title}</strong><small>{displayCategoryLabel(product.category, locale)}</small></span>
        <b>{product.price.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</b>
      </Link>) : <p className="search-no-results">{locale === "uk" ? "Нічого не знайдено. Спробуйте інше слово." : "Ничего не найдено. Попробуйте другое слово."}</p>}
    </div>}
  </div>;
}
