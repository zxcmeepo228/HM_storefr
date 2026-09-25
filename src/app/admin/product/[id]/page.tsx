"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import seedCatalog from "@/catalog/data/heymom-products.uk.json";
import type { Product, ProductCatalog } from "@/catalog/types";
import { readLocalCatalog, writeLocalCatalog } from "@/admin/local-cms";

const seed = seedCatalog as unknown as ProductCatalog;
type Tab = "main" | "inventory" | "description" | "photos" | "seo" | "bundle" | "promo";

function parseAttributes(text: string): Record<string, string> {
  return Object.fromEntries(text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const divider = line.indexOf(":");
    return divider === -1 ? [line, ""] : [line.slice(0, divider).trim(), line.slice(divider + 1).trim()];
  }));
}

export default function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [tab, setTab] = useState<Tab>("main");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [bundleSelection, setBundleSelection] = useState("");
  const [checkoutUpsellQuery, setCheckoutUpsellQuery] = useState("");
  const [checkoutUpsellCategory, setCheckoutUpsellCategory] = useState("all");

  useEffect(() => { params.then(({ id: productId }) => setId(decodeURIComponent(productId))); }, [params]);
  useEffect(() => { if (id) setProduct(readLocalCatalog(seed).products.find((item) => item.id === id) ?? null); }, [id]);

  const update = (patch: Partial<Product>) => setProduct((current) => current ? { ...current, ...patch } : current);
  const save = () => {
    if (!product) return;
    if (!product.title.trim()) return setError("Вкажіть назву товару.");
    if (!product.slug?.trim()) return setError("Вкажіть посилання для товару.");
    if (!Number.isFinite(product.price) || product.price < 0) return setError("Вкажіть коректну ціну.");
    const current = readLocalCatalog(seed);
    if (current.products.some((item) => item.id !== product.id && item.slug === product.slug)) return setError("Таке посилання вже має інший товар.");
    writeLocalCatalog({ products: current.products.map((item) => item.id === product.id ? product : item) });
    setError("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  if (!id) return <main className="cms-standalone-loading">Завантажую товар…</main>;
  if (!product) return <main className="cms-standalone-loading"><h1>Товар не знайдено</h1><Link href="/admin">← Повернутися до товарів</Link></main>;

  const images = product.images ?? [];
  const bundleCandidates = readLocalCatalog(seed).products.filter((item) => item.id !== product.id && item.inStock).sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title, "uk"));
  const pickerCategories = [...new Set(bundleCandidates.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "uk"));
  const filterPickerCandidates = (query: string, category: string) => bundleCandidates.filter((item) => (category === "all" || item.category === category) && `${item.title} ${item.category} ${item.id}`.toLocaleLowerCase("uk-UA").includes(query.trim().toLocaleLowerCase("uk-UA")));
  const checkoutUpsellCandidates = filterPickerCandidates(checkoutUpsellQuery, checkoutUpsellCategory);
  const updateBundleDiscount = (itemId: string, value: number) => update({ bundleDiscounts: { ...(product.bundleDiscounts ?? {}), [itemId]: Math.max(0, Math.min(99, value || 0)) } });
  const addBundleItem = () => {
    if (!bundleSelection || product.bundleProductIds?.includes(bundleSelection)) return;
    update({ bundleProductIds: [...(product.bundleProductIds ?? []), bundleSelection] });
    setBundleSelection("");
  };
  const discountPercent = product.oldPrice && product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    update({ images: next });
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const filesToRead = Array.from(files);
    if (filesToRead.some((file) => file.size > 2_500_000)) return setError("Одне фото має бути до 2,5 МБ, щоб локальна CMS не переповнилася.");
    const dataUrls = await Promise.all(filesToRead.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Не вдалося прочитати файл."));
      reader.readAsDataURL(file);
    })));
    update({ images: [...images, ...dataUrls] });
    setError("");
  };

  const duplicate = () => {
    if (!product) return;
    const newId = `local-${Date.now()}`;
    const copy: Product = { ...product, id: newId, title: `${product.title} — копія`, slug: `${product.slug || "product"}-copy-${Date.now().toString().slice(-5)}`, published: false };
    const current = readLocalCatalog(seed);
    writeLocalCatalog({ products: [...current.products, copy] });
    window.location.assign(`/admin/product/${encodeURIComponent(newId)}`);
  };

  const removeProduct = () => {
    if (!product || !window.confirm(`Видалити «${product.title}»? Цю дію не можна скасувати.`)) return;
    const current = readLocalCatalog(seed);
    writeLocalCatalog({ products: current.products.filter((item) => item.id !== product.id) });
    window.location.assign("/admin");
  };

  return <main className="cms-standalone-shell">
    <div className="cms-product-page">
      <header>
        <div><Link href="/admin">← До товарів</Link><span>Артикул: {product.id}</span><h1>{product.title}</h1></div>
        <div className="cms-editor-actions"><a className="cms-secondary" href={`/product/${product.slug}`} target="_blank" rel="noreferrer">Товар на сайті</a><button className="cms-secondary" onClick={duplicate}>Дублювати</button><button className="cms-danger" onClick={removeProduct}>Видалити</button><button className="cms-primary" onClick={save}>Зберегти зміни</button></div>
      </header>
      <nav className="cms-editor-tabs">
        <button className={tab === "main" ? "active" : ""} onClick={() => setTab("main")}>Основне</button>
        <button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}>Дані й продажі</button>
        <button className={tab === "description" ? "active" : ""} onClick={() => setTab("description")}>Опис і характеристики</button>
        <button className={tab === "photos" ? "active" : ""} onClick={() => setTab("photos")}>Фото <b>{images.length}</b></button>
        <button className={tab === "bundle" ? "active" : ""} onClick={() => setTab("bundle")}>Разом дешевше</button>
        <button className={tab === "promo" ? "active" : ""} onClick={() => setTab("promo")}>Акції</button>
        <button className={tab === "seo" ? "active" : ""} onClick={() => setTab("seo")}>SEO</button>
      </nav>
      <section className="cms-product-page-body">
        {tab === "main" && <>
          <div className="cms-editor-section-head"><div><h3>Основна інформація</h3><p>Ціна, категорія, наявність і публікація на сайті.</p></div><div className="cms-status-switches"><Toggle label={product.inStock ? "В наявності" : "Немає в наявності"} checked={product.inStock} onChange={(inStock) => update({ inStock })} /><Toggle label={product.published !== false ? "Опубліковано" : "Чернетка"} checked={product.published !== false} onChange={(published) => update({ published })} /></div></div>
          <div className="cms-field-grid cms-field-grid-pro"><Field label="Артикул"><input value={product.id} disabled /></Field><Field label="Посилання"><input value={product.slug ?? ""} onChange={(event) => update({ slug: event.target.value })} /></Field><Field label="Категорія"><input value={product.category} onChange={(event) => update({ category: event.target.value })} /></Field></div>
          <Field label="Назва товару"><input value={product.title} onChange={(event) => update({ title: event.target.value })} /></Field>
          <div className="cms-field-grid cms-field-grid-pro cms-price-editor"><Field label="Ціна, ₴"><input type="number" value={product.price} onChange={(event) => update({ price: Number(event.target.value) })} /></Field><Field label="Стара ціна, ₴"><input type="number" value={product.oldPrice ?? ""} onChange={(event) => update({ oldPrice: event.target.value ? Number(event.target.value) : undefined })} /></Field><Field label="Знижка"><input value={discountPercent ? `${discountPercent}%` : "—"} disabled /></Field><Field label="Гарантія, міс."><input type="number" value={product.warrantyMonths ?? ""} onChange={(event) => update({ warrantyMonths: event.target.value ? Number(event.target.value) : undefined })} /></Field></div>
          <div className="cms-field-grid cms-field-grid-pro"><Field label="Рейтинг (лише перевірений)"><input type="number" min="1" max="5" step="0.1" value={product.rating ?? ""} onChange={(event) => update({ rating: event.target.value ? Number(event.target.value) : undefined })} placeholder="4.9" /></Field><Field label="Кількість відгуків"><input type="number" min="0" step="1" value={product.reviewCount ?? ""} onChange={(event) => update({ reviewCount: event.target.value ? Number(event.target.value) : undefined })} placeholder="78" /></Field><Field label="Порядок на сайті"><input type="number" min="0" step="1" value={product.sortOrder ?? ""} onChange={(event) => update({ sortOrder: event.target.value ? Number(event.target.value) : undefined })} placeholder="Наприклад, 10" /></Field></div>
          <section className="cms-main-gallery"><div><b>Фото товару</b><span>Перше фото — головне в каталозі.</span></div><div className="cms-main-gallery-strip">{images.slice(0, 10).map((image, index) => <button key={`${image}-${index}`} className={index === 0 ? "active" : ""} onClick={() => setTab("photos")}><img src={image} alt="" /><small>{index === 0 ? "Головне" : index + 1}</small></button>)}<button className="cms-main-gallery-more" onClick={() => setTab("photos")}>+<span>Керувати фото</span></button></div></section>
        </>}
        {tab === "inventory" && <>
          <div className="cms-editor-section-head"><div><h3>Ідентифікація та продажі</h3><p>Ці дані потрібні для складу, фідів, маркетплейсів і роботи менеджера.</p></div></div>
          <div className="cms-field-list"><Field label="Штрихкод (EAN / UPC / ISBN)"><input value={product.barcode ?? ""} onChange={(event) => update({ barcode: event.target.value })} placeholder="4820…" /></Field><Field label="Код виробника (MPN)"><input value={product.manufacturerCode ?? ""} onChange={(event) => update({ manufacturerCode: event.target.value })} /></Field><Field label="Стан товару"><select value={product.condition ?? "new"} onChange={(event) => update({ condition: event.target.value as "new" | "used" })}><option value="new">Новий</option><option value="used">Вживаний</option></select></Field><Field label="Бренд"><input value={product.brand ?? ""} onChange={(event) => update({ brand: event.target.value })} placeholder="ArhiMED" /></Field><Field label="Постачальник"><input value={product.supplier ?? ""} onChange={(event) => update({ supplier: event.target.value })} /></Field><Field label="Вага, кг"><input type="number" min="0" step="0.01" value={product.weightKg ?? ""} onChange={(event) => update({ weightKg: event.target.value ? Number(event.target.value) : undefined })} /></Field></div>
          <Field label="Позначки товару — одна у рядку"><textarea rows={5} value={(product.badges ?? []).join("\n")} onChange={(event) => update({ badges: event.target.value.split("\n").map((badge) => badge.trim()).filter(Boolean) })} placeholder={"Топ продажів\nНовинка\nАкція"} /></Field>
        </>}
        {tab === "description" && <>
          <Field label="Короткий опис"><textarea rows={4} value={product.shortDescription ?? ""} onChange={(event) => update({ shortDescription: event.target.value })} /></Field>
          <Field label="Повний опис у форматі HTML"><textarea className="cms-rich-code" rows={18} value={product.descriptionHtml ?? product.description ?? ""} onChange={(event) => update({ descriptionHtml: event.target.value, description: event.target.value.replace(/<[^>]*>/g, " ") })} /></Field>
          <Field label="Характеристики — один рядок: Назва: значення"><textarea rows={9} value={Object.entries(product.attributes ?? {}).map(([key, value]) => `${key}: ${value}`).join("\n")} onChange={(event) => update({ attributes: parseAttributes(event.target.value) })} /></Field>
        </>}
        {tab === "photos" && <>
          <div className="cms-editor-section-head"><div><h3>Галерея товару</h3><p>Перше фото — головне. Переміщуй фотографії стрілками.</p></div></div>
          <div className="cms-photo-grid">{images.map((image, index) => <figure key={`${image}-${index}`}><img src={image} alt="" /><figcaption><b>{index === 0 ? "Головне фото" : `Фото ${index + 1}`}</b><div className="cms-photo-controls"><button onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button><button onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>→</button><button className="delete" onClick={() => update({ images: images.filter((_, itemIndex) => itemIndex !== index) })}>×</button></div></figcaption></figure>)}</div>
          <label className="cms-upload-button">Додати фото з пристрою<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => void uploadImages(event.target.files)} /></label>
          <Field label="Посилання на фото — по одному у рядок"><textarea rows={8} value={images.join("\n")} onChange={(event) => update({ images: event.target.value.split("\n").map((image) => image.trim()).filter(Boolean) })} /></Field>
        </>}
        {tab === "bundle" && <>
          <div className="cms-editor-section-head"><div><h3>Разом дешевше</h3><p>Саме ти обираєш супутні товари й знижку. Комплект побачить покупець лише після збереження та публікації товару.</p></div></div>
          <div className="cms-bundle-add"><label><span>Товар для комплекту</span><select value={bundleSelection} onChange={(event) => setBundleSelection(event.target.value)}><option value="">Оберіть товар зі списку</option>{bundleCandidates.filter((item) => !(product.bundleProductIds ?? []).includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title} · {item.price.toLocaleString("uk-UA")} ₴</option>)}</select></label><button type="button" className="cms-primary" disabled={!bundleSelection} onClick={addBundleItem}>+ Додати до комплекту</button></div>
          <div className="cms-bundle-selected">{(product.bundleProductIds ?? []).map((itemId) => { const item = bundleCandidates.find((candidate) => candidate.id === itemId); if (!item) return null; return <article key={item.id}>{item.images?.[0] && <img src={item.images[0]} alt="" />}<div><b>{item.title}</b><small>{item.price.toLocaleString("uk-UA")} ₴ · {item.category}</small></div><label><span>Знижка, %</span><input type="number" min="0" max="99" value={product.bundleDiscounts?.[item.id] ?? product.bundleDiscountPercent ?? 0} onChange={(event) => updateBundleDiscount(item.id, Number(event.target.value))} /></label><button type="button" onClick={() => update({ bundleProductIds: (product.bundleProductIds ?? []).filter((id) => id !== item.id) })} aria-label={`Прибрати ${item.title}`}>×</button></article>; })}{!(product.bundleProductIds ?? []).length && <p className="cms-picker-empty">Поки що в комплекті немає товарів.</p>}</div>
          <p className="cms-bundle-help">Додані товари з’являться покупцю як окремі варіанти «Разом дешевше». Для кожного можна задати свою знижку.</p>
          <div className="cms-editor-section-head cms-subsection-head"><div><h3>Додати до замовлення</h3><p>Один вибраний товар побачить покупець перед кнопкою «Підтвердити замовлення». За потреби задай чесну знижку — вона буде застосована тільки коли товар додадуть саме тут.</p></div></div>
          <Field label="Знижка на все замовлення після додавання, %"><input type="number" min="0" max="99" value={product.checkoutUpsellOrderDiscountPercent ?? 1} onChange={(event) => update({ checkoutUpsellOrderDiscountPercent: Math.max(0, Math.min(99, Number(event.target.value) || 0)) })} /><small>За замовчуванням — 1%. Доповнення лишається за своєю ціною, а знижка застосовується до всієї суми замовлення.</small></Field>
          <ProductPickerFilters query={checkoutUpsellQuery} category={checkoutUpsellCategory} categories={pickerCategories} onQueryChange={setCheckoutUpsellQuery} onCategoryChange={setCheckoutUpsellCategory} />
          <div className="cms-gift-picker cms-checkout-upsell-picker">{checkoutUpsellCandidates.map((item) => <button type="button" key={item.id} className={product.checkoutUpsellProductIds?.includes(item.id) ? "selected" : ""} onClick={() => update({ checkoutUpsellProductIds: product.checkoutUpsellProductIds?.includes(item.id) ? [] : [item.id] })}>{item.images?.[0] && <img src={item.images[0]} alt="" />}<span><b title={item.title}>{item.title}</b><small>Ціна в checkout: {item.price.toLocaleString("uk-UA")} ₴ · Арт. {item.id}</small></span></button>)}{!checkoutUpsellCandidates.length && <p className="cms-picker-empty">За цим запитом товарів не знайдено.</p>}</div>
        </>}
        {tab === "promo" && <>
          <div className="cms-editor-section-head"><div><h3>Акції та подарунки</h3><p>Позначки видно в каталозі, а подарунок показується в картці товару.</p></div></div>
          <div className="cms-promo-badges">{["Акція", "Новинка", "Топ продажів", "Хіт", "Подарунок"].map((badge) => { const selected = (product.badges ?? []).includes(badge); return <button key={badge} className={selected ? "active" : ""} onClick={() => update({ badges: selected ? (product.badges ?? []).filter((item) => item !== badge) : [...(product.badges ?? []), badge] })}>{selected ? "✓" : "+"} {badge}</button>; })}</div>
          <div className="cms-editor-section-head cms-subsection-head"><div><h3>Подарунок до товару</h3><p>Вибери товар, який покупець отримає безкоштовно разом із цим товаром.</p></div></div>
          <div className="cms-gift-picker"><button type="button" className={`cms-gift-none${!product.giftProductId ? " selected" : ""}`} onClick={() => update({ giftProductId: undefined })}>Без подарунка</button>{bundleCandidates.map((item) => <button type="button" key={item.id} className={product.giftProductId === item.id ? "selected" : ""} onClick={() => update({ giftProductId: item.id })}>{item.images?.[0] && <img src={item.images[0]} alt="" />}<span><b>{item.title}</b><small>Звичайна ціна: {item.price.toLocaleString("uk-UA")} ₴</small></span></button>)}</div>
        </>}
        {tab === "seo" && <>
          <div className="cms-editor-section-head"><div><h3>SEO та пошук</h3><p>Ці поля готові для підключення до пошуку, Google і майбутнього бекенду.</p></div></div>
          <Field label="SEO-заголовок"><input maxLength={70} value={product.metaTitle ?? ""} onChange={(event) => update({ metaTitle: event.target.value })} placeholder={product.title} /></Field>
          <Field label="SEO-опис"><textarea maxLength={160} rows={4} value={product.metaDescription ?? ""} onChange={(event) => update({ metaDescription: event.target.value })} placeholder={product.shortDescription ?? "Коротко опишіть користь товару"} /></Field>
          <Field label="Ключові слова — одне у рядку"><textarea rows={6} value={(product.seoKeywords ?? []).join("\n")} onChange={(event) => update({ seoKeywords: event.target.value.split("\n").map((keyword) => keyword.trim()).filter(Boolean) })} placeholder={"інгалятор\nнебулайзер\nArhiMED"} /></Field>
          <Toggle label="Не показувати сторінку товару в пошукових системах" checked={product.noIndex === true} onChange={(noIndex) => update({ noIndex })} />
        </>}
      </section>
    </div>
    {error && <div className="cms-standalone-error">{error}</div>}
    {saved && <div className="cms-standalone-toast">Зміни збережено</div>}
  </main>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="cms-switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span />{label}</label>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="cms-field"><span>{label}</span>{children}</label>; }
function ProductPickerFilters({ query, category, categories, onQueryChange, onCategoryChange }: { query: string; category: string; categories: string[]; onQueryChange: (value: string) => void; onCategoryChange: (value: string) => void }) {
  return <div className="cms-picker-filters"><label><span>Пошук товару</span><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Назва, категорія або артикул" /></label><label><span>Категорія</span><select value={category} onChange={(event) => onCategoryChange(event.target.value)}><option value="all">Усі категорії</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>;
}
