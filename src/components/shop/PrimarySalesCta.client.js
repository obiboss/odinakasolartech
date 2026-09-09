"use client";

import { useEffect, useRef } from "react";

export default function PrimarySalesCta({ href }) {
  const ctaRef = useRef(null);

  useEffect(() => {
    const node = ctaRef.current;
    if (!node) return undefined;

    const startAnimation = () => node.classList.add("primary-sales-cta--visible");

    if (!("IntersectionObserver" in window)) {
      const fallbackTimer = window.setTimeout(startAnimation, 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <a ref={ctaRef} href={href} className="primary-sales-cta">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="20" r="1" />
        <circle cx="19" cy="20" r="1" />
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
      </svg>
      <span>Click Here To Grab This Order</span>
    </a>
  );
}
