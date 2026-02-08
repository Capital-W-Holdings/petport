import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { LoadingState, ToastProvider } from '@/components/ui';
import { AdminRoute } from '@/components/AdminRoute';

// Pages
import { HomePage } from '@/pages/Home';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { DashboardPage } from '@/pages/Dashboard';
import { PetListPage } from '@/pages/PetList';
import { AddPetPage } from '@/pages/AddPet';
import { AddPetCompletePage } from '@/pages/AddPetComplete';
import { PetDetailPage } from '@/pages/PetDetail';
import { EditPetPage } from '@/pages/EditPet';
import { VerifyPage } from '@/pages/Verify';
import { SettingsPage } from '@/pages/Settings';
import { PublicProfilePage } from '@/pages/PublicProfile';
import { SecurityReportPage } from '@/pages/SecurityReport';

// Styles
import '@/styles/globals.css';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// App Component
function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:petportId" element={<VerifyPage />} />
            <Route path="/p/:petportId" element={<PublicProfilePage />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/pets" element={<ProtectedRoute><PetListPage /></ProtectedRoute>} />
            <Route path="/pets/new" element={<ProtectedRoute><AddPetPage /></ProtectedRoute>} />
            <Route path="/pets/new/complete" element={<ProtectedRoute><AddPetCompletePage /></ProtectedRoute>} />
            <Route path="/pets/:petId" element={<ProtectedRoute><PetDetailPage /></ProtectedRoute>} />
            <Route path="/pets/:petId/edit" element={<ProtectedRoute><EditPetPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/security-report" element={<AdminRoute><SecurityReportPage /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

// Mount App
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
