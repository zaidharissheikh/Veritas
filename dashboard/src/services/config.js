// Build-time settings (see dashboard/.env.example). Vite inlines import.meta.env.

const DEFAULT_API_URL = 'http://localhost:8000';

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

// "true" switches authApi/historyApi back to the in-browser mock (demo data, no backend needed).
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
