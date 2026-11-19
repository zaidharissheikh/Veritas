import { useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth.js';
import { UserMenu } from './UserMenu.jsx';
import { useActivePill } from './useActivePill.js';
import './TopNav.css';

const LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/diet', label: 'Information Diet' },
  { to: '/history', label: 'History' },
];

function BrandMark() {
  return (
    <Link to="/" className="top-nav__brand" aria-label="Veritas home">
      <img
        className="top-nav__mark"
        src="/icons/logo-tick.png"
        alt=""
        width={24}
        height={24}
        aria-hidden="true"
      />
      <span className="top-nav__wordmark">Veritas</span>
    </Link>
  );
}

/** Sticky translucent navigation bar with a pill that slides to the active link. */
export function TopNav() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const listRef = useRef(null);
  const pillStyle = useActivePill(listRef, pathname);

  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <BrandMark />

        <nav className="top-nav__nav" aria-label="Primary">
          <ul className="top-nav__list" ref={listRef}>
            <li className="top-nav__pill" style={pillStyle} aria-hidden="true" />
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `top-nav__link${isActive ? ' is-active' : ''}`}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <UserMenu email={user?.email} onLogout={logout} />
      </div>
    </header>
  );
}
