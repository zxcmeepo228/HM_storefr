import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { load } from "cheerio";

const input = process.argv.find((argument) => argument.startsWith("--input="))?.slice(8) ?? "src/catalog/data/heymom-products.json";
const catalogPath = path.resolve(input);
const mediaDirectory = path.resolve("public/media/products");
const baseUrl = "https://heymom.com.ua";
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

const absoluteUrl = (url) => new URL(url, baseUrl).href;
const isImageUrl = (url) => /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(url);
const localPathFor = (url) => {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  const safeExtension = /^\.(avif|gif|jpe?g|png|webp)$/.test(extension) ? extension : ".jpg";
  const hash = createHash("sha256").update(url).digest("hex");
  return `/media/products/${hash}${safeExtension}`;
};

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function originalGallery(url) {
  const response = await fetch(url, { headers: { "User-Agent": "HeymomHeadlessCatalogAudit/1.0" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const $ = load(await response.text());
  const gallery = $(".woocommerce-product-gallery");
  const links = gallery.find("a[href]").map((_, element) => absoluteUrl($(element).attr("href"))).get().filter(isImageUrl);
  const images = gallery.find("img").map((_, element) => {
    const source = $(element).attr("data-large_image") || $(element).attr("data-src") || $(element).attr("src");
    return source ? absoluteUrl(source) : "";
  }).get().filter(isImageUrl);
  return [...new Set([...links, ...images])];
}

const errors = [];
const ids = new Set();
const slugs = new Set();
for (const product of catalog.products) {
  if (ids.has(product.id)) errors.push(`${product.slug}: дубльований id`);
  if (slugs.has(product.slug)) errors.push(`${product.slug}: дубльований slug`);
  ids.add(product.id);
  slugs.add(product.slug);
  if (!product.images.length) errors.push(`${product.slug}: немає зображень`);
  for (const image of product.images) {
    if (!image.startsWith("/media/products/")) errors.push(`${product.slug}: нелокальне зображення ${image}`);
    if (!await exists(path.join(process.cwd(), "public", image))) errors.push(`${product.slug}: відсутній файл ${image}`);
  }
}

let cursor = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < catalog.products.length) {
    const product = catalog.products[cursor++];
    try {
      const sourceUrl = product.attributes?.sourceUrl;
      const remoteImages = await originalGallery(sourceUrl);
      if (!remoteImages.length) errors.push(`${product.slug}: оригінальна сторінка не містить галереї`);
      const expected = remoteImages.map(localPathFor);
      if (expected.length && JSON.stringify(product.images) !== JSON.stringify(expected)) errors.push(`${product.slug}: локальна галерея не збігається з оригіналом`);
    } catch (error) {
      errors.push(`${product.slug}: не вдалося перевірити оригінал (${error.message})`);
    }
  }
}));

if (errors.length) {
  console.error(`Аудит не пройдено: ${errors.length} проблем(и).`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const imageCount = catalog.products.reduce((total, product) => total + product.images.length, 0);
  console.log(`Аудит пройдено: ${catalog.products.length} товарів, ${imageCount} фото, усі галереї збігаються з оригінальними сторінками.`);
}
