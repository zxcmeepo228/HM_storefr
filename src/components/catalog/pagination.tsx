type Props = { current: number; total: number; onChange: (page: number) => void };
export function Pagination({ current, total, onChange }: Props) {
  if (total < 2) return null;
  return <nav className="pagination" aria-label="Пагінація">{Array.from({ length: total }, (_, index) => <button key={index} className={current === index + 1 ? "active" : ""} onClick={() => onChange(index + 1)} aria-current={current === index + 1 ? "page" : undefined}>{String(index + 1).padStart(2, "0")}</button>)}</nav>;
}
