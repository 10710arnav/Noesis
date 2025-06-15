import React, { useState, useEffect } from 'react';

// --- Animation Wrapper Component ---
export interface AnimatedDivProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number; // ms
  duration?: number; // ms
  initialY?: number; // px
}

export const AnimatedDiv: React.FC<AnimatedDivProps> = ({ children, className, delay = 50, duration = 500, initialY = 5, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`${className} transition-all ease-out ${isVisible ? 'opacity-100 translate-y-0' : `opacity-0 translate-y-${initialY}px`}`}
      style={{ transitionDuration: `${duration}ms`}}
      {...props}
    >
      {children}
    </div>
  );
};

// --- Reusable UI Components ---

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', leftIcon, ...props }) => {
  const baseStyles = "font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150 ease-in-out flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-px";
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-400",
    secondary: "bg-purple-100 hover:bg-purple-200 text-purple-700 focus:ring-purple-400 border border-purple-300 shadow-sm",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-300",
    ghost: "bg-transparent hover:bg-emerald-100 text-emerald-600 focus:ring-emerald-400 border border-emerald-500 hover:border-emerald-600"
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} {...props}>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
    </button>
  );
};

export const LoadingSpinner: React.FC<{text?: string}> = ({text}) => (
  <div className="flex flex-col justify-center items-center p-4 space-y-2">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
    {text && <p className="text-blue-600 text-sm animate-pulse">{text}</p>}
  </div>
);

export interface AlertProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
  icon?: string;
}
export const Alert: React.FC<AlertProps> = ({ message, type, onClose, icon }) => {
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimatingIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const colorClasses = {
    success: 'bg-green-500 border-green-600 text-white',
    error: 'bg-red-500 border-red-600 text-white',
    info: 'bg-sky-500 border-sky-600 text-white',
    warning: 'bg-yellow-400 border-yellow-500 text-yellow-800',
  };
  return (
    <div className={`p-4 mb-4 rounded-lg border ${colorClasses[type]} flex justify-between items-center shadow-lg transform transition-all duration-300 ease-out ${isAnimatingIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
      <div className="flex items-center">
        {icon && <i className={`${icon} mr-3 text-lg`}></i>}
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-opacity-25 hover:bg-white" aria-label="Close alert">
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
};
