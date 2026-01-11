import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  
  return {
    toast: {
      success: (message: string) => context.addToast({ type: 'success', message }),
      error: (message: string) => context.addToast({ type: 'error', message }),
      warning: (message: string) => context.addToast({ type: 'warning', message }),
      info: (message: string) => context.addToast({ type: 'info', message }),
    },
  };
}

function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {context.toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => context.removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const styles = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', Icon: CheckCircle },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', Icon: XCircle },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', Icon: AlertCircle },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', Icon: Info },
  };

  const { bg, border, text, Icon } = styles[toast.type];

  return (
    <div 
      className={`${bg} ${border} ${text} border rounded-lg p-4 pr-10 shadow-lg min-w-[300px] max-w-[400px] relative animate-slideUp`}
    >
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 opacity-50 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">{toast.message}</p>
      </div>
    </div>
  );
}

// ============================================================
// BUTTON
// ============================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input
        className={`input ${error ? 'border-rust focus:border-rust focus:ring-rust/20' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-rust">{error}</p>}
    </div>
  );
}

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select
        className={`input ${error ? 'border-rust' : ''} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-rust">{error}</p>}
    </div>
  );
}

// Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Card({ children, className = '', padding = 'md', style }: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return <div className={`card ${paddingClass} ${className}`} style={style}>{children}</div>;
}

// Alert
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', title, children, className = '' }: AlertProps) {
  const variants = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', Icon: Info },
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', Icon: CheckCircle },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', Icon: AlertCircle },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', Icon: XCircle },
  };

  const { bg, border, text, Icon } = variants[variant];

  return (
    <div className={`${bg} ${border} ${text} border rounded-lg p-4 flex gap-3 ${className}`}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <h4 className="font-medium mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

// Badge
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-sand text-charcoal',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`${variants[variant]} text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  );
}

// Loading Spinner
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return <Loader2 className={`${sizes[size]} animate-spin text-forest`} />;
}

// Loading State
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-stone">{message}</p>
    </div>
  );
}

// Error State
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="h-8 w-8 text-rust" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
        <p className="text-stone mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

// Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      {icon && (
        <div className="h-16 w-16 bg-sand rounded-full flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
        {description && <p className="text-stone mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-charcoal/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-slideUp">
        <div className="flex items-center justify-between p-6 border-b border-sand">
          <h2 className="text-xl font-semibold font-display">{title}</h2>
          <button onClick={onClose} className="text-stone hover:text-charcoal">
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
