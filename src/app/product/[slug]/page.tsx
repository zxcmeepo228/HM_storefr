import type { Metadata } from "next";
import products from "@/catalog/data/heymom-products.uk.json";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, siteName } from "@/lib/site";
import { ProductPageClient } from "./product-page-client";

type PageProps = { params: Promise<{ slug: string }> };

function getProduct(slug: string) { return products.products.find((product) => product.slug === slug); }
function compactDescription(value: string | undefined, fallback: string) {
  const plainText = (value ?? fallback).replace(/\s+/g, " ").trim();
  return plainText.length > 155 ? `${plainText.slice(0, 152).trimEnd()}…` : plainText;
}

export function generateStaticParams() { return products.products.filter((product) => product.slug).map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Товар не знайдено" };
  const description = compactDescription(product.description, product.title);
  const canonical = `/product/${product.slug}`;
  return { title: product.title, description, alternates: { canonical }, openGraph: { type: "website", url: canonical, title: `${product.title} | ${siteName}`, description, images: product.images?.[0] ? [{ url: product.images[0], alt: product.title }] : [] } };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProduct(slug);
  // У API Mode товар може існувати лише у підключеному бекенді, тому клієнтська
  // частина має шанс завантажити його замість передчасного 404 зі snapshot-у.
  if (!product) return <ProductPageClient />;
  const description = compactDescription(product.description, product.title);
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Product", name: product.title, description, image: product.images?.map((image) => absoluteUrl(image)), sku: product.attributes?.["Артикул"] ?? product.id, category: product.category, url: absoluteUrl(`/product/${product.slug}`), brand: { "@type": "Brand", name: siteName } }} />
    <ProductPageClient />
  </>;
}
