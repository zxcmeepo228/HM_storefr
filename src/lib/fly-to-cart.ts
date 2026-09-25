export function flyToCart(imageUrl: string | undefined, source: HTMLElement) {
  if (!imageUrl || typeof window === "undefined") return;
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  const image = source.closest(".product-card")?.querySelector<HTMLImageElement>(".product-image") ?? document.querySelector<HTMLImageElement>(".gallery-main img");
  if (!target || !image) return;

  const from = image.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const flyer = document.createElement("img");
  flyer.src = imageUrl;
  flyer.alt = "";
  flyer.className = "cart-flyer";
  flyer.style.left = `${from.left + from.width / 2 - 26}px`;
  flyer.style.top = `${from.top + from.height / 2 - 26}px`;
  document.body.appendChild(flyer);

  const horizontal = to.left + to.width / 2 - from.left - from.width / 2;
  const vertical = to.top + to.height / 2 - from.top - from.height / 2;
  const arcHeight = -Math.min(175, Math.max(92, Math.abs(horizontal) * 0.22));
  const animation = flyer.animate([
    { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
    { transform: "translate(0, -7px) scale(1.28) rotate(-2deg)", opacity: 1, offset: 0.12 },
    { transform: `translate(${horizontal * 0.08}px, ${vertical * 0.03 - 10}px) scale(.88) rotate(-5deg)`, opacity: 1, offset: 0.25 },
    { transform: `translate(${horizontal * 0.43}px, ${vertical * 0.27 + arcHeight}px) scale(.62) rotate(-8deg)`, opacity: 1, offset: 0.54 },
    { transform: `translate(${horizontal * 0.78}px, ${vertical * 0.73 - 24}px) scale(.34) rotate(4deg)`, opacity: 0.9, offset: 0.82 },
    { transform: `translate(${horizontal}px, ${vertical}px) scale(.12) rotate(0deg)`, opacity: 0, offset: 1 },
  ], { duration: 1700, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" });

  window.setTimeout(() => target.classList.add("cart-arrived"), 1440);
  animation.finished.finally(() => {
    flyer.remove();
    target.classList.remove("cart-arrived");
  });
}
