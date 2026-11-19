import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components';
import { verifyEmail } from '../../services/authApi.js';
import { AuthLayout } from './AuthLayout';
import { AuthNotice } from './AuthNotice';
import { authErrorMessage } from './authMessages';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  // Strip the token from browser history before any subsequent navigation.
  useEffect(() => { navigate('/verify-email', { replace: true }); }, [navigate]);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await verifyEmail(token);
      navigate('/login?verified=1', { replace: true });
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout title="Verify your email" subtitle="Confirm your email address to activate your Veritas account."
      footer={<Link to="/check-email">Request a new verification link</Link>}>
      {!token ? <AuthNotice tone="error">Open the link from your verification email. If it has expired, request a new one.</AuthNotice> : (
        <Button variant="primary" loading={busy} onClick={confirm}>Verify email address</Button>
      )}
      {error && <AuthNotice tone="error">{error}</AuthNotice>}
    </AuthLayout>
  );
}
