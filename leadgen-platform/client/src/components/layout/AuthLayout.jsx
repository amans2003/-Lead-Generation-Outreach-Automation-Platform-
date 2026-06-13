import React from 'react';
import PropTypes from 'prop-types';
import { Zap } from 'lucide-react';

function AuthLayout({ children, title }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-600 shadow-md mb-4">
            <Zap size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">LeadGen</span>
          <span className="text-sm text-gray-500 mt-1">
            Automation Lead Generation Platform
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-200 p-8">
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              {title}
            </h2>
          )}
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} LeadGen Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
};

AuthLayout.defaultProps = {
  title: '',
};

export default AuthLayout;
