import { useEffect, useState } from 'react';

/** True when the user asked the OS for reduced motion. */
export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Shared by every overlay, so a dialog opened over a modal does not unlock early.
let scrollLocks = 0;
let savedBodyStyle = null;

/** Stops the page behind an open overlay from scrolling. */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const { body, documentElement } = document;
    if (scrollLocks === 0) {
      const scrollbar = window.innerWidth - documentElement.clientWidth;
      savedBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      body.style.overflow = 'hidden';
      // Keep the layout from shifting when the scrollbar disappears.
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0 && savedBodyStyle) {
        body.style.overflow = savedBodyStyle.overflow;
        body.style.paddingRight = savedBodyStyle.paddingRight;
        savedBodyStyle = null;
      }
    };
  }, [active]);
}

/**
 * Keeps an element mounted long enough to play its exit transition.
 * const { mounted, visible } = usePresence(open, 200);
 * Render when `mounted`; apply the "shown" classes when `visible`.
 */
export function usePresence(open, duration = 200) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two frames so the browser paints the hidden state before transitioning.
      let inner;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        if (inner) cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : duration);
    return () => clearTimeout(timer);
  }, [open, duration]);

  return { mounted, visible };
}
