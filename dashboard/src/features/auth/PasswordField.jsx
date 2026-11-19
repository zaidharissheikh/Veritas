import { useState } from 'react';
import { Icon } from '../../components';
import { AuthField } from './AuthField';
import './PasswordField.css';

// Password field with a show/hide toggle in the trailing slot.
export function PasswordField({ id, label = 'Password', ...fieldProps }) {
  const [shown, setShown] = useState(false);

  const toggle = (
    <button
      type="button"
      className="password-toggle"
      onClick={() => setShown((value) => !value)}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-controls={id}
    >
      <Icon name={shown ? 'eye-off' : 'eye'} size={20} />
    </button>
  );

  return (
    <AuthField
      id={id}
      label={label}
      type={shown ? 'text' : 'password'}
      trailing={toggle}
      {...fieldProps}
    />
  );
}
