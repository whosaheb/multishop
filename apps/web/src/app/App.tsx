import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import LoginPage from '@/features/auth/LoginPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomeRedirect from '@/routes/HomeRedirect';
import ItemsPage from '@/features/items/ItemsPage';
import CreateBillPage from '@/features/bills/CreateBillPage';
import BillReviewPage from '@/features/bills/BillReviewPage';
import MyBillsPage from '@/features/bills/MyBillsPage';
import InventoryPage from '@/features/inventory/InventoryPage';
import BillSequencePage from '@/features/bill-sequence/BillSequencePage';

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
          {/* Phase 1: Items, categories, units & pricing */}
          <Route
            path="/items"
            element={
              <ProtectedRoute allow={['ADMIN', 'MANAGER']}>
                <ItemsPage />
              </ProtectedRoute>
            }
          />
          {/* Phase 2: Bill creation */}
          <Route
            path="/bills/create"
            element={
              <ProtectedRoute>
                <CreateBillPage />
              </ProtectedRoute>
            }
          />
          {/* Phase 3: Bill review queue & version history */}
          <Route
            path="/bills/review"
            element={
              <ProtectedRoute allow={['ADMIN', 'MANAGER']}>
                <BillReviewPage />
              </ProtectedRoute>
            }
          />
          {/* Cashier / Employee My Bills */}
          <Route
            path="/bills/my"
            element={
              <ProtectedRoute>
                <MyBillsPage />
              </ProtectedRoute>
            }
          />
          {/* Phase 4: Derived inventory, transfers, adjustments, receives */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute allow={['ADMIN', 'MANAGER']}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          {/* Phase 5: Bill sequence monitoring */}
          <Route
            path="/sequence-events"
            element={
              <ProtectedRoute allow={['ADMIN', 'MANAGER']}>
                <BillSequencePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
