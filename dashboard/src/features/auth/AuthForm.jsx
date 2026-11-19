import './AuthForm.css';

// Vertical form rhythm shared by the auth pages. Native validation is off
// because the pages show their own inline messages from lib/validators.
export function AuthForm({ onSubmit, children, ...rest }) {
  return (
    <form className="auth-form" noValidate onSubmit={onSubmit} {...rest}>
      {children}
    </form>
  );
}

// Stacked, full-width action buttons (primary first).
export function AuthFormActions({ children }) {
  return <div className="auth-form__actions">{children}</div>;
}
