import { Icon } from '../Icon/Icon.jsx';
import './EmptyState.css';

/** Calm, centred placeholder for lists and pages with nothing to show. */
export function EmptyState({ icon = 'inbox', title, message, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`.trim()} role="status">
      <div className="empty-state__icon">
        <Icon name={icon} size={28} />
      </div>
      {title && <h3 className="empty-state__title">{title}</h3>}
      {message && <p className="empty-state__message">{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
