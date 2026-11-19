import './Skeleton.css';

/** Shimmering placeholder block. Sizes accept any CSS length. */
export function Skeleton({ width = '100%', height = 16, radius, style, className = '' }) {
  const inline = {
    width,
    height,
    borderRadius: radius,
    ...style,
  };
  return <span className={`skeleton ${className}`.trim()} style={inline} aria-hidden="true" />;
}
