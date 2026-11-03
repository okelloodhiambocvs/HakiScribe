import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 md:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isSuccess = toast.type === 'success';

        const borderColor = isError
          ? 'border-[#B91C1C]'
          : isWarning
          ? 'border-[#B45309]'
          : isSuccess
          ? 'border-[#137333]'
          : 'border-[#0B3D2C]';

        const iconColor = isError
          ? 'text-[#B91C1C]'
          : isWarning
          ? 'text-[#B45309]'
          : isSuccess
          ? 'text-[#137333]'
          : 'text-[#0B3D2C]';

        const bg = 'bg-[#FFFFFF]';

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border-2 ${borderColor} ${bg} transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
          >
            <div className={`mt-0.5 shrink-0 ${iconColor}`}>
              {isError && <AlertCircle className="w-5 h-5 stroke-[2]" />}
              {isWarning && <AlertTriangle className="w-5 h-5 stroke-[2]" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 stroke-[2]" />}
              {toast.type === 'info' && <Info className="w-5 h-5 stroke-[2]" />}
            </div>

            <div className="flex-1 text-xs">
              {toast.title && (
                <div className="font-bold text-[#1F2A24] text-sm mb-0.5">
                  {toast.title}
                </div>
              )}
              <div className="text-[#1F2A24] leading-relaxed font-medium">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#78716C] hover:text-[#1F2A24] p-1 rounded-md transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
