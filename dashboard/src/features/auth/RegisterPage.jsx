import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import { validateRegisterForm } from '../../lib/validators';
import { useAuth } from './useAuth';
import { useAuthForm } from './useAuthForm';
import { AuthLayout } from './AuthLayout';
import { AuthForm, AuthFormActions } from './AuthForm';
import { AuthField } from './AuthField';
import { PasswordField } from './PasswordField';
import { PasswordChecklist } from './PasswordChecklist';
import { AuthNotice } from './AuthNotice';
import { authErrorMessage } from './authMessages';

const CHECKLIST_ID = 'register-password-rules';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = useAuthForm({
    initialValues: { email: '', password: '' },
    validate: validateRegisterForm,
    errorMessage: authErrorMessage,
    onSubmit: async (values) => {
      await register(values);
      navigate('/check-email', { state: { email: values.email } });
    },
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Save your analyses and build your Information Diet."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <AuthForm onSubmit={form.handleSubmit} aria-label="Create account">
        <AuthField
          id="register-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="name@example.com"
          autoFocus
          {...form.fieldProps('email')}
        />
        <PasswordField
          id="register-password"
          autoComplete="new-password"
          placeholder="Choose a password"
          describedBy={CHECKLIST_ID}
          {...form.fieldProps('password')}
        />
        <PasswordChecklist id={CHECKLIST_ID} password={form.values.password} />

        {form.formError && <AuthNotice tone="error">{form.formError}</AuthNotice>}

        <AuthFormActions>
          <Button type="submit" variant="primary" loading={form.submitting}>
            Create account
          </Button>
        </AuthFormActions>
      </AuthForm>
    </AuthLayout>
  );
}
