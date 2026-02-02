import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`
              pointer-events-auto cursor-pointer
              px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-fade-in-up
              flex items-center gap-3 min-w-[200px] max-w-sm
              ${toast.type === 'success' ? 'bg-slate-800/90 text-white border-slate-700' : ''}
              ${toast.type === 'error' ? 'bg-red-500/90 text-white border-red-600' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/90 text-white border-blue-600' : ''}
            `}
          >
            <i className={`fas ${
              toast.type === 'success' ? 'fa-check-circle' : 
              toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'
            }`}></i>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};