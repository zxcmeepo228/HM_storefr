import type { Filter, Product } from "@/catalog/types";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { getUiCopy } from "@/lib/ui-copy";
import { categoryKey, categoryLabels, displayCategoryLabel } from "@/catalog/category-label";

type Props = {
  products: Product[];
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
};

export function ProductFilters({ products, filters, onChange, mobileOpen = false, onClose }: Props) {
  const { locale } = useStorefront();
  const copy = getUiCopy(locale);
  const selectedCategory = filters.find((filter) => filter.key === "category")?.value ?? "";
  const categories = [...new Set(products.flatMap((product) => categoryLabels(product.category)))].sort();
  const selectCategory = (category: string) => {
    onChange(category ? [{ key: "category", value: category }] : []);
    onClose?.();
  };

  const filterContent = (withCloseButton: boolean) => <>
    <div className="filters-title">
      <h2>{copy.categories}</h2>
      {withCloseButton && <button className="filters-close" type="button" onClick={onClose} aria-label="Закрити">×</button>}
    </div>
    <button type="button" className={!selectedCategory ? "selected" : ""} onClick={() => selectCategory("")}>{copy.allProducts} <span>{products.length}</span></button>
    {categories.map((category) => <button type="button" key={category} className={categoryKey(selectedCategory) === categoryKey(category) ? "selected" : ""} onClick={() => selectCategory(category)}>{displayCategoryLabel(category, locale)} <span>{products.filter((product) => categoryLabels(product.category).includes(category)).length}</span></button>)}
  </>;

  return <>
    <aside className="filters" aria-label={copy.categories}>{filterContent(false)}</aside>
    {mobileOpen && <div className="mobile-filter-layer" role="dialog" aria-modal="true" aria-label={copy.categories}>
      <button className="mobile-filter-backdrop" type="button" onClick={onClose} aria-label="Закрити меню категорій" />
      <aside className="filters mobile-filter-panel" id="mobile-category-filter" aria-label={copy.categories}>{filterContent(true)}</aside>
    </div>}
  </>;
}
