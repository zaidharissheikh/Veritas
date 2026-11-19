import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components';
import { validateLoginForm } from '../../lib/validators';
import { useAuth } from './useAuth';
import { useAuthForm } from './useAuthForm';
import { AuthLayout } from './AuthLayout';
import { AuthForm, AuthFormActions } from './AuthForm';
import { AuthField } from './AuthField';
import { PasswordField } from './PasswordField';
import { AuthNotice } from './AuthNotice';
import { DEMO_ACCOUNT, LOGIN_NOTICES, authErrorMessage } from './authMessages';

// Where to go after sign-in: the location ProtectedRoute bounced from, else Overview.
function redirectTarget(state) {
  return state?.from ?? '/';
}

function useLoginNotice() {
  const [params] = useSearchParams();
  if (params.get('registered') === '1') return LOGIN_NOTICES.registered;
  if (params.get('verified') === '1') return LOGIN_NOTICES.verified;
  if (params.get('expired') === '1') return LOGIN_NOTICES.expired;
  if (params.get('reset') === '1') return LOGIN_NOTICES.reset;
  return null;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = useLoginNotice();
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  const form = useAuthForm({
    initialValues: { email: '', password: '' },
    validate: validateLoginForm,
    errorMessage: authErrorMessage,
    onSubmit: async (values) => {
      setUnverifiedEmail(null);
      try {
        await login(values);
      } catch (error) {
        if (error?.code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(values.email);
        throw error;
      }
      navigate(redirectTarget(location.state));
    },
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your analysis history and Information Diet."
      footer={
        <>
          New to Veritas? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {notice && <AuthNotice icon={notice.icon}>{notice.text}</AuthNotice>}

      <AuthForm onSubmit={form.handleSubmit} onChange={() => setUnverifiedEmail(null)} aria-label="Sign in">
        <AuthField
          id="login-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="name@example.com"
          autoFocus
          {...form.fieldProps('email')}
        />
        <PasswordField
          id="login-password"
          autoComplete="current-password"
          placeholder="Your password"
          {...form.fieldProps('password')}
        />

        {form.formError && <AuthNotice tone="error">{form.formError}</AuthNotice>}

        <AuthFormActions>
          <Link to="/forgot-password" state={{ email: form.values.email }}>Forgot password?</Link>
          {!form.submitting && unverifiedEmail && unverifiedEmail === form.values.email && (
            <Link to="/check-email" state={{ email: unverifiedEmail }}>Resend verification email</Link>
          )}
          <Button type="submit" variant="primary" loading={form.submitting}>
            Sign in
          </Button>
          <Button
            type="button"
            variant="plain"
            disabled={form.submitting}
            onClick={() => form.submitValues(DEMO_ACCOUNT)}
          >
            Try the demo account
          </Button>
          <p className="auth-form__hint">
            Demo: {DEMO_ACCOUNT.email} · {DEMO_ACCOUNT.password}
          </p>
        </AuthFormActions>
      </AuthForm>
    </AuthLayout>
  );
}
