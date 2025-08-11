import React, { useEffect, useState } from 'react';
import { mobileUXService } from '../../services/mobile-ux-service';

interface MobileBottomNavProps {
  items: Array<{
    icon: React.ReactNode;
    label: string;
    href: string;
    active?: boolean;
    onClick?: () => void;
  }>;
  className?: string;
}

export function MobileBottomNav({ items, className = '' }: MobileBottomNavProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(mobileUXService.isMobileDevice());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 ${className}`}>
      <div className="flex justify-around items-center py-2">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            onClick={item.onClick}
            className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
              item.active
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <div className="w-6 h-6 mb-1 flex items-center justify-center">
              {item.icon}
            </div>
            <span className="text-xs font-medium truncate w-full text-center">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function MobileDrawer({ isOpen, onClose, children, title }: MobileDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(mobileUXService.isMobileDevice());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isMobile) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out z-50 max-h-[90vh] overflow-hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {children}
        </div>
      </div>
    </>
  );
}

interface MobileTableProps {
  data: Array<Record<string, any>>;
  columns: Array<{
    key: string;
    header: string;
    render?: (value: any, row: Record<string, any>) => React.ReactNode;
  }>;
  className?: string;
}

export function MobileTable({ data, columns, className = '' }: MobileTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(mobileUXService.isMobileDevice());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((row, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            {columns.map((column) => (
              <div key={column.key} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {column.header}
                </span>
                <span className="text-sm text-gray-900 dark:text-white text-right">
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]
                  }
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function TouchButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}: TouchButtonProps) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(mobileUXService.isTouchDevice());
  }, []);

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
  };

  const sizeClasses = {
    sm: isTouch ? 'px-3 py-2 text-sm min-h-[44px]' : 'px-3 py-2 text-sm',
    md: isTouch ? 'px-4 py-2 text-base min-h-[44px]' : 'px-4 py-2 text-sm',
    lg: isTouch ? 'px-6 py-3 text-lg min-h-[48px]' : 'px-6 py-3 text-base'
  };

  const touchClasses = isTouch ? 'active:scale-95 touch-manipulation' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${touchClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function MobileInput({ label, error, className = '', ...props }: MobileInputProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(mobileUXService.isMobileDevice());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && isMobile) {
      mobileUXService.optimizeInputForMobile(inputRef.current);
    }
  }, [isMobile]);

  const inputClasses = isMobile
    ? 'block w-full px-3 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
    : 'block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        className={`${inputClasses} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(distance);
        setIsPulling(distance > threshold);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setIsPulling(false);
        setPullDistance(0);
        setStartY(0);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
      setStartY(0);
    }
  };

  return (
    <div
      className="mobile-pull-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={`mobile-pull-indicator ${isPulling || isRefreshing ? 'active' : ''}`}
        style={{ transform: `translateY(${Math.min(pullDistance - 80, 0)}px)` }}
      >
        <div className={`mobile-loading-spinner ${isRefreshing ? '' : 'opacity-50'}`} />
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
          {isRefreshing ? 'در حال بروزرسانی...' : isPulling ? 'رها کنید تا بروزرسانی شود' : 'برای بروزرسانی بکشید'}
        </span>
      </div>
      
      {children}
    </div>
  );
}
