import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from '../TopNav/TopNav.jsx';
import './AppShell.css';

/** Layout route: glass nav on top, a centred page container, the page below. */
export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      <a href="#main" className="app-shell__skip">
        Skip to content
      </a>
      <TopNav />
      <main id="main" className="app-shell__main" key={pathname}>
        <div className="app-shell__container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
