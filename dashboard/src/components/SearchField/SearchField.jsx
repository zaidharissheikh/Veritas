import { useId } from 'react';
import { Icon } from '../Icon/Icon.jsx';
import './SearchField.css';

/** iOS search pill with a clear button that appears once there is text. */
export function SearchField({ value = '', onChange, placeholder = 'Search', ariaLabel = 'Search', className = '' }) {
  const id = useId();
  const hasText = value.length > 0;

  return (
    <div className={`search-field${hasText ? ' has-text' : ''} ${className}`.trim()}>
      <label htmlFor={id} className="sr-only">
        {ariaLabel}
      </label>
      <Icon name="search" size={16} className="search-field__icon" />
      <input
        id={id}
        type="search"
        className="search-field__input"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && hasText) onChange?.('');
        }}
      />
      {hasText && (
        <button
          type="button"
          className="search-field__clear"
          aria-label="Clear search"
          onClick={() => onChange?.('')}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}
