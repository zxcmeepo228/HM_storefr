"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import seedCatalog from "@/catalog/data/heymom-products.uk.json";
import type { Product, ProductCatalog } from "@/catalog/types";
import { clearLocalCatalog, makeDraftProduct, readCmsCategories, readCmsHomepageBanners, readCmsOrderMeta, readCmsReviews, readLocalCatalog, type CmsCategory, type CmsHomepageBanner, type CmsOrderMeta, type CmsOrderStatus, type CmsReview, type CmsReviewStatus, writeCmsCategories, writeCmsHomepageBanners, writeCmsOrderMeta, writeCmsReviews, writeLocalCatalog } from "@/admin/local-cms";
import { conversionStages, readConversionFunnel, type ConversionStage } from "@/lib/conversion-pipeline";
import { merchandisingOrder } from "@/catalog/merchandising";

type Section = "dashboard" | "homepage" | "products" | "categories" | "reviews" | "orders" | "settings";
type StockFilter = "all" | "available" | "unavailable";
type PublicationFilter = "all" | "published" | "draft";
type MediaFilter = "all" | "with-photo" | "without-photo";
type ProductForm = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  descriptionHtml?: string;
  shortDescription?: string;
  shortDescriptionHtml?: string;
  price: number;
  sortOrder?: number;
  oldPrice?: number;
  warrantyMonths?: number;
  inStock: boolean;
  published: boolean;
  barcode?: string;
  manufacturerCode?: string;
  brand?: string;
  supplier?: string;
  condition?: "new" | "used";
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  badgesText: string;
  category: string;
  descriptionImages?: string[];
  imagesText: string;
  attributesText: string;
};

const seed = seedCatalog as unknown as ProductCatalog;
const money = new Intl.NumberFormat("uk-UA");

function toForm(product: Product): ProductForm {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug ?? "",
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    shortDescription: product.shortDescription,
    shortDescriptionHtml: product.shortDescriptionHtml,
    price: product.price,
    sortOrder: product.sortOrder,
    oldPrice: product.oldPrice,
    warrantyMonths: product.warrantyMonths,
    inStock: product.inStock,
    published: product.published !== false,
    barcode: product.barcode,
    manufacturerCode: product.manufacturerCode,
    brand: product.brand,
    supplier: product.supplier,
    condition: product.condition ?? "new",
    weightKg: product.weightKg,
    lengthCm: product.lengthCm,
    widthCm: product.widthCm,
    heightCm: product.heightCm,
    badgesText: (product.badges ?? []).join("\n"),
    category: product.category,
    descriptionImages: product.descriptionImages,
    imagesText: (product.images ?? []).join("\n"),
    attributesText: Object.entries(product.attributes ?? {}).map(([key, value]) => `${key}: ${value}`).join("\n"),
  };
}

