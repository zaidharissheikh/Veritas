import { useRef } from 'react';
import './Segmented.css';

const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp']);
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);

/**
 * iOS segmented control. Radio semantics: arrow keys move the selection,
 * the thumb slides under the active option.
 */
export function Segmented({ options = [], value, onChange, ariaLabel, size = 'md', className = '' }) {
  const groupRef = useRef(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const count = Math.max(1, options.length);

  const select = (nextIndex) => {
    const wrapped = (nextIndex + count) % count;
    onChange?.(options[wrapped].value);
    groupRef.current?.querySelectorAll('[role="radio"]')[wrapped]?.focus();
  };

  const onKeyDown = (event) => {
    if (PREV_KEYS.has(event.key)) select(index - 1);
    else if (NEXT_KEYS.has(event.key)) select(index + 1);
    else if (event.key === 'Home') select(0);
    else if (event.key === 'End') select(count - 1);
    else return;
    event.preventDefault();
  };

  const thumbStyle = {
    width: `calc((100% - 4px) / ${count})`,
    transform: `translateX(${index * 100}%)`,
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`segmented segmented--${size} ${className}`.trim()}
      onKeyDown={onKeyDown}
    >
      <span className="segmented__thumb" style={thumbStyle} aria-hidden="true" />
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          className={`segmented__option${i === index ? ' is-active' : ''}`}
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
