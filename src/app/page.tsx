"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/catalog/pagination";
import { ProductFilters } from "@/components/catalog/product-filters";
import { ProductGrid } from "@/components/catalog/product-grid";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getCatalog } from "@/catalog/repository";
import { getCatalogMode } from "@/catalog/runtime-config";
import type { Filter, Product } from "@/catalog/types";
import { getUiCopy } from "@/lib/ui-copy";
import { ProductHeader } from "@/components/catalog/product-header";
import { categoryKey, categoryLabels, displayCategoryLabel } from "@/catalog/category-label";
import { StorePolicies } from "@/components/catalog/store-policies";
import { SearchAutocomplete } from "@/components/catalog/search-autocomplete";
import { TopProducts } from "@/components/catalog/top-products";
import { SiteFooter } from "@/components/catalog/site-footer";
import { HomeBillboards } from "@/components/catalog/home-billboards";
import { catalogUpdatedEvent, readCmsCategories, readCmsReviews } from "@/admin/local-cms";
import { merchandisingOrder } from "@/catalog/merchandising";
import { withReviewStats } from "@/catalog/review-stats";

const perPage = 12;
type SortOrder = "price-asc" | "price-desc" | "popularity" | "title";

export default function HomePage() {
  const { locale, syncCartProducts } = useStorefront();
  const copy = getUiCopy(locale);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("popularity");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    const refreshCatalog = () => setCatalogVersion((version) => version + 1);
    window.addEventListener(catalogUpdatedEvent, refreshCatalog);
    return () => window.removeEventListener(catalogUpdatedEvent, refreshCatalog);
  }, []);

  useEffect(() => {
    setLoading(true); setError(null); setFilters([]); setQuery("");
    getCatalog(getCatalogMode(), locale)
      .then((catalog) => {
        syncCartProducts(catalog.products);
        setProducts(withReviewStats(catalog.products, readCmsReviews()));
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Catalog is unavailable."))
      .finally(() => setLoading(false));
  }, [locale, catalogVersion, syncCartProducts]);

  useEffect(() => setPage(1), [filters, query, sort]);

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    const requestedSearch = new URLSearchParams(window.location.search).get("search");
    if (requestedCategory) {
      setFilters([{ key: "category", value: requestedCategory }]);
      if (requestedSearch) setQuery(requestedSearch);
    }
  }, [locale]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale === "uk" ? "uk-UA" : "ru-RU");
    const matchesFilters = (product: Product) => filters.every(({ key, value }) => key === "category"
      ? categoryLabels(product.category).some((category) => categoryKey(category) === categoryKey(String(value)))
      : key.startsWith("attributes.")
        ? product.attributes?.[key.slice(11)] === value
        : product[key] === value);
    const candidates = products.filter(matchesFilters);
    if (!normalizedQuery) {
      return [...candidates].sort((a, b) => {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "popularity") return (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || (b.rating ?? 0) - (a.rating ?? 0) || merchandisingOrder(a) - merchandisingOrder(b);
        if (sort === "title") return a.title.localeCompare(b.title, locale);
        return merchandisingOrder(a) - merchandisingOrder(b) || a.title.localeCompare(b.title, locale);
      });
    }
    const primaryMatches = candidates.filter((product) => {
      const searchable = `${product.title} ${product.slug} ${product.category}`.toLocaleLowerCase(locale === "uk" ? "uk-UA" : "ru-RU");
      return searchable.includes(normalizedQuery);
    });
    const result = (primaryMatches.length ? primaryMatches : candidates.filter((product) => {
      const searchable = `${product.description ?? ""} ${product.shortDescription ?? ""}`.toLocaleLowerCase(locale === "uk" ? "uk-UA" : "ru-RU");
      return searchable.includes(normalizedQuery);
    }));
    return [...result].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "popularity") return (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || (b.rating ?? 0) - (a.rating ?? 0) || merchandisingOrder(a) - merchandisingOrder(b);
      if (sort === "title") return a.title.localeCompare(b.title, locale);
      return merchandisingOrder(a) - merchandisingOrder(b) || a.title.localeCompare(b.title, locale);
    });
  }, [products, filters, query, sort, locale]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visibleProducts = filtered.slice((page - 1) * perPage, page * perPage);
  const homepageCategorySettings = readCmsCategories();
  const categoryHighlights = useMemo(() => {
    const settingsByCategory = new Map(homepageCategorySettings.map((category) => [categoryKey(category.name), category]));
    return Array.from(new Set(products.flatMap((product) => categoryLabels(product.category)))).map((category) => {
      const productsInCategory = products.filter((product) => categoryLabels(product.category).includes(category));
      const setting = settingsByCategory.get(categoryKey(category));
      return { category, products: productsInCategory, icon: categoryIcon(category), hidden: setting?.hidden, sortOrder: setting?.sortOrder ?? Number.MAX_SAFE_INTEGER };
    }).filter(({ products: productsInCategory, hidden }) => productsInCategory.length > 0 && !hidden).sort((a, b) => a.sortOrder - b.sortOrder || b.products.length - a.products.length || a.category.localeCompare(b.category, locale)).slice(0, 6);
  }, [products, locale, homepageCategorySettings]);
  const selectedCategory = filters.find((filter) => filter.key === "category")?.value;
  const openCategories = () => {
    const openHeaderMenu = () => window.dispatchEvent(new Event("heymom:open-categories"));
    if (window.scrollY < 4) {
      openHeaderMenu();
      return;
    }

    // Opening the dropdown while the page is still scrolling can make the
    // outside-click listener close it immediately. Wait until its anchor in
    // the header is actually back on screen.
    let framesWaited = 0;
    const waitForHeader = () => {
      if (window.scrollY < 4 || framesWaited >= 48) {
        openHeaderMenu();
        return;
      }
      framesWaited += 1;
      window.requestAnimationFrame(waitForHeader);
    };
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(waitForHeader);
  };
  const scrollToCatalog = () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  };
  const resetCatalog = () => {
    setFilters([]);
    setQuery("");
    setPage(1);
    window.history.replaceState(null, "", "/");
  };
  const showCatalog = () => {
    setFilters([]);
    setQuery("");
    setPage(1);
    window.history.replaceState(null, "", "/#catalog");
    scrollToCatalog();
  };
  const applyCatalogFilters = (nextFilters: Filter[]) => {
    setFilters(nextFilters);
    setQuery("");
    setPage(1);
    const category = nextFilters.find((filter) => filter.key === "category")?.value;
    window.history.replaceState(null, "", category ? `/?category=${encodeURIComponent(String(category))}#catalog` : "/#catalog");
    scrollToCatalog();
  };
  const selectCategoryFromHeader = (category: string, keyword?: string) => {
    setFilters([{ key: "category", value: category }]);
    setQuery(keyword ?? "");
    setPage(1);
    window.history.replaceState(null, "", `/?category=${encodeURIComponent(category)}${keyword ? `&search=${encodeURIComponent(keyword)}` : ""}#catalog`);
    scrollToCatalog();
  };

  return <>
    <main className="catalog-shell page-enter" id="top">
      <ProductHeader searchValue={query} onSearchChange={setQuery} searchProducts={products} hideSearch onCatalogClick={resetCatalog} onCategorySelect={selectCategoryFromHeader} />
      <div className="mobile-home-search"><SearchAutocomplete products={products} query={query} locale={locale} onChange={setQuery} /></div>
      <HomeBillboards locale={locale} onCategorySelect={selectCategoryFromHeader} onCatalogClick={showCatalog} />
      <ScrollReveal><section className="category-rail" id="categories" aria-label={copy.popularCategories}><div className="rail-heading"><div><span className="eyebrow">{copy.quickChoice}</span><h2>{copy.popularCategories}</h2></div><span>{copy.chooseNeed}</span></div><div className="category-cards">{categoryHighlights.map(({ category, products: productsInCategory, icon }) => <button key={category} className="category-card" onClick={() => applyCatalogFilters([{ key: "category", value: category }])}>{icon && <img className="category-card-icon" src={icon} alt="" loading="lazy" />}<span>{displayCategoryLabel(category, locale)}</span><small>{productsInCategory.length} {pluralizeProducts(productsInCategory.length, locale)} <b>→</b></small></button>)}</div></section></ScrollReveal>
      <div className="desktop-catalog-search"><SearchAutocomplete products={products} query={query} locale={locale} onChange={setQuery} /></div>
      <section className="catalog-layout" id="catalog">
        <ProductFilters products={products} filters={filters} onChange={applyCatalogFilters} />
        <div className="catalog-results" id="catalog-results">
          <div className="results-heading">
            <div><span className="eyebrow">{copy.catalog}</span><h1>{selectedCategory ? displayCategoryLabel(String(selectedCategory), locale) : copy.catalog}</h1><p>{loading ? `${copy.catalog}…` : `${filtered.length} ${pluralizeProducts(filtered.length, locale)}`}</p></div>
            <div className="catalog-controls"><button className="mobile-filter-button" type="button" onClick={openCategories}>{copy.categories}</button><label className="sort-control"><span>{copy.sorting}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="popularity">{copy.popularitySort}</option><option value="price-asc">{copy.priceAsc}</option><option value="price-desc">{copy.priceDesc}</option><option value="title">{copy.titleSort}</option></select></label><select className="mobile-sort-control" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} aria-label={copy.sorting}><option value="popularity">{copy.popularitySort}</option><option value="price-asc">{copy.priceAsc}</option><option value="price-desc">{copy.priceDesc}</option><option value="title">{copy.titleSort}</option></select></div>
          </div>
          {error ? <div className="error-state"><strong>Каталог недоступний</strong><p>{error}</p></div> : <><ProductGrid products={visibleProducts} loading={loading} /><Pagination current={page} total={totalPages} onChange={setPage} /></>}
        </div>
      </section>
      <TopProducts products={products} locale={locale} />
      <StorePolicies />
      <SiteFooter />
    </main>
  </>;
}

function pluralizeProducts(count: number, locale: "uk" | "ru") {
  const last = count % 10;
  const lastTwo = count % 100;
  if (locale === "ru") {
    if (last === 1 && lastTwo !== 11) return "товар";
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "товара";
    return "товаров";
  }
  if (last === 1 && lastTwo !== 11) return "товар";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "товари";
  return "товарів";
}

function categoryIcon(category: string) {
  const normalized = categoryKey(category);
  if (normalized === "thermometers") return "/category-icons/thermometer.png";
  if (normalized === "epilators") return "/category-icons/photoepilator.png";
  if (normalized === "aspirators") return "/category-icons/aspirator.png";
  if (normalized === "nebulizers") return "/category-icons/nebulizer.png";
  if (normalized === "face-care") return "/category-icons/skin-scrubber.png";
  if (normalized === "pumps") return "/category-icons/breast-pump.png";
  return undefined;
}
