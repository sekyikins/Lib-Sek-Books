import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-sm font-bold text-foreground ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          className={`
            w-full bg-card/50 backdrop-blur-md border border-border/50 rounded-xl px-4 py-3 
            text-sm font-medium outline-none transition-all duration-300
            placeholder:text-muted-foreground/50
            hover:border-primary/30 hover:bg-card/80
            focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 focus:shadow-xl focus:shadow-black/5
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-11' : ''}
            ${rightIcon ? 'pr-11' : ''}
            ${error ? 'border-destructive focus:ring-destructive/10' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs font-bold text-destructive ml-1">
          {error}
        </p>
      )}
    </div>
  );
};
