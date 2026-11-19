import { Icon } from '../../components';
import { passwordChecks } from '../../lib/validators';
import './PasswordChecklist.css';

// Live list of password rules that tick as the user types.
export function PasswordChecklist({ id, password }) {
  return (
    <ul id={id} className="pw-checklist" aria-label="Password requirements">
      {passwordChecks(password).map(({ label, ok }) => (
        <li key={label} className={`pw-checklist__item${ok ? ' is-met' : ''}`}>
          <span className="pw-checklist__mark" aria-hidden="true">
            <Icon name="check" size={12} />
          </span>
          <span className="sr-only">{ok ? 'Met: ' : 'Not met: '}</span>
          {label}
        </li>
      ))}
    </ul>
  );
}
