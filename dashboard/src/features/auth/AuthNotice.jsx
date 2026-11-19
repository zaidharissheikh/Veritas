import { Icon } from '../../components';
import './AuthNotice.css';

// Calm banner for page notices (info) and form-level errors (error → role="alert").
export function AuthNotice({ tone = 'info', icon, children }) {
  const isError = tone === 'error';
  const iconName = icon ?? (isError ? 'alert' : 'check');

  return (
    <div className={`auth-notice auth-notice--${tone}`} role={isError ? 'alert' : 'status'}>
      <Icon name={iconName} size={18} className="auth-notice__icon" />
      <p className="auth-notice__text">{children}</p>
    </div>
  );
}
