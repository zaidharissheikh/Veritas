import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components';
import { ProtectedRoute, PublicOnlyRoute } from './features/auth/ProtectedRoute.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import CheckEmailPage from './features/auth/CheckEmailPage.jsx';
import VerifyEmailPage from './features/auth/VerifyEmailPage.jsx';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx';
import OverviewPage from './features/overview/OverviewPage.jsx';
import DietPage from './features/diet/DietPage.jsx';
import HistoryPage from './features/history/HistoryPage.jsx';
import DetailPage from './features/history/DetailPage.jsx';

// Dev-only component kit. The DEV check is a compile-time constant, so production
// builds drop the import (and kit.css) entirely.
const KitPage = import.meta.env.DEV ? lazy(() => import('./dev/KitPage.jsx')) : null;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<OverviewPage />} />
        <Route path="/diet" element={<DietPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<DetailPage />} />
      </Route>

      {KitPage && (
        <Route
          path="/_kit"
          element={
            <ProtectedRoute>
              <Suspense fallback={null}>
                <KitPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
