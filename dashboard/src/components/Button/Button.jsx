import { Link } from 'react-router-dom';
import { Icon } from '../Icon/Icon.jsx';
import './Button.css';

function Spinner() {
  return (
    <span className="btn__spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
    </span>
  );
}

/**
 * Pill button. `variant` primary | secondary | plain; renders a router Link
 * when `to` is given. Shows a spinner and blocks input while `loading`.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  to,
  icon,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, loading && 'is-loading', className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading && <Spinner />}
      <span className="btn__content">
        {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} className="btn__icon" />}
        {children}
      </span>
    </>
  );

  if (to && !disabled && !loading) {
    return (
      <Link to={to} className={classes} onClick={onClick} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...rest}
    >
      {content}
    </button>
  );
}
