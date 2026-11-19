import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '../../components';
import { resendVerification } from '../../services/authApi.js';
import { AuthLayout } from './AuthLayout';
import { AuthForm, AuthFormActions } from './AuthForm';
import { AuthField } from './AuthField';
import { AuthNotice } from './AuthNotice';
import { useAuthForm } from './useAuthForm';
import { authErrorMessage } from './authMessages';
import { validateEmail } from '../../lib/validators';

export default function CheckEmailPage() {
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
      setMessage('');
      if (Date.now() < retryAt) {
        setMessage('Please wait one minute between requests.');
        return;
      }
      const result = await resendVerification(email);
      setRetryAt(Date.now() + 60000);
      setMessage(result.message);
    },
  });
  return (
    <AuthLayout title="Check your email" subtitle="Open the verification link in your inbox to finish registration. Check your spam folder too."
      footer={<Link to="/login">Back to sign in</Link>}>
      <AuthForm onSubmit={form.handleSubmit} aria-label="Resend verification email">
        <AuthField id="verification-email" label="Email" type="email" autoComplete="email" {...form.fieldProps('email')} />
        {message && <AuthNotice>{message}</AuthNotice>}
        {form.formError && <AuthNotice tone="error">{form.formError}</AuthNotice>}
        <AuthFormActions>
          <Button type="submit" variant="primary" loading={form.submitting}>Resend verification email</Button>
          <p className="auth-form__hint">You can request a new link once per minute. Only the newest link will work.</p>
        </AuthFormActions>
      </AuthForm>
    </AuthLayout>
  );
}
