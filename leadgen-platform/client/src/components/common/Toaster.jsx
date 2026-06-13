import React from 'react';
import * as Toast from '@radix-ui/react-toast';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastStore } from '../../stores/toastStore.js';

const ICON_MAP = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLOR_MAP = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
};

const ICON_COLOR_MAP = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type] || Info;
        return (
          <Toast.Root
            key={toast.id}
            open
            onOpenChange={(open) => { if (!open) dismiss(toast.id); }}
            className={clsx(
              'flex items-start gap-3 w-[360px] max-w-[90vw] rounded-xl border px-4 py-3 shadow-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:slide-in-from-right-4 data-[state=closed]:slide-out-to-right-4',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'duration-200',
              COLOR_MAP[toast.type] || COLOR_MAP.info
            )}
          >
            <Icon size={18} className={clsx('mt-0.5 shrink-0', ICON_COLOR_MAP[toast.type])} />

            <div className="flex-1 min-w-0">
              {toast.title && (
                <Toast.Title className="text-sm font-semibold leading-snug">
                  {toast.title}
                </Toast.Title>
              )}
              {toast.description && (
                <Toast.Description className="text-xs mt-0.5 leading-relaxed opacity-80">
                  {toast.description}
                </Toast.Description>
              )}
            </div>

            <Toast.Close asChild>
              <button
                className="shrink-0 p-0.5 rounded hover:opacity-70 transition-opacity"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </Toast.Close>
          </Toast.Root>
        );
      })}

      <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 outline-none" />
    </Toast.Provider>
  );
}

export default Toaster;
