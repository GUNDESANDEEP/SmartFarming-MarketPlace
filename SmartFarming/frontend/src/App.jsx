import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OTPLogin from './pages/auth/OTPLogin';
import EmailVerification from './pages/auth/EmailVerification';
import ForgotPassword from './pages/auth/ForgotPassword';

// Farmer Pages
import FarmerDashboard from './pages/farmer/Dashboard';
import FarmerEarnings from './pages/farmer/Earnings';
import FarmerProducts from './pages/farmer/Products';
import FarmerOrders from './pages/farmer/Orders';
import FarmerMessages from './pages/farmer/Messages';
import FarmerAnalytics from './pages/farmer/Analytics';
import FarmerMarketing from './pages/farmer/Marketing';
import FarmerAITools from './pages/farmer/AITools';
import FarmerFutureAI from './pages/farmer/FutureAI';
import AgriBot from './pages/AgriBot';

// Buyer Pages
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import BuyerMarketplace from './pages/buyer/Marketplace';
import BuyerCheckout from './pages/buyer/Checkout';
import OrderSuccess from './pages/buyer/OrderSuccess';
import MyOrders from './pages/buyer/MyOrders';
import OrderTracking from './pages/buyer/OrderTracking';

// Farmer Checkout Pages
import FarmerIncomingOrders from './pages/farmer/IncomingOrders';
import FarmerWallet from './pages/farmer/Wallet';

// Pricing Page
import PricingPlans from './pages/PricingPlans';

// Admin Pages
// (to be implemented)

function App() {
  useEffect(() => {
    // Check and initialize auth state from localStorage if needed
    const token = localStorage.getItem('access_token');
    if (token) {
      // Token exists, user is authenticated
    }
  }, []);

  return (
    <Router basename={process.env.PUBLIC_URL || ''}>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
        }}
      />
      
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/otp-login" element={<OTPLogin />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/pricing" element={<PricingPlans />} />

        {/* Farmer Routes */}
        <Route
          path="/farmer/dashboard"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/earnings"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerEarnings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/products"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/orders"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/messages"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/analytics"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/marketing"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerMarketing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/ai-tools"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerAITools />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/future-ai"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerFutureAI />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/agribot"
          element={
            <ProtectedRoute requiredRole="farmer">
              <AgriBot />
            </ProtectedRoute>
          }
        />

        {/* Farmer Checkout Routes */}
        <Route
          path="/farmer/incoming-orders"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerIncomingOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/wallet"
          element={
            <ProtectedRoute requiredRole="farmer">
              <FarmerWallet />
            </ProtectedRoute>
          }
        />

        {/* Buyer Routes */}
        <Route
          path="/buyer/dashboard"
          element={
            <ProtectedRoute requiredRole="buyer">
              <BuyerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/marketplace"
          element={
            <ProtectedRoute requiredRole="buyer">
              <BuyerMarketplace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/checkout"
          element={
            <ProtectedRoute requiredRole="buyer">
              <BuyerCheckout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/order-success"
          element={
            <ProtectedRoute requiredRole="buyer">
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/orders"
          element={
            <ProtectedRoute requiredRole="buyer">
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/orders/:id"
          element={
            <ProtectedRoute requiredRole="buyer">
              <OrderTracking />
            </ProtectedRoute>
          }
        />

        {/* Redirect shortcuts */}
        <Route path="/farmer" element={<Navigate to="/farmer/dashboard" replace />} />
        <Route path="/buyer" element={<Navigate to="/buyer/dashboard" replace />} />

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