function fromForm(form: ProductForm): Product {
  const attributes = Object.fromEntries(form.attributesText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const separator = line.indexOf(":");
    return separator === -1 ? [line, ""] : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }).filter(([key]) => key));
  return {
    id: form.id.trim(),
    title: form.title.trim(),
    slug: form.slug?.trim(),
    category: form.category.trim() || "Без категорії",
    price: Number(form.price) || 0,
    sortOrder: form.sortOrder,
    oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
    warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : undefined,
    images: form.imagesText.split("\n").map((image) => image.trim()).filter(Boolean),
    attributes,
    description: form.description,
    descriptionHtml: form.descriptionHtml,
    shortDescription: form.shortDescription,
    shortDescriptionHtml: form.shortDescriptionHtml,
    descriptionImages: form.descriptionImages,
    inStock: form.inStock,
    published: form.published,
    barcode: form.barcode?.trim() || undefined,
    manufacturerCode: form.manufacturerCode?.trim() || undefined,
    brand: form.brand?.trim() || undefined,
    supplier: form.supplier?.trim() || undefined,
    condition: form.condition ?? "new",
    weightKg: form.weightKg ? Number(form.weightKg) : undefined,
    lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
    widthCm: form.widthCm ? Number(form.widthCm) : undefined,
    heightCm: form.heightCm ? Number(form.heightCm) : undefined,
    badges: form.badgesText.split("\n").map((badge) => badge.trim()).filter(Boolean),
  };
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("dashboard");
  const [catalog, setCatalog] = useState<ProductCatalog>(seed);
  const [categorySettings, setCategorySettings] = useState<CmsCategory[]>([]);
  const [homepageBanners, setHomepageBanners] = useState<CmsHomepageBanner[]>([]);
  const [orderMeta, setOrderMeta] = useState<CmsOrderMeta[]>([]);
  const [reviews, setReviews] = useState<CmsReview[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewQuery, setReviewQuery] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<"all" | CmsReviewStatus>("all");
  const [reviewPage, setReviewPage] = useState(1);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [publicationFilter, setPublicationFilter] = useState<PublicationFilter>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  // localStorage is unavailable during SSR. Start with the same empty funnel
  // on server and client, then load the browser-only metrics after hydration.
  const [funnel, setFunnel] = useState<Record<ConversionStage, number>>(() => Object.fromEntries(conversionStages.map((stage) => [stage, 0])) as Record<ConversionStage, number>);

  const refresh = () => {
    setCatalog(readLocalCatalog(seed));
    setCategorySettings(readCmsCategories());
    setHomepageBanners(readCmsHomepageBanners());
    setOrderMeta(readCmsOrderMeta());
    setReviews(readCmsReviews());
  };

  useEffect(() => { refresh(); setFunnel(readConversionFunnel()); setReady(true); }, []);

  const products = useMemo(() => catalog.products.filter((product) => {
    const text = `${product.title} ${product.category} ${product.id} ${product.slug ?? ""}`.toLowerCase();
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesStock = stockFilter === "all" || (stockFilter === "available" ? product.inStock : !product.inStock);
    const matchesPublication = publicationFilter === "all" || (publicationFilter === "published" ? product.published !== false : product.published === false);
    const hasPhoto = Boolean(product.images?.length);
    const matchesMedia = mediaFilter === "all" || (mediaFilter === "with-photo" ? hasPhoto : !hasPhoto);
    return text.includes(query.trim().toLowerCase()) && matchesCategory && matchesStock && matchesPublication && matchesMedia;
  }), [catalog.products, query, categoryFilter, stockFilter, publicationFilter, mediaFilter]);
  const categoryList = useMemo(() => {
    const categoryOrder = new Map(categorySettings.map((category) => [category.name, category.sortOrder ?? Number.MAX_SAFE_INTEGER]));
    return [...new Set([...catalog.products.map((product) => product.category), ...categorySettings.map((category) => category.name)])].sort((a, b) => (categoryOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (categoryOrder.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b, "uk"));
  }, [catalog.products, categorySettings]);
  const categories = categoryList.length;
  const publishedReviews = reviews.filter((review) => review.status === "published").length;
  const filteredReviews = useMemo(() => reviews.filter((review) => {
    const productTitle = catalog.products.find((product) => product.id === review.productId)?.title ?? "";
    const searchable = `${review.name} ${review.text} ${productTitle}`.toLocaleLowerCase("uk-UA");
    return (reviewStatusFilter === "all" || review.status === reviewStatusFilter) && searchable.includes(reviewQuery.trim().toLocaleLowerCase("uk-UA"));
  }), [reviews, catalog.products, reviewQuery, reviewStatusFilter]);
  const reviewPageSize = 24;
  const reviewPageCount = Math.max(1, Math.ceil(filteredReviews.length / reviewPageSize));
  const visibleReviews = filteredReviews.slice((reviewPage - 1) * reviewPageSize, reviewPage * reviewPageSize);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const visibleProducts = products.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); setSelectedIds([]); }, [query, categoryFilter, stockFilter, publicationFilter, mediaFilter]);
  useEffect(() => { setReviewPage(1); }, [reviewQuery, reviewStatusFilter]);

  useEffect(() => {
    const openProductEditor = (event: MouseEvent) => {
      const button = (event.target as Element).closest<HTMLButtonElement>(".cms-row-actions button:not([aria-label])");
      if (!button) return;
      const title = button.closest("tr")?.querySelector("td strong")?.textContent?.trim();
      const product = catalog.products.find((item) => item.title === title);
      if (!product) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(`/admin/product/${encodeURIComponent(product.id)}`, "_blank");
    };
    document.addEventListener("click", openProductEditor, true);
    return () => document.removeEventListener("click", openProductEditor, true);
  }, [catalog.products]);

  const saveProduct = () => {
    if (!editing) return;
    try {
      const product = fromForm(editing);
      if (!product.id || !product.title) throw new Error("Вкажіть артикул і назву товару.");
      const hasDuplicateSlug = catalog.products.some((item) => item.id !== product.id && item.slug === product.slug);
      if (hasDuplicateSlug) throw new Error("Такий slug уже є. Змініть посилання товару.");
      const existing = catalog.products.some((item) => item.id === product.id);
      const next: ProductCatalog = { products: existing ? catalog.products.map((item) => item.id === product.id ? product : item) : [product, ...catalog.products] };
      setCatalog(writeLocalCatalog(next));
      setEditing(null); setMessage("Товар збережено локально. Онови вітрину, щоб побачити зміни.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не вдалося зберегти товар."); }
  };

  const deleteProduct = (id: string) => {
    const product = catalog.products.find((item) => item.id === id);
    if (!product || !window.confirm(`Видалити «${product.title}»?`)) return;
    setCatalog(writeLocalCatalog({ products: catalog.products.filter((item) => item.id !== id) }));
    setMessage("Товар видалено з локальної CMS.");
  };

  const setSelected = (id: string, checked: boolean) => setSelectedIds((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  const selectVisible = (checked: boolean) => setSelectedIds((current) => checked ? [...new Set([...current, ...visibleProducts.map((item) => item.id)])] : current.filter((id) => !visibleProducts.some((item) => item.id === id)));
  const updateSelectedStock = (inStock: boolean) => {
    if (!selectedIds.length) return;
    const next = { products: catalog.products.map((product) => selectedIds.includes(product.id) ? { ...product, inStock } : product) };
    setCatalog(writeLocalCatalog(next)); setSelectedIds([]); setMessage(inStock ? "Позначено: в наявності." : "Позначено: немає в наявності.");
  };
  const updateSelectedPublication = (published: boolean) => {
    if (!selectedIds.length) return;
    const next = { products: catalog.products.map((product) => selectedIds.includes(product.id) ? { ...product, published } : product) };
    setCatalog(writeLocalCatalog(next)); setSelectedIds([]); setMessage(published ? "Товари опубліковано на сайті." : "Товари перенесено в чернетки.");
  };
  const quickUpdateProduct = (id: string, patch: Partial<Product>) => {
    const next = { products: catalog.products.map((product) => product.id === id ? { ...product, ...patch } : product) };
    setCatalog(writeLocalCatalog(next));
    setMessage("Зміну збережено.");
  };
  const duplicateProduct = (id: string) => {
    const source = catalog.products.find((product) => product.id === id);
    if (!source) return;
    const timestamp = Date.now();
    const copy: Product = { ...source, id: `local-${timestamp}`, slug: `${source.slug || source.id}-copy-${timestamp}`, title: `${source.title} (копія)`, published: false, sortOrder: undefined };
    setCatalog(writeLocalCatalog({ products: [copy, ...catalog.products] }));
    setEditing(toForm(copy));
    setMessage("Створено копію товару як чернетку. Перевір назву, ціну та посилання перед публікацією.");
  };
  const deleteSelected = () => {
    if (!selectedIds.length || !window.confirm(`Видалити вибрані товари: ${selectedIds.length}?`)) return;
    setCatalog(writeLocalCatalog({ products: catalog.products.filter((product) => !selectedIds.includes(product.id)) }));
    setSelectedIds([]); setMessage("Вибрані товари видалено.");
  };

  const exportCatalog = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "heymom-catalog.json"; link.click(); URL.revokeObjectURL(url);
  };

  const importCatalog = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const imported = JSON.parse(await file.text()) as ProductCatalog;
      setCatalog(writeLocalCatalog(imported)); setMessage("Каталог імпортовано та перевірено за JCOS.");
    } catch (error) { setMessage(error instanceof Error ? `Імпорт скасовано: ${error.message}` : "Не вдалося імпортувати файл."); }
    event.target.value = "";
  };

  const setReviewStatus = (id: string, status: CmsReview["status"]) => {
    const next = reviews.map((review) => review.id === id ? { ...review, status } : review);
    setReviews(next); writeCmsReviews(next);
  };
  const deleteReview = (id: string) => {
    const next = reviews.filter((review) => review.id !== id);
    setReviews(next); writeCmsReviews(next);
  };
  const updateReview = (id: string, patch: Pick<CmsReview, "name" | "rating" | "text" | "createdAt" | "status" | "reply">) => {
    const next = reviews.map((review) => review.id === id ? { ...review, ...patch } : review);
    setReviews(next); writeCmsReviews(next); setEditingReviewId(null);
  };
  const resetCatalog = () => {
    if (!window.confirm("Повернути стартовий каталог? Локальні зміни товарів зникнуть.")) return;
    clearLocalCatalog(); setCatalog(seed); setMessage("Повернуто стартовий каталог.");
  };

  const saveCategorySettings = (next: CmsCategory[]) => { setCategorySettings(next); writeCmsCategories(next); };
  const saveHomepageBanners = (next: CmsHomepageBanner[]) => { setHomepageBanners(next); writeCmsHomepageBanners(next); };
  const updateOrderMeta = (id: string, patch: Partial<CmsOrderMeta>) => {
    const current = orderMeta.find((item) => item.id === id) ?? { id, status: "new" as CmsOrderStatus, updatedAt: new Date().toISOString() };
    const nextItem = { ...current, ...patch, updatedAt: new Date().toISOString() };
    const next = orderMeta.some((item) => item.id === id) ? orderMeta.map((item) => item.id === id ? nextItem : item) : [...orderMeta, nextItem];
    setOrderMeta(next); writeCmsOrderMeta(next);
  };
  const updateHomepageBanner = (id: string, patch: Partial<CmsHomepageBanner>) => {
    const current = homepageBanners.find((banner) => banner.id === id) ?? { id };
    saveHomepageBanners(homepageBanners.some((banner) => banner.id === id) ? homepageBanners.map((banner) => banner.id === id ? { ...banner, ...patch } : banner) : [...homepageBanners, { ...current, ...patch }]);
  };
  const reorderHomepageBanners = (id: string, targetId: string) => {
    const ids = ["hero", "aspirators", "nebulizers", "thermometers"];
    const configured = ids.map((bannerId) => homepageBanners.find((banner) => banner.id === bannerId) ?? { id: bannerId }).sort((a, b) => (a.sortOrder ?? ids.indexOf(a.id)) - (b.sortOrder ?? ids.indexOf(b.id)));
    const sourceIndex = configured.findIndex((banner) => banner.id === id);
    if (sourceIndex < 0 || id === targetId) return;
    const [banner] = configured.splice(sourceIndex, 1);
    const targetIndex = configured.findIndex((item) => item.id === targetId);
    if (targetIndex < 0) return;
    configured.splice(targetIndex, 0, banner);
    saveHomepageBanners(configured.map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 })));
    setMessage("Порядок банерів збережено.");
  };
  const createCategory = () => {
    const name = window.prompt("Назва нової категорії");
    if (!name?.trim()) return;
    const normalized = name.trim();
    if (categoryList.some((category) => category.toLocaleLowerCase() === normalized.toLocaleLowerCase())) { setMessage("Така категорія вже є."); return; }
    saveCategorySettings([...categorySettings, { id: `category-${Date.now()}`, name: normalized }]);
    setMessage("Категорію створено. Тепер її можна вибрати у товарі.");
  };
  const renameCategory = (oldName: string) => {
    const nextName = window.prompt("Нова назва категорії", oldName)?.trim();
    if (!nextName || nextName === oldName) return;
    const nextCatalog = { products: catalog.products.map((product) => product.category === oldName ? { ...product, category: nextName } : product) };
    setCatalog(writeLocalCatalog(nextCatalog));
    saveCategorySettings(categorySettings.map((category) => category.name === oldName ? { ...category, name: nextName } : category));
    setMessage("Назву категорії оновлено у всіх товарах.");
  };
  const categorySetting = (name: string) => categorySettings.find((category) => category.name === name);
  const updateCategory = (name: string, patch: Partial<CmsCategory>) => {
    const current = categorySetting(name) ?? { id: `category-${Date.now()}-${name}`, name };
    const next = categorySettings.some((category) => category.name === name) ? categorySettings.map((category) => category.name === name ? { ...category, ...patch } : category) : [...categorySettings, { ...current, ...patch }];
    saveCategorySettings(next);
  };
  const homepageProducts = useMemo(() => catalog.products.filter((product) => product.published !== false).sort((a, b) => merchandisingOrder(a) - merchandisingOrder(b) || a.title.localeCompare(b.title, "uk")), [catalog.products]);
  const moveHomepageProduct = (id: string, direction: -1 | 1) => {
    const currentIndex = homepageProducts.findIndex((product) => product.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= homepageProducts.length) return;
    const ordered = [...homepageProducts];
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    const nextSortOrder = new Map(ordered.map((product, index) => [product.id, (index + 1) * 10]));
    setCatalog(writeLocalCatalog({ products: catalog.products.map((product) => nextSortOrder.has(product.id) ? { ...product, sortOrder: nextSortOrder.get(product.id) } : product) }));
    setMessage("Порядок товарів на головній збережено.");
  };
  const reorderHomepageProducts = (id: string, targetId: string) => {
    const ordered = [...homepageProducts];
    const sourceIndex = ordered.findIndex((product) => product.id === id);
    if (sourceIndex < 0 || id === targetId) return;
    const [product] = ordered.splice(sourceIndex, 1);
    const targetIndex = ordered.findIndex((item) => item.id === targetId);
    if (targetIndex < 0) return;
    ordered.splice(targetIndex, 0, product);
    const nextSortOrder = new Map(ordered.map((item, index) => [item.id, (index + 1) * 10]));
    setCatalog(writeLocalCatalog({ products: catalog.products.map((item) => nextSortOrder.has(item.id) ? { ...item, sortOrder: nextSortOrder.get(item.id) } : item) }));
    setMessage("Новий порядок товарів збережено.");
  };
  const reorderCategoryProducts = (category: string, id: string, targetId: string) => {
    const ordered = catalog.products.filter((product) => product.category === category).sort((a, b) => merchandisingOrder(a) - merchandisingOrder(b) || a.title.localeCompare(b.title, "uk"));
    const sourceIndex = ordered.findIndex((product) => product.id === id);
    if (sourceIndex < 0 || id === targetId) return;
    const [product] = ordered.splice(sourceIndex, 1);
    const targetIndex = ordered.findIndex((item) => item.id === targetId);
    if (targetIndex < 0) return;
    ordered.splice(targetIndex, 0, product);
    const nextSortOrder = new Map(ordered.map((item, index) => [item.id, (index + 1) * 10]));
    setCatalog(writeLocalCatalog({ products: catalog.products.map((item) => nextSortOrder.has(item.id) ? { ...item, sortOrder: nextSortOrder.get(item.id) } : item) }));
    setMessage(`Порядок товарів у категорії «${category}» збережено.`);
  };
  const moveHomepageCategory = (name: string, direction: -1 | 1) => {
    const currentIndex = categoryList.indexOf(name);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categoryList.length) return;
    const ordered = [...categoryList];
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    const nextSortOrder = new Map(ordered.map((category, index) => [category, (index + 1) * 10]));
    saveCategorySettings(ordered.map((category) => ({ ...(categorySetting(category) ?? { id: `category-${Date.now()}-${category}`, name: category }), sortOrder: nextSortOrder.get(category) })));
    setMessage("Порядок категорій на головній збережено.");
  };
  const reorderHomepageCategories = (name: string, targetName: string) => {
    const ordered = [...categoryList];
    const sourceIndex = ordered.indexOf(name);
    if (sourceIndex < 0 || name === targetName) return;
    const [category] = ordered.splice(sourceIndex, 1);
    const targetIndex = ordered.indexOf(targetName);
    if (targetIndex < 0) return;
    ordered.splice(targetIndex, 0, category);
    const nextSortOrder = new Map(ordered.map((item, index) => [item, (index + 1) * 10]));
    saveCategorySettings(ordered.map((item) => ({ ...(categorySetting(item) ?? { id: `category-${Date.now()}-${item}`, name: item }), sortOrder: nextSortOrder.get(item) })));
    setMessage("Новий порядок категорій збережено.");
  };

  const localOrders = ready ? Object.keys(window.localStorage).filter((key) => key.startsWith("heymom-order-")).map((key) => {
    try { return JSON.parse(window.localStorage.getItem(key) ?? "{}"); } catch { return {}; }
  }) : [];
  const quickOrders = ready ? Object.keys(window.localStorage).filter((key) => key.startsWith("heymom-quick-order-")).map((key) => {
    try { return JSON.parse(window.localStorage.getItem(key) ?? "{}"); } catch { return {}; }
  }) : [];
  const draftProducts = catalog.products.filter((product) => product.published === false).length;
  const unavailableProducts = catalog.products.filter((product) => !product.inStock).length;
  const productsWithoutPhotos = catalog.products.filter((product) => !product.images?.length).length;
  const moderationReviews = reviews.filter((review) => review.status === "pending").length;
  const activeProductView = publicationFilter === "published" ? "published" : publicationFilter === "draft" ? "draft" : mediaFilter === "without-photo" ? "without-photo" : stockFilter === "unavailable" ? "unavailable" : "all";
  const applyProductView = (view: "all" | "published" | "draft" | "without-photo" | "unavailable") => {
    setQuery(""); setCategoryFilter("all"); setStockFilter(view === "unavailable" ? "unavailable" : "all"); setPublicationFilter(view === "published" ? "published" : view === "draft" ? "draft" : "all"); setMediaFilter(view === "without-photo" ? "without-photo" : "all");
  };
  const sectionTitle: Record<Section, string> = { dashboard: "Огляд", homepage: "Конструктор головної", products: "Товари", categories: "Категорії", reviews: "Відгуки", orders: "Замовлення", settings: "Налаштування" };
  const sectionSubtitle: Record<Section, string> = { dashboard: "Короткий стан вашого магазину", homepage: "Порядок товарів та категорій на вітрині", products: "Керуйте асортиментом та цінами", categories: "Структура каталогу та видимість", reviews: "Модерація відгуків покупців", orders: "Замовлення з локального режиму", settings: "Дані, експорт і підключення" };

  return <main className="cms-shell">
    <aside className="cms-sidebar">
      <div className="cms-sidebar-head"><Link className="cms-brand" href="/">Hey<span>m</span>om <small>CMS</small></Link></div>
      <p className="cms-nav-label">КЕРУВАННЯ МАГАЗИНОМ</p>
      <nav aria-label="Адмін-навігація">
        <button className={section === "dashboard" ? "active" : ""} onClick={() => setSection("dashboard")}><CmsIcon name="home" /><span>Огляд</span></button>
        <button className={section === "homepage" ? "active" : ""} onClick={() => setSection("homepage")}><CmsIcon name="home" /><span>Головна</span></button>
        <button className={section === "products" ? "active" : ""} onClick={() => setSection("products")}><CmsIcon name="box" /><span>Товари</span></button>
        <button className={section === "categories" ? "active" : ""} onClick={() => setSection("categories")}><CmsIcon name="grid" /><span>Категорії</span></button>
        <button className={section === "reviews" ? "active" : ""} onClick={() => setSection("reviews")}><CmsIcon name="star" /><span>Відгуки</span></button>
        <button className={section === "orders" ? "active" : ""} onClick={() => setSection("orders")}><CmsIcon name="bag" /><span>Замовлення</span></button>
        <button className={section === "settings" ? "active" : ""} onClick={() => setSection("settings")}><CmsIcon name="settings" /><span>Налаштування</span></button>
      </nav>
      <div className="cms-sidebar-note"><b><i />Локальний режим</b><span>Дані у цьому браузері</span></div>
      <Link className="cms-back-link" href="/">← До магазину</Link>
    </aside>
    <section className="cms-main">
      <header className="cms-topbar"><div><p>{sectionSubtitle[section]}</p><h1>{sectionTitle[section]}</h1></div><div className="cms-top-actions">{section === "products" && <><label className="cms-import">Імпорт<input type="file" accept="application/json" onChange={importCatalog} /></label><button className="cms-secondary" onClick={exportCatalog}>Експорт</button><button className="cms-primary" onClick={() => setEditing(toForm(makeDraftProduct()))}>+ Новий товар</button></>}<div className="cms-user">А<span>Адміністратор</span></div></div></header>
      {message && <div className="cms-toast" role="status">{message}<button onClick={() => setMessage("")} aria-label="Закрити">×</button></div>}
      {section === "dashboard" && <div className="cms-dashboard"><section className="cms-welcome"><div><p>HEYMOM · РОБОЧИЙ ПРОСТІР</p><h2>Вітаю! Магазин під контролем.</h2><span>Редагуй товари, контролюй відгуки й готуй каталог до запуску.</span></div><button className="cms-primary" onClick={() => setEditing(toForm(makeDraftProduct()))}>+ Додати товар</button></section>
        <article className="cms-kpi products"><CmsIcon name="box" /><span>Товари</span><strong>{catalog.products.length}</strong><button onClick={() => setSection("products")}>Керувати товарами <b>→</b></button></article>
        <article className="cms-kpi categories"><CmsIcon name="grid" /><span>Категорії</span><strong>{categories}</strong><button onClick={() => setSection("products")}>Подивитися каталог <b>→</b></button></article>
        <article className="cms-kpi reviews"><CmsIcon name="star" /><span>Опубліковані відгуки</span><strong>{publishedReviews}</strong><button onClick={() => setSection("reviews")}>Модерувати <b>→</b></button></article>
        <article className="cms-kpi orders"><CmsIcon name="bag" /><span>Локальні замовлення</span><strong>{localOrders.length}</strong><button onClick={() => setSection("orders")}>Відкрити <b>→</b></button></article>
        <section className="cms-funnel"><div><p>КОНВЕРСІЙНИЙ ПАЙПЛАЙН</p><h2>Шлях покупця</h2><span>Дані цього браузера, без ПІБ, телефону чи інших персональних даних.</span></div><div>{conversionStages.map((stage, index) => <article key={stage}><b>0{index + 1}</b><strong>{{ product_view: "Переглянули товар", add_to_cart: "Додали в кошик", cart_open: "Відкрили кошик", checkout_started: "Почали оформлення", order_completed: "Оформили замовлення" }[stage]}</strong><em>{funnel[stage]}</em></article>)}</div></section>
        <section className="cms-action-center"><header><div><p>ОПЕРАЦІЙНИЙ ЦЕНТР</p><h2>Що потребує уваги</h2></div><span>{draftProducts + unavailableProducts + productsWithoutPhotos + moderationReviews + quickOrders.length} задач</span></header><div className="cms-action-grid">
          <button className={draftProducts ? "cms-action-item attention" : "cms-action-item"} onClick={() => { setSection("products"); setPublicationFilter("draft"); setStockFilter("all"); setMediaFilter("all"); setQuery(""); }}><i>◌</i><span><b>Чернетки товарів</b><small>Не показуються покупцям</small></span><strong>{draftProducts}</strong><em>→</em></button>
          <button className={productsWithoutPhotos ? "cms-action-item attention" : "cms-action-item"} onClick={() => { setSection("products"); setMediaFilter("without-photo"); setPublicationFilter("all"); setStockFilter("all"); setQuery(""); }}><i>▧</i><span><b>Товари без фото</b><small>Перевір головну картинку</small></span><strong>{productsWithoutPhotos}</strong><em>→</em></button>
          <button className={unavailableProducts ? "cms-action-item attention" : "cms-action-item"} onClick={() => { setSection("products"); setStockFilter("unavailable"); setPublicationFilter("all"); setMediaFilter("all"); }}><i>!</i><span><b>Немає в наявності</b><small>Приховай або онови залишок</small></span><strong>{unavailableProducts}</strong><em>→</em></button>
          <button className={moderationReviews ? "cms-action-item attention" : "cms-action-item"} onClick={() => { setSection("reviews"); setReviewStatusFilter("pending"); }}><i>★</i><span><b>Відгуки на модерації</b><small>Ще не опубліковані</small></span><strong>{moderationReviews}</strong><em>→</em></button>
          <button className={quickOrders.length ? "cms-action-item attention" : "cms-action-item"} onClick={() => setSection("orders")}><i>☎</i><span><b>Заявки в 1 клік</b><small>Локальний демо-режим</small></span><strong>{quickOrders.length}</strong><em>→</em></button>
        </div></section>
        <section className="cms-info-card"><h2>Що вже можна редагувати</h2><p>Товари, ціни, галереї, описи, характеристики, категорії та відгуки. Після підключення Shopify або іншого API цей самий інтерфейс можна перевести з localStorage на реальну базу даних.</p></section>
      </div>}
      {section === "homepage" && <HomepageBuilder products={homepageProducts} categories={categoryList} banners={homepageBanners} productCount={(category) => catalog.products.filter((product) => product.category === category).length} onMoveProduct={moveHomepageProduct} onMoveCategory={moveHomepageCategory} onReorderProducts={reorderHomepageProducts} onReorderCategories={reorderHomepageCategories} onUpdateBanner={updateHomepageBanner} onReorderBanners={reorderHomepageBanners} />}
      {section === "products" && <div className="cms-section">
        <div className="cms-product-views" role="tablist" aria-label="Швидкі види товарів"><button className={activeProductView === "all" ? "active" : ""} onClick={() => applyProductView("all")}>Усі <b>{catalog.products.length}</b></button><button className={activeProductView === "published" ? "active" : ""} onClick={() => applyProductView("published")}>Опубліковані <b>{catalog.products.length - draftProducts}</b></button><button className={activeProductView === "draft" ? "active" : ""} onClick={() => applyProductView("draft")}>Чернетки <b>{draftProducts}</b></button><button className={activeProductView === "without-photo" ? "active" : ""} onClick={() => applyProductView("without-photo")}>Без фото <b>{productsWithoutPhotos}</b></button><button className={activeProductView === "unavailable" ? "active" : ""} onClick={() => applyProductView("unavailable")}>Немає в наявності <b>{unavailableProducts}</b></button></div>
        <div className="cms-toolbar cms-toolbar-advanced"><label>⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пошук за назвою, категорією, артикулом" /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Категорія"><option value="all">Усі категорії</option>{categoryList.map((category) => <option key={category} value={category}>{category}</option>)}</select><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)} aria-label="Наявність"><option value="all">Будь-яка наявність</option><option value="available">В наявності</option><option value="unavailable">Немає в наявності</option></select><select value={publicationFilter} onChange={(event) => setPublicationFilter(event.target.value as PublicationFilter)} aria-label="Публікація"><option value="all">Усі статуси</option><option value="published">Опубліковані</option><option value="draft">Чернетки</option></select><select value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value as MediaFilter)} aria-label="Фото"><option value="all">Усі фото</option><option value="with-photo">З фото</option><option value="without-photo">Без фото</option></select><span>{products.length} із {catalog.products.length}</span></div>
        {selectedIds.length > 0 && <div className="cms-bulk-bar"><b>Вибрано: {selectedIds.length}</b><button onClick={() => updateSelectedPublication(true)}>Опублікувати</button><button onClick={() => updateSelectedPublication(false)}>У чернетки</button><button onClick={() => updateSelectedStock(true)}>Є в наявності</button><button onClick={() => updateSelectedStock(false)}>Немає в наявності</button><button className="cms-danger-link" onClick={deleteSelected}>Видалити</button><button onClick={() => setSelectedIds([])}>Скасувати</button></div>}
        <div className="cms-table-wrap"><table className="cms-table cms-product-table"><thead><tr><th><input type="checkbox" aria-label="Вибрати товари на сторінці" checked={visibleProducts.length > 0 && visibleProducts.every((product) => selectedIds.includes(product.id))} onChange={(event) => selectVisible(event.target.checked)} /></th><th>Фото</th><th>Артикул</th><th>Назва</th><th>Категорія</th><th>Швидка ціна</th><th>Наявність</th><th>На сайті</th><th></th></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id}><td><input type="checkbox" aria-label={`Вибрати ${product.title}`} checked={selectedIds.includes(product.id)} onChange={(event) => setSelected(product.id, event.target.checked)} /></td><td>{product.images?.[0] ? <img src={product.images[0]} alt="" /> : <i>—</i>}</td><td>{product.id}</td><td><strong>{product.title}</strong><small>/{product.slug}</small></td><td>{product.category}</td><td><div className="cms-inline-prices"><label><span>Ціна, ₴</span><input type="number" min="0" defaultValue={product.price} onBlur={(event) => { const price = Number(event.target.value); if (Number.isFinite(price) && price >= 0 && price !== product.price) quickUpdateProduct(product.id, { price }); }} /></label><label><span>Стара</span><input type="number" min="0" defaultValue={product.oldPrice ?? ""} placeholder="—" onBlur={(event) => { const oldPrice = event.target.value ? Number(event.target.value) : undefined; if (oldPrice !== product.oldPrice) quickUpdateProduct(product.id, { oldPrice }); }} /></label></div></td><td><button className={product.inStock ? "cms-status available cms-status-button" : "cms-status cms-status-button"} onClick={() => quickUpdateProduct(product.id, { inStock: !product.inStock })}>{product.inStock ? "В наявності" : "Немає"}</button></td><td><label className="cms-publish-toggle" title="Показувати товар на сайті"><input type="checkbox" checked={product.published !== false} onChange={(event) => quickUpdateProduct(product.id, { published: event.target.checked })} /><span>{product.published !== false ? "Опубл." : "Чернетка"}</span></label></td><td><div className="cms-row-actions"><button onClick={() => setEditing(toForm(product))}>Редагувати</button><button onClick={() => duplicateProduct(product.id)} aria-label={`Створити копію: ${product.title}`} title="Створити копію як чернетку">⧉</button><button onClick={() => deleteProduct(product.id)} aria-label="Видалити">×</button></div></td></tr>)}</tbody></table></div>
        <div className="cms-pagination"><span>Сторінка {page} з {pageCount}</span><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>← Назад</button><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Далі →</button></div>
      </div>}
      {section === "reviews" && <div className="cms-section"><p className="cms-section-intro">Нові відгуки покупців приходять у модерацію й не показуються на сайті до публікації. Тут також можна змінити дату, статус і додати офіційну відповідь Heymom.</p><div className="cms-review-toolbar"><label>⌕ <input value={reviewQuery} onChange={(event) => setReviewQuery(event.target.value)} placeholder="Пошук за автором, текстом або товаром" /></label><select value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value as "all" | CmsReviewStatus)} aria-label="Статус відгуку"><option value="all">Усі статуси</option><option value="pending">Очікують модерації</option><option value="draft">Чернетки</option><option value="published">Опубліковані</option><option value="hidden">Приховані</option></select><span>{filteredReviews.length} із {reviews.length}</span></div><div className="cms-review-admin-list">{visibleReviews.length ? visibleReviews.map((review) => <ReviewAdminCard key={review.id} review={review} productTitle={catalog.products.find((item) => item.id === review.productId)?.title ?? "Товар видалено"} editing={editingReviewId === review.id} onEdit={() => setEditingReviewId(review.id)} onCloseEdit={() => setEditingReviewId(null)} onSave={updateReview} onStatus={setReviewStatus} onDelete={deleteReview} />) : <div className="cms-empty">За цим фільтром відгуків не знайдено.</div>}</div>{filteredReviews.length > reviewPageSize && <div className="cms-pagination"><span>Сторінка {reviewPage} з {reviewPageCount}</span><button disabled={reviewPage === 1} onClick={() => setReviewPage((value) => value - 1)}>← Назад</button><button disabled={reviewPage === reviewPageCount} onClick={() => setReviewPage((value) => value + 1)}>Далі →</button></div>}</div>}
      {section === "orders" && <div className="cms-section"><p className="cms-section-intro">Демо-замовлення та заявки в 1 клік зберігаються тільки у цьому браузері. Реальний список замовлень з’явиться після підключення API.</p>{localOrders.length ? <div className="cms-order-list">{localOrders.map((order, index) => <article key={order.id ?? index}><strong>№ {order.id ?? "—"}</strong><span>{order.customer?.fullName ?? order.fullName ?? "Клієнт"}</span><span>{order.customer?.phone ?? order.phone ?? "—"}</span><b>{order.total ? `${money.format(order.total)} ₴` : "—"}</b></article>)}</div> : <div className="cms-empty">Поки що немає локальних замовлень.</div>}{quickOrders.length > 0 && <section className="cms-quick-orders"><header><div><p>КУПІВЛЯ В 1 КЛІК</p><h2>Нові заявки</h2></div><span>{quickOrders.length}</span></header><div>{quickOrders.map((order, index) => <article key={order.product?.id ? `${order.product.id}-${index}` : index}><div><b>{order.product?.title ?? "Товар не вказано"}</b><small>{order.customer?.phone ?? "Номер не вказано"}</small></div><span>{order.product?.price ? `${money.format(order.product.price)} ₴` : "—"}</span></article>)}</div></section>}</div>}
      {section === "orders" && <OrderStatusBoard orders={localOrders as Record<string, unknown>[]} meta={orderMeta} onUpdate={updateOrderMeta} />}
      {section === "settings" && <div className="cms-section cms-settings"><h2>Дані та підключення</h2><p>Зараз CMS працює у localStorage. Експорт зберігає резервну копію каталогу у JSON, а імпорт повертає або завантажує дані після перевірки JCOS.</p><div><button className="cms-secondary" onClick={exportCatalog}>Експортувати каталог</button><button className="cms-danger" onClick={resetCatalog}>Повернути стартові товари</button></div><small>У продакшені тут будуть налаштування Shopify, Medusa, Vendure або іншого бекенду. Не зберігай реальні персональні дані клієнтів у локальному режимі.</small></div>}
      {section === "categories" && <CategoryManager categories={categoryList} settings={categorySettings} products={catalog.products} onCreate={createCategory} onRename={renameCategory} onUpdate={updateCategory} onReorder={reorderHomepageCategories} onReorderProducts={reorderCategoryProducts} onEditProduct={(product) => setEditing(toForm(product))} />}
    </section>
    {editing && <ProductEditorPro value={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={saveProduct} />}
  </main>;
}

