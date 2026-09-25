import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const inputPath = path.resolve(process.argv.find((argument) => argument.startsWith("--input="))?.slice(8) ?? "src/catalog/data/heymom-products.uk.json");
const outputPath = path.resolve(process.argv.find((argument) => argument.startsWith("--output="))?.slice(9) ?? "src/catalog/data/heymom-reviews.ts");
const catalog = JSON.parse(await readFile(inputPath, "utf8"));

const ukrainianMonths = new Map([
  ["січня", 0], ["лютого", 1], ["березня", 2], ["квітня", 3], ["травня", 4], ["червня", 5],
  ["липня", 6], ["серпня", 7], ["вересня", 8], ["жовтня", 9], ["листопада", 10], ["грудня", 11],
]);

const cleanText = (value) => value.replace(/\s+/g, " ").trim();
const withoutHashAndTrailingSlash = (value) => new URL(value).href.replace(/#.*$/, "").replace(/\/$/, "");

function parseDate(value) {
  const match = cleanText(value).toLocaleLowerCase("uk-UA").match(/(\d{1,2})\s+([а-щьюяіїєґ]+)\s+(\d{4})/iu);
  if (!match) return null;
  const month = ukrainianMonths.get(match[2]);
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1]))).toISOString();
}

function extractReviews(html, product) {
  const $ = load(html);
  const seen = new Set();
  // У темі є сторонні списки коментарів у віджетах. Беремо тільки прямі
  // відгуки з product-comments конкретної PDP, а не всі li.comment сторінки.
  return $(".product-comments #comments > .commentlist > li.comment").map((_, element) => {
    const review = $(element);
    const name = cleanText(review.find(".author").first().text());
    const createdAt = parseDate(review.find("time").first().text());
    const ratingText = cleanText(review.find("strong.rating").first().text()) || review.find(".star-rating").first().attr("aria-label") || "";
    const rating = Number(ratingText.match(/[1-5]/)?.[0]);
    const commentUrl = review.find("a.comment-date").first().attr("href");
    const content = review.find(".comment-content").first().clone();
    content.find(".cld-like-dislike-wrap, .comment-reply-link, script, style").remove();
    const text = cleanText(content.text());
    const sourceCommentId = review.attr("id")?.replace(/^comment-/, "");
    // Навіть у product-comments оригінальна тема іноді показує агреговані
    // відгуки. Посилання дати містить справжню PDP коментаря, тож воно є
    // перевіркою, що запис належить саме цьому товару.
    if (!name || !createdAt || !rating || !text || !sourceCommentId || !commentUrl || withoutHashAndTrailingSlash(commentUrl) !== withoutHashAndTrailingSlash(product.sourceUrl) || seen.has(sourceCommentId)) return null;
    seen.add(sourceCommentId);
    return {
      id: `heymom-${sourceCommentId}`,
      productId: product.id,
      name,
      rating,
      text,
      createdAt,
      status: "published",
      sourceUrl: product.sourceUrl,
    };
  }).get().filter(Boolean);
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

const products = catalog.products.map((product) => ({ id: product.id, sourceUrl: product.attributes?.sourceUrl })).filter((product) => typeof product.sourceUrl === "string");
const imported = await mapWithConcurrency(products, 4, async (product) => {
  try {
    const response = await fetch(product.sourceUrl, { headers: { "User-Agent": "HeymomHeadlessReviewsImporter/1.0" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const reviews = extractReviews(await response.text(), product);
    console.log(`${product.id}: ${reviews.length} відгуків`);
    return reviews;
  } catch (error) {
    console.warn(`${product.id}: не вдалося отримати відгуки (${error.message})`);
    return [];
  }
});

const reviews = imported.flat().sort((a, b) => a.productId.localeCompare(b.productId, "uk") || b.createdAt.localeCompare(a.createdAt));
const duplicateIds = reviews.filter((review, index) => reviews.findIndex((item) => item.id === review.id) !== index);
if (duplicateIds.length) throw new Error(`Знайдено дублікати ID відгуків: ${duplicateIds.map((review) => review.id).join(", ")}`);

const output = `import type { CmsReview } from "@/admin/local-cms";\n\n// Дослівні відгуки з публічних PDP heymom.com.ua. Оновлено: ${new Date().toISOString().slice(0, 10)}.\n// sourceUrl і ID оригінального коментаря дають змогу перевірити кожен запис і не створювати дублікати.\nexport const verifiedHeymomReviews: CmsReview[] = ${JSON.stringify(reviews, null, 2)};\n`;
await writeFile(outputPath, output, "utf8");
console.log(`Імпортовано ${reviews.length} відгуків для ${new Set(reviews.map((review) => review.productId)).size} товарів у ${outputPath}`);
