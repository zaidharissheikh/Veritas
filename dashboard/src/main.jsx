import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import App from './App.jsx';

// Opting in to the v7 behaviour now silences React Router's upgrade warnings in the console.
const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={ROUTER_FUTURE}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
