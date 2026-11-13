import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion.js';

/**
 * Animates a number from its previous value to `value` once it changes.
 * format: (n) => string. Reduced motion → shows the final value immediately.
 */
export default function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-PH'), duration = 900 }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(prefersReducedMotion() ? target : 0);
  const fromRef = useRef(prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = target;
      setShown(target);
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 4;
      const current = from + (target - from) * eased;
      setShown(current);
      fromRef.current = current;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Animation frames pause in background tabs; always land on the real value.
    const settle = setTimeout(() => {
      fromRef.current = target;
      setShown(target);
    }, duration + 80);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [target, duration]);

  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(target)}</span>
    </>
  );
}
