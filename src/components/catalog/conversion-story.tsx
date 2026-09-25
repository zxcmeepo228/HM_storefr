"use client";

import type { Product } from "@/catalog/types";

type Props = { product: Product; locale: "uk" | "ru" };

const ignoredAttributeKeys = /^(source(url)?|reviews|reviewcount)$/i;

export function ConversionStory({ product, locale }: Props) {
  const uk = locale === "uk";
  const facts = Object.entries(product.attributes ?? {})
    .filter(([key, value]) => !ignoredAttributeKeys.test(key) && Boolean(value))
    .slice(0, 4);
  const visual = product.descriptionImages?.[0] ?? product.images?.[1] ?? product.images?.[0];
  const scrollToPurchase = () => document.querySelector<HTMLElement>("[data-primary-purchase]")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return <section className="conversion-story" aria-label={uk ? "Переваги товару" : "Преимущества товара"}>
    <div className="story-intro">
      <p className="story-eyebrow">{uk ? "СТВОРЕНО ДЛЯ СПОКІЙНОГО ВИБОРУ" : "СОЗДАНО ДЛЯ СПОКОЙНОГО ВЫБОРА"}</p>
      <h2>{uk ? "Все важливе про товар — без зайвого пошуку" : "Всё важное о товаре — без лишнего поиска"}</h2>
      <p>{uk ? `Ми зібрали ключову інформацію про «${product.title}», щоб ви могли впевнено визначитися перед замовленням.` : `Мы собрали ключевую информацию о «${product.title}», чтобы вы могли уверенно определиться перед заказом.`}</p>
    </div>

    <div className="story-split">
      {visual && <div className="story-image"><img src={visual} alt={product.title} loading="lazy" /></div>}
      <div className="story-benefits">
        <p className="story-kicker">{uk ? "ЩО ВИ ОТРИМУЄТЕ" : "ЧТО ВЫ ПОЛУЧАЕТЕ"}</p>
        <h3>{product.title}</h3>
        {product.shortDescription && <p className="story-lead">{product.shortDescription}</p>}
        {facts.length > 0 && <dl className="story-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        <button className="story-cta" onClick={scrollToPurchase}>{uk ? "Обрати товар" : "Выбрать товар"}<span>→</span></button>
      </div>
    </div>

    <div className="story-steps">
      <div><b>01</b><h3>{uk ? "Обираєте" : "Выбираете"}</h3><p>{uk ? "Перегляньте фото, опис і характеристики у зручному темпі." : "Посмотрите фото, описание и характеристики в удобном темпе."}</p></div>
      <div><b>02</b><h3>{uk ? "Замовляєте" : "Заказываете"}</h3><p>{uk ? "Додайте товар у кошик або залиште заявку в 1 клік." : "Добавьте товар в корзину или оставьте заявку в 1 клик."}</p></div>
      <div><b>03</b><h3>{uk ? "Отримуєте" : "Получаете"}</h3><p>{uk ? "Надішлемо замовлення, створені до 19:00, того ж дня." : "Отправим заказы, созданные до 19:00, в тот же день."}</p></div>
    </div>

    <div className="story-reassurance">
      <div><span>✓</span><p><strong>{uk ? "14 днів на обмін і повернення" : "14 дней на обмен и возврат"}</strong><small>{uk ? "Якщо товар не був у використанні та збережено товарний вигляд." : "Если товар не был в использовании и сохранён товарный вид."}</small></p></div>
      <div><span>✓</span><p><strong>{uk ? "Офіційна гарантія" : "Официальная гарантия"}</strong><small>{product.warrantyMonths ? (uk ? `${product.warrantyMonths} міс. гарантії для цього товару.` : `${product.warrantyMonths} мес. гарантии для этого товара.`) : (uk ? "Умови гарантії вказані у характеристиках товару." : "Условия гарантии указаны в характеристиках товара.")}</small></p></div>
      <div><span>✓</span><p><strong>{uk ? "Оплата зручним способом" : "Оплата удобным способом"}</strong><small>{uk ? "Онлайн, при отриманні або частинами — оберіть під час оформлення." : "Онлайн, при получении или частями — выберите при оформлении."}</small></p></div>
    </div>

    <div className="story-faq">
      <div><p className="story-kicker">{uk ? "ВІДПОВІДІ ПЕРЕД ЗАМОВЛЕННЯМ" : "ОТВЕТЫ ПЕРЕД ЗАКАЗОМ"}</p><h3>{uk ? "Залишилися питання?" : "Остались вопросы?"}</h3></div>
      <div className="story-faq-list">
        <details><summary>{uk ? "Коли відправите замовлення?" : "Когда отправите заказ?"}</summary><p>{uk ? "Замовлення, створені до 19:00, передаємо в доставку того ж дня." : "Заказы, созданные до 19:00, передаём в доставку в тот же день."}</p></details>
        <details><summary>{uk ? "Чи можлива оплата частинами?" : "Можно ли оплатить частями?"}</summary><p>{uk ? "Так. Під час оформлення можна обрати оплату частинами, якщо вона доступна для вашого банку." : "Да. При оформлении можно выбрать оплату частями, если она доступна для вашего банка."}</p></details>
        <details><summary>{uk ? "Що робити, якщо товар не підійшов?" : "Что делать, если товар не подошёл?"}</summary><p>{uk ? "Ви можете звернутися щодо обміну або повернення протягом 14 днів, якщо товар не використовувався." : "Вы можете обратиться по поводу обмена или возврата в течение 14 дней, если товар не использовался."}</p></details>
        <details><summary>{uk ? "Як діє гарантія?" : "Как действует гарантия?"}</summary><p>{product.warrantyMonths ? (uk ? `Для цього товару передбачена гарантія ${product.warrantyMonths} міс. Деталі будуть у документах до замовлення.` : `Для этого товара предусмотрена гарантия ${product.warrantyMonths} мес. Детали будут в документах к заказу.`) : (uk ? "Умови гарантії для товару вказані в його характеристиках." : "Условия гарантии для товара указаны в его характеристиках.")}</p></details>
      </div>
    </div>
  </section>;
}
