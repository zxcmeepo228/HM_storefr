const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heymom.com.ua";

export const siteUrl = rawSiteUrl.replace(/\/$/, "");
export const siteName = "Heymom";

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteUrl}/`).toString();
}
