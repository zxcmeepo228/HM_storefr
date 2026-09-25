import Link from "next/link";

export default function NotFound() {
  return <main className="product-page">
    <p className="eyebrow">404</p>
    <h1>Сторінку не знайдено</h1>
    <p>Можливо, товар уже недоступний або посилання змінилося.</p>
    <Link className="detail-buy" href="/">Повернутися до каталогу</Link>
  </main>;
}