function ReviewAdminCard({ review, productTitle, editing, onEdit, onCloseEdit, onSave, onStatus, onDelete }: { review: CmsReview; productTitle: string; editing: boolean; onEdit: () => void; onCloseEdit: () => void; onSave: (id: string, patch: Pick<CmsReview, "name" | "rating" | "text" | "createdAt" | "status" | "reply">) => void; onStatus: (id: string, status: CmsReview["status"]) => void; onDelete: (id: string) => void }) {
  const statusLabels: Record<CmsReview["status"], string> = { draft: "Чернетка", pending: "Очікує модерації", published: "Опубліковано", hidden: "Приховано" };
  const save = () => {
    const name = (document.getElementById(`review-name-${review.id}`) as HTMLInputElement).value.trim();
    const rating = Number((document.getElementById(`review-rating-${review.id}`) as HTMLSelectElement).value);
    const text = (document.getElementById(`review-text-${review.id}`) as HTMLTextAreaElement).value.trim();
    const date = (document.getElementById(`review-date-${review.id}`) as HTMLInputElement).value;
    const status = (document.getElementById(`review-status-${review.id}`) as HTMLSelectElement).value as CmsReview["status"];
    const replyText = (document.getElementById(`review-reply-${review.id}`) as HTMLTextAreaElement).value.trim();
    if (!name || !text || !date) return;
    onSave(review.id, { name, rating, text, createdAt: `${date}T12:00:00.000Z`, status, reply: replyText ? { author: review.reply?.author || "Heymom", text: replyText, createdAt: review.reply?.createdAt || new Date().toISOString() } : undefined });
  };
  return <article><div><strong>{editing ? <input aria-label="Автор відгуку" defaultValue={review.name} id={`review-name-${review.id}`} /> : review.name}</strong><span>{editing ? <select aria-label="Оцінка відгуку" defaultValue={review.rating} id={`review-rating-${review.id}`}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} ★</option>)}</select> : "★".repeat(review.rating)}</span><small>{productTitle}</small></div>{editing ? <><textarea aria-label="Текст відгуку" defaultValue={review.text} id={`review-text-${review.id}`} rows={4} /><label className="cms-review-reply-editor">Відповідь Heymom (побачить покупець після публікації)<textarea aria-label="Відповідь Heymom" defaultValue={review.reply?.text ?? ""} id={`review-reply-${review.id}`} rows={3} placeholder="Наприклад: Дякуємо за ваш відгук!" /></label></> : <><p>{review.text}</p>{review.reply?.text && <section className="cms-review-admin-reply"><b>{review.reply.author || "Heymom"} · відповідь магазину</b><p>{review.reply.text}</p></section>}</>}<footer>{editing ? <><label className="cms-review-date-editor">Дата<input type="date" id={`review-date-${review.id}`} defaultValue={review.createdAt.slice(0, 10)} /></label><select id={`review-status-${review.id}`} aria-label="Статус відгуку" defaultValue={review.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button onClick={save}>Зберегти</button><button onClick={onCloseEdit}>Скасувати</button></> : <><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("uk-UA")}</time><span className={review.status === "published" ? "cms-status available" : "cms-status"}>{statusLabels[review.status]}</span><button onClick={onEdit}>Редагувати</button>{review.status === "published" ? <><button onClick={() => onStatus(review.id, "hidden")}>Приховати</button><button onClick={() => onStatus(review.id, "draft")}>У чернетку</button></> : <><button onClick={() => onStatus(review.id, "published")}>Опублікувати</button>{review.status !== "draft" && <button onClick={() => onStatus(review.id, "draft")}>У чернетку</button>}</>}<button className="cms-danger-link" onClick={() => onDelete(review.id)}>Видалити</button></>}</footer></article>;
}

