import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 900;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Animates a number from its previous value toward `target` with ease-out. */
export function useCountUp(target) {
  const [value, setValue] = useState(0);
  // Mirrors the displayed value so a new target animates from wherever the last run stopped.
  const shownRef = useRef(0);

  useEffect(() => {
    const show = (next) => {
      shownRef.current = next;
      setValue(next);
    };

    if (prefersReducedMotion()) {
      show(target);
      return undefined;
    }

    const from = shownRef.current;
    let frame = 0;
    let startAt = 0;
    const step = (now) => {
      if (!startAt) startAt = now;
      const t = Math.min(1, (now - startAt) / DURATION_MS);
      show(from + (target - from) * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
