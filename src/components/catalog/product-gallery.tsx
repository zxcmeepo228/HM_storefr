"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = { images?: string[]; title: string; locale: "uk" | "ru" };
type Direction = "left" | "right";

export function ProductGallery({ images = [], title, locale }: Props) {
  const gallery = useMemo(() => [...new Set(images)], [images]);
  const [active, setActive] = useState(0);
  const [windowStart, setWindowStart] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [direction, setDirection] = useState<Direction>("left");
  const [slideVersion, setSlideVersion] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const labels = locale === "uk"
    ? { gallery: "Фотогалерея", open: "Відкрити фото у великому розмірі", previous: "Попереднє фото", next: "Наступне фото", previousThumbnails: "Попередні мініатюри", nextThumbnails: "Наступні мініатюри", close: "Закрити", image: "фото", unavailable: "Фото товару тимчасово недоступні", large: "Велике фото" }
    : { gallery: "Фотогалерея", open: "Открыть фото в большом размере", previous: "Предыдущее фото", next: "Следующее фото", previousThumbnails: "Предыдущие миниатюры", nextThumbnails: "Следующие миниатюры", close: "Закрыть", image: "фото", unavailable: "Фото товара временно недоступны", large: "Большое фото" };
  const move = useCallback((step: number, nextDirection: Direction) => {
    const next = (active + step + gallery.length) % gallery.length;
    setDirection(nextDirection);
    setSlideVersion((version) => version + 1);
    setActive(next);
    setWindowStart((start) => next < start ? next : next >= start + 5 ? next - 4 : start);
  }, [active, gallery.length]);

  useEffect(() => {
    if (!zoomed) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
      if (event.key === "ArrowLeft") move(-1, "right");
      if (event.key === "ArrowRight") move(1, "left");
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [zoomed, move]);

  useEffect(() => {
    if (gallery.length < 2) return;
    const previous = gallery[(active - 1 + gallery.length) % gallery.length];
    const next = gallery[(active + 1) % gallery.length];
    [previous, next].forEach((source) => {
      const image = new Image();
      image.src = source;
    });
  }, [active, gallery]);

  if (!gallery.length) return <div className="gallery-empty">{labels.unavailable}</div>;
  const onTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    const end = event.changedTouches[0];
    touchStart.current = null;
    if (!start || Math.abs(end.clientX - start.x) < 42 || Math.abs(end.clientX - start.x) < Math.abs(end.clientY - start.y)) return;
    move(end.clientX < start.x ? 1 : -1, end.clientX < start.x ? "left" : "right");
  };
  const visible = gallery.slice(windowStart, windowStart + 5);
  const hasMultiple = gallery.length > 1;

  return <>
    <section className="product-gallery" aria-label={`${labels.gallery}: ${title}`}>
      <div className="gallery-main" onTouchStart={(event) => { const touch = event.changedTouches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={onTouchEnd}>
        <button className="gallery-zoom" onClick={() => setZoomed(true)} aria-label={labels.open}>
          <img key={`gallery-${active}-${slideVersion}`} className={`gallery-photo gallery-photo-static gallery-photo-in-${direction}`} src={gallery[active]} alt={`${title} — ${labels.image} ${active + 1}`} loading="eager" fetchPriority="high" decoding="async" draggable={false} />
        </button>
        {hasMultiple && <><button className="gallery-arrow previous" onClick={() => move(-1, "right")} aria-label={labels.previous}>‹</button><button className="gallery-arrow next" onClick={() => move(1, "left")} aria-label={labels.next}>›</button><span className="gallery-counter">{String(active + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}</span></>}
      </div>
      {hasMultiple && <div className="gallery-thumbnails"><button className="thumbnail-nav" onClick={() => setWindowStart((start) => Math.max(0, start - 1))} disabled={windowStart === 0} aria-label={labels.previousThumbnails}>‹</button><div className="thumbnail-strip">{visible.map((image, offset) => { const index = windowStart + offset; return <button key={image} className={index === active ? "thumbnail active" : "thumbnail"} onClick={() => { if (index !== active) { setDirection(index > active ? "left" : "right"); setSlideVersion((version) => version + 1); setActive(index); } }} aria-label={`${labels.open}: ${labels.image} ${index + 1}`}><img src={image} alt="" loading="lazy" /></button>; })}</div><button className="thumbnail-nav" onClick={() => setWindowStart((start) => Math.min(gallery.length - 5, start + 1))} disabled={windowStart >= gallery.length - 5} aria-label={labels.nextThumbnails}>›</button></div>}
    </section>

    {zoomed && createPortal(<div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`${labels.large}: ${title}`}>
      <button className="product-lightbox-backdrop" onClick={() => setZoomed(false)} aria-label={labels.close} />
      <div className="product-lightbox-dialog">
        <div className="product-lightbox-media" onTouchStart={(event) => { const touch = event.changedTouches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={onTouchEnd}>
          <img key={`lightbox-${active}-${slideVersion}`} className={`lightbox-photo-in-${direction}`} src={gallery[active]} alt={`${title} — ${labels.image} ${active + 1}`} draggable={false} />
          <button className="product-lightbox-close" onClick={() => setZoomed(false)} aria-label={labels.close}>×</button>
        </div>
        {hasMultiple && <><button className="product-lightbox-nav previous" onClick={() => move(-1, "right")} aria-label={labels.previous}>‹</button><button className="product-lightbox-nav next" onClick={() => move(1, "left")} aria-label={labels.next}>›</button></>}
      </div>
    </div>, document.body)}
  </>;
}
