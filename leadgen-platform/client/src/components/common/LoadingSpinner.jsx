import React from 'react';
import PropTypes from 'prop-types';
import { clsx } from 'clsx';

const SIZE_MAP = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
  xl: 'w-16 h-16 border-4',
};

function LoadingSpinner({ size, className, label }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={clsx('flex items-center justify-center', className)}
    >
      <div
        className={clsx(
          'rounded-full border-gray-200 border-t-primary-600 animate-spin',
          SIZE_MAP[size] || SIZE_MAP.md
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
  label: PropTypes.string,
};

LoadingSpinner.defaultProps = {
  size: 'md',
  className: '',
  label: 'Loading...',
};

export default LoadingSpinner;
