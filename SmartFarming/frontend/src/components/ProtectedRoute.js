import React, { memo } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../services/authStore';

const ProtectedRoute = memo(function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Check zustand store for auth loading state (token refresh in progress)
  const authLoading = useAuthStore((state) => state.authLoading);

  const isAuthenticated = !!token && !!user;

  // While auth is still initializing (e.g. refreshing token), show a brief loader
  // instead of immediately redirecting to login
  if (authLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a2e1a 0%, #14532d 50%, #1a4731 100%)',
      }}>
        <div style={{
          width: '36px', height: '36px',
          border: '3px solid rgba(34, 197, 94, 0.2)',
          borderTop: '3px solid #22c55e',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Support both requiredRole (single) and allowedRoles (array)
  const roles = allowedRoles || (requiredRole ? [requiredRole] : null);
  
  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard based on actual role
    if (user.role === 'farmer') {
      return <Navigate to="/farmer/dashboard" replace />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/buyer/marketplace" replace />;
    }
  }

  return children;
});

export default ProtectedRoute;
