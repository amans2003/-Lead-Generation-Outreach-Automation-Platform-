import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

// Public pages
const LoginPage    = lazy(() => import('../pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx'));

// Protected pages
const DashboardPage       = lazy(() => import('../pages/DashboardPage.jsx'));
const LeadsPage           = lazy(() => import('../pages/LeadsPage.jsx'));
const GoodLeadsPage       = lazy(() => import('../pages/GoodLeadsPage.jsx'));
const NotInterestedPage   = lazy(() => import('../pages/NotInterestedPage.jsx'));
const ProcessingLeadsPage = lazy(() => import('../pages/ProcessingLeadsPage.jsx'));
const ScraperPage         = lazy(() => import('../pages/ScraperPage.jsx'));
const OutreachPage        = lazy(() => import('../pages/OutreachPage.jsx'));
const CampaignsPage       = lazy(() => import('../pages/CampaignsPage.jsx'));
const AnalyticsPage       = lazy(() => import('../pages/AnalyticsPage.jsx'));
const SettingsPage        = lazy(() => import('../pages/SettingsPage.jsx'));

function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Public routes */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"           element={<DashboardPage />} />
          <Route path="/leads"               element={<LeadsPage />} />
          <Route path="/leads/good"          element={<GoodLeadsPage />} />
          <Route path="/leads/not-interested" element={<NotInterestedPage />} />
          <Route path="/leads/processing"    element={<ProcessingLeadsPage />} />
          <Route path="/scraper"             element={<ScraperPage />} />
          <Route path="/outreach"            element={<OutreachPage />} />
          <Route path="/campaigns"           element={<CampaignsPage />} />
          <Route path="/analytics"           element={<AnalyticsPage />} />
          <Route path="/settings"            element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
