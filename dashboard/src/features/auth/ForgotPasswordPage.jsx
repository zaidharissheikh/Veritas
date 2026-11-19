import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../components';
import { validateEmail } from '../../lib/validators';
import { forgotPassword } from '../../services/authApi.js';
import { AuthLayout } from './AuthLayout';
import { AuthForm, AuthFormActions } from './AuthForm';
import { AuthField } from './AuthField';
import { AuthNotice } from './AuthNotice';
import { useAuthForm } from './useAuthForm';
import { authErrorMessage } from './authMessages';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const form = useAuthForm({
    initialValues: { email: location.state?.email ?? '' },
    validate: ({ email }) => {
      const error = validateEmail(email);
      return error ? { email: error } : {};
    },
    errorMessage: authErrorMessage,
    onSubmit: async ({ email }) => {
      if (Date.now() < retryAt) {
        setMessage('Please wait one minute before requesting another reset link.');
        return;
      }
      setMessage('');
      const response = await forgotPassword(email);
      setRetryAt(Date.now() + 60000);
      setMessage(response.message);
    },
  });

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your account email and we’ll send you a link to choose a new password."
      footer={<Link to="/login">Back to sign in</Link>}>
      <AuthForm onSubmit={form.handleSubmit} aria-label="Request password reset">
        <AuthField id="reset-email" label="Email" type="email" autoComplete="email"
          placeholder="name@example.com" autoFocus {...form.fieldProps('email')} />
        {message && <AuthNotice>{message}</AuthNotice>}
        {form.formError && <AuthNotice tone="error">{form.formError}</AuthNotice>}
        <AuthFormActions>
          <Button type="submit" variant="primary" loading={form.submitting}>Send reset link</Button>
          <p className="auth-form__hint">Check your spam folder too. Only the newest reset link will work.</p>
          <p className="auth-form__hint">New account? <Link to="/check-email" state={{ email: form.values.email }}>
            Verify your email first</Link>.</p>
        </AuthFormActions>
      </AuthForm>
    </AuthLayout>
  );
}
