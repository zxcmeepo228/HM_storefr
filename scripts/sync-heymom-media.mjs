import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const input = process.argv.find((argument) => argument.startsWith("--input="))?.slice(8) ?? "src/catalog/data/heymom-products.json";
const catalogPath = path.resolve(input);
const mediaDirectory = path.resolve("public/media/products");
const concurrency = 6;

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const isImageUrl = (url) => /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url);
const htmlImageUrls = (html = "") => (html.match(/https?:\/\/[^"' )]+/g) ?? []).map((url) => url.replace(/&amp;/g, "&")).filter(isImageUrl);
const remoteUrls = [...new Set(catalog.products.flatMap((product) => [
  ...product.images,
  ...(product.descriptionImages ?? []),
  ...htmlImageUrls(product.descriptionHtml),
  ...htmlImageUrls(product.shortDescriptionHtml),
]).filter((url) => /^https?:\/\//.test(url)))];

if (remoteUrls.length === 0) {
  console.log("Усі зображення вже локальні.");
  process.exit(0);
}

await mkdir(mediaDirectory, { recursive: true });

function targetFor(url) {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname).toLowerCase();
  const safeExtension = /^\.(avif|gif|jpe?g|png|webp)$/.test(extension) ? extension : ".jpg";
  const hash = createHash("sha256").update(url).digest("hex");
  return path.join(mediaDirectory, `${hash}${safeExtension}`);
}

function publicPath(url) {
  return `/media/products/${path.basename(targetFor(url))}`;
}

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function download(url) {
  const target = targetFor(url);
  if (await exists(target)) return { url, local: publicPath(url), cached: true };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "HeymomHeadlessMediaSync/1.0" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await writeFile(target, new Uint8Array(await response.arrayBuffer()));
      return { url, local: publicPath(url), cached: false };
    } catch (error) {
      lastError = error;
    }
  }
  return { url, error: lastError instanceof Error ? lastError.message : String(lastError) };
}

const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor < remoteUrls.length) {
    const index = cursor++;
    const result = await download(remoteUrls[index]);
    results[index] = result;
    if ((index + 1) % 50 === 0 || index + 1 === remoteUrls.length) console.log(`Оброблено ${index + 1}/${remoteUrls.length}`);
  }
}));

const localByRemoteUrl = new Map(results.filter((result) => result.local).map((result) => [result.url, result.local]));
const failures = results.filter((result) => result.error);
const permanentlyMissing = new Set(failures.filter((failure) => failure.error?.startsWith("HTTP 404")).map((failure) => failure.url));
for (const product of catalog.products) {
  product.images = product.images.map((url) => localByRemoteUrl.get(url) ?? url).filter((url) => !permanentlyMissing.has(url));
  if (product.descriptionImages) product.descriptionImages = product.descriptionImages.map((url) => localByRemoteUrl.get(url) ?? url).filter((url) => !permanentlyMissing.has(url));
  if (product.descriptionHtml) {
    for (const [remote, local] of localByRemoteUrl) product.descriptionHtml = product.descriptionHtml.split(remote).join(local);
  }
  if (product.shortDescriptionHtml) {
    for (const [remote, local] of localByRemoteUrl) product.shortDescriptionHtml = product.shortDescriptionHtml.split(remote).join(local);
  }
}
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

console.log(`Локально збережено: ${localByRemoteUrl.size}/${remoteUrls.length}.`);
if (failures.length) {
  console.error(`Не вдалося завантажити ${failures.length} файлів:`);
  failures.slice(0, 20).forEach((failure) => console.error(`${failure.url}: ${failure.error}`));
  process.exitCode = 1;
}
