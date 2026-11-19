import './RouteLoading.css';

// Quiet full-page state while the saved session is restored. The spinner fades in late,
// so an instant restore shows nothing at all.
export function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__spinner" aria-hidden="true" />
      <span className="route-loading__label">Restoring your session</span>
    </div>
  );
}

export default RouteLoading;
