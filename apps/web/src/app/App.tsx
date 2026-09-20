import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import LoginPage from '@/features/auth/LoginPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomeRedirect from '@/routes/HomeRedirect';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />
          {/* Phase 2+ routes (items, bills, review, inventory, reports,
              users, shops) attach here the same way, wrapped in
              <ProtectedRoute allow={[...]}> as needed. */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
