"use client";

import { useEffect, useRef, useState } from "react";

type Props = { children: React.ReactNode; className?: string; delay?: number };

export function ScrollReveal({ children, className = "", delay = 0 }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = element.current;
    if (!target) return;
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -7%", threshold: 0.08 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return <div ref={element} className={`scroll-reveal ${visible ? "is-visible" : ""} ${className}`.trim()} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