function ProductEditor({ value, onChange, onClose, onSave }: { value: ProductForm; onChange: (value: ProductForm) => void; onClose: () => void; onSave: () => void }) {
  const set = <K extends keyof ProductForm>(key: K, next: ProductForm[K]) => onChange({ ...value, [key]: next });
  return <div className="cms-modal-layer" role="dialog" aria-modal="true" aria-label="Редагування товару"><button className="cms-modal-backdrop" onClick={onClose} aria-label="Закрити" /><section className="cms-editor"><header><div><span>Товар</span><h2>{value.id.startsWith("local-") ? "Новий товар" : "Редагування"}</h2></div><button onClick={onClose}>×</button></header><div className="cms-editor-body"><div className="cms-field-grid"><Field label="Артикул"><input value={value.id} onChange={(e) => set("id", e.target.value)} /></Field><Field label="Slug / посилання"><input value={value.slug ?? ""} onChange={(e) => set("slug", e.target.value)} /></Field></div><Field label="Назва товару"><input value={value.title} onChange={(e) => set("title", e.target.value)} /></Field><div className="cms-field-grid"><Field label="Ціна, ₴"><input type="number" min="0" value={value.price} onChange={(e) => set("price", Number(e.target.value))} /></Field><Field label="Стара ціна, ₴"><input type="number" min="0" value={value.oldPrice ?? ""} onChange={(e) => set("oldPrice", e.target.value ? Number(e.target.value) : undefined)} /></Field><Field label="Гарантія, міс."><input type="number" min="0" value={value.warrantyMonths ?? ""} onChange={(e) => set("warrantyMonths", e.target.value ? Number(e.target.value) : undefined)} /></Field></div><Field label="Категорія"><input value={value.category} onChange={(e) => set("category", e.target.value)} /></Field><label className="cms-toggle"><input type="checkbox" checked={value.inStock} onChange={(e) => set("inStock", e.target.checked)} /> В наявності</label><Field label="Короткий опис"><textarea rows={3} value={value.shortDescription ?? ""} onChange={(e) => set("shortDescription", e.target.value)} /></Field><Field label="Повний опис"><textarea rows={6} value={value.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field><Field label="Посилання на фото — одне у рядку"><textarea rows={5} value={value.imagesText} onChange={(e) => set("imagesText", e.target.value)} placeholder="/media/photo.jpg&#10;https://..." /></Field><Field label="Характеристики — формат «Назва: значення»"><textarea rows={6} value={value.attributesText} onChange={(e) => set("attributesText", e.target.value)} placeholder="Бренд: ArhiMED&#10;Гарантія: 12 місяців" /></Field></div><footer><button className="cms-secondary" onClick={onClose}>Скасувати</button><button className="cms-primary" onClick={onSave}>Зберегти товар</button></footer></section></div>;
}

function OrderStatusBoard({ orders, meta, onUpdate }: { orders: Record<string, unknown>[]; meta: CmsOrderMeta[]; onUpdate: (id: string, patch: Partial<CmsOrderMeta>) => void }) {
  const labels: Record<CmsOrderStatus, string> = { new: "Нове", confirmed: "Підтверджено", processing: "В роботі", shipped: "Відправлено", completed: "Завершено", cancelled: "Скасовано" };
  if (!orders.length) return null;
  return <section className="cms-order-board"><header><div><p>РОБОЧИЙ СТАТУС</p><h2>Обробка замовлень</h2></div><span>{orders.length}</span></header><div>{orders.map((order, index) => { const id = String(order.id ?? `local-order-${index}`); const item = meta.find((entry) => entry.id === id); return <article key={id}><div><b>№ {String(order.id ?? "—")}</b><small>Статус і внутрішня нотатка зберігаються у цьому браузері.</small></div><select value={item?.status ?? "new"} onChange={(event) => onUpdate(id, { status: event.target.value as CmsOrderStatus })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><textarea aria-label={`Нотатка до замовлення ${id}`} rows={2} value={item?.note ?? ""} onChange={(event) => onUpdate(id, { note: event.target.value })} placeholder="Нотатка для менеджера" /></article>; })}</div></section>;
}

function CmsIcon({ name }: { name: "home" | "box" | "grid" | "star" | "bag" | "settings" }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-7h6v7" /></>,
    box: <><path d="m21 8-9 5-9-5 9-5 9 5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5.3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
  };
  return <i className="cms-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg></i>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="cms-field"><span>{label}</span>{children}</label>; }

function RichDescriptionEditor({ html, onChange }: { html: string; onChange: (html: string, plainText: string) => void }) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const updateFromEditor = () => {
    const editor = editorRef.current;
    if (editor) onChange(editor.innerHTML, editor.innerText);
  };
  const command = (name: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    updateFromEditor();
  };
  const insertLink = () => {
    const link = window.prompt("Встав посилання");
    if (link) command("createLink", link);
  };
  const insertImage = () => {
    const source = window.prompt("Встав посилання на фото");
    if (source) command("insertImage", source);
  };
  const switchMode = (nextMode: "visual" | "html") => {
    if (nextMode === "html") updateFromEditor();
    setMode(nextMode);
  };

  return <section className="cms-rich-editor" aria-label="Повний опис товару">
    <div className="cms-rich-editor-head"><div><b>Повний опис</b><span>Додавай текст, заголовки, списки та фото прямо в опис товару.</span></div><div className="cms-rich-mode"><button type="button" className={mode === "visual" ? "active" : ""} onClick={() => switchMode("visual")}>Візуально</button><button type="button" className={mode === "html" ? "active" : ""} onClick={() => switchMode("html")}>HTML</button></div></div>
    {mode === "visual" ? <><div className="cms-rich-toolbar" role="toolbar" aria-label="Форматування опису"><select aria-label="Формат абзацу" defaultValue="p" onChange={(event) => command("formatBlock", event.target.value)}><option value="p">Абзац</option><option value="h2">Заголовок 2</option><option value="h3">Заголовок 3</option></select><button type="button" onClick={() => command("bold")} aria-label="Жирний"><b>B</b></button><button type="button" onClick={() => command("italic")} aria-label="Курсив"><i>I</i></button><button type="button" onClick={() => command("insertUnorderedList")} aria-label="Список">☷</button><button type="button" onClick={() => command("insertOrderedList")} aria-label="Нумерований список">1.</button><button type="button" onClick={insertLink} aria-label="Посилання">↗</button><button type="button" onClick={insertImage} aria-label="Вставити фото">▧</button><button type="button" onClick={() => command("removeFormat")} aria-label="Очистити форматування">Tx</button></div><div ref={editorRef} className="cms-rich-surface" contentEditable suppressContentEditableWarning onInput={updateFromEditor} dangerouslySetInnerHTML={{ __html: html }} data-placeholder="Напиши детальний опис товару…" /></> : <textarea className="cms-rich-code" rows={16} value={html} onChange={(event) => onChange(event.target.value, event.target.value.replace(/<[^>]*>/g, " "))} spellCheck={false} />}
  </section>;
}

type EditorTab = "main" | "description" | "photos" | "seo";

function ProductEditorPro({ value, onChange, onClose, onSave, standalone = false }: { value: ProductForm; onChange: (value: ProductForm) => void; onClose: () => void; onSave: () => void; standalone?: boolean }) {
  const [tab, setTab] = useState<EditorTab>("main");
  const set = <K extends keyof ProductForm>(key: K, next: ProductForm[K]) => onChange({ ...value, [key]: next });
  const images = value.imagesText.split("\n").map((image) => image.trim()).filter(Boolean);
  const title = value.title || "Новий товар";
  const handleSaveAndClose = () => onSave();
  const setImages = (nextImages: string[]) => set("imagesText", nextImages.join("\n"));
  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const nextImages = [...images];
    [nextImages[index], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[index]];
    setImages(nextImages);
  };
  const removeImage = (index: number) => setImages(images.filter((_, currentIndex) => currentIndex !== index));
  const updateImage = (index: number, nextValue: string) => setImages(images.map((image, currentIndex) => currentIndex === index ? nextValue.trim() : image).filter(Boolean));
  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    const encoded = await Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));
    setImages([...images, ...encoded]);
    event.target.value = "";
  };

  return <div className={standalone ? "cms-product-page-editor" : "cms-modal-layer cms-product-editor-layer"} role="dialog" aria-modal={!standalone} aria-label="Редагування товару">
    {!standalone && <button className="cms-modal-backdrop" onClick={onClose} aria-label="Закрити" />}
    <section className="cms-editor cms-editor-pro">
      <header className="cms-editor-pro-header">
        <div><span>{value.id.startsWith("local-") ? "Новий товар" : `Артикул: ${value.id}`}</span><h2>{title}</h2></div>
        <div className="cms-editor-actions"><a className="cms-secondary" href="/admin">← До товарів</a>{!value.id.startsWith("local-") && <a className="cms-secondary" href={`/admin/product/${encodeURIComponent(value.id)}`}>Відкрити окремо</a>}<a className="cms-secondary" href={value.slug ? `/product/${value.slug}` : "/"} target="_blank" rel="noreferrer">Товар на сайті</a><button className="cms-secondary" onClick={onClose}>Скасувати</button><button className="cms-primary" onClick={handleSaveAndClose}>Зберегти</button><button className="cms-primary cms-save-exit" onClick={handleSaveAndClose}>Зберегти й вийти</button></div>
      </header>
      <nav className="cms-editor-tabs" aria-label="Розділи редактора">
        <button className={tab === "main" ? "active" : ""} onClick={() => setTab("main")}>Основне</button>
        <button className={tab === "description" ? "active" : ""} onClick={() => setTab("description")}>Опис і характеристики</button>
        <button className={tab === "photos" ? "active" : ""} onClick={() => setTab("photos")}>Фото <b>{images.length}</b></button>
        <button className={tab === "seo" ? "active" : ""} onClick={() => setTab("seo")}>SEO і маркетплейси</button>
      </nav>
      <div className="cms-editor-body cms-editor-pro-body">
        {tab === "main" && <>
          <div className="cms-editor-section-head"><div><h3>Основна інформація</h3><p>Назва, ціна, наявність і категорія товару.</p></div><div className="cms-status-switches"><label className="cms-switch"><input type="checkbox" checked={value.inStock} onChange={(event) => set("inStock", event.target.checked)} /><span />{value.inStock ? "В наявності" : "Немає в наявності"}</label><label className="cms-switch"><input type="checkbox" checked={value.published} onChange={(event) => set("published", event.target.checked)} /><span />{value.published ? "Опубліковано" : "Чернетка"}</label></div></div>
          <div className="cms-field-grid cms-field-grid-pro"><Field label="Артикул"><input value={value.id} onChange={(event) => set("id", event.target.value)} /></Field><Field label="Посилання на товар"><input value={value.slug ?? ""} onChange={(event) => set("slug", event.target.value)} /></Field><Field label="Категорія"><input value={value.category} onChange={(event) => set("category", event.target.value)} placeholder="Наприклад: Термометри" /></Field></div>
          <Field label="Назва товару (UA)"><input value={value.title} onChange={(event) => set("title", event.target.value)} /></Field>
          <div className="cms-field-grid cms-field-grid-pro"><Field label="Ціна, ₴"><input type="number" min="0" value={value.price} onChange={(event) => set("price", Number(event.target.value))} /></Field><Field label="Стара ціна, ₴"><input type="number" min="0" value={value.oldPrice ?? ""} onChange={(event) => set("oldPrice", event.target.value ? Number(event.target.value) : undefined)} /></Field><Field label="Гарантія, міс."><input type="number" min="0" value={value.warrantyMonths ?? ""} onChange={(event) => set("warrantyMonths", event.target.value ? Number(event.target.value) : undefined)} /></Field></div>
          <div className="cms-editor-tip"><b>Порада</b><span>Стара ціна показується перекресленою. Якщо акції немає — залиш її порожньою.</span></div>
        </>}
        {tab === "description" && <>
          <div className="cms-editor-section-head"><div><h3>Опис товару</h3><p>Текст одразу відобразиться у вкладці товару на вітрині.</p></div><span className="cms-language-pill">UA</span></div>
          <Field label="Короткий опис"><textarea rows={4} value={value.shortDescription ?? ""} onChange={(event) => set("shortDescription", event.target.value)} placeholder="2–4 речення для верхньої частини картки товару" /></Field>
          <RichDescriptionEditor html={value.descriptionHtml ?? value.description ?? ""} onChange={(nextHtml, plainText) => { set("descriptionHtml", nextHtml); set("description", plainText); }} />
          <Field label="Характеристики"><textarea rows={8} value={value.attributesText} onChange={(event) => set("attributesText", event.target.value)} placeholder={"Бренд: ArhiMED\nМатеріал: Харчовий пластик\nГарантія: 12 місяців"} /></Field>
          <p className="cms-field-help">Кожну характеристику вказуй з нового рядка у форматі «Назва: значення».</p>
        </>}
        {tab === "photos" && <>
          <div className="cms-editor-section-head"><div><h3>Фотографії та відео</h3><p>Перше фото буде головним на картці та в каталозі.</p></div><span className="cms-language-pill">{images.length} файлів</span></div>
          <div className="cms-photo-actions"><label className="cms-primary cms-upload-button">+ Завантажити фото<input type="file" accept="image/*" multiple onChange={uploadImages} /></label><span>Можна вибрати одразу кілька файлів</span></div>
          <div className="cms-photo-grid">{images.map((image, index) => <figure key={`${image}-${index}`}><img src={image} alt="" /><figcaption><b>{index === 0 ? "Головне фото" : `Фото ${index + 1}`}</b><div className="cms-photo-controls"><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Перемістити ліворуч">←</button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label="Перемістити праворуч">→</button><button type="button" className="delete" onClick={() => removeImage(index)} aria-label="Видалити фото">×</button></div></figcaption><input className="cms-photo-url" value={image} onChange={(event) => updateImage(index, event.target.value)} aria-label={`Посилання на фото ${index + 1}`} /></figure>)}{!images.length && <div className="cms-photo-empty">Поки немає фото<br /><span>Завантаж файли або додай посилання нижче</span></div>}</div>
          <Field label="Посилання на фото — одне в рядку"><textarea rows={7} value={value.imagesText} onChange={(event) => set("imagesText", event.target.value)} placeholder={"/photos/product-main.jpg\nhttps://..."} /></Field>
          <div className="cms-editor-tip"><b>Рекомендований формат</b><span>Квадратні фото від 1200 × 1200 px. Порядок рядків = порядок фото в галереї.</span></div>
        </>}
        {tab === "seo" && <>
          <div className="cms-editor-section-head"><div><h3>SEO та відображення</h3><p>Ці дані допоможуть товару коректно виглядати у пошуку та фідах.</p></div></div>
          <Field label="URL / аліас"><input value={value.slug ?? ""} onChange={(event) => set("slug", event.target.value)} /></Field>
          <Field label="Назва для Google та маркетплейсів"><input value={value.title} onChange={(event) => set("title", event.target.value)} /></Field>
          <Field label="Короткий опис для Google"><textarea rows={4} value={value.shortDescription ?? ""} onChange={(event) => set("shortDescription", event.target.value)} /></Field>
          <div className="cms-feed-card"><strong>Google Merchant Center</strong><span>Після підключення реального бекенду цей товар можна буде автоматично передавати у фід.</span><label><input type="checkbox" defaultChecked /> Додати до товарного фіду</label></div>
        </>}
      </div>
    </section>
  </div>;
}

function CategoryManager({ categories, settings, products, onCreate, onRename, onUpdate, onReorder, onReorderProducts, onEditProduct }: { categories: string[]; settings: CmsCategory[]; products: Product[]; onCreate: () => void; onRename: (category: string) => void; onUpdate: (category: string, patch: Partial<CmsCategory>) => void; onReorder: (category: string, targetCategory: string) => void; onReorderProducts: (category: string, id: string, targetId: string) => void; onEditProduct: (product: Product) => void }) {
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [openedCategory, setOpenedCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const settingsFor = (name: string) => settings.find((category) => category.name === name);

  return <div className="cms-section cms-category-manager">
    <div className="cms-category-manager-head"><div><span>Каталог</span><h2>Категорії</h2><p>Затисни категорію лівою кнопкою миші й перетягни у потрібне місце. Тут само можна задати головне фото картки категорії на сайті.</p></div><button className="cms-primary" onClick={onCreate}>+ Нова категорія</button></div>
    <div className="cms-category-list">{categories.map((category, index) => {
      const setting = settingsFor(category);
      const categoryProducts = products.filter((product) => product.category === category).sort((a, b) => merchandisingOrder(a) - merchandisingOrder(b) || a.title.localeCompare(b.title, "uk"));
      const imageProducts = categoryProducts.filter((product) => Boolean(product.images?.[0]));
      const selectedProductImage = imageProducts.find((product) => product.images?.[0] === setting?.image)?.images?.[0] ?? "";
      const displayedImage = setting?.image || categoryProducts[0]?.images?.[0];
      const opened = openedCategory === category;
      return <article key={category} draggable className={`cms-draggable-category${draggedCategory === category ? " is-dragging" : ""}${dropTarget === category ? " is-drop-target" : ""}${opened ? " is-open" : ""}`} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedCategory(category); }} onDragOver={(event) => { event.preventDefault(); if (draggedCategory !== category) setDropTarget(category); }} onDragLeave={() => setDropTarget((current) => current === category ? null : current)} onDrop={(event) => { event.preventDefault(); if (draggedCategory) onReorder(draggedCategory, category); setDraggedCategory(null); setDropTarget(null); }} onDragEnd={() => { setDraggedCategory(null); setDropTarget(null); }}>
        <span className="cms-category-drag-handle" aria-hidden="true">⠿</span><b className="cms-category-position">{index + 1}</b><div className="cms-category-cover">{displayedImage ? <img src={displayedImage} alt="" /> : <span>{category.slice(0, 1).toUpperCase()}</span>}</div><div className="cms-category-copy"><strong>{category}</strong><small>{categoryProducts.length} товарів</small></div>
        <label className="cms-category-image"><span>Головне фото на сайті</span><input value={setting?.image ?? ""} onChange={(event) => onUpdate(category, { image: event.target.value })} placeholder="Встав посилання на зображення" /><select value={selectedProductImage} onChange={(event) => onUpdate(category, { image: event.target.value || undefined })}><option value="">Автоматично: перше фото товару</option>{imageProducts.map((product) => <option key={product.id} value={product.images?.[0]}>{product.title}</option>)}</select></label>
        <label className="cms-switch"><input type="checkbox" checked={!setting?.hidden} onChange={(event) => onUpdate(category, { hidden: !event.target.checked })} /><span />{setting?.hidden ? "Прихована" : "На сайті"}</label><div className="cms-category-actions"><button type="button" onClick={() => setEditingCategory(editingCategory === category ? null : category)}>{editingCategory === category ? "Сховати налаштування" : "Налаштування"}</button><button type="button" onClick={() => setOpenedCategory(opened ? null : category)}>{opened ? "Сховати товари" : `Товари (${categoryProducts.length})`}</button><button type="button" onClick={() => onRename(category)}>Перейменувати</button></div>{editingCategory === category && <section className="cms-category-settings"><header><div><b>Налаштування категорії</b><span>Зміни зберігаються одразу. Поля SEO підготовані для підключення бекенду та окремих сторінок категорій.</span></div></header><label><span>URL категорії</span><input value={setting?.slug ?? ""} onChange={(event) => onUpdate(category, { slug: event.target.value.trim().replace(/^\/+|\/+$/g, "") || undefined })} placeholder="napryklad-termometry" /></label><label><span>Опис категорії</span><textarea rows={4} value={setting?.description ?? ""} onChange={(event) => onUpdate(category, { description: event.target.value })} placeholder="Коротко поясни, які товари тут знайде покупець." /></label><label><span>SEO-заголовок</span><input maxLength={70} value={setting?.metaTitle ?? ""} onChange={(event) => onUpdate(category, { metaTitle: event.target.value })} placeholder={category} /></label><label><span>SEO-опис</span><textarea rows={3} maxLength={160} value={setting?.metaDescription ?? ""} onChange={(event) => onUpdate(category, { metaDescription: event.target.value })} placeholder="Короткий опис категорії для пошуку." /></label></section>}{opened && <CategoryProductsEditor category={category} products={categoryProducts} onReorder={onReorderProducts} onEdit={onEditProduct} />}
      </article>;
    })}{!categories.length && <div className="cms-empty">Категорій ще немає. Створи першу категорію.</div>}</div>
  </div>;
}

