import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PageLayout from '../components/layout/PageLayout.jsx';

function ProtectedRoute({ title }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <PageLayout title={title}>
      <Outlet />
    </PageLayout>
  );
}

ProtectedRoute.propTypes = {
  title: PropTypes.string,
};

ProtectedRoute.defaultProps = {
  title: '',
};

export default ProtectedRoute;
