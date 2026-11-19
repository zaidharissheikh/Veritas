import './AuthField.css';

// Labelled inset text field with an inline validation message.
// `describedBy` lets a page attach extra helper content (e.g. the password checklist).
export function AuthField({ id, label, error, trailing, describedBy, ...inputProps }) {
  const errorId = `${id}-error`;
  const described = [error ? errorId : null, describedBy].filter(Boolean).join(' ');

  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>
        {label}
      </label>

      <div className={`auth-field__control${error ? ' is-invalid' : ''}`}>
        <input
          id={id}
          className="auth-field__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={described || undefined}
          {...inputProps}
        />
        {trailing}
      </div>

      {error && (
        <p id={errorId} className="auth-field__error">
          {error}
        </p>
      )}
    </div>
  );
}
