import { useEffect } from 'react';
import './AuthLayout.css';

// Centred card used by the login and register pages: brand, large title,
// one-line subtitle, the form, and a footer link to the other page.
export function AuthLayout({ title, subtitle, footer, children }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Veritas`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <main className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <img src="/icons/spaced_veritas.png" alt="" width={28} height={28} className="auth__mark" />
          {/* <span className="auth__wordmark">Veritas</span> */}
        </div>

        <h1 className="auth__title">{title}</h1>
        <p className="auth__subtitle">{subtitle}</p>

        <div className="auth__body">{children}</div>

        {footer && <p className="auth__footer">{footer}</p>}
      </div>
    </main>
  );
}
