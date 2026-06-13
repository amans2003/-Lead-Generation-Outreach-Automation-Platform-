import React from 'react';
import PropTypes from 'prop-types';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

const VARIANT_STYLES = {
  danger: {
    icon: 'bg-red-100 text-red-600',
    confirm: 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500',
  },
  warning: {
    icon: 'bg-yellow-100 text-yellow-600',
    confirm: 'bg-yellow-500 hover:bg-yellow-600 text-white focus-visible:ring-yellow-400',
  },
  info: {
    icon: 'bg-blue-100 text-blue-600',
    confirm: 'bg-primary-600 hover:bg-primary-700 text-white focus-visible:ring-primary-500',
  },
};

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant,
  isLoading,
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;

  function handleConfirm() {
    if (onConfirm) onConfirm();
  }

  function handleCancel() {
    if (onCancel) onCancel();
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content */}
        <Dialog.Content
          className={clsx(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'bg-white rounded-2xl shadow-xl border border-gray-200 p-6',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200'
          )}
        >
          {/* Close button */}
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </Dialog.Close>

          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                'flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                styles.icon
              )}
            >
              <AlertTriangle size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-semibold text-gray-900 leading-tight">
                {title}
              </Dialog.Title>

              {description && (
                <Dialog.Description className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  {description}
                </Dialog.Description>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                styles.confirm
              )}
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  variant: PropTypes.oneOf(['danger', 'warning', 'info']),
  isLoading: PropTypes.bool,
};

ConfirmDialog.defaultProps = {
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  onConfirm: null,
  onCancel: null,
  variant: 'danger',
  isLoading: false,
};

export default ConfirmDialog;
