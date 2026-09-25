"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { getUiCopy } from "@/lib/ui-copy";
import type { StorefrontLocale } from "@/components/storefront/storefront-provider";
import { catalogUpdatedEvent, readCmsHomepageBanners, type CmsHomepageBanner } from "@/admin/local-cms";

type Billboard = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  image: string;
  mobileImage?: string;
  imageAlt: string;
  variant: "family" | "mesh" | "aspirator" | "thermometer";
  category?: string;
};

export function HomeBillboards({ locale, onCategorySelect, onCatalogClick }: { locale: StorefrontLocale; onCategorySelect?: (category: string) => void; onCatalogClick?: () => void }) {
  const copy = getUiCopy(locale);
  const [active, setActive] = useState(0);
  const [bannerSettings, setBannerSettings] = useState<CmsHomepageBanner[]>([]);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressBannerClick = useRef(false);
  const defaultBillboards: Billboard[] = locale === "uk" ? [
    { id: "hero", eyebrow: copy.heroEyebrow, title: copy.heroTitle, text: copy.heroText, cta: copy.heroCta, href: "#catalog", image: "/heymom-hero-mom-baby.png", mobileImage: "/banners/mobile-family-care-v1.png", imageAlt: "Мама ніжно тримає усміхненого малюка", variant: "family" },
    { id: "aspirators", eyebrow: copy.heroEyebrow, title: "Аспіратори для щоденного догляду", text: "Зручні рішення для догляду за малюком — оберіть свій варіант.", cta: "Переглянути аспіратори", href: "/?category=Аспіратори#catalog", image: "/banners/category-aspirators-family-v2.png", mobileImage: "/banners/mobile-aspirators-care-v1.png", imageAlt: "Мама поруч із малюком у світлій дитячій кімнаті", variant: "aspirator", category: "Аспіратори" },
    { id: "nebulizers", eyebrow: copy.heroEyebrow, title: "Небулайзери для всієї родини", text: "Добірка моделей для домашнього використання.", cta: "Переглянути небулайзери", href: "/?category=Небулайзери%20(інгалятори)#catalog", image: "/banners/category-nebulizers-family-v2.png", mobileImage: "/banners/mobile-nebulizers-care-v1.png", imageAlt: "Бабуся з дитиною у затишній вітальні", variant: "mesh", category: "Небулайзери (інгалятори)" },
    { id: "thermometers", eyebrow: copy.heroEyebrow, title: "Термометри для всієї родини", text: "Обирайте зручний формат для контролю температури вдома.", cta: "Переглянути термометри", href: "/?category=Термометри#catalog", image: "/banners/category-thermometers-family-v2.png?v=2", mobileImage: "/banners/category-thermometers-family-v2.png?v=2", imageAlt: "Контроль температури вдома", variant: "thermometer", category: "Термометри" },
  ] : [
    { id: "hero", eyebrow: copy.heroEyebrow, title: copy.heroTitle, text: copy.heroText, cta: copy.heroCta, href: "#catalog", image: "/heymom-hero-mom-baby.png", mobileImage: "/banners/mobile-family-care-v1.png", imageAlt: "Мама нежно держит улыбающегося малыша", variant: "family" },
    { id: "aspirators", eyebrow: copy.heroEyebrow, title: "Аспираторы для ежедневного ухода", text: "Удобные решения для ухода за малышом — выберите свой вариант.", cta: "Посмотреть аспираторы", href: "/?category=Аспіратори#catalog", image: "/banners/category-aspirators-family-v2.png", mobileImage: "/banners/mobile-aspirators-care-v1.png", imageAlt: "Мама рядом с малышом в светлой детской комнате", variant: "aspirator", category: "Аспіратори" },
    { id: "nebulizers", eyebrow: copy.heroEyebrow, title: "Небулайзеры для всей семьи", text: "Подборка моделей для домашнего использования.", cta: "Посмотреть небулайзеры", href: "/?category=Небулайзери%20(інгалятори)#catalog", image: "/banners/category-nebulizers-family-v2.png", mobileImage: "/banners/mobile-nebulizers-care-v1.png", imageAlt: "Бабушка с ребёнком в уютной гостиной", variant: "mesh", category: "Небулайзери (інгалятори)" },
    { id: "thermometers", eyebrow: copy.heroEyebrow, title: "Термометры для всей семьи", text: "Выбирайте удобный формат для контроля температуры дома.", cta: "Посмотреть термометры", href: "/?category=Термометри#catalog", image: "/banners/category-thermometers-family-v2.png?v=2", mobileImage: "/banners/category-thermometers-family-v2.png?v=2", imageAlt: "Контроль температуры дома", variant: "thermometer", category: "Термометри" },
  ];
  useEffect(() => { const sync = () => setBannerSettings(readCmsHomepageBanners()); sync(); window.addEventListener(catalogUpdatedEvent, sync); return () => window.removeEventListener(catalogUpdatedEvent, sync); }, []);
  const billboards = (() => {
    const settingsById = new Map(bannerSettings.map((banner) => [banner.id, banner]));
    return defaultBillboards.map((banner, index) => {
      const setting = settingsById.get(banner.id);
      const localized = locale === "uk" ? { eyebrow: setting?.eyebrowUk, title: setting?.titleUk, text: setting?.textUk, cta: setting?.ctaUk } : { eyebrow: setting?.eyebrowRu, title: setting?.titleRu, text: setting?.textRu, cta: setting?.ctaRu };
      return { ...banner, ...localized, eyebrow: localized.eyebrow || banner.eyebrow, title: localized.title || banner.title, text: localized.text || banner.text, cta: localized.cta || banner.cta, href: setting?.href || banner.href, category: setting?.category || banner.category, enabled: setting?.enabled, sortOrder: setting?.sortOrder ?? index };
    }).filter((banner) => banner.enabled !== false).sort((a, b) => a.sortOrder - b.sortOrder);
  })();
  useEffect(() => { setActive((index) => Math.min(index, Math.max(0, billboards.length - 1))); }, [billboards.length]);
  useEffect(() => {
    if (!billboards.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % billboards.length), 7000);
    return () => window.clearInterval(timer);
  }, [billboards.length]);
  if (!billboards.length) return null;
  const current = billboards[active];
  const previous = () => setActive((index) => (index - 1 + billboards.length) % billboards.length);
  const next = () => setActive((index) => (index + 1) % billboards.length);
  const startSwipe = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const finishSwipe = (event: PointerEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const horizontal = event.clientX - start.x;
    const vertical = event.clientY - start.y;
    if (Math.abs(horizontal) < 42 || Math.abs(horizontal) <= Math.abs(vertical)) return;
    suppressBannerClick.current = true;
    if (horizontal < 0) next(); else previous();
    window.setTimeout(() => { suppressBannerClick.current = false; }, 0);
  };

  return <section className={`home-billboard home-billboard-${current.variant}`} aria-labelledby="home-billboard-title" onPointerDown={startSwipe} onPointerUp={finishSwipe}>
    <picture className="home-billboard-picture"><source media="(max-width: 800px)" srcSet={current.mobileImage ?? current.image} /><img key={current.image} className="home-billboard-image" src={current.image} alt={current.imageAlt} loading="eager" fetchPriority="high" decoding="async" /></picture>
    <div className="home-billboard-content">{current.eyebrow && <span className="eyebrow">{current.eyebrow}</span>}<h1 id="home-billboard-title">{current.title}</h1><p>{current.text}</p><Link className="home-hero-cta" href={current.href} onClick={(event) => { if (suppressBannerClick.current) { event.preventDefault(); return; } if (current.category && onCategorySelect) { event.preventDefault(); onCategorySelect(current.category); return; } if (current.href === "#catalog" && onCatalogClick) { event.preventDefault(); onCatalogClick(); } }}><b>{current.cta}</b></Link></div>
    <div className="home-billboard-controls" aria-label={locale === "uk" ? "Керування банерами" : "Управление баннерами"}>
      <button type="button" onClick={previous} aria-label={locale === "uk" ? "Попередній банер" : "Предыдущий баннер"}>‹</button>
      <div>{billboards.map((item, index) => <button key={item.id} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`${locale === "uk" ? "Банер" : "Баннер"} ${index + 1}`} />)}</div>
      <button type="button" onClick={next} aria-label={locale === "uk" ? "Наступний банер" : "Следующий баннер"}>›</button>
    </div>
  </section>;
}
