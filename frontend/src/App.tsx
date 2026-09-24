import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import HealthCheckPage from "./pages/HealthCheckPage";
import ProductsPage from "./pages/ProductsPage";
import PurchasesPage from "./pages/PurchasesPage";
import SuppliersPage from "./pages/SuppliersPage";
import SalesPage from "./pages/SalesPage";
import CustomersPage from "./pages/CustomersPage";
import ExpensesPage from "./pages/ExpensesPage";
import CustomerUdhaarPage from "./pages/CustomerUdhaarPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import SupplierPayablesPage from "./pages/SupplierPayablesPage";
import SupplierDetailPage from "./pages/SupplierDetailPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import AIAssistantPage from "./pages/AIAssistantPage";


/**
 * Phase 5 adds /sales and /customers (protected, inside AppLayout).
 * /login, /register, /health stay as they were.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/health" element={<HealthCheckPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/customer-udhaar/:id"
              element={<CustomerDetailPage />}
            />
            <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="/customer-udhaar" element={<CustomerUdhaarPage />} />
            <Route
              path="/supplier-payables"
              element={<SupplierPayablesPage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
