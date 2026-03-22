import React from 'react';
import { Card, CardContent } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  className = '',
}) => {
  return (
    <Card className={`group ${className}`} variant="glass">
      <CardContent className="p-6">
        <div className="flex items-start justify-between space-x-4">
          <div>
            <p className="text-sm font-medium text-secondary-foreground transition-colors group-hover:text-primary">
              {title}
            </p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight">{value}</h3>
            {description && (
              <p className="text-xs text-secondary-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-xs font-medium ${trend.isUp ? 'text-green-500' : 'text-red-500'}`}>
                {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
                <span className="text-secondary-foreground ml-1">vs last month</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary transition-transform group-hover:scale-110 group-hover:rotate-3">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
