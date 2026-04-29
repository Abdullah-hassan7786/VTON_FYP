import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import PrivateRoute from './components/layout/PrivateRoute';
import SkeletonLoader from './components/ui/SkeletonLoader';

// Lazy load Pages for performance optimization
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const CatalogPage = lazy(() => import('./pages/Catalog'));
const TryOnPage = lazy(() => import('./pages/TryOn'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/Admin'));

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            style: { background: '#2ECC71', color: 'white' }
          },
          error: {
            style: { background: '#E74C3C', color: 'white' }
          }
        }} 
      />
      
      <Navbar />
      
      <main className="min-h-screen pt-16">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
            <div className="flex flex-col items-center gap-4">
              <SkeletonLoader variant="circle" className="w-16 h-16" />
              <div className="text-text-muted font-medium animate-pulse">Loading amazing styles...</div>
            </div>
          </div>
        }>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          
          {/* Private Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />
          
          <Route path="/upload" element={
            <PrivateRoute>
              <UploadPage />
            </PrivateRoute>
          } />
          
          <Route path="/analysis" element={
            <PrivateRoute>
              <AnalysisPage />
            </PrivateRoute>
          } />
          
          <Route path="/try-on" element={
            <PrivateRoute>
              <TryOnPage />
            </PrivateRoute>
          } />
          
          <Route path="/history" element={
            <PrivateRoute>
              <HistoryPage />
            </PrivateRoute>
          } />
          
          <Route path="/profile" element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } />
          
          {/* Admin Route */}
          <Route path="/admin" element={
            <PrivateRoute requireAdmin={true}>
              <AdminPage />
            </PrivateRoute>
          } />
          
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      
      <Footer />
    </BrowserRouter>
  );
}

export default App;