function CategoryProductsEditor({ category, products, onReorder, onEdit }: { category: string; products: Product[]; onReorder: (category: string, id: string, targetId: string) => void; onEdit: (product: Product) => void }) {
  const [draggedProduct, setDraggedProduct] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  return <section className="cms-category-products" onDragStart={(event) => event.stopPropagation()} onDragOver={(event) => event.stopPropagation()} onDrop={(event) => event.stopPropagation()}>
    <header><div><b>Товари в категорії</b><span>Перетягуй для зміни порядку або відкрий повне редагування.</span></div></header>
    <div role="list">
      {products.map((product, index) => <div key={product.id} role="listitem" draggable className={`cms-category-product-row${draggedProduct === product.id ? " is-dragging" : ""}${dropTarget === product.id ? " is-drop-target" : ""}`} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = "move"; setDraggedProduct(product.id); }} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); if (draggedProduct !== product.id) setDropTarget(product.id); }} onDragLeave={() => setDropTarget((current) => current === product.id ? null : current)} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggedProduct) onReorder(category, draggedProduct, product.id); setDraggedProduct(null); setDropTarget(null); }} onDragEnd={() => { setDraggedProduct(null); setDropTarget(null); }}>
        <span className="cms-drag-handle" aria-hidden="true">⠿</span><strong>{index + 1}</strong><div className="cms-category-product-image">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : <span>—</span>}</div><div><b>{product.title}</b><small>Арт. {product.id} · {money.format(product.price)} ₴</small></div><button type="button" onClick={() => onEdit(product)}>Редагувати</button>
      </div>)}
    </div>
    {!products.length && <p className="cms-category-products-empty">У цій категорії поки немає товарів.</p>}
  </section>;
}

