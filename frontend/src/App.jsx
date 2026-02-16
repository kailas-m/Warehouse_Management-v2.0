import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmationProvider } from "./context/ConfirmationContext";
import { DrawerProvider } from "./context/DrawerContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/common/Dashboard";
import ProductList from "./pages/viewer/ProductList";
import WarehouseList from "./pages/admin/WarehouseList";
import UserList from "./pages/manager/UserList";
import PurchaseRequestCreate from "./pages/viewer/PurchaseRequestCreate";
import Thresholds from "./pages/manager/Thresholds";
import PromotionRequest from "./pages/manager/PromotionRequest";
import Reports from "./pages/admin/Reports";
import ProfilePage from "./pages/common/ProfilePage";
import WarehouseCreate from "./pages/admin/WarehouseCreate";
import WarehouseDelete from "./pages/admin/WarehouseDelete";
import WarehouseDetail from "./pages/admin/WarehouseDetail";
import ProductCreate from "./pages/admin/ProductCreate";
import PurchaseRequestList from "./pages/admin/PurchaseRequestList";
import StockAssign from "./pages/admin/StockAssign";
import StockList from "./pages/admin/StockList";
import TransferRequestList from "./pages/admin/TransferRequestList";
import TransferRequestCreate from "./pages/manager/TransferRequestCreate";
import MyPurchaseRequests from "./pages/viewer/MyPurchaseRequests";
import PromotionRequestList from "./pages/admin/PromotionRequestList";

const NotFound = () => <h1>404 Not Found</h1>;

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={
        <PrivateRoute>
          <DashboardLayout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductCreate />} />
        <Route path="warehouses" element={<WarehouseList />} />
        <Route path="warehouses/new" element={<WarehouseCreate />} />
        <Route path="warehouses/delete/:id" element={<WarehouseDelete />} />
        <Route path="warehouses/:id" element={<WarehouseDetail />} />
        <Route path="stocks" element={<StockList />} />
        <Route path="stocks/assign" element={<StockAssign />} />
        <Route path="transfer-requests" element={<TransferRequestList />} />
        <Route path="transfer-requests/new" element={<TransferRequestCreate />} />
        <Route path="users" element={<UserList />} />
        <Route path="thresholds" element={<Thresholds />} />
        <Route path="promotions" element={<PromotionRequest />} />
        <Route path="admin/promotions" element={<PromotionRequestList />} />
        <Route path="reports" element={<Reports />} />
        <Route path="purchase-requests" element={<PurchaseRequestList />} />
        <Route path="purchase-requests/new" element={<PurchaseRequestCreate />} />
        <Route path="my-requests" element={<MyPurchaseRequests />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <ConfirmationProvider>
              <DrawerProvider>
                <AppRoutes />
              </DrawerProvider>
            </ConfirmationProvider>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
