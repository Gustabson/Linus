"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface Props {
  /** px scrolled before button appears (default 800) */
  threshold?: number;
  /** className override for the button */
  className?: string;
}

export function ScrollToTop({ threshold = 800, className = "" }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > threshold);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-primary text-primary-fg shadow-lg hover:bg-primary-h transition-all flex items-center justify-center md:bottom-6 ${className}`}
      aria-label="Volver arriba"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