function HomepageBannerBuilder({ banners, categories, onUpdate, onReorder }: { banners: CmsHomepageBanner[]; categories: string[]; onUpdate: (id: string, patch: Partial<CmsHomepageBanner>) => void; onReorder: (id: string, targetId: string) => void }) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const definitions = [{ id: "hero", label: "Головний банер", note: "Перший екран магазину" }, { id: "aspirators", label: "Банер аспіраторів", note: "Добірка для догляду" }, { id: "nebulizers", label: "Банер небулайзерів", note: "Добірка для інгаляцій" }, { id: "thermometers", label: "Банер термометрів", note: "Добірка для контролю температури" }];
  const settingsById = new Map(banners.map((banner) => [banner.id, banner]));
  const ordered = definitions.map((definition, index) => ({ ...definition, ...(settingsById.get(definition.id) ?? {}), sortOrder: settingsById.get(definition.id)?.sortOrder ?? index })).sort((a, b) => a.sortOrder - b.sortOrder);
  return <section className="cms-homepage-builder-panel cms-banner-builder"><header><div><span>01</span><div><h3>Банери на головній</h3><p>Увімкни потрібні банери, задай їх порядок і напрямок кнопки. Тексти редагуються окремо для UA та RU.</p></div></div><b>{ordered.filter((banner) => banner.enabled !== false).length} на сайті</b></header><div className="cms-banner-list">{ordered.map((banner, index) => <article key={banner.id} draggable className={`cms-banner-item${dragged === banner.id ? " is-dragging" : ""}${dropTarget === banner.id ? " is-drop-target" : ""}`} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDragged(banner.id); }} onDragOver={(event) => { event.preventDefault(); if (dragged !== banner.id) setDropTarget(banner.id); }} onDragLeave={() => setDropTarget((current) => current === banner.id ? null : current)} onDrop={(event) => { event.preventDefault(); if (dragged) onReorder(dragged, banner.id); setDragged(null); setDropTarget(null); }} onDragEnd={() => { setDragged(null); setDropTarget(null); }}><header><span className="cms-drag-handle" aria-hidden="true">⠿</span><b>{index + 1}</b><div><strong>{banner.label}</strong><small>{banner.note}</small></div><label className="cms-switch"><input type="checkbox" checked={banner.enabled !== false} onChange={(event) => onUpdate(banner.id, { enabled: event.target.checked })} /><span />{banner.enabled === false ? "Прихований" : "На сайті"}</label><div className="cms-homepage-order-actions"><button type="button" disabled={index === 0} onClick={() => onReorder(banner.id, ordered[index - 1].id)} aria-label={`Підняти ${banner.label}`}>↑</button><button type="button" disabled={index === ordered.length - 1} onClick={() => onReorder(banner.id, ordered[index + 1].id)} aria-label={`Опустити ${banner.label}`}>↓</button></div></header><div className="cms-banner-settings"><label><span>Відкрити категорію</span><select value={banner.category ?? ""} onChange={(event) => onUpdate(banner.id, { category: event.target.value || undefined })}><option value="">Не обирати категорію</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label><span>Посилання кнопки</span><input value={banner.href ?? ""} onChange={(event) => onUpdate(banner.id, { href: event.target.value.trim() || undefined })} placeholder="#catalog або /delivery" /></label><details><summary>Тексти українською</summary><label><span>Надзаголовок</span><input value={banner.eyebrowUk ?? ""} onChange={(event) => onUpdate(banner.id, { eyebrowUk: event.target.value })} /></label><label><span>Заголовок</span><input value={banner.titleUk ?? ""} onChange={(event) => onUpdate(banner.id, { titleUk: event.target.value })} /></label><label><span>Текст</span><textarea rows={3} value={banner.textUk ?? ""} onChange={(event) => onUpdate(banner.id, { textUk: event.target.value })} /></label><label><span>Текст кнопки</span><input value={banner.ctaUk ?? ""} onChange={(event) => onUpdate(banner.id, { ctaUk: event.target.value })} /></label></details><details><summary>Тексти російською</summary><label><span>Надзаголовок</span><input value={banner.eyebrowRu ?? ""} onChange={(event) => onUpdate(banner.id, { eyebrowRu: event.target.value })} /></label><label><span>Заголовок</span><input value={banner.titleRu ?? ""} onChange={(event) => onUpdate(banner.id, { titleRu: event.target.value })} /></label><label><span>Текст</span><textarea rows={3} value={banner.textRu ?? ""} onChange={(event) => onUpdate(banner.id, { textRu: event.target.value })} /></label><label><span>Текст кнопки</span><input value={banner.ctaRu ?? ""} onChange={(event) => onUpdate(banner.id, { ctaRu: event.target.value })} /></label></details></div></article>)}</div></section>;
}

