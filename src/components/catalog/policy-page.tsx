"use client";

import Link from "next/link";
import { ProductHeader } from "@/components/catalog/product-header";
import { SiteFooter } from "@/components/catalog/site-footer";
import { StorePolicies } from "@/components/catalog/store-policies";
import { useStorefront } from "@/components/storefront/storefront-provider";

export function PolicyPage({ section }: { section: "delivery" | "returns" }) {
  const { locale } = useStorefront();
  const uk = locale === "uk";
  const title = section === "delivery" ? (uk ? "Доставка й оплата" : "Доставка и оплата") : (uk ? "Умови повернення" : "Условия возврата");
  return <>
    <ProductHeader />
    <main className="policy-page page-enter">
      <nav className="breadcrumbs" aria-label={uk ? "Навігація" : "Навигация"}><Link href="/">{uk ? "Головна" : "Главная"}</Link><span>›</span><span>{title}</span></nav>
      <header><span className="eyebrow">Heymom</span><h1>{title}</h1><p>{section === "delivery" ? (uk ? "Усі способи доставки та оплати в одному місці." : "Все способы доставки и оплаты в одном месте.") : (uk ? "Прозорі умови обміну, повернення й гарантії." : "Прозрачные условия обмена, возврата и гарантии.")}</p></header>
      <StorePolicies initialTab={section} />
    </main>
    <SiteFooter />
  </>;
}
