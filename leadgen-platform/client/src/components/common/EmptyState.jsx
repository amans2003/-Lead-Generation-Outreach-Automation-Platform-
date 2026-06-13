import React from 'react';
import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';
import { clsx } from 'clsx';

function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mb-4">
        <Icon size={26} className="text-gray-400" />
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string,
};

EmptyState.defaultProps = {
  icon: Inbox,
  description: '',
  action: null,
  className: '',
};

export default EmptyState;
