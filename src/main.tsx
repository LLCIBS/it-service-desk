import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ProtectedPlatformRoute } from './components/auth/ProtectedPlatformRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { PlatformLoginPage } from './pages/PlatformLoginPage';
import { PlatformOrganizationsPage } from './pages/PlatformOrganizationsPage';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/platform/login" element={<PlatformLoginPage />} />
          <Route
            path="/platform"
            element={
              <ProtectedPlatformRoute>
                <PlatformOrganizationsPage />
              </ProtectedPlatformRoute>
            }
          />
          <Route path="/o/:orgSlug/login" element={<LoginPage />} />
          <Route
            path="/o/:orgSlug/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
