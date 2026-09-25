import type { MetadataRoute } from "next";
import products from "@/catalog/data/heymom-products.uk.json";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const generatedAt = new Date();

  return [
    { url: absoluteUrl(), lastModified: generatedAt, changeFrequency: "daily", priority: 1 },
    ...products.products.filter((product) => product.slug).map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: generatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
