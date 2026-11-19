import { useEffect, useState } from 'react';

// Recharts writes colours into SVG attributes, which cannot resolve var(--token),
// so we read the computed token values and refresh whenever the theme changes.
const TOKENS = {
  accent: '--accent',
  label: '--label',
  label2: '--label-2',
  separator: '--separator',
  surface: '--surface',
  riskLow: '--risk-low',
  riskMedium: '--risk-medium',
  riskHigh: '--risk-high',
};

function readTheme() {
  const style = getComputedStyle(document.documentElement);
  const theme = {};
  for (const [key, name] of Object.entries(TOKENS)) {
    theme[key] = style.getPropertyValue(name).trim();
  }
  theme.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return theme;
}

export function useChartTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const refresh = () => setTheme(readTheme());
    const queries = [
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ];
    queries.forEach((q) => q.addEventListener('change', refresh));

    // A manual theme toggle flips data-theme on <html>.
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      queries.forEach((q) => q.removeEventListener('change', refresh));
      observer.disconnect();
    };
  }, []);

  return theme;
}
