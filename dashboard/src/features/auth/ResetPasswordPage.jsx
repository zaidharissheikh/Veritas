import { useLayoutEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import { validateResetForm } from '../../lib/validators';
import { resetPassword } from '../../services/authApi.js';
import { AuthLayout } from './AuthLayout';
import { AuthForm, AuthFormActions } from './AuthForm';
import { PasswordField } from './PasswordField';
import { PasswordChecklist } from './PasswordChecklist';
import { AuthNotice } from './AuthNotice';
import { useAuthForm } from './useAuthForm';
import { authErrorMessage } from './authMessages';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(location.search).get('token') ?? '');
  // Keep the token in memory and remove it from the URL/history before painting the form.
  useLayoutEffect(() => {
    if (location.search) navigate('/reset-password', { replace: true });
  }, [location.search, navigate]);
  const form = useAuthForm({
    initialValues: { password: '', confirmPassword: '' },
    validate: validateResetForm,
    errorMessage: authErrorMessage,
    onSubmit: async ({ password }) => {
      await resetPassword({ token, password });
      navigate('/login?reset=1', { replace: true });
    },
  });
  const hasToken = /^[A-Za-z0-9_-]{43}$/.test(token);

  return (
    <AuthLayout title="Choose a new password" subtitle="After resetting, sign in again on each of your devices."
      footer={<Link to="/forgot-password">Request a new reset link</Link>}>
      {!hasToken ? <AuthNotice tone="error">Open the complete link from your password reset email, or request a new one.</AuthNotice> : (
        <AuthForm onSubmit={form.handleSubmit} aria-label="Reset password">
          <PasswordField id="new-password" label="New password" autoComplete="new-password"
            describedBy="reset-password-rules" autoFocus {...form.fieldProps('password')} />
          <PasswordChecklist id="reset-password-rules" password={form.values.password} />
          <PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password"
            {...form.fieldProps('confirmPassword')} />
          {form.formError && <AuthNotice tone="error">{form.formError}</AuthNotice>}
          <AuthFormActions>
            <Button type="submit" variant="primary" loading={form.submitting}>Reset password</Button>
          </AuthFormActions>
        </AuthForm>
      )}
    </AuthLayout>
  );
}
