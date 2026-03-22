import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  ...props
}) => {
  const baseStyles = 'rounded-xl border border-border/80 overflow-hidden backdrop-blur-[2px] transition-all duration-300';
  const variants = {
    default: 'bg-card/95 text-card-foreground shadow-xl shadow-black/5',
    glass: 'glass border-ring shadow-2xl shadow-black/10',
  };
  const hoverStyles = hoverable ? 'hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.01] cursor-pointer' : '';

  return (
    <div className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 border-b border-border ${className}`}>{children}</div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 border-t border-border bg-muted/30 ${className}`}>{children}</div>
);
