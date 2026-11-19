import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon.jsx';
import './UserMenu.css';

function initialOf(email) {
  return (email?.[0] ?? '?').toUpperCase();
}

/** Avatar button that opens a small popover with the email and Log out. */
export function UserMenu({ email, onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {initialOf(email)}
        </span>
        <span className="user-menu__email">{email ?? 'Not signed in'}</span>
        <Icon name="chevron-down" size={14} className="user-menu__chevron" />
      </button>

      <div id={menuId} role="menu" className={`user-menu__panel${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="user-menu__header">
          <span className="user-menu__caption">Signed in as</span>
          <span className="user-menu__value">{email ?? '—'}</span>
        </div>
        <button
          type="button"
          role="menuitem"
          className="user-menu__item"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setOpen(false);
            onLogout?.();
          }}
        >
          <Icon name="log-out" size={18} />
          Log out
        </button>
      </div>
    </div>
  );
}
