import { productCatalogSchema } from "./schema";
import type { Product, ProductCatalog } from "./types";

const items = [
  ["Інгалятор (небулайзер) ArhiMED MESH Pro", "Небулайзери (інгалятори)", "https://heymom.com.ua/wp-content/uploads/2024/11/pro-new-300x300.jpg"],
  ["Безконтактний термометр ArhiMED Ecotherm ST350", "Термометри", "https://heymom.com.ua/wp-content/uploads/2020/09/350-new-300x300.jpg"],
  ["Аспіратор електронний назальний ArhiMED EcoBreath XS", "Аспіратори", "https://heymom.com.ua/wp-content/uploads/2025/03/xs-new-300x300.jpg"],
  ["Фотоепілятор ArhiMED IPL PRO", "Фотоепілятори", "https://heymom.com.ua/wp-content/uploads/2021/07/IMG_2259-300x300.png"],
  ["Ультразвуковий фетальний допплер ArhiMED Sensitive S6", "Фетальні допплери", "https://heymom.com.ua/wp-content/uploads/2024/10/sens-new-300x300.jpg"],
  ["Ультразвуковий скрабер ArhiMED PureGlide S7", "Апарати для чищення обличчя", "https://heymom.com.ua/wp-content/uploads/2022/01/9C5BEB2E-6717-40EE-9BBB-352B3A5C3712-300x300.jpg"],
] as const;
const colors = ["Білий", "Блакитний", "Рожевий", "Сірий"];

/** Генерує значення тільки для властивостей, описаних у JCOS. */
export function createMockCatalog(count = 18): ProductCatalog {
  const fields = productCatalogSchema.properties.products.items.properties;
  const products = Array.from({ length: count }, (_, index) => {
    const id = String(index + 1);
    const [title, category, image] = items[index % items.length];
    const price = 1199 + ((index * 173) % 10) * 100;
    const product: Record<string, unknown> = {};

    for (const key of Object.keys(fields)) {
      switch (key) {
        case "id": product[key] = id; break;
        case "title": product[key] = title; break;
        case "slug": product[key] = `${title.toLowerCase().replaceAll(" ", "-")}-${id}`; break;
        case "price": product[key] = price; break;
        case "oldPrice": product[key] = index % 3 === 0 ? price + 300 : undefined; break;
        case "inStock": product[key] = index % 5 !== 0; break;
        case "category": product[key] = category; break;
        case "images": product[key] = [image]; break;
        case "attributes": product[key] = { Колір: colors[index % colors.length], Виробник: "ArhiMED", Гарантія: "12 місяців" }; break;
      }
    }
    return product as Product;
  });

  return { products };
}
