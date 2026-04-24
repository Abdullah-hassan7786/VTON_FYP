import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SkeletonLoader from '../ui/SkeletonLoader';

const PrivateRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary pt-16">
        <div className="w-full max-w-md p-8">
          <div className="flex justify-center mb-8">
             <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-display font-bold">R</div>
             </div>
          </div>
          <SkeletonLoader variant="text" rows={3} />
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // If route requires admin and user is not admin, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;
