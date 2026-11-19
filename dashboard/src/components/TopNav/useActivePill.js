import { useLayoutEffect, useState } from 'react';

/**
 * Measures the active nav link so a single pill can slide between links.
 * Returns an inline style for the pill (hidden until the first measurement).
 */
export function useActivePill(listRef, pathname) {
  const [style, setStyle] = useState({ opacity: 0 });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;

    const measure = () => {
      const active = list.querySelector('.top-nav__link.is-active');
      if (!active) {
        setStyle({ opacity: 0 });
        return;
      }
      setStyle({
        opacity: 1,
        width: active.offsetWidth,
        transform: `translateX(${active.offsetLeft}px)`,
      });
    };

    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(list);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [listRef, pathname]);

  return style;
}