function HomepageBuilder({ products, categories, banners, productCount, onMoveProduct, onMoveCategory, onReorderProducts, onReorderCategories, onUpdateBanner, onReorderBanners }: { products: Product[]; categories: string[]; banners: CmsHomepageBanner[]; productCount: (category: string) => number; onMoveProduct: (id: string, direction: -1 | 1) => void; onMoveCategory: (category: string, direction: -1 | 1) => void; onReorderProducts: (id: string, targetId: string) => void; onReorderCategories: (name: string, targetName: string) => void; onUpdateBanner: (id: string, patch: Partial<CmsHomepageBanner>) => void; onReorderBanners: (id: string, targetId: string) => void }) {
  const [draggedProduct, setDraggedProduct] = useState<string | null>(null);
  const [productDropTarget, setProductDropTarget] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [categoryDropTarget, setCategoryDropTarget] = useState<string | null>(null);
  return <div className="cms-section cms-homepage-builder">
    <div className="cms-homepage-builder-head"><div><span>Вітрина</span><h2>Конструктор головної сторінки</h2><p>Затисни рядок лівою кнопкою миші, перетягни у потрібне місце та відпусти. Порядок зберігається одразу.</p></div><Link className="cms-secondary" href="/">Відкрити вітрину ↗</Link></div>
    <HomepageBannerBuilder banners={banners} categories={categories} onUpdate={onUpdateBanner} onReorder={onReorderBanners} />
    <section className="cms-homepage-builder-panel"><header><div><span>01</span><div><h3>Товари у каталозі</h3><p>Перші товари отримують найвищий пріоритет на головній. Чернетки не показуються.</p></div></div><b>{products.length} на сайті</b></header><div className="cms-homepage-order-list" aria-label="Порядок товарів на головній">{products.map((product, index) => <article key={product.id} draggable className={`cms-homepage-order-item cms-draggable-item${draggedProduct === product.id ? " is-dragging" : ""}${productDropTarget === product.id ? " is-drop-target" : ""}`} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedProduct(product.id); }} onDragOver={(event) => { event.preventDefault(); if (draggedProduct !== product.id) setProductDropTarget(product.id); }} onDragLeave={() => setProductDropTarget((current) => current === product.id ? null : current)} onDrop={(event) => { event.preventDefault(); if (draggedProduct) onReorderProducts(draggedProduct, product.id); setDraggedProduct(null); setProductDropTarget(null); }} onDragEnd={() => { setDraggedProduct(null); setProductDropTarget(null); }}><span className="cms-drag-handle" aria-hidden="true">⠿</span><strong>{index + 1}</strong><div className="cms-homepage-product-image">{product.images?.[0] ? <img src={product.images[0]} alt="" /> : <span>—</span>}</div><div className="cms-homepage-product-copy"><b>{product.title}</b><small>{product.category} · Арт. {product.id}</small></div><em>{money.format(product.price)} ₴</em><div className="cms-homepage-order-actions"><button type="button" onClick={() => onMoveProduct(product.id, -1)} disabled={index === 0} aria-label={`Підняти ${product.title}`}>↑</button><button type="button" onClick={() => onMoveProduct(product.id, 1)} disabled={index === products.length - 1} aria-label={`Опустити ${product.title}`}>↓</button></div></article>)}</div></section>
    <section className="cms-homepage-builder-panel"><header><div><span>02</span><div><h3>Категорії на головній</h3><p>Порядок застосовується до карток швидкого вибору. Показуються перші шість категорій із товарами.</p></div></div><b>{categories.length} категорій</b></header><div className="cms-homepage-order-list cms-homepage-category-order-list" aria-label="Порядок категорій на головній">{categories.map((category, index) => <article key={category} draggable className={`cms-homepage-order-item cms-draggable-item${draggedCategory === category ? " is-dragging" : ""}${categoryDropTarget === category ? " is-drop-target" : ""}`} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedCategory(category); }} onDragOver={(event) => { event.preventDefault(); if (draggedCategory !== category) setCategoryDropTarget(category); }} onDragLeave={() => setCategoryDropTarget((current) => current === category ? null : current)} onDrop={(event) => { event.preventDefault(); if (draggedCategory) onReorderCategories(draggedCategory, category); setDraggedCategory(null); setCategoryDropTarget(null); }} onDragEnd={() => { setDraggedCategory(null); setCategoryDropTarget(null); }}><span className="cms-drag-handle" aria-hidden="true">⠿</span><strong>{index + 1}</strong><div className="cms-homepage-category-mark">{category.slice(0, 1).toUpperCase()}</div><div className="cms-homepage-product-copy"><b>{category}</b><small>{productCount(category)} товарів</small></div><div className="cms-homepage-order-actions"><button type="button" onClick={() => onMoveCategory(category, -1)} disabled={index === 0} aria-label={`Підняти категорію ${category}`}>↑</button><button type="button" onClick={() => onMoveCategory(category, 1)} disabled={index === categories.length - 1} aria-label={`Опустити категорію ${category}`}>↓</button></div></article>)}</div></section>
  </div>;
}
