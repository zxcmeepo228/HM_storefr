# Публікація фронтенду Heymom

Цей проєкт готовий до двох режимів — вони перемикаються **лише змінними середовища** в панелі хостингу.

## 1. Без бекенду: автономний каталог

Залиште такі значення. Сайт працює з перевіреним локальним знімком товарів і фото.

```env
NEXT_PUBLIC_CATALOG_MODE=mock
NEXT_PUBLIC_CATALOG_PROVIDER=heymom-snapshot
NEXT_PUBLIC_CATALOG_ENDPOINT=/catalog
NEXT_PUBLIC_SITE_URL=https://ваш-домен.com.ua
NEXT_PUBLIC_QUICK_ORDER_ENDPOINT=https://api.ваш-домен.com.ua/orders/quick
NEXT_PUBLIC_ORDER_ENDPOINT=https://api.ваш-домен.com.ua/orders
```

## 2. З вашим бекендом

Бекенд має віддавати `GET /catalog` у JCOS-форматі цього проєкту: `{ "products": [...] }`.

```env
NEXT_PUBLIC_CATALOG_MODE=api
NEXT_PUBLIC_CATALOG_PROVIDER=contract
NEXT_PUBLIC_API_URL=https://api.ваш-домен.com.ua
NEXT_PUBLIC_CATALOG_ENDPOINT=/catalog
NEXT_PUBLIC_SITE_URL=https://ваш-домен.com.ua
```

Після збереження змінних натисніть **Redeploy**. Якщо API тимчасово недоступний, сайт не падає: він покаже локальний каталог.

> Якщо ваш бекенд повертає інші поля, ніж JCOS, потрібно один раз додати маленький transform у `src/catalog/providers/`. Це свідомий захист: фронтенд не показує зламані або неповні дані.

## Vercel — найпростіший варіант

1. Завантажте цей проєкт у GitHub.
2. На Vercel натисніть **Add New → Project** та виберіть репозиторій.
3. Vercel сам визначить Next.js. Нічого в Build Command не змінюйте.
4. У **Settings → Environment Variables** вставте чотири змінні з одного блоку вище.
5. Натисніть **Deploy** і в розділі **Domains** підключіть свій домен.

## Будь-який хостинг із Docker

У корені є готовий `Dockerfile`. Оберіть Docker/Container deployment, вкажіть корінь репозиторію та додайте ті самі Environment Variables. Контейнер слухає порт `3000`.

## Перевірка після публікації

Відкрийте:

- `/api/health` — має повернути `status: ok` і потрібний `catalogMode`;
- `/robots.txt`;
- `/sitemap.xml`;
- будь-яку сторінку товару.

Не вводьте приватні ключі або паролі в `NEXT_PUBLIC_*`: вони видимі у браузері. Для секретних ключів потрібен серверний бекенд або API-route.

## Контракт заявки «Купити в 1 клік»

`NEXT_PUBLIC_QUICK_ORDER_ENDPOINT` отримує `POST` JSON такого вигляду:

```json
{
  "type": "quick-order",
  "customer": { "fullName": "Ім'я Прізвище", "phone": "+380…", "email": "name@example.com" },
  "product": { "id": "…", "title": "…", "slug": "…", "price": 0, "quantity": 1 }
}
```

Ваш бекенд має повернути успішний HTTP-статус `200–299`. Якщо endpoint не заданий, форма нічого не відправляє менеджеру — вона лише працює як локальна демонстрація.
