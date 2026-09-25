"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/catalog/types";
import { trackConversion } from "@/lib/conversion-pipeline";

type CartLine = Product & { quantity: number; checkoutUpsellOrderDiscountPercent?: number };
type LegacyDiscountedCartLine = CartLine & { checkoutUpsellOriginalPrice?: number; checkoutUpsellDiscountPercent?: number };
type AddToCartOptions = { checkoutUpsellOrderDiscountPercent?: number };
export type StorefrontLocale = "uk" | "ru";

type StorefrontContextValue = {
  cart: CartLine[];
  favorites: string[];
  locale: StorefrontLocale;
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  favoritesOpen: boolean;
  /** True after cart, language and favourites are restored from this browser. */
  isReady: boolean;
  addToCart: (product: Product, options?: AddToCartOptions) => void;
  addBundleToCart: (products: Product[], bundleTitle: string, bundlePrice: number) => void;
  openCart: () => void;
  closeCart: () => void;
  openFavorites: () => void;
  closeFavorites: () => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  /** Updates stored product snapshots after the catalog is loaded in another locale. */
  syncCartProducts: (products: Product[]) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  setLocale: (locale: StorefrontLocale) => void;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);
const CART_KEY = "heymom-cart";
const FAVORITES_KEY = "heymom-favorites";
const LOCALE_KEY = "heymom-locale";

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [locale, setLocale] = useState<StorefrontLocale>("uk");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const savedCart = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]") as LegacyDiscountedCartLine[];
      // Restore regular prices from the previous per-item checkout discount format.
      setCart(savedCart.map(({ checkoutUpsellOriginalPrice, checkoutUpsellDiscountPercent: _legacyDiscount, ...line }) => ({ ...line, price: typeof checkoutUpsellOriginalPrice === "number" ? checkoutUpsellOriginalPrice : line.price })));
      setFavorites(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]"));
      const savedLocale = window.localStorage.getItem(LOCALE_KEY);
      if (savedLocale === "uk" || savedLocale === "ru") setLocale(savedLocale);
    } catch {
      window.localStorage.removeItem(CART_KEY);
      window.localStorage.removeItem(FAVORITES_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(LOCALE_KEY, locale);
  }, [locale, ready]);

  const syncCartProducts = useCallback((products: Product[]) => {
    const productsById = new Map(products.map((product) => [product.id, product]));
    setCart((current) => {
      let changed = false;
      const next = current.map((line) => {
        // Bundles are virtual products created in the cart and must retain their own title and price.
        if (line.slug === "bundle") return line;
        const product = productsById.get(line.id);
        if (!product) return line;
        const localized = {
          ...product,
          quantity: line.quantity,
          checkoutUpsellOrderDiscountPercent: line.checkoutUpsellOrderDiscountPercent,
        };
        if (line.title === localized.title && line.category === localized.category && line.images === localized.images && line.price === localized.price) return line;
        changed = true;
        return localized;
      });
      return changed ? next : current;
    });
  }, []);

  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeFavorites = useCallback(() => setFavoritesOpen(false), []);

  const value = useMemo<StorefrontContextValue>(() => ({
    cart,
    favorites,
    locale,
    cartCount: cart.reduce((sum, line) => sum + line.quantity, 0),
    cartTotal: Math.round(cart.reduce((sum, line) => sum + line.price * line.quantity, 0) * (1 - Math.max(0, ...cart.map((line) => line.checkoutUpsellOrderDiscountPercent ?? 0)) / 100)),
    cartOpen,
    favoritesOpen,
    isReady: ready,
    addToCart: (product, options) => { trackConversion("add_to_cart", product.id); setCart((current) => {
      const checkoutUpsellOrderDiscountPercent = Math.max(0, Math.min(99, options?.checkoutUpsellOrderDiscountPercent ?? 0));
      const existing = current.find((line) => line.id === product.id);
      return existing
        ? current.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { ...product, checkoutUpsellOrderDiscountPercent: checkoutUpsellOrderDiscountPercent || undefined, quantity: 1 }];
    }); },
    addBundleToCart: (products, bundleTitle, bundlePrice) => { trackConversion("add_to_cart", products[0]?.id); setCart((current) => {
      const id = `bundle-${products.map((product) => product.id).sort().join("-")}`;
      const existing = current.find((line) => line.id === id);
      if (existing) return current.map((line) => line.id === id ? { ...line, quantity: line.quantity + 1 } : line);
      const base = products[0];
      return [...current, {
        ...base,
        id,
        slug: "bundle",
        title: bundleTitle,
        price: bundlePrice,
        oldPrice: products.reduce((sum, product) => sum + product.price, 0),
        images: base.images,
        attributes: { "Комплект": products.map((product) => product.title).join(" + ") },
        quantity: 1,
      }];
    }); },
    openCart: () => { trackConversion("cart_open"); setFavoritesOpen(false); setCartOpen(true); },
    closeCart,
    openFavorites: () => { setCartOpen(false); setFavoritesOpen(true); },
    closeFavorites,
    removeFromCart: (id) => setCart((current) => current.filter((line) => line.id !== id)),
    updateQuantity: (id, quantity) => setCart((current) => quantity < 1
      ? current.filter((line) => line.id !== id)
      : current.map((line) => line.id === id ? { ...line, quantity } : line)),
    clearCart: () => setCart([]),
    syncCartProducts,
    toggleFavorite: (id) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]),
    isFavorite: (id) => favorites.includes(id),
    setLocale,
  }), [cart, cartOpen, closeCart, closeFavorites, favorites, favoritesOpen, locale, ready, syncCartProducts]);

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const value = useContext(StorefrontContext);
  if (!value) throw new Error("useStorefront must be used inside StorefrontProvider");
  return value;
}
