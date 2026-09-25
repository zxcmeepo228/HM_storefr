"use client";

import { CartDrawer } from "@/components/storefront/cart-drawer";
import { FavoritesDrawer } from "@/components/storefront/favorites-drawer";
import { useStorefront } from "@/components/storefront/storefront-provider";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const { cartOpen, closeCart, favoritesOpen, closeFavorites } = useStorefront();
  const pathname = usePathname();

  // A drawer must never survive navigation: on mobile it can sit invisibly
  // above the next page and steal the first tap or scroll.
  useEffect(() => {
    closeCart();
    closeFavorites();
  }, [pathname, closeCart, closeFavorites]);

  return <>{children}{!pathname.startsWith("/admin") && <><CartDrawer open={cartOpen} onClose={closeCart} /><FavoritesDrawer open={favoritesOpen} onClose={closeFavorites} /></>}</>;
}
