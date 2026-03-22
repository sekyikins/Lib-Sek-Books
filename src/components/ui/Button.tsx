import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center hover:cursor-pointer justify-center rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] shadow-sm';
  
  const variants = {
    primary: 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-xl shadow-primary/30 ring-primary',
    secondary: 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80 shadow-lg shadow-black/5 ring-secondary',
    outline: 'border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-lg shadow-black/5 ring-ring',
    danger: 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/30 ring-destructive',
    ghost: 'border-transparent hover:bg-accent hover:text-accent-foreground hover:shadow-lg hover:shadow-black/5 ring-ring',
    success: 'bg-green-500 text-white border-green-500 hover:bg-green-600 shadow-xl shadow-green-500/30 ring-green-500',
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
    icon: 'h-10 w-10',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
      ) : null}
      {children}
    </button>
  );
};
