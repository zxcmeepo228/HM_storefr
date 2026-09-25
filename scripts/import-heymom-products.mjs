import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const language = process.argv.find((argument) => argument.startsWith("--lang="))?.slice(7) ?? "ru";
if (!new Set(["ru", "uk"]).has(language)) throw new Error("Підтримуються лише --lang=ru та --lang=uk");
const siteUrl = "https://heymom.com.ua";
const baseUrl = language === "uk" ? `${siteUrl}/uk` : siteUrl;
// --output дає змогу зібрати актуальний snapshot для аудиту без перезапису
// робочого каталогу або локальних CMS-правок.
const requestedOutput = process.argv.find((argument) => argument.startsWith("--output="))?.slice(9);
const outputPath = path.resolve(requestedOutput ?? (language === "uk" ? "src/catalog/data/heymom-products.uk.json" : "src/catalog/data/heymom-products.json"));

const fetchText = async (url) => {
  const response = await fetch(url, { headers: { "User-Agent": "HeymomHeadlessCatalogImporter/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
};

const absoluteUrl = (url) => new URL(url, siteUrl).href;
const toNumber = (text) => Number((text ?? "").replace(/[^0-9,]/g, "").replace(",", "."));
const decodeHtml = (value) => load(`<span>${value}</span>`)("span").text().trim();

function extractCards(html) {
  const $ = load(html);
  return $("li.product").map((_, element) => {
    const card = $(element);
    const link = card.find("a.woocommerce-LoopProduct-link").first().attr("href");
    const id = /post-(\d+)/.exec(card.attr("class") ?? "")?.[1];
    const price = toNumber(card.find(".price ins .woocommerce-Price-amount").first().text() || card.find(".price .woocommerce-Price-amount").first().text());
    const oldPrice = toNumber(card.find(".price del .woocommerce-Price-amount").first().text());
    if (!id || !link || !Number.isFinite(price)) return null;

    return {
      id,
      title: decodeHtml(card.find(".woocommerce-loop-product__title").first().text()),
      slug: new URL(link).pathname.split("/").filter(Boolean).pop(),
      link: absoluteUrl(link),
      price,
      ...(Number.isFinite(oldPrice) && oldPrice > price ? { oldPrice } : {}),
      inStock: card.hasClass("instock"),
      category: decodeHtml(card.find(".loop-product-categories").first().text()) || "Інше",
      cardImages: card.find(".product-thumbnail img").map((__, image) => absoluteUrl($(image).attr("src"))).get(),
    };
  }).get().filter(Boolean);
}

async function fetchCatalogCards() {
  const products = [];
  let pageUrl = `${baseUrl}/shop/`;
  const visited = new Set();

  while (pageUrl && !visited.has(pageUrl)) {
    visited.add(pageUrl);
    const html = await fetchText(pageUrl);
    const cards = extractCards(html);
    if (!cards.length) throw new Error(`Не знайдено товарних карток: ${pageUrl}`);
    products.push(...cards);
    const $ = load(html);
    const next = $(".woocommerce-pagination a.next, .woocommerce-pagination a[rel='next']").first().attr("href");
    pageUrl = next ? absoluteUrl(next) : null;
  }
  return [...new Map(products.map((product) => [product.id, product])).values()];
}

async function fetchProductDetails(product) {
  try {
    const html = await fetchText(product.link);
    const $ = load(html);
    const gallery = $(".woocommerce-product-gallery");
    const isImageUrl = (url) => /\.(?:avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(url);
    const galleryLinks = gallery.find("a[href]").map((_, link) => absoluteUrl($(link).attr("href"))).get().filter(isImageUrl);
    const galleryImages = gallery.find("img").map((_, image) => {
      const source = $(image).attr("data-large_image") || $(image).attr("data-src") || $(image).attr("src");
      return source ? absoluteUrl(source) : "";
    }).get().filter(isImageUrl);
    // Беремо лише зображення з галереї конкретної сторінки товару. WP media?parent
    // виявився ненадійним: у частини записів він віддає вкладення інших товарів.
    const images = [...new Set([...galleryLinks, ...galleryImages])];
    const sku = $(".sku").first().text().replace(/\s+/g, " ").trim();
    let descriptionBlock = $("#tab-description, .woocommerce-Tabs-panel--description").first();
    if (!descriptionBlock.length) descriptionBlock = $(".woocommerce-product-details__short-description").first();
    const shortDescriptionBlock = $(".woocommerce-product-details__short-description").first();
    const cleanDescriptionBlock = descriptionBlock.clone();
    cleanDescriptionBlock.find(".product-tabs__heading, .product-about__description > .product-tabs__heading").remove();
    const description = cleanDescriptionBlock.text().replace(/\s+/g, " ").trim();
    const descriptionHtml = cleanDescriptionBlock.html()?.trim() ?? "";
    const shortDescription = shortDescriptionBlock.text().replace(/\s+/g, " ").trim();
    const shortDescriptionHtml = shortDescriptionBlock.html()?.trim() ?? "";
    const descriptionImages = [...new Set(descriptionBlock.find("img").map((_, image) => {
      const source = $(image).attr("data-large_image") || $(image).attr("data-src") || $(image).attr("src");
      return source && isImageUrl(source) ? absoluteUrl(source) : "";
    }).get().filter(Boolean))];
    const pageText = $.root().text().replace(/\s+/g, " ");
    // На оригінальних сторінках гарантія показується окремим сервісним блоком,
    // а не завжди у таблиці характеристик. Беремо строк тільки з цієї сторінки.
    const warrantyMatch = pageText.match(/Гаранті[яї]\s*(?:[:\-–—]\s*)?(\d{1,2})\s*(?:міс(?:\.|яц(?:ів|і)?)?|months?)/iu);
    const attributes = {};
    if (sku) attributes["Артикул"] = sku;
    // WooCommerce uses several equivalent table/class variants depending on the theme.
    // Keep the complete source rows instead of relying on one theme-specific selector.
    $(".woocommerce-product-attributes tr, table.shop_attributes tr, .shop_attributes tr, [class*='product-attribute'] tr").each((_, row) => {
      const key = $(row).find("th, .woocommerce-product-attributes-item__label, .attribute-label, dt").first().text().replace(/\s+/g, " ").trim();
      const value = $(row).find("td, .woocommerce-product-attributes-item__value, .attribute-value, dd").first().text().replace(/\s+/g, " ").trim();
      if (key && value) attributes[key] = value;
    });
    $(".woocommerce-product-attributes-item, .product-attributes__item, .product-attribute").each((_, row) => {
      const key = $(row).find("th, .woocommerce-product-attributes-item__label, .attribute-label, dt, .label").first().text().replace(/\s+/g, " ").trim();
      const value = $(row).find("td, .woocommerce-product-attributes-item__value, .attribute-value, dd, .value").first().text().replace(/\s+/g, " ").trim();
      if (key && value) attributes[key] = value;
    });
    // Heymom's current theme stores characteristics as alternating dt/dd pairs.
    $(".product-characteristics__list, .product-about__characteristics dl").each((_, list) => {
      let key = "";
      $(list).children("dt, dd").each((__, item) => {
        const text = $(item).text().replace(/\s+/g, " ").trim();
        if ($(item).is("dt")) key = text;
        else if (key && text) { attributes[key] = text; key = ""; }
      });
    });
    return { images: images.length ? images : product.cardImages, descriptionImages, descriptionHtml, shortDescription, shortDescriptionHtml, attributes, description: description || product.title, ...(warrantyMatch ? { warrantyMonths: Number(warrantyMatch[1]) } : {}) };
  } catch (error) {
    console.warn(`Не вдалося отримати галерею ${product.slug}; використано фото картки.`, error.message);
    return { images: product.cardImages, descriptionImages: [], descriptionHtml: "", shortDescription: "", shortDescriptionHtml: "", attributes: {}, description: product.title };
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const result = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await mapper(items[index]);
    }
  }));
  return result;
}

const cards = await fetchCatalogCards();
const products = await mapWithConcurrency(cards, 5, async (product) => {
  const details = await fetchProductDetails(product);
  return {
    id: product.id,
    title: product.title,
    description: details.description,
    ...(details.descriptionHtml ? { descriptionHtml: details.descriptionHtml } : {}),
    ...(details.shortDescription ? { shortDescription: details.shortDescription } : {}),
    ...(details.shortDescriptionHtml ? { shortDescriptionHtml: details.shortDescriptionHtml } : {}),
    slug: product.slug,
    price: product.price,
    ...(product.oldPrice ? { oldPrice: product.oldPrice } : {}),
    ...(details.warrantyMonths ? { warrantyMonths: details.warrantyMonths } : {}),
    inStock: product.inStock,
    category: product.category,
    images: details.images,
    ...(details.descriptionImages.length ? { descriptionImages: details.descriptionImages } : {}),
    attributes: { ...details.attributes, sourceUrl: product.link, source: "heymom.com.ua" },
  };
});

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ products }, null, 2)}\n`, "utf8");
console.log(`Імпортовано ${products.length} товарів (${language}) у ${outputPath}`);
