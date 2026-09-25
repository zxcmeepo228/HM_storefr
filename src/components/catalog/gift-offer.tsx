import type { Product } from "@/catalog/types";

type Props = { product: Product; products: Product[]; locale: "uk" | "ru" };

/** The gift is already shown as a dedicated offer card. */
export function withoutGiftHeading(html?: string) {
  if (!html) return html;
  return html.replace(/<h2\b[^>]*>[\s\S]*?(?:подар|гідрогел|гидрогел|узд\s*гел|gift)[\s\S]*?<\/h2>/gi, "");
}

export function GiftOffer({ product, products, locale }: Props) {
  const manualGift = product.giftProductId ? products.find((item) => item.id === product.giftProductId) : undefined;
  if (manualGift?.images?.[0]) return <section className="gift-offer" aria-label={locale === "uk" ? "Подарунок до товару" : "Подарок к товару"}>
    <img src={manualGift.images[0]} alt="" /><div><strong>{locale === "uk" ? "Подарунок" : "Подарок"}</strong><p>{manualGift.title}</p><div><s>{manualGift.price.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</s><b>{locale === "uk" ? "Безкоштовно" : "Бесплатно"}</b></div></div>
  </section>;
  const title = `${product.title} ${product.description ?? ""}`;
  if (!/подар|gift/i.test(title)) return null;
  const giftPattern = /гідрогел|гидрогел|hydrogel/i.test(title)
    ? /гидрогел.*30\s*мл|гідрогел.*30\s*мл|hydrogel.*30/i
    : /узд\s*гел|узи\s*гел/i.test(title)
      ? /узд\s*гел.*30\s*мл|узи\s*гел.*30\s*мл/i
      : /gentle\s*s3|пакет.*молока.*подар/i.test(title)
        ? /пакет.*молока.*250.*30|pakety.*moloka.*30/i
        : null;
  if (!giftPattern) return null;
  const gift = products.find((item) => giftPattern.test(item.title) && item.id !== product.id);
  if (!gift?.images?.[0]) return null;

  return <section className="gift-offer" aria-label={locale === "uk" ? "Подарунок до товару" : "Подарок к товару"}>
    <img src={gift.images[0]} alt="" />
    <div><strong>{locale === "uk" ? "Подарунок" : "Подарок"}</strong><p>{gift.title}</p><div><s>{gift.price.toLocaleString(locale === "uk" ? "uk-UA" : "ru-RU")} ₴</s><b>{locale === "uk" ? "Безкоштовно" : "Бесплатно"}</b></div></div>
  </section>;
}
